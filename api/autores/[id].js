import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

/**
 * API handler for individual autor operations (GET, PUT, DELETE).
 * All routes in this handler are protected and require authentication.
 * The user can only operate on autores they own.
 *
 * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
const handler = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.query; // Autor ID from the URL path

  // Handles GET /api/autores/:id
  // Fetches a single autor by its ID.
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, autor_data, updated_at FROM autores WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Autor not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[GET /api/autores/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    // Handles PUT /api/autores/:id
    // Updates an existing autor.
  } else if (req.method === 'PUT') {
    try {
      const { name, autor_data } = await parseBody(req);
      if (!name || !autor_data) {
        return res.status(400).json({ error: 'Autor name and data are required.' });
      }
      const { rows } = await query(
        'UPDATE autores SET name = $1, autor_data = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, autor_data, updated_at',
        [name, autor_data, id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Autor not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[PUT /api/autores/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    // Handles DELETE /api/autores/:id
    // Deletes an autor, but only if it's not associated with any campaigns.
  } else if (req.method === 'DELETE') {
    try {
      // First, check if the autor is used in any campaigns for this user.
      const campaignCheck = await query(
        "SELECT COUNT(*) FROM campaigns WHERE user_id = $1 AND autor_id = $2",
        [userId, id]
      );

      if (parseInt(campaignCheck.rows[0].count, 10) > 0) {
        return res.status(409).json({
          error: 'This autor cannot be deleted because it is associated with one or more campaigns.',
        });
      }

      // If not used, proceed with deletion.
      const { rowCount } = await query(
        'DELETE FROM autores WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (rowCount === 0) {
        // This case would be rare if the campaign check passes, but it's good practice.
        return res.status(404).json({ error: 'Autor not found or access denied.' });
      }

      return res.status(200).json({ message: 'Autor deleted successfully.' });
    } catch (error) {
      console.error(`[DELETE /api/autores/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
