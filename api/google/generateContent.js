import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

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
        // Return empty object if body is not valid JSON
        resolve({});
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

    if (!contents || !model) {
      return res.status(400).json({ error: 'Missing required parameters: contents and model' });
    }

    const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [req.user.sub]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found for user' });
    }

    const geminiApiKey = dbResult.rows[0]?.settings_data?.gemini_api_key;
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    // START: Model compatibility validation
    const cleanModel = model.replace('models/', '');
    const modelInfoUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}?key=${geminiApiKey}`;

    const modelInfoResponse = await fetch(modelInfoUrl);
    if (!modelInfoResponse.ok) {
        const errorText = await modelInfoResponse.text();
        console.error('Failed to fetch model info for validation:', errorText);
        return res.status(modelInfoResponse.status).json({ error: 'Failed to fetch model information for validation', details: errorText });
    }

    const modelData = await modelInfoResponse.json();
    const supportedMethods = modelData.supportedGenerationMethods || [];

    if (!supportedMethods.includes('generateContent')) {
      return res.status(400).json({
        error: 'Model does not support generateContent',
        model: cleanModel,
        supportedMethods: supportedMethods
      });
    }
    // END: Model compatibility validation

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'x-goog-api-key': geminiApiKey, // Removed as per report
      },
      body: JSON.stringify({ contents }),
    });

    if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API Error:', errorText);
        return res.status(geminiResponse.status).json({ error: 'Failed to fetch from Gemini API', details: errorText });
    }

    const geminiData = await geminiResponse.json();
    res.status(200).json(geminiData);

  } catch (error) {
    console.error('Error in Gemini proxy:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export default withAuth(handler);
