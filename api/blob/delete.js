import { withAuth } from '../middleware/auth.js';
import { del } from '@vercel/blob';

const handler = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Invalid request body: urls array is required.' });
    }

    await del(urls);

    return res.status(200).json({ message: 'Files deleted successfully.' });
  } catch (error) {
    console.error('Error deleting blobs:', error);
    return res.status(500).json({ error: 'Internal server error while deleting files.' });
  }
};

export default withAuth(handler);
