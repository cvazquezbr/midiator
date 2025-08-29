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
        'SELECT id, name, persona_data, updated_at FROM personas WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Persona not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[GET /api/personas/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, persona_data } = await parseBody(req);
      if (!name || !persona_data) {
        return res.status(400).json({ error: 'Persona name and data are required.' });
      }
      const { rows } = await query(
        'UPDATE personas SET name = $1, persona_data = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, persona_data, updated_at',
        [name, persona_data, id, userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Persona not found or access denied.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`[PUT /api/personas/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { rowCount } = await query(
        'DELETE FROM personas WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Persona not found or access denied.' });
      }
      return res.status(200).json({ message: 'Persona deleted successfully.' });
    } catch (error) {
      console.error(`[DELETE /api/personas/${id}] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
