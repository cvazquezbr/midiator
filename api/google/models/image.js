import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [req.user.sub]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found for user' });
    }

    const geminiApiKey = dbResult.rows[0]?.settings_data?.gemini_api_key;
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    const supportedModels = [
      {
        name: 'models/imagen-3.0-generate-002',
        displayName: 'imagen-3.0-generate-002',
        description: 'O modelo de geração de imagem mais avançado do Google.',
        supportedGenerationMethods: ['generateImages'],
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages'
      }
    ];
    res.status(200).json({ models: supportedModels });

  } catch (error) {
    console.error('Error in Gemini models proxy:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export default withAuth(handler);
