import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { google } from 'googleapis';
import { Readable, PassThrough } from 'stream';
import { GoogleAuth } from 'google-auth-library';

async function getGoogleAuthClient(userId) {
    const { rows } = await query('SELECT google_access_token, google_refresh_token FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
        throw new Error('Usuário não encontrado ou não conectado ao Google.');
    }

    const { google_access_token, google_refresh_token } = rows[0];
    if (!google_access_token || !google_refresh_token) {
        throw new Error('Credenciais do Google incompletas.');
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: google_access_token,
        refresh_token: google_refresh_token,
    });

    return oauth2Client;
}


async function handleUploadImageToFolder(request, response) {
    const { imageBase64, fileName, folderId, imageType } = request.body.payload;
    if (!imageBase64 || !fileName || !folderId || !imageType) {
        return response.status(400).json({ message: 'Dados insuficientes para o upload.' });
    }

    try {
        const userId = request.user.sub;
        const auth = await getGoogleAuthClient(userId);
        const drive = google.drive({ version: 'v3', auth });

        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const stream = new PassThrough();
        stream.end(imageBuffer);

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };
        const media = {
            mimeType: imageType,
            body: stream,
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name',
        });

        return response.status(200).json(file.data);

    } catch (error) {
        console.error('Erro ao fazer upload para o Google Drive:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido no servidor.';
        return response.status(500).json({ message: `Falha no upload para o Google Drive: ${errorMessage}` });
    }
}

async function handleGenerateImageGemini(request, response) {
    try {
        const { prompt, model } = request.body.payload;

        if (!prompt || !model) {
            return response.status(400).json({ error: 'Missing required parameters: prompt and model' });
        }

        const dbResult = await query('SELECT settings_data FROM settings WHERE user_id = $1', [request.user.sub]);

        if (dbResult.rows.length === 0) {
            return response.status(404).json({ error: 'Settings not found for user' });
        }

        const geminiApiKey = dbResult.rows[0]?.settings_data?.gemini_api_key;
        if (!geminiApiKey) {
            return response.status(400).json({ error: 'Gemini API key not configured' });
        }

        const cleanModel = model.replace('models/', '');
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${geminiApiKey}`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt }
                ]
            }],
        };

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
            const errorDetails = {
                status: geminiResponse.status,
                statusText: geminiResponse.statusText,
                headers: Object.fromEntries(geminiResponse.headers.entries()),
                body: await geminiResponse.text()
            };
            console.error('Gemini API Error:', JSON.stringify(errorDetails, null, 2));
            return response.status(geminiResponse.status).json({ error: 'Failed to fetch from Gemini API', details: errorDetails.body });
        }

        const geminiData = await geminiResponse.json();
        const base64Image = geminiData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Image) {
            return response.status(200).json({ base64Image });
        } else {
            console.error("Unexpected Gemini API response, no image data:", geminiData);
            return response.status(500).json({ error: 'No image data was returned by the API.' });
        }

    } catch (error) {
        console.error('Error in Gemini image proxy:', error);
        response.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

async function handleGenerateImageVertex(request, response) {
    try {
        const { prompt, model } = request.body.payload;

        if (!prompt) {
            return response.status(400).json({ error: 'Missing required parameter: prompt' });
        }

        const userId = request.user.sub;
        const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);

        if (rows.length === 0 || !rows[0].settings_data) {
            return response.status(403).json({ error: 'Settings not found for user.' });
        }

        const settings = rows[0].settings_data;
        const serviceAccount = settings.gemini_service_account;
        const geminiProjectId = settings.gemini_project_id;
        const geminiRegion = settings.gemini_region || 'us-central1';
        const geminiImageModel = model || settings.gemini_image_model || 'imagen-3.0-generate-002';

        if (!serviceAccount || !geminiProjectId) {
            return response.status(500).json({ error: 'A Conta de Serviço e o ID do Projeto Google Cloud devem ser configurados.' });
        }

        const cleanModel = geminiImageModel.replace(/^models\//, '').trim();
        if (!cleanModel) {
            return response.status(400).json({ error: 'Nome do modelo de imagem inválido.' });
        }

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

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: requestBody,
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`Erro da API Vertex AI (imagem) - Status: ${apiResponse.status}`, errorText);
            let errorDetail = 'Nenhum detalhe de erro retornado pela API.';
            if (errorText) {
                try {
                    const errorJson = JSON.parse(errorText);
                    errorDetail = errorJson.error?.message || errorText;
                } catch (e) {
                    errorDetail = errorText;
                }
            }
            return response.status(apiResponse.status).json({ error: `Falha na comunicação com a API de imagem Vertex AI: ${errorDetail}` });
        }

        const data = await apiResponse.json();
        const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

        if (base64Image) {
            return response.status(200).json({ base64Image });
        } else {
            console.error("Resposta inesperada da API Vertex AI (imagem), sem imagem:", data);
            return response.status(500).json({ error: 'Nenhuma imagem foi retornada pela API.' });
        }

    } catch (error) {
        console.error('Error calling Vertex AI API proxy:', error);
        response.status(500).json({ error: 'An unexpected error occurred' });
    }
}

const mainHandler = async (request, response) => {
    const { action } = request.body;

    switch (action) {
        case 'uploadImageToFolder':
            return handleUploadImageToFolder(request, response);
        case 'listFolders':
            return handleListFolders(request, response);
        case 'createFolder':
            return handleCreateFolder(request, response);
        case 'generateImageGemini':
            return handleGenerateImageGemini(request, response);
        case 'generateImageVertex':
            return handleGenerateImageVertex(request, response);
        default:
            return response.status(400).json({ message: `Ação inválida: ${action}` });
    }
};

async function handleListFolders(request, response) {
    try {
        const userId = request.user.sub;
        const auth = await getGoogleAuthClient(userId);
        const drive = google.drive({ version: 'v3', auth });

        const res = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false",
            fields: 'files(id, name, parents)',
            spaces: 'drive',
            orderBy: 'name',
        });

        return response.status(200).json(res.data.files || []);
    } catch (error) {
        console.error('Erro ao listar pastas do Google Drive:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido no servidor.';
        return response.status(500).json({ message: `Falha ao listar pastas: ${errorMessage}` });
    }
}

async function handleCreateFolder(request, response) {
    const { name, parentId } = request.body.payload;
    if (!name) {
        return response.status(400).json({ message: 'O nome da pasta é obrigatório.' });
    }

    try {
        const userId = request.user.sub;
        const auth = await getGoogleAuthClient(userId);
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
        };
        if (parentId) {
            fileMetadata.parents = [parentId];
        }

        const file = await drive.files.create({
            resource: fileMetadata,
            fields: 'id, name',
        });

        return response.status(200).json(file.data);
    } catch (error) {
        console.error('Erro ao criar pasta no Google Drive:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido no servidor.';
        return response.status(500).json({ message: `Falha ao criar pasta: ${errorMessage}` });
    }
}

export default withAuth(mainHandler);
