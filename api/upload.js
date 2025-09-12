import { handleUpload } from '@vercel/blob/server';
import { withAuth } from './middleware/auth.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req, res) => {
  console.log('[API /upload] Received request (server handler)');

  try {
    const jsonResponse = await handleUpload({
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log(`[API /upload] onBeforeGenerateToken: Pathname: ${pathname}`);

        if (!req.user || !req.user.uuid) {
          throw new Error('Authentication is required to upload files.');
        }
        const userId = req.user.uuid;

        const sanitizedPathname = pathname.replace(/^\/|\/$/g, '').replace(/\.\./g, '');
        if (!sanitizedPathname.startsWith(userId)) {
          throw new Error('User is not allowed to upload to this path.');
        }

        return {
          addRandomSuffix: true,
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'video/webm', 'audio/webm', 'audio/wav', 'audio/mp3'],
          maximumSizeInBytes: 524288000, // 500MB
          tokenPayload: JSON.stringify({ userId }),
          pathname: sanitizedPathname,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { userId } = JSON.parse(tokenPayload);
        console.log(`[API /upload] onUploadCompleted: Blob upload finished for user ${userId}.`);
        console.log('[API /upload] Blob details:', { url: blob.url, pathname: blob.pathname, contentType: blob.contentType, contentLength: blob.contentLength });
      },
    });

    // The 'server' handler doesn't return the same kind of response to the API route itself,
    // but the client-side `upload` function will receive the result directly from Vercel.
    // We still need to send a response to finish the serverless function.
    return res.status(200).json({ message: 'Upload handled.' });

  } catch (error) {
    console.error('[API /upload] An unhandled error occurred in the upload handler:', error);
    return res.status(500).json({
      error: 'An internal server error occurred during the upload.',
      details: error.message,
    });
  }
};

export default withAuth(handler);
