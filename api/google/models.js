import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Fetch the Gemini API key from the database
    const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [req.user.sub]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found for user' });
    }

    const geminiApiKey = dbResult.rows[0].settings_data?.gemini_api_key;
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
        console.error('Gemini API Error:', geminiData);
        return res.status(geminiResponse.status).json({ error: 'Failed to fetch models from Gemini API', details: geminiData });
    }

    // Filter for models that support 'generateContent'
    const filteredModels = geminiData.models.filter(model =>
        model.supportedGenerationMethods.includes('generateContent')
    );

    res.status(200).json({ models: filteredModels });

  } catch (error) {
    console.error('Error in Gemini models proxy:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export default withAuth(handler);
