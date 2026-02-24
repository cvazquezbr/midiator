import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const handler = async (req, res) => {
  const { action } = req.body;
  const userId = req.user.sub;

  try {
    switch (action) {
      case 'createSession':
        return await handleCreateSession(req, res, userId);
      case 'getSessions':
        return await handleGetSessions(req, res, userId);
      case 'getSessionDetails':
        return await handleGetSessionDetails(req, res, userId);
      case 'updatePostDecision':
        return await handleUpdatePostDecision(req, res, userId);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Engagement Discovery Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

async function handleCreateSession(req, res, userId) {
  const { sourcePostId, sourcePostContent } = req.body;
  
  const result = await query(
    `INSERT INTO linkedin_discovery_sessions (user_id, source_post_id, source_post_content, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [userId, sourcePostId, sourcePostContent]
  );
  
  res.status(201).json(result.rows[0]);
}

async function handleGetSessions(req, res, userId) {
  const result = await query(
    `SELECT * FROM linkedin_discovery_sessions WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  res.status(200).json(result.rows);
}

async function handleGetSessionDetails(req, res, userId) {
  const { sessionId } = req.body;
  
  const session = await query(
    `SELECT * FROM linkedin_discovery_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  
  if (session.rows.length === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const posts = await query(
    `SELECT * FROM linkedin_discovered_posts WHERE session_id = $1 ORDER BY final_score DESC`,
    [sessionId]
  );
  
  res.status(200).json({
    session: session.rows[0],
    posts: posts.rows
  });
}

async function handleUpdatePostDecision(req, res, userId) {
  const { postId, decision } = req.body;
  
  // Verify ownership through session
  const postCheck = await query(
    `SELECT p.id FROM linkedin_discovered_posts p
     JOIN linkedin_discovery_sessions s ON p.session_id = s.id
     WHERE p.id = $1 AND s.user_id = $2`,
    [postId, userId]
  );
  
  if (postCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Post not found or unauthorized' });
  }
  
  const result = await query(
    `UPDATE linkedin_discovered_posts 
     SET user_decision = $1, decided_at = NOW() 
     WHERE id = $2 
     RETURNING *`,
    [decision, postId]
  );
  
  res.status(200).json(result.rows[0]);
}

export default withAuth(handler);
