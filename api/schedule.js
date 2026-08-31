import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { parseBody } from './utils.js';
import { sendPublicationNotification } from './email-utils.js';

// Helper function to create a schedule
async function handleCreateSchedule(request, response) {
    try {
        const {
            campaign_id,
            parent_id,
            scheduled_at,
            content,
            authorUrn,
            status = 'scheduled', // Default to 'scheduled'
            linkedin_post_url = null,
            notification_email = null
        } = request.body.payload;

        if (!scheduled_at || !content || !authorUrn) {
            return response.status(400).json({ error: 'Missing required fields for scheduling.' });
        }

        const userId = request.user.sub;
        const executionDate = new Date(scheduled_at);

        // Extract post ID from URL. The ID is the URN.
        const match = linkedin_post_url ? linkedin_post_url.match(/(urn:li:(?:share|ugcPost):\d+)/) : null;
        const linkedin_post_id = match ? match[0] : null;

        // Robustly handle content to prevent double-stringifying
        const contentObject = typeof content === 'string' ? JSON.parse(content) : content;

        const { rows } = await query(
            `INSERT INTO linkedin_schedules (user_id, campaign_id, parent_id, scheduled_at, user_selected_time, post_content, status, linkedin_post_url, linkedin_post_id, notification_email)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                userId,
                campaign_id || null,
                parent_id || null,
                executionDate.toISOString(),
                scheduled_at,
                JSON.stringify({ ...contentObject, authorUrn }),
                status,
                linkedin_post_url,
                linkedin_post_id,
                notification_email
            ]
        );

        const newSchedule = rows[0];

        // If immediately published, send notification if email is provided
        if (status === 'published' && notification_email && linkedin_post_url) {
            try {
                let campaignTitle = contentObject.titulo || 'Publicação no LinkedIn';

                // Try to get campaign name if campaign_id is provided
                if (campaign_id) {
                    const { rows: campRows } = await query('SELECT name FROM campaigns WHERE id = $1', [campaign_id]);
                    if (campRows.length > 0) {
                        campaignTitle = campRows[0].name;
                    }
                }

                const postText = contentObject.fullText || contentObject.conteudo || '';

                await sendPublicationNotification({
                    to: notification_email,
                    campaignTitle,
                    postUrl: linkedin_post_url,
                    postContent: postText
                });
            } catch (emailErr) {
                console.error('[Schedule API] Failed to send immediate notification:', emailErr);
                // We don't fail the request if only the email fails
            }
        }

        return response.status(201).json(newSchedule);
    } catch (error) {
        console.error('Error creating schedule:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper function to get schedules for a user
async function handleGetSchedules(request, response) {
    try {
        const userId = request.user.sub;
        // Optimization: Do NOT load the heavy c.campaign_data for listing schedules.
        // Post images and thumbnails are already stored in ls.post_content -> images/video.
        const { rows } = await query(
            `SELECT
                ls.id,
                ls.user_id,
                ls.campaign_id,
                ls.parent_id,
                ls.scheduled_at,
                ls.user_selected_time,
                ls.post_content,
                ls.status,
                ls.error_message,
                ls.linkedin_post_url,
                ls.linkedin_post_id,
                ls.notification_email,
                ls.created_at,
                ps.linkedin_post_url AS parent_post_url
             FROM linkedin_schedules ls
             LEFT JOIN linkedin_schedules ps ON ls.parent_id = ps.id
             WHERE ls.user_id = $1
             ORDER BY ls.scheduled_at DESC`,
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

// This endpoint only handles user-facing actions now, which are all POST requests.
const mainHandler = async (request, response) => {
    const body = await parseBody(request);
    request.body = body;

    if (request.method === 'POST') {
        // We wrap the user actions handler with withAuth to protect it
        return withAuth(userActionsHandler)(request, response);
    }

    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
};

export default mainHandler;
