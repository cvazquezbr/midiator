import fetch from 'node-fetch';
import { withAuth } from './middleware/auth.js';
import { query } from './db.js';

async function handler(req, res) {
  // O middleware withAuth já lidou com a autenticação.
  // req.user está disponível.

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Vercel serverless functions parse the body automatically
  // no need for manual parsing.
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Missing required parameters: text and targetLanguage' });
  }

  try {
    const userId = req.user.sub;

    // Buscar configurações do usuário no banco de dados
    const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

    if (rows.length === 0 || !rows[0].settings_data) {
        return res.status(403).json({ error: 'Settings not found for user.' });
    }

    const settings = rows[0].settings_data;
    const geminiApiKey = settings.gemini_api_key;
    const geminiModel = settings.gemini_model || 'gemini-1.0-pro'; // Usar um modelo padrão se não estiver definido

    if (!geminiApiKey) {
      return res.status(500).json({ error: 'O serviço de tradução não está configurado corretamente. Por favor, contate o administrador.' });
    }

    // URL da API Gemini atualizada
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent`;

    // Handle both string and array of strings
    const isArray = Array.isArray(text);
    let prompt;

    if (isArray) {
      const jsonText = JSON.stringify(text);
      prompt = `Translate each string in the following JSON array to ${targetLanguage}. Return ONLY a valid JSON array string with the translated strings in the same order. Do not include any other text or formatting. Input: ${jsonText}`;
    } else {
      prompt = `Translate the following text to ${targetLanguage}, preserving markdown formatting: "${text}"`;
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey, // Enviar a chave da API no cabeçalho
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => response.text());
      console.error('Gemini API request failed:', errorBody);
      // Retornar a mensagem de erro da API Gemini se disponível
      const errorMessage = errorBody?.error?.message || JSON.stringify(errorBody);
      return res.status(response.status).json({ error: `Gemini API request failed: ${errorMessage}` });
    }

    const data = await response.json();

    // Adicionar verificação para o caso de a resposta não conter os dados esperados
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('Invalid response structure from Gemini API:', data);
        return res.status(500).json({ error: 'Invalid response structure from translation service.' });
    }

    let translatedText = data.candidates[0].content.parts[0].text;

    if (isArray) {
      try {
        // The response should be a string that is a valid JSON array.
        translatedText = JSON.parse(translatedText);
      } catch (e) {
        console.error('Failed to parse translated array from Gemini:', translatedText);
        // Fallback or error handling: maybe try to clean the string
        const cleanedText = translatedText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
        try {
          translatedText = JSON.parse(cleanedText);
        } catch (e2) {
           console.error('Failed to parse cleaned translated array from Gemini:', cleanedText);
           return res.status(500).json({ error: 'Translation service returned an invalid array format.' });
        }
      }
    }

    res.status(200).json({ translatedText });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}

// Envolver o handler com o middleware de autenticação
export default withAuth(handler);
