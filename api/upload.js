import { put } from '@vercel/blob';
import { withAuth } from './middleware/auth.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req, res) => {
  console.log('[API /upload] Received request (server-side upload handler)');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user || !req.user.uuid) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  const userId = req.user.uuid;
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const filename = searchParams.get('filename');

  if (!filename) {
    return res.status(400).json({ error: 'Filename query parameter is required' });
  }

  // Sanitize the filename and create the full path
  const sanitizedFilename = filename.replace(/[^\/\w\-_\.]/g, '');
  const blobPath = `${userId}/${sanitizedFilename}`;

  console.log(`[API /upload] Attempting to upload to path: ${blobPath}`);

  try {
    const blob = await put(blobPath, req, {
      access: 'public',
      addRandomSuffix: true,
      // The server-side `put` does not have the same content-type/size validation
      // as the client-side token generation. We would need to add manual checks
      // on the stream if we wanted to enforce them here before uploading.
      // For now, we trust the client-side logic to send correct files.
    });

    console.log('[API /upload] Upload successful:', blob);
    return res.status(200).json(blob);

  } catch (uploadError) {
    console.error('[API /upload] Vercel Blob upload error:', uploadError);
    return res.status(500).json({
      error: 'Failed to upload file to storage.',
      details: uploadError.message
    });
  }
};

export default withAuth(handler);
