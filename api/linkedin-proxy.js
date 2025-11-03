import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { kv } from './kv.js';
import fetch from 'node-fetch';

const LINKEDIN_API_VERSION = '202411';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function stripEmojis(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
}

function escapeLinkedinText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/([|{}@[\]()<>#*_~\\])/g, '\\$1');
}

// LinkedIn create post handler with full commentary and multi-image support
async function handleCreatePost(request, response) {
  try {
    const { action, accessToken, payload } = request.body;
    if (!accessToken || !payload) {
      return response.status(400).json({ error: 'Missing accessToken or payload for creating post.' });
    }

    let { targetId, targetType, commentary, content, images, video, title, author } = payload;
    let authorUrn;

    if (author) {
      authorUrn = author;
    } else if (targetId && targetType) {
      authorUrn = `urn:li:${targetType === 'organization' ? 'organization' : 'person'}:${targetId}`;
    }

    if (!authorUrn || (!commentary && !content)) {
      return response.status(400).json({ error: 'Missing author or commentary/content.' });
    }

    const textContent = stripEmojis(escapeLinkedinText(commentary || content || ''));
    const postData = {
      author: authorUrn,
      commentary: textContent,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };

    if (video) {
      postData.content = {
        media: { id: video, title: title || 'Video Post' }
      };
    } else if (images && images.length > 0) {
      const normalizedUrns = images.map(img => (typeof img === 'string' ? img : img.id)).filter(Boolean);
      if (normalizedUrns.length === 1) {
        postData.content = { media: { id: normalizedUrns[0] } };
      } else if (normalizedUrns.length > 1) {
        postData.content = {
          multiImage: {
            images: normalizedUrns.map(urn => ({ id: urn, altText: ' ' }))
          },
          contentFormat: 'MULTI_IMAGE'
        };
      }
    }

    console.log('[Proxy Fixed] Final postData before sending:', JSON.stringify(postData, null, 2));
    const url = 'https://api.linkedin.com/rest/posts';
    const linkedinResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_API_VERSION
      },
      body: JSON.stringify(postData)
    });

    // If the post was created successfully (201 Created), the ID is in the headers
    if (linkedinResponse.status === 201) {
      const postId = linkedinResponse.headers.get('x-restli-id');
      if (postId) {
        return response.status(200).json({ id: postId });
      }
    }

    const result = await linkedinResponse.json().catch(() => ({}));
    return response.status(linkedinResponse.status).json(result);
  } catch (error) {
    console.error('[FATAL] Error in handleCreatePost (fixed):', error);
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

export default handleCreatePost;
