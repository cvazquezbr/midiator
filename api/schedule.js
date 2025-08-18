import { kv } from './kv.js';
import crypto from 'crypto';
import { markdownToLinkedinText } from './utils.js';
import fetch from 'node-fetch';

// Helper function to create a post
async function handleCreateSchedule(request, response) {
    try {
        const postData = request.body.payload;
        if (!postData) {
            return response.status(400).json({ error: 'Missing post data payload.' });
        }

        const userSelectedScheduledAt = postData.scheduledAt;
        const executionDate = new Date(userSelectedScheduledAt);
        const executionTimestamp = executionDate.getTime();

        const postId = crypto.randomUUID();
        const newPost = {
            id: postId,
            createdAt: new Date().toISOString(),
            status: 'scheduled',
            ...postData,
            scheduledAt: executionDate.toISOString(),
            userSelectedTime: userSelectedScheduledAt,
        };

        await kv.set(`post:${postId}`, JSON.stringify(newPost));
        await kv.sadd(`user:${newPost.authorUrn}`, postId);
        await kv.zadd('schedules_by_time', executionTimestamp, postId);

        return response.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating schedule:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper function to get schedules for a user
async function handleGetSchedules(request, response) {
    try {
        const { authorUrn } = request.body.payload || {};
        if (!authorUrn) {
            return response.status(200).json([]);
        }

        const postIds = await kv.smembers(`user:${authorUrn}`);
        if (!postIds || postIds.length === 0) {
            return response.status(200).json([]);
        }

        const postsRaw = await kv.mget(postIds.map(id => `post:${id}`));
        const posts = postsRaw.map(p => p ? JSON.parse(p) : null).filter(p => p);
        return response.status(200).json(posts);
    } catch (error) {
        console.error('Error getting schedules:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper function to delete a schedule
async function handleDeleteSchedule(request, response) {
    try {
        const { id, authorUrn } = request.body.payload;
        if (!id || !authorUrn) {
            return response.status(400).json({ error: 'Missing id or authorUrn for deleting schedule.' });
        }

        await kv.del(`post:${id}`);
        await kv.srem(`user:${authorUrn}`, id);
        await kv.zrem('schedules_by_time', id);

        return response.status(200).json({ message: 'Schedule deleted successfully.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper function to get a single schedule by ID
async function handleGetScheduleById(request, response) {
    try {
        const { id } = request.body.payload;
        if (!id) {
            return response.status(400).json({ error: 'Missing id for getting schedule.' });
        }

        const postRaw = await kv.get(`post:${id}`);
        if (!postRaw) {
            return response.status(404).json({ error: 'Schedule not found.' });
        }

        const post = JSON.parse(postRaw);
        return response.status(200).json(post);
    } catch (error) {
        console.error('Error getting schedule by id:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper function to update a schedule
async function handleUpdateSchedule(request, response) {
    try {
        const { id, scheduledAt: newScheduledAt } = request.body.payload;
        if (!id || !newScheduledAt) {
            return response.status(400).json({ error: 'Missing id or newScheduledAt for updating schedule.' });
        }

        const postRaw = await kv.get(`post:${id}`);
        if (!postRaw) {
            return response.status(404).json({ error: 'Schedule not found to update.' });
        }

        const post = JSON.parse(postRaw);

        // Update the schedule time
        const newExecutionDate = new Date(newScheduledAt);
        const newExecutionTimestamp = newExecutionDate.getTime();

        post.scheduledAt = newExecutionDate.toISOString();
        post.userSelectedTime = newScheduledAt;
        // Also update status back to 'scheduled' in case it was 'failed'
        post.status = 'scheduled';
        post.error = null; // Clear previous errors

        // Update the post in KV
        await kv.set(`post:${id}`, JSON.stringify(post));

        // zadd with the same member updates the score, so this is correct.
        await kv.zadd('schedules_by_time', { score: newExecutionTimestamp, member: id });

        return response.status(200).json(post);
    } catch (error) {
        console.error('Error updating schedule:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}


// The main scheduler logic
async function handleRunScheduler(request, response) {
    console.log('Scheduler run initiated...');
    let publishedCount = 0;
    let failedCount = 0;

    try {
        const now = Date.now();
        const duePostIds = await kv.zrangebyscore('schedules_by_time', 0, now);

        if (duePostIds.length === 0) {
            return response.status(200).json({ message: 'No due posts to publish.' });
        }

        for (const postId of duePostIds) {
            const postRaw = await kv.get(`post:${postId}`);
            if (!postRaw) {
                await kv.zrem('schedules_by_time', postId); // Clean up dangling ID
                continue;
            }
            const post = JSON.parse(postRaw);

            try {
                const postText = [
                    post.content.titulo.toUpperCase(),
                    '',
                    markdownToLinkedinText(post.content.conteudo),
                    '',
                    '----',
                    post.content.cta,
                    '----',
                    (post.content.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
                ].join('\n');

                const shareContent = { shareCommentary: { text: postText }, shareMediaCategory: 'NONE' };
                const payload = {
                    author: post.authorUrn,
                    lifecycleState: 'PUBLISHED',
                    specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
                    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
                };

                const proxyUrl = `${process.env.VITE_API_BASE_URL || 'http://localhost:5173'}/api/linkedin-proxy`;
                const proxyResponse = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'createPost', accessToken: post.accessToken, payload }),
                });

                if (!proxyResponse.ok) {
                    const errorData = await proxyResponse.json();
                    throw new Error(`LinkedIn API Error: ${errorData.message || 'Unknown'}`);
                }

                const result = await proxyResponse.json();
                post.status = 'published';
                post.publishedAt = new Date().toISOString();
                post.postId = result.id;
                publishedCount++;
            } catch (error) {
                post.status = 'failed';
                post.error = error.message;
                failedCount++;
            }

            await kv.set(`post:${postId}`, JSON.stringify(post));
            await kv.zrem('schedules_by_time', postId);
        }

        const summary = `Scheduler run finished. Published: ${publishedCount}, Failed: ${failedCount}.`;
        return response.status(200).json({ message: summary });

    } catch (error) {
        console.error('Critical error in scheduler run:', error);
        return response.status(500).json({ error: 'Internal Server Error during scheduler run' });
    }
}

// Main API handler
export default async function handler(request, response) {
    if (request.method === 'GET') {
        return handleRunScheduler(request, response);
    }
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST', 'GET']);
        return response.status(405).end('Method Not Allowed');
    }

    const { action } = request.body;
    switch (action) {
        case 'createSchedule': return handleCreateSchedule(request, response);
        case 'getSchedules': return handleGetSchedules(request, response);
        case 'deleteSchedule': return handleDeleteSchedule(request, response);
        case 'getSchedule': return handleGetScheduleById(request, response);
        case 'updateSchedule': return handleUpdateSchedule(request, response);
        default: return response.status(400).json({ error: `Invalid action specified: ${action}` });
    }
}

// Test exports
export { handleCreateSchedule, handleGetSchedules, handleDeleteSchedule, handleRunScheduler, handleGetScheduleById, handleUpdateSchedule };
