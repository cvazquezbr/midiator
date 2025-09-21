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

const handler = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, campaign_data, autor_id, persona_id, palette_id, updated_at FROM campaigns WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[GET /api/campaigns/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, campaign_data, autor_id, persona_id, palette_id } = await parseBody(req);
      if (!name || !campaign_data) {
        return res.status(400).json({ error: 'Campaign name and data are required.' });
      }

      // Ensure empty strings for foreign keys are converted to null
      const finalAutorId = autor_id === '' ? null : autor_id;
      const finalPersonaId = persona_id === '' ? null : persona_id;
      const finalPaletteId = palette_id === '' ? null : palette_id;

      const { rows } = await query(
        'UPDATE campaigns SET name = $1, campaign_data = $2, autor_id = $3, persona_id = $4, palette_id = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING id, name, updated_at',
        [name, campaign_data, finalAutorId, finalPersonaId, finalPaletteId, id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[PUT /api/campaigns/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { rowCount } = await query(
        'DELETE FROM campaigns WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }
      return res.status(200).json({ message: 'Campaign deleted successfully.' });
    } catch (error) {
      console.error(`[DELETE /api/campaigns/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
