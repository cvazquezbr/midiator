import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { markdownToLinkedinText } from './utils.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to create a schedule
async function handleCreateSchedule(request, response) {
    try {
        const {
            campaign_id,
            scheduled_at,
            content,
            authorUrn,
            status = 'scheduled', // Default to 'scheduled'
            linkedin_post_url = null
        } = request.body.payload;

        if (!scheduled_at || !content || !authorUrn) {
            return response.status(400).json({ error: 'Missing required fields for scheduling.' });
        }

        const userId = request.user.sub;
        const executionDate = new Date(scheduled_at);

        // Extract post ID from URL. The ID is the URN.
        const match = linkedin_post_url ? linkedin_post_url.match(/(urn:li:(?:share|ugcPost):\d+)/) : null;
        const linkedin_post_id = match ? match[0] : null;

        const { rows } = await query(
            `INSERT INTO linkedin_schedules (user_id, campaign_id, scheduled_at, user_selected_time, post_content, status, linkedin_post_url, linkedin_post_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                userId,
                campaign_id || null,
                executionDate.toISOString(),
                scheduled_at,
                JSON.stringify({ ...content, authorUrn }),
                status,
                linkedin_post_url,
                linkedin_post_id
            ]
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

// Helper function to publish a single post to LinkedIn.
// It returns the final response from the proxy.
async function publishPost(fetch, post, accessToken) {
    const postContent = post.post_content;
    const authorUrn = postContent.authorUrn;
    const proxyApiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5173';

    // Define common headers for internal API calls to the proxy
    const internalApiHeaders = {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET,
    };

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

    const images = post.post_content?.images || [];
    const imageUrns = [];

    if (images.length > 0) {
        for (const imageUrl of images) {
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error(`Failed to fetch image from blob store: ${imageUrl}`);

            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            const imageType = imageResponse.headers.get('content-type');

            const registerResponse = await fetch(`${proxyApiBaseUrl}/api/linkedin-proxy`, {
                method: 'POST',
                headers: internalApiHeaders,
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

            if (registerResponse.status === 401) return registerResponse;
            if (!registerResponse.ok) {
                const errorData = await registerResponse.json();
                throw new Error(`Failed to register image upload: ${errorData.message || 'Unknown error'}`);
            }

            const { uploadUrl, assetUrn } = await registerResponse.json();

            const uploadResponse = await fetch(`${proxyApiBaseUrl}/api/linkedin-proxy`, {
                method: 'POST',
                headers: internalApiHeaders,
                body: JSON.stringify({ action: 'uploadImage', accessToken, uploadUrl, imageBase64, imageType })
            });

            if (uploadResponse.status === 401) return uploadResponse;
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(`Failed to upload image: ${errorData.message || 'Unknown error'}`);
            }

            imageUrns.push(assetUrn);
        }
    }

    const videoUrn = post.post_content?.video;
    const payload = {
        author: authorUrn,
        content: postText,
        images: imageUrns,
        video: videoUrn,
        title: post.post_content?.titulo || 'Video Post'
    };

    return fetch(`${proxyApiBaseUrl}/api/linkedin-proxy`, {
        method: 'POST',
        headers: internalApiHeaders,
        body: JSON.stringify({ action: 'createPost', accessToken, payload }),
    });
}


// The main scheduler logic
export async function handleRunScheduler(request, response) {
    const fetch = (await import('node-fetch')).default;
    console.log('Scheduler run initiated...');
    let publishedCount = 0;
    let failedCount = 0;

    try {
        const now = new Date();
        const { rows: duePosts } = await query(
            `SELECT ls.*, c.campaign_data, u.linkedin_access_token
             FROM linkedin_schedules ls
             JOIN users u ON ls.user_id = u.id
             LEFT JOIN campaigns c ON ls.campaign_id = c.id
             WHERE ls.scheduled_at <= ($1 AT TIME ZONE 'UTC')
               AND ls.status = 'scheduled'
               AND u.linkedin_access_token IS NOT NULL`,
            [now.toISOString()]
        );

        if (duePosts.length === 0) {
            console.log('No due posts to publish.');
            return response.status(200).json({ message: 'No due posts to publish.' });
        }

        console.log(`Found ${duePosts.length} posts to process.`);

        for (const post of duePosts) {
            try {
                let accessToken = post.linkedin_access_token;

                // First attempt to publish
                let proxyResponse = await publishPost(fetch, post, accessToken);

                // If the token is expired (401), try to refresh it
                if (proxyResponse.status === 401) {
                    console.log(`Access token for user ${post.user_id} may have expired. Attempting to refresh.`);

                    const refreshResponse = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:5173'}/api/linkedin-proxy`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal-secret': process.env.INTERNAL_API_SECRET,
                        },
                        body: JSON.stringify({ action: 'refreshTokenInternal', userId: post.user_id }),
                    });

                    if (refreshResponse.ok) {
                        const { accessToken: newAccessToken } = await refreshResponse.json();
                        accessToken = newAccessToken; // Update token
                        console.log(`Token refreshed successfully for user ${post.user_id}. Waiting 2s before retry...`);

                        await delay(2000);

                        // Second attempt to publish with the new token
                        proxyResponse = await publishPost(fetch, post, accessToken);
                    } else {
                        // If refresh fails, we can't proceed with this post.
                        const errorData = await refreshResponse.json();
                        throw new Error(`Failed to refresh token: ${errorData.message || `Status ${refreshResponse.status}`}`);
                    }
                }

                // Check the result of the final publish attempt
                if (!proxyResponse.ok) {
                    const errorData = await proxyResponse.json();
                    console.error('[Scheduler] Full error data from proxy:', errorData);
                    throw new Error(`LinkedIn API Error after potential refresh: ${JSON.stringify(errorData)}`);
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
                console.log(`Successfully published post ${post.id} for user ${post.user_id}.`);

            } catch (error) {
                console.error(`Failed to process post ${post.id} for user ${post.user_id}. Error: ${error.message}`);
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
        console.log(summary);
        return response.status(200).json({ message: summary });

    } catch (error) {
        console.error('Critical error in scheduler run:', error);
        return response.status(500).json({ error: 'Internal Server Error during scheduler run' });
    }
}

