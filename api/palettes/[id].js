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
 * API handler for individual palette operations (GET, PUT, DELETE).
 * All routes in this handler are protected and require authentication.
 * The user can only operate on palettes they own.
 *
 * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
const handler = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.query; // Palette ID from the URL path

  // Handles GET /api/palettes/:id
  // Fetches a single palette by its ID.
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, colors, updated_at FROM palettes WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[GET /api/palettes/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    // Handles PUT /api/palettes/:id
    // Updates an existing palette.
  } else if (req.method === 'PUT') {
    try {
      const { name, colors } = await parseBody(req);
      if (!name || !colors) {
        return res.status(400).json({ error: 'Palette name and colors are required.' });
      }
      const { rows } = await query(
        'UPDATE palettes SET name = $1, colors = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, colors, updated_at',
        [name, JSON.stringify(colors), id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[PUT /api/palettes/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    // Handles DELETE /api/palettes/:id
    // Deletes a palette, but only if it's not associated with any campaigns.
  } else if (req.method === 'DELETE') {
    try {
      // First, check if the palette is used in any campaigns for this user.
      const campaignCheck = await query(
        'SELECT COUNT(*) FROM campaigns WHERE user_id = $1 AND palette_id = $2',
        [userId, id]
      );

      if (parseInt(campaignCheck.rows[0].count, 10) > 0) {
        return res.status(409).json({
          error: 'This palette cannot be deleted because it is associated with one or more campaigns.',
        });
      }

      // If not used, proceed with deletion.
      const { rowCount } = await query(
        'DELETE FROM palettes WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (rowCount === 0) {
        // This case would be rare if the campaign check passes, but it's good practice.
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }

      return res.status(200).json({ message: 'Palette deleted successfully.' });
    } catch (error) {
      console.error(`[DELETE /api/palettes/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
