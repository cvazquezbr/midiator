import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

/**
 * API handler for autor collection operations.
 * All routes in this handler are protected and require authentication.
 *
 * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
const handler = async (req, res) => {
  // The user ID is extracted from the authenticated request.
  const userId = req.user.sub;

  // Handles GET requests to /api/autores
  // Fetches all autores belonging to the authenticated user.
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, autor_data, updated_at FROM autores WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/autores] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  // Handles POST requests to /api/autores
  // Creates a new autor for the authenticated user.
  } else if (req.method === 'POST') {
    try {
      const { name, autor_data } = await parseBody(req);
      if (!name || !autor_data) {
        return res.status(400).json({ error: 'Autor name and data are required.' });
      }
      const { rows } = await query(
        'INSERT INTO autores (user_id, name, autor_data) VALUES ($1, $2, $3) RETURNING id, name, autor_data, updated_at',
        [userId, name, autor_data]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(`[POST /api/autores] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
