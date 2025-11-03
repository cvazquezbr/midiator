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

async function handleExchangeCode(request, response) {
    const { code, redirectUri } = request.body;
    if (!code) {
        return response.status(400).json({ error: 'Authorization code is missing.' });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return response.status(500).json({ error: 'LinkedIn API credentials are not configured on the server.' });
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri || `${process.env.VITE_API_BASE_URL}`);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    try {
        const linkedinResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        const data = await linkedinResponse.json();

        if (!linkedinResponse.ok) {
            return response.status(linkedinResponse.status).json({
                error: 'Failed to exchange authorization code for token.',
                details: data.error_description || data.error || 'Unknown error from LinkedIn.',
            });
        }

        return response.status(200).json(data);
    } catch (error) {
        console.error('Error exchanging LinkedIn auth code:', error);
        return response.status(500).json({ error: 'An internal error occurred while communicating with LinkedIn.' });
    }
}


// LinkedIn create post handler with full commentary and multi-image support
async function handleCreatePost(request, response) {
  try {
    const { accessToken, payload } = request.body;
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

    if (linkedinResponse.status === 201) {
      const postId = linkedinResponse.headers.get('x-restli-id');
      if (postId) {
        return response.status(200).json({ id: postId });
      }
    }

    const result = await linkedinResponse.json().catch(() => ({}));
    return response.status(linkedinResponse.status).json(result);
  } catch (error) {
    console.error('[FATAL] Error in handleCreatePost:', error);
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

async function handler(request, response) {
    const { action } = request.body;

    if (action === 'getClientId') {
        return response.status(200).json({ clientId: process.env.LINKEDIN_CLIENT_ID });
    }

    if (action === 'exchangeCode') {
        return handleExchangeCode(request, response);
    }

    // For all other actions, apply the auth middleware
    return withAuth(async (req, res) => {
        const { action } = req.body;
        switch (action) {
            case 'createPost':
                return handleCreatePost(req, res);
            // Add other authenticated actions here
            default:
                return res.status(400).json({ error: `Action '${action}' not supported.` });
        }
    })(request, response);
}

export default handler;
