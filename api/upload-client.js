import { handleUpload } from '@vercel/blob/client';
import { withAuth } from './middleware/auth.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user || !req.user.uuid) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  // The body will be a JSON object with the file's metadata.
  // The actual file is not sent to this endpoint.
  const body = await req.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        // This is the server-side logic to authorize the upload.
        // We can use the authenticated user's ID to create a secure path.
        const userId = req.user.uuid;
        const blobPath = `${userId}/${pathname}`;

        // Here you can add more validation if needed, e.g., based on clientPayload.
        return {
          // The pathname now includes the user's ID.
          pathname: blobPath,
          // By default, the token is valid for 5 minutes.
          // You can customize this if needed.
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
          // You can also add a tokenPayload that will be sent back to your
          // `onUploadCompleted` callback.
          tokenPayload: JSON.stringify({
            userId: userId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback is triggered after the file has been successfully uploaded to Vercel Blob.
        // You can use this to update your database with the blob's URL.
        console.log('[API /upload-client] Blob upload completed!', blob, tokenPayload);
        // Example: await db.updateUser(JSON.parse(tokenPayload).userId, { avatar: blob.url });
      },
    });

    // The response contains the client token and other details for the client-side upload.
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[API /upload-client] Error generating upload token:', error);
    // The webhook will retry 5 times waiting for a 200 status code.
    return res.status(400).json({ error: error.message });
  }
};

export default withAuth(handler);
