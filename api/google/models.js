// api/google/models.js
import fetch from 'node-fetch';
import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const userId = req.user.sub;
    const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

    if (rows.length === 0 || !rows[0].settings_data) {
        return res.status(403).json({ error: 'Settings not found for user.' });
    }

    const settings = rows[0].settings_data;
    const geminiApiKey = settings.gemini_api_key;

    if (!geminiApiKey) {
      return res.status(500).json({ error: 'The AI service is not configured correctly. Please contact the administrator.' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models`;

    const response = await fetch(geminiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const errorMessage = errorBody.error?.message || `Erro ${response.status}`;
      console.error('Gemini API request failed:', errorBody);
      return res.status(response.status).json({ error: `Gemini API request failed: ${errorMessage}` });
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Error calling Gemini API proxy:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}

export default withAuth(handler);
