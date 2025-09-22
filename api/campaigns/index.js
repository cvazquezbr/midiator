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

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, updated_at FROM campaigns WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/campaigns] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, campaign_data, autor_id, persona_id, palette_id } = await parseBody(req);
      if (!name || !campaign_data) {
        return res.status(400).json({ error: 'Campaign name and data are required.' });
      }
      // Convert empty strings or "custom" to null for foreign key fields
      const final_autor_id = autor_id === '' ? null : autor_id;
      const final_persona_id = persona_id === '' ? null : persona_id;
      const final_palette_id = (palette_id === '' || palette_id === 'custom') ? null : palette_id;

      const { rows } = await query(
        'INSERT INTO campaigns (user_id, name, campaign_data, autor_id, persona_id, palette_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, updated_at',
        [userId, name, campaign_data, final_autor_id, final_persona_id, final_palette_id]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(`[POST /api/campaigns] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
