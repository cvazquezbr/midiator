import { del } from '@vercel/blob';
import { withAuth } from '../middleware/auth.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    await del(url);

    return res.status(200).json({ message: 'Blob deleted successfully' });
  } catch (error) {
    console.error('Error deleting blob:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default withAuth(handler);
