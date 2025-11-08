import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const handler = async (req, res) => {
  const userId = req.user.id || req.user.sub || req.user.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Could not determine user from token.' });
  }

  // GET: List all page sets for the authenticated user
  if (req.method === 'GET') {
    try {
      const { rows: pageSets } = await query(
        'SELECT * FROM page_sets WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return res.status(200).json(pageSets);
    } catch (error) {
      console.error('Error fetching page sets:', error);
      return res.status(500).json({ error: 'Failed to fetch page sets' });
    }
  }

  // POST: Create a new page set for the authenticated user
  if (req.method === 'POST') {
    const { name, page_set_data } = req.body;

    if (!name || !page_set_data) {
      return res.status(400).json({ error: 'Page set name and data are required.' });
    }

    try {
      const { rows } = await query(
        'INSERT INTO page_sets (user_id, name, page_set_data) VALUES ($1, $2, $3::jsonb) RETURNING *',
        [userId, name, JSON.stringify(page_set_data)]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error creating page set:', error);
      return res.status(500).json({ error: 'Failed to create page set' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
