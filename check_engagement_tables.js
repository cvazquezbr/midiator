import { query } from './api/db.js';

async function checkTables() {
  const tables = [
    'linkedin_discovery_sessions',
    'linkedin_discovered_posts',
    'linkedin_generated_comments'
  ];

  for (const table of tables) {
    try {
      const result = await query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
      console.log(`Table ${table} exists: ${result.rows[0].exists}`);
    } catch (err) {
      console.error(`Error checking table ${table}:`, err.message);
    }
  }
}

checkTables();
