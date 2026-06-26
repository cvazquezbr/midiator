import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { parseBody } from '../utils.js';

const handler = async (req, res) => {
  const body = await parseBody(req);
  // withAuth middleware has already run, so req.user is available (it's the JWT payload).
  // We need to robustly get the user identifier. It could be in `id`, `sub`, or `userId`.
  const userId = req.user.id || req.user.sub || req.user.userId;
  const { id } = req.query;
  const paletteId = parseInt(id, 10);

  if (!userId) {
    // This should not happen if withAuth is working, but as a safeguard:
    return res.status(401).json({ error: 'Could not determine user from token.' });
  }

  if (isNaN(paletteId)) {
    return res.status(400).json({ error: 'Invalid palette ID.' });
  }

  // GET: Fetch a single palette by ID
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT * FROM palettes WHERE id = $1 AND user_id = $2',
        [paletteId, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error fetching palette ${paletteId}:`, error);
      return res.status(500).json({ error: 'Failed to fetch palette' });
    }
  }

  // PUT: Update a palette by ID
  if (req.method === 'PUT') {
    const { name, colors, harmony, harmony_justification } = body;
    if (!name || !Array.isArray(colors)) {
      return res.status(400).json({ error: 'Palette name and colors array are required.' });
    }
    try {
      const { rows } = await query(
        'UPDATE palettes SET name = $1, colors = $2, harmony = $3, harmony_justification = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
        [name, JSON.stringify(colors), harmony, harmony_justification, paletteId, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error updating palette ${paletteId}:`, error);
      return res.status(500).json({ error: 'Failed to update palette' });
    }
  }

  // DELETE: Delete a palette by ID
  if (req.method === 'DELETE') {
    try {
      // First, check if any campaigns are using this palette.
      // Note: This assumes a `campaigns` table with a `palette_id` column.
      const { rows: campaigns } = await query(
        'SELECT id FROM campaigns WHERE palette_id = $1 AND user_id = $2',
        [paletteId, userId]
      );
      if (campaigns.length > 0) {
        return res.status(400).json({ error: `Cannot delete palette because it is being used by ${campaigns.length} campaign(s).` });
      }

      const { rows: deletedRows } = await query(
        'DELETE FROM palettes WHERE id = $1 AND user_id = $2 RETURNING *',
        [paletteId, userId]
      );
      if (deletedRows.length === 0) {
        return res.status(404).json({ error: 'Palette not found or access denied.' });
      }
      return res.status(200).json({ message: 'Palette deleted successfully.' });
    } catch (error) {
      console.error(`Error deleting palette ${paletteId}:`, error);
      return res.status(500).json({ error: 'Failed to delete palette' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withAuth(handler);
