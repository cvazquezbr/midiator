import { GoogleAuth } from 'google-auth-library';
import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { prompt, model } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing required parameter: prompt' });
  }

  try {
    const userId = req.user.sub;
    const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

    if (rows.length === 0 || !rows[0].settings_data) {
      return res.status(403).json({ error: 'Settings not found for user.' });
    }

    const settings = rows[0].settings_data;
    const serviceAccount = settings.gemini_service_account;
    const geminiProjectId = settings.gemini_project_id;
    const geminiRegion = settings.gemini_region || 'us-central1';
    const geminiImageModel = model || settings.gemini_image_model || 'imagen-3.0-generate-002';

    if (!serviceAccount || !geminiProjectId) {
      return res.status(500).json({ error: 'A Conta de Serviço e o ID do Projeto Google Cloud devem ser configurados.' });
    }

    const cleanModel = geminiImageModel.replace(/^models\//, '').trim();
    if (!cleanModel) {
      return res.status(400).json({ error: 'Nome do modelo de imagem inválido.' });
    }

    // Authenticate using the service account
    const auth = new GoogleAuth({
      credentials: JSON.parse(serviceAccount),
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    const apiUrl = `https://${geminiRegion}-aiplatform.googleapis.com/v1/projects/${geminiProjectId}/locations/${geminiRegion}/publishers/google/models/${cleanModel}:predict`;

    const requestBody = JSON.stringify({
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1
      }
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro da API Vertex AI (imagem) - Status: ${response.status}`, errorText);
      let errorDetail = 'Nenhum detalhe de erro retornado pela API.';
      if (errorText) {
          try {
              const errorJson = JSON.parse(errorText);
              errorDetail = errorJson.error?.message || errorText;
          } catch (e) {
              errorDetail = errorText;
          }
      }
      return res.status(response.status).json({ error: `Falha na comunicação com a API de imagem Vertex AI: ${errorDetail}` });
    }

    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

    if (base64Image) {
      return res.status(200).json({ base64Image });
    } else {
      console.error("Resposta inesperada da API Vertex AI (imagem), sem imagem:", data);
      return res.status(500).json({ error: 'Nenhuma imagem foi retornada pela API.' });
    }

  } catch (error) {
    console.error('Error calling Gemini API proxy:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}

export default withAuth(handler);
