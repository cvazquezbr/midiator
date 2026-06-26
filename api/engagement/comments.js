import { withAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { handleCreateComment, handleGetProfile } from '../linkedin-proxy.js';
import { generateCommentForPost } from './ai-worker.js';
import { escapeLinkedinText, parseBody } from '../utils.js';

const handler = async (req, res) => {
  const body = await parseBody(req);
  req.body = body;
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
      case 'publishComment':
        return await handlePublishComment(req, res, userId);
      case 'regenerateComment':
        return await handleRegenerateComment(req, res, userId);
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

async function handlePublishComment(req, res, userId) {
  const { commentId } = req.body;

  // 1. Get comment and post details
  const result = await query(
    `SELECT c.*, p.linkedin_post_id, p.post_author_urn, p.session_id, u.linkedin_access_token
     FROM linkedin_generated_comments c
     JOIN linkedin_discovered_posts p ON c.discovered_post_id = p.id
     JOIN users u ON c.user_id = u.id
     WHERE c.id = $1 AND c.user_id = $2`,
    [commentId, userId]
  );

  const comment = result.rows[0];
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.status === 'published') return res.status(400).json({ error: 'Comment already published' });

  // Use final_text if available, otherwise generated_text
  const textToPublish = comment.final_text || comment.generated_text;

  // 2. Call LinkedIn API via proxy handler
  try {
    let responseData;
    // To determine the correct actorUrn, we check the source post's author.
    // If the user published as an organization, they must comment as that organization.
    // We fetch the source post details from linkedin_schedules to find the authorUrn used.
    const sourcePostResult = await query(
      `SELECT post_content FROM linkedin_schedules 
       WHERE linkedin_post_id = (SELECT source_post_id FROM linkedin_discovery_sessions WHERE id = $1)`,
      [comment.session_id]
    );

    let actorUrn = null;
    if (sourcePostResult.rows.length > 0) {
      const postContent = typeof sourcePostResult.rows[0].post_content === 'string' 
        ? JSON.parse(sourcePostResult.rows[0].post_content) 
        : sourcePostResult.rows[0].post_content;
      actorUrn = postContent.authorUrn;
    }

    // Fallback: if we can't find the original authorUrn, we default to the personal profile
    if (!actorUrn) {
      let profileData;
      const mockReqProfile = { body: { accessToken: comment.linkedin_access_token } };
      const mockResProfile = {
        status: () => ({ json: (data) => { profileData = data; return mockResProfile; } }),
        json: (data) => { profileData = data; return mockResProfile; }
      };
      await handleGetProfile(mockReqProfile, mockResProfile);
      if (profileData && profileData.id) {
        actorUrn = `urn:li:person:${profileData.id}`;
      }
    }

    if (!actorUrn) {
        return res.status(500).json({ error: 'Could not determine actor URN for LinkedIn comment' });
    }

    const mockResponse = {
      status: (code) => ({
        json: (data) => { responseData = data; return mockResponse; }
      }),
      json: (data) => { responseData = data; return mockResponse; }
    };

    const finalText = escapeLinkedinText(textToPublish);

    const publishReq = {
        body: {
            accessToken: comment.linkedin_access_token,
            postUrn: comment.linkedin_post_id.startsWith('urn:li:') ? comment.linkedin_post_id : `urn:li:activity:${comment.linkedin_post_id}`,
            actorUrn: actorUrn,
            text: finalText
        }
    };

    await handleCreateComment(publishReq, mockResponse);

    if (responseData && responseData.id) {
        // 3. Update database
        await query(
            `UPDATE linkedin_generated_comments
             SET status = 'published', linkedin_comment_id = $1, published_at = NOW(), updated_at = NOW()
             WHERE id = $2`,
            [responseData.id, commentId]
        );
        return res.status(200).json({ success: true, commentId: responseData.id });
    } else {
        return res.status(500).json({ error: 'Failed to publish to LinkedIn', details: responseData });
    }
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'Internal error during publication', details: err.message });
  }
}

async function handleRegenerateComment(req, res, userId) {
  const { commentId } = req.body;

  const result = await query(
    `SELECT discovered_post_id, generation_version FROM linkedin_generated_comments WHERE id = $1 AND user_id = $2`,
    [commentId, userId]
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

  const { discovered_post_id, generation_version } = result.rows[0];

  try {
    const newComment = await generateCommentForPost(discovered_post_id, userId);

    // Increment version in the new record (or we could update the existing one,
    // but the document suggests versions)
    await query(
        'UPDATE linkedin_generated_comments SET generation_version = $1 WHERE id = $2',
        [generation_version + 1, newComment.id]
    );

    res.status(200).json(newComment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate comment', details: err.message });
  }
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
