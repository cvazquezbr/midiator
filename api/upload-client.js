import { put } from '@vercel/blob';
import { withAuth } from './middleware/auth.js';

// The Vercel/Node.js runtime doesn't automatically parse the body for file uploads,
// so the request object `req` itself is a stream containing the file data.
const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user || !req.user.uuid) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required.' });
  }

  try {
    const userId = req.user.uuid;
    const blobPath = `${userId}/${filename}`;

    // The `put` function from `@vercel/blob` can directly accept the request `req`
    // stream and upload it. This is the correct server-side approach.
    const blob = await put(blobPath, req, {
      access: 'public',
      // Optionally, you can add contentType if you can determine it.
      // contentType: req.headers['content-type'],
    });

    // Return the blob object, which is consistent with what the frontend expects.
    return res.status(200).json(blob);
  } catch (error) {
    console.error('[API /upload-client] Error in upload handler:', error);
    return res.status(400).json({ error: error.message });
  }
};

export default withAuth(handler);
