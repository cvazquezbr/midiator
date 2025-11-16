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

        const TEXT_API_URL = 'https://generativelanguage.googleapis.com/v1/models?filter=supported_generation_methods:generateContent';
        const IMAGE_API_URL = 'https://generativelanguage.googleapis.com/v1/models?filter=supported_generation_methods:generateImages';

        const fetchOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
        };

        // Make the two API calls in parallel
        const [textResponse, imageResponse] = await Promise.all([
            fetch(TEXT_API_URL, fetchOptions),
            fetch(IMAGE_API_URL, fetchOptions)
        ]);

        // Handle potential errors for each response
        if (!textResponse.ok) {
            const errorText = await textResponse.text();
            console.error('Google API error (text models):', errorText);
            // Decide if you want to fail the whole request or just proceed with partial data
        }
        if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            console.error('Google API error (image models):', errorText);
            // Decide if you want to fail the whole request or just proceed with partial data
        }

        const textData = textResponse.ok ? await textResponse.json() : { models: [] };
        const imageData = imageResponse.ok ? await imageResponse.json() : { models: [] };

        // Combine the models from both responses
        const allModels = [...(textData.models || []), ...(imageData.models || [])];

        // Remove duplicates based on the model name to ensure a unique list
        const uniqueModels = Array.from(new Map(allModels.map(model => [model.name, model])).values());

        // Send the combined and deduplicated list to the frontend
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).json({ models: uniqueModels });
    } catch (error) {
        console.error('Error fetching from Google API:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

export default withAuth(handler);