// Handler for user-facing actions, protected by withAuth
const userActionsHandler = async (request, response) => {
    const { action } = request.body;

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

// Main API handler that routes requests based on method
const mainHandler = async (request, response) => {
    // Cron job endpoint (GET) - uses Vercel's built-in cron secret
    if (request.method === 'GET') {
        const vercelCronSecret = process.env.VERCEL_CRON_SECRET;
        const secretFromHeader = typeof request.headers.get === 'function'
            ? request.headers.get('x-vercel-cron-secret')
            : request.headers['x-vercel-cron-secret'];

        // It's critical that the VERCEL_CRON_SECRET is available.
        // Vercel automatically injects this for projects with cron jobs.
        if (!vercelCronSecret) {
            console.error('CRITICAL: VERCEL_CRON_SECRET environment variable not found.');
            // This might indicate a misconfiguration or local testing without the secret.
            return response.status(500).json({ error: 'Server configuration error for cron jobs.' });
        }

        // The request must have the x-vercel-cron-secret header and it must match.
        if (secretFromHeader !== vercelCronSecret) {
            console.warn('Unauthorized attempt to run scheduler: Invalid or missing x-vercel-cron-secret header.');
            return response.status(401).json({ error: 'Unauthorized' });
        }

        return handleRunScheduler(request, response);
    }

    // User actions endpoint (POST) - uses JWT cookie auth
    if (request.method === 'POST') {
        // We wrap the user actions handler with withAuth to protect it
        return withAuth(userActionsHandler)(request, response);
    }

    // If the method is not GET or POST, it's not allowed.
    response.setHeader('Allow', ['GET', 'POST']);
    return response.status(405).end('Method Not Allowed');
};

export default mainHandler;
