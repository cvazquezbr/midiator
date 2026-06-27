import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import redis from './redis.js';
import { parseBody } from './utils.js';

/**
 * API handler for getting and saving user settings.
 * This route is protected and operates on the currently authenticated user.
 */
const settingsHandler = async (req, res) => {
  console.log(`[api/settings] Received ${req.method} request.`);
  try {
    // sub is the serial user ID, uuid is the string UUID
    const userId = req.user.sub;
    const cacheKey = `settings:${userId}`;
    console.log(`[api/settings] Authenticated user ID: ${userId}`);

    if (req.method === 'GET') {
      try {
        const cachedSettings = await redis.get(cacheKey);
        if (cachedSettings) {
          console.log(`[api/settings] Cache HIT for user ${userId}.`);
          return res.status(200).json(JSON.parse(cachedSettings));
        }
      } catch (cacheError) {
        console.error(`[api/settings] Redis GET error for user ${userId}:`, cacheError);
        // Don't fail the request if cache is down, just log and proceed to DB.
      }

      console.log(`[api/settings] Cache MISS for user ${userId}. Querying database.`);
      const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);
      console.log(`[api/settings] DB query successful. Found ${rows.length} rows for user ${userId}.`);

      const settingsData = rows.length > 0 ? (rows[0].settings_data || {}) : {};
      console.log(`[api/settings] Settings keys for user ${userId}:`, Object.keys(settingsData));

      try {
        // Cache the result for 1 hour (3600 seconds)
        await redis.set(cacheKey, JSON.stringify(settingsData), 'EX', 3600);
      } catch (cacheError) {
         console.error(`[api/settings] Redis SET error for user ${userId}:`, cacheError);
         // Don't fail the request if cache write fails.
      }

      return res.status(200).json(settingsData);

    } else if (req.method === 'PUT') {
      console.log(`[api/settings] Entering PUT block for user ${userId}.`);
      const settingsData = await parseBody(req);

      if (!settingsData || (typeof settingsData === 'object' && Object.keys(settingsData).length === 0)) {
        console.warn(`[api/settings] Received empty settings data for user ${userId}. Skipping save to prevent data loss.`);
        return res.status(400).json({ error: 'Falha ao processar os dados das configurações. Tente novamente.' });
      }

      const upsertQuery = `
        INSERT INTO settings (user_id, settings_data)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET settings_data = EXCLUDED.settings_data, updated_at = NOW();
      `;

      await query(upsertQuery, [userId, settingsData]);
      console.log(`[api/settings] Successfully saved settings for user ${userId}.`);

      try {
        console.log(`[api/settings] Invalidating cache for user ${userId}.`);
        await redis.del(cacheKey);
      } catch (cacheError) {
        console.error(`[api/settings] Redis DEL error for user ${userId}:`, cacheError);
        // Don't fail the request if cache invalidation fails.
      }

      return res.status(200).json({ message: 'Settings saved successfully.' });
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`[api/settings] CATASTROPHIC ERROR: ${error.message}`);
    console.error(error.stack);
    // Even in a crash, try to send a JSON response with details.
    return res.status(500).json({
        error: 'Internal Server Error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

export default withAuth(settingsHandler);
