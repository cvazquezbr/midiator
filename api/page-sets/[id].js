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
 * API handler for individual page set operations (GET, PUT, DELETE).
 * All routes in this handler are protected and require authentication.
 * The user can only operate on page sets they own.
 */
const handler = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.query; // PageSet ID from the URL path

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
      // Ensure page_set_data is parsed if it's a string
      const pageSet = rows[0];
      if (typeof pageSet.page_set_data === 'string') {
        try {
          pageSet.page_set_data = JSON.parse(pageSet.page_set_data);
        } catch (e) {
          console.error(`[GET /api/page-sets/${id}] Error parsing page_set_data for user ${userId}:`, e);
          return res.status(500).json({ error: 'Error parsing page set data.' });
        }
      }
      return res.status(200).json(pageSet);
    } catch (error) {
      console.error(`[GET /api/page-sets/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Handles PUT /api/page-sets/:id
  else if (req.method === 'PUT') {
    try {
      const { name, page_set_data } = await parseBody(req);
      if (!name || !page_set_data) {
        return res.status(400).json({ error: 'PageSet name and data are required.' });
      }
      const { rows } = await query(
        'UPDATE page_sets SET name = $1, page_set_data = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, page_set_data, updated_at',
        [name, JSON.stringify(page_set_data), id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'PageSet not found or access denied.' });
      }
      const updatedPageSet = rows[0];
      if (typeof updatedPageSet.page_set_data === 'string') {
        updatedPageSet.page_set_data = JSON.parse(updatedPageSet.page_set_data);
      }
      return res.status(200).json(updatedPageSet);
    } catch (error) {
      console.error(`[PUT /api/page-sets/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Handles DELETE /api/page-sets/:id
  else if (req.method === 'DELETE') {
    try {
      // Note: Unlike personas, we don't currently check for campaign associations.
      // This could be added in the future if needed.
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
