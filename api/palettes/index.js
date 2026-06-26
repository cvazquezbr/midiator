import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  const body = await parseBody(req);
  // withAuth middleware has already run, so req.user is available (it's the JWT payload).
  // We need to robustly get the user identifier. It could be in `id`, `sub`, or `userId`.
  const userId = req.user.id || req.user.sub || req.user.userId;

  if (!userId) {
    // This should not happen if withAuth is working, but as a safeguard:
    return res.status(401).json({ error: 'Could not determine user from token.' });
  }

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
    const { name, colors, harmony, harmony_justification } = body;

    if (!name || !Array.isArray(colors)) {
      return res.status(400).json({ error: 'Palette name and a colors array are required.' });
    }

    try {
      const { rows } = await query(
        'INSERT INTO palettes (user_id, name, colors, harmony, harmony_justification) VALUES ($1, $2, $3::jsonb, $4, $5) RETURNING *',
        [userId, name, JSON.stringify(colors), harmony, harmony_justification]
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
