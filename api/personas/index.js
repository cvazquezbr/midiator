import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

/**
 * API handler for persona collection operations.
 * All routes in this handler are protected and require authentication.
 *
 * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
const handler = async (req, res) => {
  // The user ID is extracted from the authenticated request.
  const userId = req.user.sub;

  // Handles GET requests to /api/personas
  // Fetches all personas belonging to the authenticated user.
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, persona_data, updated_at FROM personas WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/personas] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  // Handles POST requests to /api/personas
  // Creates a new persona for the authenticated user.
  } else if (req.method === 'POST') {
    try {
      const { name, persona_data } = await parseBody(req);
      if (!name || !persona_data) {
        return res.status(400).json({ error: 'Persona name and data are required.' });
      }
      const { rows } = await query(
        'INSERT INTO personas (user_id, name, persona_data) VALUES ($1, $2, $3) RETURNING id, name, persona_data, updated_at',
        [userId, name, persona_data]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(`[POST /api/personas] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
