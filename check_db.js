import { query } from './api/db.js';

async function checkSessions() {
  try {
    const { rows } = await query('SELECT id, status, created_at, updated_at FROM linkedin_discovery_sessions ORDER BY created_at DESC LIMIT 10');
    console.log('Last 10 sessions:');
    console.table(rows);

    const countResult = await query('SELECT status, COUNT(*) FROM linkedin_discovery_sessions GROUP BY status');
    console.log('Session counts by status:');
    console.table(countResult.rows);
  } catch (err) {
    console.error('Error checking sessions:', err);
  } finally {
    process.exit();
  }
}

checkSessions();
