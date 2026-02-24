import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { processDiscoverySession, generateCommentForPost } from './ai-worker.js';

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
      case 'processSession':
        return await handleProcessSession(req, res, userId);
      case 'processMySessions':
        return await handleProcessMySessions(req, res, userId);
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
  
  const session = result.rows[0];

  // Trigger background processing
  // Note: On Vercel, this might be terminated if the response is sent immediately,
  // but for this implementation we assume a best-effort trigger.
  processDiscoverySession(session.id).catch(err =>
    console.error(`Error triggering discovery session ${session.id}:`, err)
  );

  res.status(201).json(session);
}

async function handleGetSessions(req, res, userId) {
  const result = await query(
    `SELECT s.*, COUNT(p.id) as post_count
     FROM linkedin_discovery_sessions s
     LEFT JOIN linkedin_discovered_posts p ON s.id = p.session_id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [userId]
  );
  res.status(200).json(result.rows.map(row => ({
    ...row,
    post_count: parseInt(row.post_count, 10)
  })));
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

  const updatedPost = result.rows[0];

  // If approved, trigger comment generation
  if (decision === 'approved') {
    generateCommentForPost(postId, userId).catch(err =>
      console.error(`Error generating comment for post ${postId}:`, err)
    );
  }
  
  res.status(200).json(updatedPost);
}

async function handleProcessMySessions(req, res, userId) {
  const { rows } = await query(
    `SELECT id FROM linkedin_discovery_sessions
     WHERE user_id = $1 AND status IN ('pending', 'error', 'searching')`,
    [userId]
  );

  if (rows.length === 0) {
    return res.status(200).json({ message: 'Nenhuma sessão pendente encontrada.' });
  }

  const results = [];
  for (const session of rows) {
    try {
      await processDiscoverySession(session.id);
      results.push({ id: session.id, status: 'success' });
    } catch (err) {
      results.push({ id: session.id, status: 'error', error: err.message });
    }
  }

  res.status(200).json({
    message: `Processadas ${rows.length} sessões de descoberta.`,
    results
  });
}

async function handleProcessSession(req, res, userId) {
  const { sessionId } = req.body;

  // Verify ownership
  const sessionCheck = await query(
    `SELECT id FROM linkedin_discovery_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (sessionCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Session not found or unauthorized' });
  }

  try {
    // We await it here for the manual trigger to give immediate feedback
    await processDiscoverySession(sessionId);

    // Return the updated session
    const updated = await query('SELECT * FROM linkedin_discovery_sessions WHERE id = $1', [sessionId]);
    res.status(200).json(updated.rows[0]);
  } catch (err) {
    console.error(`Error processing session ${sessionId}:`, err);
    res.status(500).json({ error: 'Failed to process session', details: err.message });
  }
}

export default withAuth(handler);
