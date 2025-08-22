import { handleUpload } from '@vercel/blob/client';
import { withAuth } from './middleware/auth.js';

// By removing the `config` export, we re-enable the default Next.js body parser.

const handler = async (req, res) => {
  console.log('[API /upload] Received request');

  if (req.method !== 'POST') {
    console.warn(`[API /upload] Method not allowed: ${req.method}`);
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The body is now automatically parsed by Next.js and available on `req.body`.
  const body = req.body;

  try {
    const jsonResponse = await handleUpload({
      body, // Pass the parsed body object.
      request: req, // Pass the original request for other properties.
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log(`[API /upload] onBeforeGenerateToken: Pathname: ${pathname}`);

        // Authentication check
        if (!req.user || !req.user.uuid) {
          console.error('[API /upload] Auth error: User not found in request.');
          throw new Error('Authentication is required to upload files.');
        }
        const userId = req.user.uuid;
        console.log(`[API /upload] Authenticated user: ${userId}`);

        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        console.log('[API /upload] Client payload parsed:', payload);

        // Path sanitization and validation
        const sanitizedPathname = pathname.replace(/^\/|\/$/g, '').replace(/\.\./g, '');
        if (!sanitizedPathname.startsWith(userId)) {
          console.error(`[API /upload] AuthZ error: User ${userId} tried to upload to forbidden path ${sanitizedPathname}.`);
          throw new Error('User is not allowed to upload to this path.');
        }

        console.log(`[API /upload] Path authorized: ${sanitizedPathname}`);

        return {
          addRandomSuffix: true,
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'video/webm', 'audio/webm', 'audio/wav'],
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

    console.log('[API /upload] handleUpload completed successfully. Sending response to client.');
    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error('[API /upload] An unhandled error occurred in the upload handler:', error);
    return res.status(500).json({
      error: 'An internal server error occurred during the upload.',
      details: error.message,
    });
  }
};

export default withAuth(handler);
