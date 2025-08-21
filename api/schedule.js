import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { markdownToLinkedinText } from './utils.js';
import fetch from 'node-fetch';

// Helper function to create a schedule
async function handleCreateSchedule(request, response) {
    try {
        const { campaign_id, scheduled_at, content, authorUrn } = request.body.payload;
        if (!scheduled_at || !content || !authorUrn) {
            return response.status(400).json({ error: 'Missing required fields for scheduling.' });
        }
        const userId = request.user.sub;
        const executionDate = new Date(scheduled_at);

        const { rows } = await query(
            `INSERT INTO linkedin_schedules (user_id, campaign_id, scheduled_at, user_selected_time, post_content, status)
             VALUES ($1, $2, $3, $4, $5, 'scheduled') RETURNING *`,
            [userId, campaign_id || null, executionDate.toISOString(), scheduled_at, JSON.stringify({ ...content, authorUrn })]
        );

        return response.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating schedule:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper function to get schedules for a user
async function handleGetSchedules(request, response) {
    try {
        const userId = request.user.sub;
        // Also get campaign data to have access to images
        const { rows } = await query(
            `SELECT ls.*, c.campaign_data
             FROM linkedin_schedules ls
             LEFT JOIN campaigns c ON ls.campaign_id = c.id
             WHERE ls.user_id = $1 ORDER BY ls.scheduled_at DESC`,
            [userId]
        );
        return response.status(200).json(rows);
    } catch (error) {
        console.error('Error getting schedules:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper function to delete a schedule
async function handleDeleteSchedule(request, response) {
    try {
        const { id } = request.body.payload;
        if (!id) {
            return response.status(400).json({ error: 'Missing id for deleting schedule.' });
        }
        const userId = request.user.sub;

        const { rowCount } = await query(
            'DELETE FROM linkedin_schedules WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (rowCount === 0) {
            return response.status(404).json({ error: 'Schedule not found or user not authorized.' });
        }

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
        const userId = request.user.sub;

        const { rows } = await query(
            `SELECT ls.*, c.campaign_data
             FROM linkedin_schedules ls
             LEFT JOIN campaigns c ON ls.campaign_id = c.id
             WHERE ls.id = $1 AND ls.user_id = $2`,
            [id, userId]
        );

        if (rows.length === 0) {
            return response.status(404).json({ error: 'Schedule not found or user not authorized.' });
        }

        return response.status(200).json(rows[0]);
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
        const userId = request.user.sub;
        const newExecutionDate = new Date(newScheduledAt);

        const { rows } = await query(
            `UPDATE linkedin_schedules
             SET scheduled_at = $1, user_selected_time = $2, status = 'scheduled', error_message = NULL
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [newExecutionDate.toISOString(), newScheduledAt, id, userId]
        );

        if (rows.length === 0) {
            return response.status(404).json({ error: 'Schedule not found or user not authorized to update.' });
        }

        return response.status(200).json(rows[0]);
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
        const now = new Date();
        const { rows: duePosts } = await query(
            `SELECT ls.*, c.campaign_data, u.linkedin_access_token
             FROM linkedin_schedules ls
             LEFT JOIN campaigns c ON ls.campaign_id = c.id
             JOIN users u ON ls.user_id = u.id
             WHERE ls.scheduled_at <= $1 AND ls.status = 'scheduled'`,
            [now]
        );

        if (duePosts.length === 0) {
            return response.status(200).json({ message: 'No due posts to publish.' });
        }

        for (const post of duePosts) {
            try {
                const postContent = post.post_content;
                const authorUrn = postContent.authorUrn;
                let accessToken = post.linkedin_access_token;

                // NOTE: Token refresh logic might need adjustment depending on where it's stored and how it's managed.
                // Assuming a refresh mechanism exists.
                const refreshResponse = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:5173'}/api/linkedin-proxy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'refreshToken', userId: post.user_id }),
                });

                if (refreshResponse.ok) {
                    const { accessToken: newAccessToken } = await refreshResponse.json();
                    accessToken = newAccessToken;
                } else {
                    console.warn(`Failed to refresh token for user ${post.user_id}. Proceeding with existing token.`);
                }

                const postText = [
                    postContent.titulo.toUpperCase(),
                    '',
                    markdownToLinkedinText(postContent.conteudo),
                    '',
                    '----',
                    postContent.cta,
                    '----',
                    (postContent.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
                ].join('\n');

                const images = post.campaign_data?.images || [];
                const imageUrns = [];

                if (images.length > 0) {
                    for (const imageUrl of images) {
                        // Fetch the image from the blob store
                        const imageResponse = await fetch(imageUrl);
                        if (!imageResponse.ok) {
                            throw new Error(`Failed to fetch image from blob store: ${imageUrl}`);
                        }
                        const imageBuffer = await imageResponse.arrayBuffer();
                        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
                        const imageType = imageResponse.headers.get('content-type');

                        // Register the upload with LinkedIn
                        const registerResponse = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:5173'}/api/linkedin-proxy`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'registerUpload',
                                accessToken,
                                payload: {
                                    registerUploadRequest: {
                                        owner: authorUrn,
                                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                                        serviceRelationships: [{
                                            relationshipType: 'OWNER',
                                            identifier: 'urn:li:userGeneratedContent'
                                        }]
                                    }
                                }
                            })
                        });

                        if (!registerResponse.ok) {
                            throw new Error('Failed to register image upload with LinkedIn.');
                        }
                        const registerData = await registerResponse.json();
                        const uploadUrl = registerData.uploadUrl;
                        const assetUrn = registerData.assetUrn;

                        // Upload the image to LinkedIn
                        const uploadResponse = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:5173'}/api/linkedin-proxy`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'uploadImage',
                                accessToken,
                                uploadUrl,
                                imageBase64,
                                imageType
                            })
                        });

                        if (!uploadResponse.ok) {
                            throw new Error('Failed to upload image to LinkedIn.');
                        }

                        imageUrns.push(assetUrn);
                    }
                }

                const payload = {
                    author: authorUrn,
                    content: postText,
                    images: imageUrns
                };

                const proxyUrl = `${process.env.VITE_API_BASE_URL || 'http://localhost:5173'}/api/linkedin-proxy`;
                const proxyResponse = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'createPost', accessToken, payload }),
                });

                if (!proxyResponse.ok) {
                    const errorData = await proxyResponse.json();
                    throw new Error(`LinkedIn API Error: ${errorData.message || 'Unknown'}`);
                }

                const result = await proxyResponse.json();
                const linkedinPostUrl = `https://www.linkedin.com/feed/update/${result.id}/`;

                await query(
                    `UPDATE linkedin_schedules
                     SET status = 'published', linkedin_post_id = $1, linkedin_post_url = $2, updated_at = NOW()
                     WHERE id = $3`,
                    [result.id, linkedinPostUrl, post.id]
                );
                publishedCount++;

            } catch (error) {
                await query(
                    `UPDATE linkedin_schedules
                     SET status = 'failed', error_message = $1, updated_at = NOW()
                     WHERE id = $2`,
                    [error.message, post.id]
                );
                failedCount++;
            }
        }

        const summary = `Scheduler run finished. Published: ${publishedCount}, Failed: ${failedCount}.`;
        return response.status(200).json({ message: summary });

    } catch (error) {
        console.error('Critical error in scheduler run:', error);
        return response.status(500).json({ error: 'Internal Server Error during scheduler run' });
    }
}

// Main API handler
const mainHandler = async (request, response) => {
    if (request.method === 'GET') {
        return handleRunScheduler(request, response);
    }
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST', 'GET']);
        return response.status(405).end('Method Not Allowed');
    }

    const { action, payload } = request.body;

    // Pass the entire request object to handlers that need it (for user, etc.)
    switch (action) {
        case 'createSchedule':
            return handleCreateSchedule(request, response);
        case 'getSchedules':
            return handleGetSchedules(request, response);
        case 'deleteSchedule':
            return handleDeleteSchedule(request, response);
        case 'getSchedule':
            return handleGetScheduleById(request, response);
        case 'updateSchedule':
            return handleUpdateSchedule(request, response);
        default:
            return response.status(400).json({ error: `Invalid action specified: ${action}` });
    }
};

export default withAuth(mainHandler);
