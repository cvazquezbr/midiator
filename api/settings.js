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
 * API handler for getting and saving user settings.
 * This route is protected and operates on the currently authenticated user.
 */
const settingsHandler = async (req, res) => {
  const userId = req.user.sub; // Get user ID from the JWT payload

  if (req.method === 'GET') {
    try {
      const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);
      if (rows.length === 0) {
        // It's not an error if the user has no saved settings yet. Return an empty object.
        return res.status(200).json({});
      }
      // The settings are stored in a JSONB column named 'settings_data'.
      return res.status(200).json(rows[0].settings_data);
    } catch (error) {
      console.error(`Failed to get settings for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const settingsData = await parseBody(req);

      // Use an "upsert" operation (INSERT ... ON CONFLICT ... DO UPDATE).
      // This is an atomic and efficient way to handle both creating and updating.
      const upsertQuery = `
        INSERT INTO settings (user_id, settings_data)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET settings_data = EXCLUDED.settings_data, updated_at = NOW();
      `;

      await query(upsertQuery, [userId, settingsData]);

      return res.status(200).json({ message: 'Settings saved successfully.' });
    } catch (error) {
      console.error(`Failed to save settings for user ${userId}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(settingsHandler);
