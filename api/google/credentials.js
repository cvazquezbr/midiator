
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import fetch from 'node-fetch';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const handleTokenRefresh = async (req, res) => {
    try {
        const userId = req.user.sub;
        const { rows } = await query('SELECT google_access_token, google_refresh_token FROM users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (!user.google_refresh_token) {
            return res.status(403).json({ error: 'Google integration not authorized. No refresh token found.' });
        }

        client.setCredentials({
            refresh_token: user.google_refresh_token,
        });

        const { token: newAccessToken } = await client.getAccessToken();

        if (!newAccessToken) {
            throw new Error('Failed to refresh access token from Google.');
        }

        if (newAccessToken !== user.google_access_token) {
            await query('UPDATE users SET google_access_token = $1 WHERE id = $2', [newAccessToken, userId]);
        }

        res.status(200).json({ accessToken: newAccessToken });

    } catch (error) {
        console.error('Failed to get Google access token:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
            return res.status(403).json({ error: 'Google authorization has been revoked. Please log in again.' });
        }
        res.status(500).json({ error: 'Failed to retrieve Google access token.' });
    }
};

const handleImageGeneration = async (req, res) => {
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
            const headers = {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiApiKey,
            };
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
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
};


const handler = async (req, res) => {
  if (req.method === 'POST') {
      const { action } = req.body;
      if (action === 'generateImage') {
          return handleImageGeneration(req, res);
      }
  }

  if (req.method === 'GET') {
      return handleTokenRefresh(req, res);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
