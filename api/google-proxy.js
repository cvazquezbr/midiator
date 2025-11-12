import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { google } from 'googleapis';
import { Readable, PassThrough } from 'stream';

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

    // O cliente OAuth2 lida com o refresh do token automaticamente se estiver expirado
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


const mainHandler = async (request, response) => {
    const { action } = request.body;

    switch (action) {
        case 'uploadImageToFolder':
            return handleUploadImageToFolder(request, response);
        case 'listFolders':
            return handleListFolders(request, response);
        case 'createFolder':
            return handleCreateFolder(request, response);
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
