import { handleUpload } from '@vercel/blob/client';
import { withAuth } from './middleware/auth.js';

// Helper to parse body in a Vercel Node.js environment
const getBody = async (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        // If the body is empty, resolve with null, otherwise parse it.
        resolve(body ? JSON.parse(body) : null);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user || !req.user.uuid) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  try {
    // Manually parse the JSON body from the request stream
    const body = await getBody(req);

    if (!body) {
      return res.status(400).json({ error: 'Request body is empty or invalid.' });
    }

    const jsonResponse = await handleUpload({
      body, // Pass the parsed body
      request: req, // Pass the original request
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        const userId = req.user.uuid;
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
