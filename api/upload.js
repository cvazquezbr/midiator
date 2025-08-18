import { handleUpload } from '@vercel/blob/server';
import { withAuth } from './middleware/auth.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = await req.json();

  try {
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
    console.error('Error in upload handler:', error);
    return res.status(400).json({ error: error.message });
  }
};

export default withAuth(handler);
