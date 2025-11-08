import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const handler = async (req, res) => {
  const userId = req.user.id || req.user.sub || req.user.userId;
  const { id } = req.query;
  const pageSetId = parseInt(id, 10);

  if (!userId) {
    return res.status(401).json({ error: 'Could not determine user from token.' });
  }

  if (isNaN(pageSetId)) {
    return res.status(400).json({ error: 'Invalid page set ID.' });
  }

  // GET: Fetch a single page set by ID
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT * FROM page_sets WHERE id = $1 AND user_id = $2',
        [pageSetId, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Page set not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error fetching page set ${pageSetId}:`, error);
      return res.status(500).json({ error: 'Failed to fetch page set' });
    }
  }

  // PUT: Update a page set by ID
  if (req.method === 'PUT') {
    const { name, page_set_data } = req.body;
    if (!name || !page_set_data) {
      return res.status(400).json({ error: 'Page set name and data are required.' });
    }
    try {
      const { rows } = await query(
        'UPDATE page_sets SET name = $1, page_set_data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
        [name, JSON.stringify(page_set_data), pageSetId, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Page set not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error updating page set ${pageSetId}:`, error);
      return res.status(500).json({ error: 'Failed to update page set' });
    }
  }

  // DELETE: Delete a page set by ID
  if (req.method === 'DELETE') {
    try {
      const { rows: deletedRows } = await query(
        'DELETE FROM page_sets WHERE id = $1 AND user_id = $2 RETURNING *',
        [pageSetId, userId]
      );
      if (deletedRows.length === 0) {
        return res.status(404).json({ error: 'Page set not found or access denied.' });
      }
      return res.status(200).json({ message: 'Page set deleted successfully.' });
    } catch (error) {
      console.error(`Error deleting page set ${pageSetId}:`, error);
      return res.status(500).json({ error: 'Failed to delete page set' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
