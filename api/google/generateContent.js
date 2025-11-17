import fetch from 'node-fetch';
import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { promptString } = req.body;

  if (!promptString) {
    return res.status(400).json({ error: 'Missing required parameter: promptString' });
  }

  try {
    const userId = req.user.sub;
    const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

    if (rows.length === 0 || !rows[0].settings_data) {
        return res.status(403).json({ error: 'Settings not found for user.' });
    }

    const settings = rows[0].settings_data;
    const geminiApiKey = settings.gemini_api_key;
    const geminiModel = settings.gemini_model || 'gemini-1.0-pro';

    if (!geminiApiKey) {
      return res.status(500).json({ error: 'The AI service is not configured correctly. Please contact the administrator.' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

    let response;
    let lastErrorBody;
    const maxRetries = 4;

    for (let i = 0; i < maxRetries; i++) {
      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptString
            }]
          }]
        }),
      });

      if (response.status !== 429) {
        break;
      }

      // Safely consume the body to prevent "body used already" errors.
      const errorText = await response.text();
      try {
        lastErrorBody = JSON.parse(errorText);
      } catch (e) {
        lastErrorBody = { error: { message: errorText } };
      }

      const delay = Math.pow(2, i) * 1000;
      console.log(`Gemini API rate limit exceeded. Retrying in ${delay}ms...`);
      await sleep(delay);
    }

    if (response.ok) {
      // Success path: The loop broke with a successful response.
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse successful Gemini API response as JSON:', responseText);
        return res.status(500).json({ error: 'Invalid response structure from the AI service.' });
      }

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('Invalid response structure from Gemini API:', data);
        return res.status(500).json({ error: 'Invalid response structure from the AI service.' });
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      res.status(200).json({ generatedText });
    } else {
      // Error path: The final response was not ok.
      let errorBody;

      if (response.status === 429) {
        // All retries were exhausted with 429 errors. The body was already read.
        errorBody = lastErrorBody;
      } else {
        // A non-429 error occurred. The body has not been read yet.
        const errorText = await response.text();
        try {
          errorBody = JSON.parse(errorText);
        } catch (e) {
          errorBody = { error: { message: errorText } };
        }
      }
      console.error('Gemini API request failed:', errorBody);
      const errorMessage = errorBody?.error?.message || JSON.stringify(errorBody);
      return res.status(response.status).json({ error: `Gemini API request failed: ${errorMessage}` });
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}

export default withAuth(handler);
