import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

const parseBody = async (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { contents, model } = await parseBody(req);

    // Fetch the Gemini API key from the database
    const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [req.user.sub]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found for user' });
    }

    const geminiApiKey = dbResult.rows[0].settings_data?.gemini_api_key;
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({ contents }),
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
        console.error('Gemini API Error:', geminiData);
        return res.status(geminiResponse.status).json({ error: 'Failed to fetch from Gemini API', details: geminiData });
    }

    res.status(200).json(geminiData);
  } catch (error) {
    console.error('Error in Gemini proxy:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export default withAuth(handler);
