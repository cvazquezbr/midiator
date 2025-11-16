import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

// Note: This is now a standard Node.js serverless function, not an edge function.
// The 'res' object is the standard response object from Express/Connect.
async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const userId = req.user.sub;
        const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

        if (rows.length === 0 || !rows[0].settings_data || !rows[0].settings_data.gemini_api_key) {
            return res.status(400).json({ error: 'API key is not configured' });
        }

        const apiKey = rows[0].settings_data.gemini_api_key;
        const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1/models';

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
            return res.status(fetchResponse.status).json({
                error: 'Failed to fetch models from Google API',
                details: errorText
            });
        }

        // Stream the response body from the Google API to the client
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        // fetchResponse.body is a ReadableStream, pipe it to the response
        fetchResponse.body.pipe(res);

    } catch (error) {
        console.error('Error fetching from Google API:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

export default withAuth(handler);
