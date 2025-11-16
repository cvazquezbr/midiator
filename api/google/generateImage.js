import fetch from 'node-fetch';
import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing required parameter: prompt' });
  }

  try {
    const userId = req.user.sub;

    const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

    if (rows.length === 0 || !rows[0].settings_data) {
      return res.status(403).json({ error: 'Settings not found for user.' });
    }

    const settings = rows[0].settings_data;
    const geminiApiKey = settings.gemini_api_key;
    const geminiImageModel = settings.gemini_image_model;

    if (!geminiApiKey || !geminiImageModel) {
      return res.status(500).json({ error: 'Gemini image generation is not configured. Please select an image model in the settings.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiImageModel}:generateContent`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => response.text());
      console.error('Gemini API request failed:', errorBody);
      const errorMessage = errorBody?.error?.message || JSON.stringify(errorBody);
      return res.status(response.status).json({ error: `Gemini API request failed: ${errorMessage}` });
    }

    const data = await response.json();

    if (data.promptFeedback && data.promptFeedback.blockReason) {
        return res.status(400).json({ error: `Image generation was blocked for safety reasons: ${data.promptFeedback.blockReason}`});
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart) {
        res.status(200).json({ base64Image: imagePart.inlineData.data });
    } else {
        console.error('Unexpected response format from Gemini Image API:', data);
        res.status(500).json({ error: 'No image was returned from the API.' });
    }

  } catch (error) {
    console.error('Error calling Gemini API proxy:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}

export default withAuth(handler);
