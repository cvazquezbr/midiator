import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

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
        // Simplifica a expressão OR para evitar a repetição do campo
        const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1/models?filter=supported_generation_methods:generateContent%20OR%20generateImages';

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

        // Buffer the response body before sending it to the client
        const modelsData = await fetchResponse.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).json(modelsData);
    } catch (error) {
        console.error('Error fetching from Google API:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

export default withAuth(handler);
