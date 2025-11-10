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
 * API handler for page_set collection operations.
 * All routes in this handler are protected and require authentication.
 */
const handler = async (req, res) => {
  const userId = req.user.sub;

  // Handles GET requests to /api/page-sets
  // Fetches all page_sets belonging to the authenticated user.
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, page_set_data, updated_at FROM page_sets WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/page-sets] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // Handles POST requests to /api/page-sets
  // Creates a new page_set for the authenticated user.
  else if (req.method === 'POST') {
    try {
      const { name, page_set_data } = await parseBody(req);
      if (!name || !name.trim() || !page_set_data) {
        return res.status(400).json({ error: 'PageSet name and data are required.' });
      }
      const { rows } = await query(
        'INSERT INTO page_sets (user_id, name, page_set_data) VALUES ($1, $2, $3) RETURNING id, name, page_set_data, updated_at',
        [userId, name.trim(), JSON.stringify(page_set_data)]
      );
      const newPageSet = rows[0];
      if (typeof newPageSet.page_set_data === 'string') {
        newPageSet.page_set_data = JSON.parse(newPageSet.page_set_data);
      }
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
