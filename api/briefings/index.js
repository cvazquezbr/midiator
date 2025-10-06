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
        'SELECT id, name, briefing_data, updated_at FROM briefings WHERE user_id = $1',
        [userId]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/briefings] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, briefing_data } = await parseBody(req);
      if (!name || !briefing_data) {
        return res.status(400).json({ error: 'Briefing name and data are required.' });
      }
      const { rows } = await query(
        'INSERT INTO briefings (user_id, name, briefing_data) VALUES ($1, $2, $3) RETURNING id, name, briefing_data, updated_at',
        [userId, name, briefing_data]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(`[POST /api/briefings] Error for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);