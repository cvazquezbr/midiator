import { handleUpload } from '@vercel/blob/client';
import { withAuth } from './middleware/auth.js';

// Helper to parse the body for Vercel Serverless Functions
async function parseJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = await parseJson(req);

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        if (!req.user || !req.user.sub) {
          throw new Error('Authentication is required to upload files.');
        }

        // The pathname will be the one sent from the client.
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'video/webm', 'audio/webm', 'audio/wav'],
          tokenPayload: JSON.stringify({
            userId: req.user.sub, // Associate the upload with the user from the withAuth middleware
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This is where you can add custom logic after an upload is complete.
        // For example, you can save the blob's URL to your database.
        // Here, we're just logging it.
        console.log('Blob upload completed for user', JSON.parse(tokenPayload).userId);
        console.log('Blob details:', blob);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Error in Vercel Blob upload handler:', error);
    // Return a 500 error for server-side issues
    return res.status(500).json({
      error: 'Ocorreu um erro interno no servidor durante o upload.',
      details: error.message,
      suggestion: 'Verifique se o armazenamento de Blob (Vercel Blob, S3, etc.) está corretamente configurado e conectado ao projeto Vercel.'
    });
  }
};

export default withAuth(handler);
