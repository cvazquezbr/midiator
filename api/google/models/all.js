import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [req.user.sub]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found for user' });
    }

    let geminiApiKey = req.headers['x-gemini-api-key'] || req.headers.get?.('x-gemini-api-key');
    if (!geminiApiKey) {
      geminiApiKey = dbResult.rows[0]?.settings_data?.gemini_api_key;
    }

    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API Error:', errorText);
        return res.status(geminiResponse.status).json({ error: 'Failed to fetch models from Gemini API', details: errorText });
    }

    const geminiData = await geminiResponse.json();

    const allModels = geminiData.models
      .map(model => {
        const modelName = model.name.split('/').pop();
        // Determine the primary generation method to construct a useful endpoint URL
        let generationMethod = 'generateContent'; // Default
        if (model.supportedGenerationMethods.includes('generateImage')) {
            generationMethod = 'generateImage';
        } else if (model.supportedGenerationMethods.includes('generateText')) {
            generationMethod = 'generateText';
        }

        return {
          name: model.name,
          displayName: model.displayName,
          supportedGenerationMethods: model.supportedGenerationMethods,
          endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${generationMethod}`
        };
      });

    res.status(200).json({ models: allModels });

  } catch (error) {
    console.error('Error in Gemini models proxy:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export default withAuth(handler);
