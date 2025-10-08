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

  // First, get the user's UUID from their integer ID (from JWT sub)
  let userUUID;
  try {
    const { rows } = await query('SELECT uuid FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    userUUID = rows[0].uuid;
  } catch (error) {
    console.error(`[GET /api/briefings] Error fetching user UUID for user ${userId}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        'SELECT id, name, briefing_data, updated_at FROM briefings WHERE user_id = $1',
        [userUUID]
      );
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`[GET /api/briefings] Error for user ${userId} (UUID: ${userUUID}):`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { nomeBriefing, briefing_data } = await parseBody(req);
      const name = nomeBriefing;

      if (!name) {
        return res.status(400).json({ error: 'Briefing name is required.' });
      }

      const { rows } = await query(
        'INSERT INTO briefings (user_id, name, briefing_data) VALUES ($1, $2, $3) RETURNING id, name, briefing_data, updated_at',
        [userUUID, name, briefing_data]
      );

      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(`[POST /api/briefings] Error for user ${userId} (UUID: ${userUUID}):`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);