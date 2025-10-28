import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Missing required parameters: text and targetLanguage' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is not set' });
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;

  try {
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
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
