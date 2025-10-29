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

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey, // Enviar a chave da API no cabeçalho
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate the following text to ${targetLanguage}, preserving markdown formatting: "${text}"`
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

    const translatedText = data.candidates[0].content.parts[0].text;
    res.status(200).json({ translatedText });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}

// Envolver o handler com o middleware de autenticação
export default withAuth(handler);
