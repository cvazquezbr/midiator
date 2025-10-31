import { handleUpload, vercelBlob } from '@vercel/blob';
import { withAuth } from './middleware/auth.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user || !req.user.uuid) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  // The filename is passed as a query parameter
  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required.' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body, // The file data is in the body
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const userId = req.user.uuid;
        // Prepend the user's ID to the blob path for security/organization
        const blobPath = `${userId}/${pathname}`;

        return {
          pathname: blobPath,
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/mpeg',
            'audio/mpeg',
            'audio/mp3',
          ],
          tokenPayload: JSON.stringify({
            userId: userId,
          }),
          allowOverwrite: true,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('[API /upload-client] Blob upload completed!', blob, tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[API /upload-client] Error in upload handler:', error);
    return res.status(400).json({ error: error.message });
  }
};

export default withAuth(handler);
