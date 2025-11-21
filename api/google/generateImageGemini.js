import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, model } = req.body;

    if (!prompt || !model) {
      return res.status(400).json({ error: 'Missing required parameters: prompt and model' });
    }

    const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [req.user.sub]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found for user' });
    }

    const geminiApiKey = dbResult.rows[0]?.settings_data?.gemini_api_key;
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    const cleanModel = model.replace('models/', '');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${cleanModel}:generateImage?key=${geminiApiKey}`;

    const requestBody = {
      prompt: {
        text: prompt
      }
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API Error:', errorText);
        return res.status(geminiResponse.status).json({ error: 'Failed to fetch from Gemini API', details: errorText });
    }

    const geminiData = await geminiResponse.json();
    const base64Image = geminiData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Image) {
      return res.status(200).json({ base64Image });
    } else {
      console.error("Unexpected Gemini API response, no image data:", geminiData);
      return res.status(500).json({ error: 'No image data was returned by the API.' });
    }

  } catch (error) {
    console.error('Error in Gemini image proxy:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export default withAuth(handler);
