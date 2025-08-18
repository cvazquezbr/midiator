import { put } from '@vercel/blob';
import { withAuth } from './middleware/auth.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const filename = req.headers['x-vercel-filename'] || 'file';
    const blob = await put(filename, req.body, {
      access: 'public',
    });

    return res.status(200).json(blob);
  } catch (error) {
    console.error('[API/UPLOAD] Error uploading file:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default withAuth(handler);
