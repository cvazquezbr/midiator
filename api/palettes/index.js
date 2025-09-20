import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const parseBody = async (req) => {
  let body = '';
  for await (const chunk of req) {
    body += new TextDecoder().decode(chunk);
  }
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

/**
 * API handler for palette collection operations.
 * All routes in this handler are protected and require authentication.
 *
 * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
const handler = async (req, res) => {
  // The user ID is extracted from the authenticated request.
  const userId = req.user.sub;

  // Handles GET requests to /api/palettes
  // Fetches all palettes belonging to the authenticated user.
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, colors, updated_at FROM palettes WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/palettes] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  // Handles POST requests to /api/palettes
  // Creates a new palette for the authenticated user.
  } else if (req.method === 'POST') {
    try {
      const { name, colors } = await parseBody(req);
      if (!name || !colors) {
        return res.status(400).json({ error: 'Palette name and colors are required.' });
      }
      const { rows } = await query(
        'INSERT INTO palettes (user_id, name, colors) VALUES ($1, $2, $3) RETURNING id, name, colors, updated_at',
        [userId, name, JSON.stringify(colors)]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(`[POST /api/palettes] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
