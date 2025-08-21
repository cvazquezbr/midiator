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
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!req.user || !req.user.sub) {
          throw new Error('Authentication is required to upload files.');
        }

        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const { campaignId } = payload;

        // Sanitize pathname to prevent directory traversal.
        // The client should only send the filename.
        const sanitizedPathname = pathname.split('/').pop();
        if (!sanitizedPathname) {
          throw new Error('Invalid filename provided.');
        }

        // Construct the final path. If campaignId is not provided,
        // files will be stored in a generic user folder.
        const finalPathname = campaignId
          ? `${req.user.sub}/${campaignId}/${sanitizedPathname}`
          : `${req.user.sub}/${sanitizedPathname}`;

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'video/webm', 'audio/webm', 'audio/wav'],
          tokenPayload: JSON.stringify({
            userId: req.user.sub,
            campaignId: campaignId, // Include campaignId in the token payload
          }),
          pathname: finalPathname, // Override the pathname
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
