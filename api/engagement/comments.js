import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const handler = async (req, res) => {
  const { action } = req.body;
  const userId = req.user.sub;

  try {
    switch (action) {
      case 'getComments':
        return await handleGetComments(req, res, userId);
      case 'approveComment':
        return await handleApproveComment(req, res, userId);
      case 'updateComment':
        return await handleUpdateComment(req, res, userId);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Engagement Comments Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

async function handleGetComments(req, res, userId) {
  const result = await query(
    `SELECT c.*, p.post_content, p.post_url, p.post_author_name 
     FROM linkedin_generated_comments c
     JOIN linkedin_discovered_posts p ON c.discovered_post_id = p.id
     WHERE c.user_id = $1 
     ORDER BY c.created_at DESC`,
    [userId]
  );
  res.status(200).json(result.rows);
}

async function handleApproveComment(req, res, userId) {
  const { commentId, finalText } = req.body;
  
  const result = await query(
    `UPDATE linkedin_generated_comments 
     SET status = 'approved', final_text = $1, updated_at = NOW() 
     WHERE id = $2 AND user_id = $3 
     RETURNING *`,
    [finalText, commentId, userId]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  res.status(200).json(result.rows[0]);
}

async function handleUpdateComment(req, res, userId) {
  const { commentId, finalText, status } = req.body;
  
  const result = await query(
    `UPDATE linkedin_generated_comments 
     SET final_text = $1, status = $2, updated_at = NOW() 
     WHERE id = $3 AND user_id = $4 
     RETURNING *`,
    [finalText, status || 'pending', commentId, userId]
  );
  
  res.status(200).json(result.rows[0]);
}

export default withAuth(handler);
