import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

const parseBody = async (req) => {
  let body = '';
  for await (const chunk of req) {
    body += new TextDecoder().decode(chunk);
  }
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const userId = req.user.sub;

    // 1. Get the user's Gemini API key from the database
    const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);
    if (rows.length === 0 || !rows[0].settings_data || !rows[0].settings_data.gemini_api_key) {
      return res.status(403).json({ error: 'Gemini API key not configured on the server.' });
    }
    const geminiApiKey = rows[0].settings_data.gemini_api_key;

    // 2. Get the prompt and model from the client's request body
    const { prompt, model } = await parseBody(req);
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const targetModel = model || GEMINI_MODEL;

    // 3. Make the API call to the actual Gemini API
    const apiUrl = `${GEMINI_API_BASE_URL}/${targetModel}:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    // 4. Proxy the response (or error) back to the client
    const responseData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Error from Gemini API:', responseData);
      return res.status(geminiResponse.status).json({
        error: `Gemini API Error: ${responseData.error?.message || 'Unknown error'}`,
      });
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in Gemini proxy handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default withAuth(handler);
