import { query } from './api/db.js';
import { processDiscoverySession } from './api/engagement/ai-worker.js';

async function debug(sessionId) {
  console.log(`Debugging session: ${sessionId}`);
  try {
    const sessionResult = await query('SELECT * FROM linkedin_discovery_sessions WHERE id = $1', [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) {
      console.error('Session not found');
      return;
    }
    console.log('Session data:', JSON.stringify(session, null, 2));

    const postsResult = await query('SELECT * FROM linkedin_discovered_posts WHERE session_id = $1', [sessionId]);
    console.log(`Found ${postsResult.rows.length} posts in DB for this session.`);
    if (postsResult.rows.length > 0) {
        console.table(postsResult.rows.map(p => ({
            id: p.id,
            linkedin_id: p.linkedin_post_id,
            score: p.final_score,
            content: p.post_content?.substring(0, 50)
        })));
    }

    console.log('Re-running discovery process...');
    await processDiscoverySession(sessionId);
    
    const updatedSession = await query('SELECT * FROM linkedin_discovery_sessions WHERE id = $1', [sessionId]);
    console.log('Updated session status:', updatedSession.rows[0].status);
    
    const newPostsResult = await query('SELECT * FROM linkedin_discovered_posts WHERE session_id = $1', [sessionId]);
    console.log(`Found ${newPostsResult.rows.length} posts in DB after re-run.`);

  } catch (err) {
    console.error('Debug error:', err);
  } finally {
    process.exit();
  }
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Please provide a session ID');
  process.exit(1);
}
debug(sessionId);
