import { query } from '../db.js';
import { processDiscoverySession } from '../engagement/ai-worker.js';

/**
 * Handle running the discovery job to process pending sessions.
 * @param {import('vercel').VercelRequest} request
 * @param {import('vercel').VercelResponse} response
 */
export async function handleRunDiscovery(request, response) {
  console.log('[Cron Discovery] Starting discovery session processing...');
  try {
    // Process sessions that are 'pending', 'error' (to retry) or 'searching' (potential stuck sessions)
    const { rows } = await query(
      `SELECT id, status FROM linkedin_discovery_sessions
       WHERE status IN ('pending', 'error', 'searching')
       ORDER BY created_at ASC`
    );

    if (rows.length === 0) {
      const allCount = await query('SELECT COUNT(*) FROM linkedin_discovery_sessions');
      console.log(`[Cron Discovery] No sessions found with status pending, error, or searching. Total sessions in DB: ${allCount.rows[0].count}`);
      if (response) return response.status(200).json({
        message: 'No discovery sessions found to process.',
        debug: { totalSessions: parseInt(allCount.rows[0].count) }
      });
      return;
    }

    console.log(`[Cron Discovery] Found ${rows.length} sessions to process. Statuses: ${rows.map(r => r.status).join(', ')}`);

    const results = [];
    for (const row of rows) {
      try {
        console.log(`[Cron Discovery] Processing session ${row.id}...`);
        await processDiscoverySession(row.id);
        results.push({ id: row.id, status: 'success' });
      } catch (err) {
        console.error(`[Cron Discovery] Error processing session ${row.id}:`, err);
        results.push({ id: row.id, status: 'error', error: err.message });
      }
    }

    if (response) {
      return response.status(200).json({
        message: `Processed ${rows.length} discovery sessions.`,
        results
      });
    }
  } catch (error) {
    console.error('[Cron Discovery] Fatal error:', error);
    if (response) return response.status(500).json({ error: error.message });
  }
}

export default async function handler(request, response) {
  // Check for the cron secret if provided in the Authorization header
  const authHeader = request.headers.authorization;
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return handleRunDiscovery(request, response);
  }

  // Also check for internal secret if used by our own internal calls
  if (process.env.INTERNAL_API_SECRET && request.headers['x-internal-secret'] === process.env.INTERNAL_API_SECRET) {
    return handleRunDiscovery(request, response);
  }

  // Note: The manual trigger from Admin Dashboard uses /api/schedule/run-discovery.js
  // which calls handleRunDiscovery directly after admin authentication.

  console.warn(`[Cron Discovery] Unauthorized access attempt from ${request.headers['x-forwarded-for'] || request.socket.remoteAddress}`);
  return response.status(401).json({ error: 'Unauthorized' });
}
