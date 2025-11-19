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
    const geminiApiKey = settings.gemini_api_key;
    const geminiImageModel = model || settings.gemini_image_model;

    if (!geminiApiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured.' });
    }
    if (!geminiImageModel) {
      return res.status(400).json({ error: 'No image model specified' });
    }

    const cleanModel = geminiImageModel.replace(/^models\//, '').trim();
    if (!cleanModel) {
      return res.status(400).json({ error: 'Invalid image model name' });
    }

    // Conditional logic for Imagen 3.0 model
    if (cleanModel.includes('imagen-3.0-generate-002')) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateImages`;
      const requestBody = JSON.stringify({
        prompt: prompt,
        config: {
          number_of_images: 1,
          output_mime_type: "image/png",
          aspect_ratio: "1:1"
        }
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = 'Nenhum detalhe de erro retornado pela API.';
        if (errorText) {
            try {
                const errorJson = JSON.parse(errorText);
                errorDetail = errorJson.error?.message || errorText;
            } catch (e) {
                errorDetail = errorText;
            }
        }
        return res.status(response.status).json({ error: `Falha na comunicação com a API de imagem Gemini: ${errorDetail}` });
      }

      const data = await response.json();
      const base64Image = data.generated_images?.[0]?.image?.image_bytes;

      if (base64Image) {
        return res.status(200).json({ base64Image });
      } else {
        return res.status(500).json({ error: 'Nenhuma imagem foi retornada pela API.' });
      }

    } else {
      // Existing logic for other models
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${cleanModel}:generateContent?key=${geminiApiKey}`;
      const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Falha na comunicação com a API Gemini: ${errorText}` });
      }

      const data = await response.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

      if (imagePart) {
        return res.status(200).json({ base64Image: imagePart.inlineData.data });
      } else {
        return res.status(500).json({ error: 'Nenhuma imagem foi retornada pela API.' });
      }
    }

  } catch (error) {
    console.error('Error calling Gemini API proxy:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}

export default withAuth(handler);
