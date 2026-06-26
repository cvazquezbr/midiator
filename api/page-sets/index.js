import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

/**
 * Normalizes a page set object to ensure page_set_data is a parsed JSON object.
 * @param {object} ps - The page set object from the database.
 * @returns {object} The normalized page set object.
 */
const normalizePageSet = (ps) => {
  if (!ps) return null;

  let page_set_data = ps.page_set_data || {}; // Default to empty object if null/undefined

  if (typeof page_set_data === 'string') {
    try {
      page_set_data = JSON.parse(page_set_data);
    } catch (e) {
      console.error(`[normalizePageSet] Failed to parse page_set_data for PageSet ID ${ps.id}:`, e);
      page_set_data = {}; // Default to empty object on parse failure
    }
  }

  return {
    ...ps,
    page_set_data,
  };
};

/**
 * API handler for page_set collection operations.
 */
const handler = async (req, res) => {
  const userId = req.user.sub;

  // Handles GET requests to /api/page-sets
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, page_set_data, updated_at FROM page_sets WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      const pageSets = rows.map(normalizePageSet);
      return res.status(200).json(pageSets);
    } catch (error) {
      console.error(`[GET /api/page-sets] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Handles POST requests to /api/page-sets
  else if (req.method === 'POST') {
    try {
      const { name, page_set_data } = await parseBody(req);
      if (!name || !name.trim() || !page_set_data) {
        return res.status(400).json({ error: 'PageSet name and data are required.' });
      }
      const { rows } = await query(
        'INSERT INTO page_sets (user_id, name, page_set_data) VALUES ($1, $2, $3) RETURNING id, name, page_set_data, updated_at',
        [userId, name.trim(), page_set_data]
      );
      const newPageSet = normalizePageSet(rows[0]);
      return res.status(201).json(newPageSet);
    } catch (error) {
      console.error(`[POST /api/page-sets] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
