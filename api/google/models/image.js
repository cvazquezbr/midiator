import { withAuth } from '../../middleware/auth.js';
import { query } from '../../db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Basic auth check to ensure a user context exists
    const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [req.user.sub]);
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found for user' });
    }

    const supportedModels = [
      {
        name: 'models/imagen-3.0-generate-002',
        displayName: 'imagen-3.0-generate-002',
        description: 'O modelo de geração de imagem mais avançado do Google.',
        supportedGenerationMethods: ['generateImages'],
      }
    ];
    res.status(200).json({ models: supportedModels });

  } catch (error) {
    console.error('Error in Gemini models proxy:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export default withAuth(handler);
