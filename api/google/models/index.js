import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

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

        const V1_API_URL = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        const V1BETA_API_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const fetchOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        };

        const results = await Promise.allSettled([
            fetch(V1_API_URL, fetchOptions),
            fetch(V1BETA_API_URL, fetchOptions)
        ]);

        let allModels = [];
        let firstError = null;

        for (const result of results) {
            if (result.status === 'fulfilled') {
                const response = result.value;
                if (response.ok) {
                    try {
                        const data = await response.json();
                        if (data.models) {
                            allModels.push(...data.models);
                        }
                    } catch (jsonError) {
                        console.error('Failed to parse JSON from Google API response:', jsonError);
                        if (!firstError) firstError = 'Failed to parse API response.';
                    }
                } else {
                    const errorText = await response.text();
                    console.error(`Google API error: Status ${response.status}`, errorText);
                    if (!firstError) firstError = `Google API returned status ${response.status}.`;
                }
            } else {
                console.error('Failed to fetch from Google API:', result.reason);
                if (!firstError) firstError = 'Failed to connect to Google API.';
            }
        }

        if (allModels.length === 0 && firstError) {
             return res.status(500).json({ error: 'Failed to fetch any models from Google API', details: firstError });
        }

        const uniqueModels = Array.from(new Map(allModels.map(model => [model.name, model])).values());

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).json({ models: uniqueModels });

    } catch (error) {
        console.error('Error fetching from Google API:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

export default withAuth(handler);
