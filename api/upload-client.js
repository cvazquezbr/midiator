import { handleUpload, vercelBlobStoreId } from '@vercel/blob/client';
import { withAuth } from './middleware/auth.js';

// This endpoint is for client-side uploads to Vercel Blob.
// It does not handle the file body itself, but rather generates a secure token
// that the client can use to upload the file directly.
const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user || !req.user.uuid) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  const userId = req.user.uuid;
  // The filename is sent in the body by the client library
  const { pathname } = req.body;

  if (!pathname) {
    return res.status(400).json({ error: '`pathname` is required in the request body.' });
  }

  // Sanitize the filename and create the full path
  const sanitizedFilename = pathname.replace(/[^\/\w\-_\.]/g, '');
  const blobPath = `${userId}/${sanitizedFilename}`;

  try {
    const jsonResponse = await handleUpload({
      body: req.body, // The client sends a JSON body with the file's metadata
      request: req,
      // The full pathname of the blob
      pathname: blobPath,
      // The 'public' access level allows the blob to be served publicly
      access: 'public',
      // The client-side upload must specify the Vercel Blob store ID
      storeId: vercelBlobStoreId,
      // Multipart uploads are automatically enabled for files larger than 4.5MB
      multipart: true,
    });

    // The response from `handleUpload` is a JSON object that contains the upload token
    // and other necessary information for the client to perform the upload.
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[API /upload-client] Error generating upload token:', error);
    return res.status(500).json({ error: 'Failed to generate upload token.', details: error.message });
  }
};

export default withAuth(handler);
