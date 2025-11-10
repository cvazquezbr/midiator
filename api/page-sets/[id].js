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
 * API handler for individual page_set operations (GET, PUT, DELETE).
 */
const handler = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.query;

  // Handles GET /api/page-sets/:id
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, page_set_data, updated_at FROM page_sets WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'PageSet not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[GET /api/page-sets/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Handles PUT /api/page-sets/:id
  else if (req.method === 'PUT') {
    try {
      const { name, page_set_data } = await parseBody(req);
      if (!name || !name.trim() || !page_set_data) {
        return res.status(400).json({ error: 'PageSet name and data are required.' });
      }
      const { rows } = await query(
        'UPDATE page_sets SET name = $1, page_set_data = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, page_set_data, updated_at',
        [name.trim(), JSON.stringify(page_set_data), id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'PageSet not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[PUT /api/page-sets/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Handles DELETE /api/page-sets/:id
  else if (req.method === 'DELETE') {
    try {
      const { rowCount } = await query(
        'DELETE FROM page_sets WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rowCount === 0) {
        return res.status(404).json({ error: 'PageSet not found or access denied.' });
      }
      return res.status(200).json({ message: 'PageSet deleted successfully.' });
    } catch (error) {
      console.error(`[DELETE /api/page-sets/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
