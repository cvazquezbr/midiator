import fetch from 'node-fetch';
import { withAuth } from './middleware/auth.js';
import { query } from './db.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Missing required parameters: text and targetLanguage' });
  }

  try {
    // Buscar a chave da API do Gemini do banco de dados
    const settingsResult = await query('SELECT value FROM settings WHERE key = $1', ['gemini_api_key']);
    const geminiApiKey = settingsResult.rows[0]?.value;

    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Server configuration error: Gemini API key is not configured in the database.' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate the following text to ${targetLanguage}: "${text}"`
          }]
        }]
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API request failed:', errorBody);
      return res.status(response.status).json({ error: `Gemini API request failed: ${errorBody}` });
    }

    const data = await response.json();
    const translatedText = data.candidates[0].content.parts[0].text;
    res.status(200).json({ translatedText });
  } catch (error) {
    console.error('Error during translation process:', error);
    res.status(500).json({ error: 'An unexpected error occurred during the translation process.' });
  }
}

export default withAuth(handler);
