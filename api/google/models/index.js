import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        // Note: Standard Response objects are used here as this might not be run in a Node.js context compatible with `res.status()`
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const userId = req.user.sub;
        const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

        if (rows.length === 0 || !rows[0].settings_data || !rows[0].settings_data.gemini_api_key) {
            return new Response(JSON.stringify({ error: 'API key is not configured' }), {
                status: 400, // 400 Bad Request is more appropriate here than 500
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const apiKey = rows[0].settings_data.gemini_api_key;
        const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

        const fetchResponse = await fetch(GOOGLE_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
        });

        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error('Google API error response:', errorText);
            return new Response(JSON.stringify({
                error: 'Failed to fetch models from Google API',
                details: errorText
            }), {
                status: fetchResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Return a new streaming response
        return new Response(fetchResponse.body, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate',
            },
        });

    } catch (error) {
        console.error('Error fetching from Google API:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Wrap the handler with the authentication middleware
export default withAuth(handler);
