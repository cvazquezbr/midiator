import db from './database.js';
import crypto from 'crypto';
import { markdownToLinkedinText } from './utils.js';
import fetch from 'node-fetch';

async function handleCreateSchedule(request, response) {
    try {
        const postData = request.body.payload;
        if (!postData) {
            return response.status(400).json({ error: 'Missing post data payload.' });
        }

        const newPost = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            status: 'scheduled',
            ...postData,
        };

        db.data.posts.push(newPost);
        await db.write();

        return response.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating schedule:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleGetSchedules(request, response) {
    try {
        const posts = db.data.posts;
        return response.status(200).json(posts);
    } catch (error) {
        console.error('Error getting schedules:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleDeleteSchedule(request, response) {
    try {
        const { id } = request.body.payload;
        if (!id) {
            return response.status(400).json({ error: 'Missing id for deleting schedule.' });
        }

        const initialLength = db.data.posts.length;
        db.data.posts = db.data.posts.filter(post => post.id !== id);

        if (db.data.posts.length === initialLength) {
            return response.status(404).json({ error: 'Post not found.' });
        }

        await db.write();
        return response.status(200).json({ message: 'Schedule deleted successfully.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleRunScheduler(request, response) {
    console.log('Scheduler run initiated...');
    let publishedCount = 0;
    let failedCount = 0;

    try {
        const now = new Date();
        const duePosts = db.data.posts.filter(p =>
            p.status === 'scheduled' && new Date(p.scheduledAt) <= now
        );

        if (duePosts.length === 0) {
            console.log('No due posts found.');
            return response.status(200).json({ message: 'No due posts to publish.' });
        }

        console.log(`Found ${duePosts.length} due posts to publish.`);

        for (const post of duePosts) {
            try {
                // We will need to handle media posts later. For now, only text posts.
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

                const shareContent = {
                    shareCommentary: { text: postText },
                    shareMediaCategory: 'NONE',
                };

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
                    body: JSON.stringify({
                        action: 'createPost',
                        accessToken: post.accessToken,
                        payload,
                    }),
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
                console.log(`Post ${post.id} published successfully. LinkedIn ID: ${result.id}`);

            } catch (error) {
                post.status = 'failed';
                post.error = error.message;
                failedCount++;
                console.error(`Failed to publish post ${post.id}:`, error);
            }
        }

        await db.write();

        const summary = `Scheduler run finished. Published: ${publishedCount}, Failed: ${failedCount}.`;
        console.log(summary);
        return response.status(200).json({ message: summary });

    } catch (error) {
        console.error('Critical error in scheduler run:', error);
        return response.status(500).json({ error: 'Internal Server Error during scheduler run' });
    }
}

export async function handleCreateScheduleForTest(req, res) {
    return await handleCreateSchedule(req, res);
}

export async function handleRunSchedulerForTest(req, res) {
    return await handleRunScheduler(req, res);
}

export async function handleGetSchedulesForTest(req, res) {
    return await handleGetSchedules(req, res);
}

export default async function handler(request, response) {
    // Vercel Cron jobs send GET requests. We'll allow GET only for the cron.
    if (request.method === 'GET') {
        console.log(`[${new Date().toISOString()}] /api/schedule invoked by GET (Cron Job)`);
        // We can add a secret here for security if needed, e.g., check a header.
        return handleRunScheduler(request, response);
    }

    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST', 'GET']);
        return response.status(405).end('Method Not Allowed');
    }

    // For POST requests, continue with the action-based logic.
    console.log(`[${new Date().toISOString()}] /api/schedule invoked by POST. Action: ${request.body?.action}`);
    const { action } = request.body;

    switch (action) {
        case 'createSchedule':
            return handleCreateSchedule(request, response);
        case 'getSchedules':
            return handleGetSchedules(request, response);
        case 'deleteSchedule':
            return handleDeleteSchedule(request, response);
        case 'runScheduler':
            return handleRunScheduler(request, response);
        default:
            return response.status(400).json({ error: `Invalid action specified: ${action}` });
    }
}
