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
      const pageSet = rows[0];
      if (typeof pageSet.page_set_data === 'string') {
        pageSet.page_set_data = JSON.parse(pageSet.page_set_data);
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
      if (!name || !name.trim() || !page_set_data) {
        return res.status(400).json({ error: 'PageSet name and data are required.' });
      }
      const { rows } = await query(
        'UPDATE page_sets SET name = $1, page_set_data = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, page_set_data, updated_at',
        [name.trim(), page_set_data, id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'PageSet not found or access denied.' });
      }
      const updatedPageSet = rows[0];
      // Defensive parsing to ensure page_set_data is an object.
      if (typeof updatedPageSet.page_set_data === 'string') {
        try {
          updatedPageSet.page_set_data = JSON.parse(updatedPageSet.page_set_data);
        } catch (parseError) {
          console.error(`[PUT /api/page-sets/${id}] JSON parsing error for PageSet ID ${id}:`, parseError);
        }
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
      // First, check if the page set is used in any campaigns for this user.
      const campaignCheck = await query(
        "SELECT COUNT(*) FROM campaigns WHERE user_id = $1 AND campaign_data->'pageSet'->>'id' = $2",
        [userId, id]
      );

      if (parseInt(campaignCheck.rows[0].count, 10) > 0) {
        return res.status(409).json({
          error: 'Este conjunto de páginas não pode ser excluído porque está associado a uma ou mais campanhas.',
        });
      }

      // If not used, proceed with deletion.
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
