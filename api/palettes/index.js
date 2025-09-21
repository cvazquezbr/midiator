import { withAuth } from '../middleware/auth';
import { query } from '../db';

const handler = async (req, res) => {
  // withAuth middleware has already run, so req.user is available.
  const userId = req.user.id;

  // GET: List all palettes for the authenticated user
  if (req.method === 'GET') {
    try {
      const { rows: userPalettes } = await query(
        'SELECT * FROM palettes WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      // Sanitize data to ensure colors is always an array
      const sanitizedPalettes = userPalettes.map(palette => {
        if (typeof palette.colors !== 'object' || palette.colors === null || !Array.isArray(palette.colors)) {
          console.warn(`Sanitizing malformed color data for palette ID: ${palette.id}. Found:`, palette.colors);
          return { ...palette, colors: [] };
        }
        return palette;
      });

      return res.status(200).json(sanitizedPalettes);
    } catch (error) {
      console.error('Error fetching palettes:', error);
      return res.status(500).json({ error: 'Failed to fetch palettes' });
    }
  }

  // POST: Create a new palette for the authenticated user
  if (req.method === 'POST') {
    const { name, colors } = req.body;

    if (!name || !Array.isArray(colors)) {
      return res.status(400).json({ error: 'Palette name and a colors array are required.' });
    }

    try {
      // The 'colors' array from JS will be automatically converted to a JSONB string by the pg driver.
      const { rows } = await query(
        'INSERT INTO palettes (user_id, name, colors) VALUES ($1, $2, $3) RETURNING *',
        [userId, name, colors]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error creating palette:', error);
      return res.status(500).json({ error: 'Failed to create palette' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
