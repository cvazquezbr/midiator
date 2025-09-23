import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { kv } from './kv.js';

const LINKEDIN_API_VERSION = '202411';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(fetch, url, options, retries = 5, initialBackoff = 3000) {
  let backoff = initialBackoff;
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    // Retry on rate limit or server errors
    if (response.status === 429 || response.status >= 500) {
      const isRateLimit = response.status === 429;
      const retryAfterHeader = response.headers.get('Retry-After');
      // Use Retry-After header if present (for 429), otherwise use exponential backoff
      const retryAfter = isRateLimit && retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : backoff;
      const jitter = Math.random() * 1000;

      const reason = isRateLimit ? "Rate limit hit" : `Server error (${response.status})`;
      console.warn(`${reason}. Retrying after ${Math.round((retryAfter + jitter)/1000)}s... (Attempt ${i + 1}/${retries})`);
      await delay(retryAfter + jitter);

      backoff *= 2;
      continue;
    }
    return response;
  }
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function handleTokenExchange(fetch, request, response) {
  const { code, redirectUri } = request.body;
  const userId = request.user.sub;
  if (!code || !redirectUri) return response.status(400).json({ error: 'Missing code or redirectUri for token exchange.' });
  const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } = process.env;
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) return response.status(400).json({ error: 'LinkedIn credentials not configured.' });

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET,
  });

  try {
    const linkedinResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await linkedinResponse.json();
    if (linkedinResponse.ok) {
        const { access_token, expires_in, refresh_token } = data;
        const expiryDate = new Date(Date.now() + expires_in * 1000);
        await query('UPDATE users SET linkedin_access_token = $1, linkedin_access_token_expiry = $2, linkedin_refresh_token = $3 WHERE id = $4', [access_token, expiryDate, refresh_token, userId]);
    }
    return response.status(linkedinResponse.status).json(data);
  } catch (error) {
    console.error('Error during token exchange:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

function stripEmojis(text) {
    if (!text) return text;
    // This regex removes most common emojis and symbols.
    return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
}

async function handleGenericPost(fetch, request, response, url) {
    const { accessToken, payload } = request.body;
    if (!accessToken || !payload) return response.status(400).json({ error: 'Missing accessToken or payload.' });
    try {
        // Ensure commentary is clean before sending
        if (payload.commentary) {
            payload.commentary = stripEmojis(payload.commentary);
        }

        const linkedinResponse = await fetchWithRetry(fetch, url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': LINKEDIN_API_VERSION },
            body: JSON.stringify(payload),
        });

        if (linkedinResponse.ok) {
            // For post creation, the ID is in the x-restli-id header.
            const postId = linkedinResponse.headers.get('x-restli-id');
            if (postId) {
                return response.status(linkedinResponse.status).json({ id: postId });
            }

            const responseText = await linkedinResponse.text();
            if (!responseText) {
                console.warn('[WARN] LinkedIn API returned 200 OK with an empty response body.');
                return response.status(200).json({ value: { warning: 'Empty response from LinkedIn API.' } });
            }
            try {
                const data = JSON.parse(responseText);
                return response.status(linkedinResponse.status).json(data.value || data);
            } catch (e) {
                console.warn(`[WARN] LinkedIn API returned 200 OK but with invalid JSON body: ${responseText}`);
                return response.status(200).json({ value: { warning: 'Invalid JSON response from LinkedIn API.', body: responseText } });
            }
        } else {
            // Handle error response
            const errorBody = await linkedinResponse.text();
            console.error(`[ERROR] LinkedIn API responded with status ${linkedinResponse.status}:`, errorBody);
            try {
                // Try to parse the error body as JSON, as LinkedIn often returns structured errors.
                const errorJson = JSON.parse(errorBody);
                return response.status(linkedinResponse.status).json(errorJson);
            } catch (e) {
                // If the error body is not JSON, return it as a plain text message.
                return response.status(linkedinResponse.status).json({ message: errorBody });
            }
        }
    } catch (error) {
        console.error(`[FATAL] Error during POST to ${url}:`, error.message, error.stack);
        return response.status(500).json({
            error: `Internal Server Error during POST to ${url}`,
            details: error.message,
            stack: error.stack,
        });
    }
}

async function handleUploadVideo(fetch, request, response) {
  const { uploadUrl, videoBase64, videoContentType } = request.body;
  if (!uploadUrl || !videoBase64 || !videoContentType) return response.status(400).json({ error: 'Missing parameters for video part upload.' });

  const videoBuffer = Buffer.from(videoBase64, 'base64');
  try {
    const linkedinResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': videoContentType }, body: videoBuffer });
    if (!linkedinResponse.ok) {
      const errorText = await linkedinResponse.text();
      console.error("LinkedIn Video Part Upload Error Body:", errorText);
      return response.status(linkedinResponse.status).json({ message: `Failed to upload video part. Status: ${linkedinResponse.status}` });
    }
    const eTag = linkedinResponse.headers.get('ETag');
    if (!eTag) return response.status(500).json({ message: 'ETag missing from LinkedIn upload response.' });
    return response.status(200).json({ eTag: eTag.replace(/"/g, '') });
  } catch (error) {
    console.error('Error during video part upload:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleCheckVideoStatus(fetch, request, response) {
    const { accessToken, videoUrn } = request.body;
    if (!videoUrn) return response.status(400).json({ error: 'Missing videoUrn' });
    const statusUrl = `https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`;
    try {
        const linkedinResponse = await fetch(statusUrl, { headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': LINKEDIN_API_VERSION } });
        const data = await linkedinResponse.json();
        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error checking video status:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleGetProfile(fetch, request, response) {
    const { accessToken } = request.body;
    if (!accessToken) return response.status(400).json({ error: 'Missing accessToken for getProfile.' });
    const profileUrl = 'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))';
    try {
        const linkedinResponse = await fetch(profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await linkedinResponse.json();
        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error during proxied getProfile:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleUploadImage(fetch, request, response) {
  const { accessToken, uploadUrl, imageBase64, imageType } = request.body;
  if (!accessToken || !uploadUrl || !imageBase64 || !imageType) return response.status(400).json({ error: 'Missing parameters for image upload.' });
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  try {
    const linkedinResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': imageType }, body: imageBuffer });
    return response.status(linkedinResponse.status).json({ success: true });
  } catch (error) {
    console.error('Error during image upload:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleCreatePost(fetch, request, response) {
    try {
        const { accessToken, payload } = request.body;
        if (!accessToken || !payload) {
            return response.status(400).json({ error: 'Missing accessToken or payload for creating post.' });
        }

        console.log('[DEBUG] Entering handleCreatePost with received payload:', JSON.stringify(payload, null, 2));

        // Make the function more flexible by handling both formats from the UI and the scheduler.
        let { targetId, targetType, content, images, video, title, author } = payload;
        let authorUrn;

        if (author) {
            // Format sent by the scheduler, which already has the full URN.
            authorUrn = author;
        } else if (targetId && targetType) {
            // Format sent by the user-facing UI.
            authorUrn = `urn:li:${targetType === 'organization' ? 'organization' : 'person'}:${targetId}`;
        }

        // Validate that we have the necessary information to proceed.
        if (!authorUrn || !content) {
             console.error('[DEBUG] Validation failed in handleCreatePost:', { authorUrn, contentExists: !!content });
             return response.status(400).json({ error: 'Missing author information or content for creating post.' });
        }

        // Base structure for the new Posts API
        const postData = {
            author: authorUrn,
            commentary: content,
            visibility: "PUBLIC",
            distribution: {
                feedDistribution: "MAIN_FEED",
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            lifecycleState: "PUBLISHED",
            isReshareDisabledByAuthor: false
        };

        if (video) {
            postData.content = {
                media: {
                    id: video,
                    title: title || 'Video Post'
                }
            };
        } else if (images && images.length > 0) {
            if (images.length === 1) {
                // Single image post
                postData.content = {
                    media: {
                        id: images[0]
                    }
                };
            } else {
                // Multi-image post
                postData.content = {
                    multiImage: {
                        images: images.map(urn => ({ id: urn }))
                    }
                };
            }
        }

        console.log('[DEBUG] Calling handleGenericPost with new Posts API payload:', JSON.stringify(postData, null, 2));

        return handleGenericPost(fetch, { ...request, body: { accessToken, payload: postData } }, response, 'https://api.linkedin.com/rest/posts');
    } catch (error) {
        console.error('[FATAL] Unhandled exception in handleCreatePost:', error);
        return response.status(500).json({ error: 'An unexpected error occurred in handleCreatePost.' });
    }
}

async function handleGetProfiles(fetch, request, response) {
  const { accessToken, forceRefresh } = request.body;
  if (!accessToken) return response.status(400).json({ error: 'Missing accessToken for getProfiles.' });
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': LINKEDIN_API_VERSION };
  try {
    const [personalResponse, orgAclsResponse] = await Promise.all([
      fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', { headers }),
      fetch('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED', { headers })
    ]);
    if (!personalResponse.ok) throw new Error(`Failed to fetch personal profile: ${personalResponse.status}`);
    const personalData = await personalResponse.json();
    const personal = { id: personalData.id, name: `${personalData.firstName.localized.pt_BR || personalData.firstName.localized.en_US} ${personalData.lastName.localized.pt_BR || personalData.lastName.localized.en_US}`, type: 'person', profilePicture: personalData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier };
    let organizations = [];
    if (orgAclsResponse.ok) {
      const orgAclsData = await orgAclsResponse.json();

      const allowedRoles = new Set(['ADMINISTRATOR', 'CONTENT_ADMINISTRATOR']);
      const approvedAcls = orgAclsData.elements?.filter(acl => allowedRoles.has(acl.role)) || [];

      if (approvedAcls.length > 0) {
        const allOrgDetails = [];
        for (const acl of approvedAcls) {
            const orgId = acl.organization.split(':').pop();
            const cacheKey = `linkedin:org:${orgId}`;
            let orgData = null;

            if (!forceRefresh) {
                const cached = await kv.get(cacheKey);
                if (cached) {
                    orgData = JSON.parse(cached);
                }
            }

            if (!orgData) {
                const orgUrl = `https://api.linkedin.com/rest/organizations/${orgId}`;
                try {
                    const orgResponse = await fetchWithRetry(fetch, orgUrl, { headers });
                    if (orgResponse.ok) {
                        orgData = await orgResponse.json();
                        await kv.set(cacheKey, JSON.stringify(orgData), 'EX', 3600);
                    }
                } catch (error) {
                    console.error(`Failed to fetch details for org ${orgId}:`, error);
                }
            }

            if (orgData) {
                allOrgDetails.push({ id: orgId, ...orgData });
            }
            await delay(200); // 200ms delay between each request
        }

        organizations = allOrgDetails.map(details => {
            const acl = approvedAcls.find(a => a.organization.endsWith(details.id));
            return {
                id: details.id,
                name: details.localizedName || 'Nome Indisponível',
                role: acl?.role,
                logo: details.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier,
                type: 'organization'
            };
        });
      }
    }
    return response.status(200).json({ personal, organizations, hasOrganizations: organizations.length > 0 });
  } catch (error) {
    console.error('Error in handleGetProfiles:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

// For server-to-server calls (e.g., scheduler)
async function handleRefreshTokenInternal(fetch, userId) {
    if (!userId) {
        throw new Error('User ID is required for internal token refresh.');
    }

    const { rows } = await query('SELECT linkedin_refresh_token FROM users WHERE id = $1', [userId]);
    if (rows.length === 0 || !rows[0].linkedin_refresh_token) {
        throw new Error(`Refresh token not found for user ${userId}.`);
    }

    const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } = process.env;
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
        throw new Error('LinkedIn credentials not configured.');
    }

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: rows[0].linkedin_refresh_token,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET
    });

    const linkedinResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const data = await linkedinResponse.json();

    if (linkedinResponse.ok) {
        const { access_token, expires_in, refresh_token } = data;
        await query(
            'UPDATE users SET linkedin_access_token = $1, linkedin_access_token_expiry = $2, linkedin_refresh_token = $3 WHERE id = $4',
            [access_token, new Date(Date.now() + expires_in * 1000), refresh_token || rows[0].linkedin_refresh_token, userId]
        );
        return { success: true, accessToken: access_token };
    } else {
        // Construct a meaningful error from LinkedIn's response
        const errorMessage = data.error_description || data.error || `LinkedIn API error with status ${linkedinResponse.status}`;
        throw new Error(errorMessage);
    }
}

// For user-initiated calls (e.g., from the frontend)
async function handleRefreshToken(fetch, request, response) {
    const userId = request.user?.sub;
    if (!userId) {
        return response.status(401).json({ error: 'User not authenticated.' });
    }
    try {
        const result = await handleRefreshTokenInternal(fetch, userId);
        return response.status(200).json({ accessToken: result.accessToken });
    } catch (error) {
        console.error(`Error refreshing LinkedIn token for user ${userId}:`, error.message);
        return response.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}


async function handleGetShareStatistics(fetch, request, response) {
    const { accessToken, payload } = request.body;
    const { authorUrn, shareUrns } = payload;

    if (!accessToken || !authorUrn || !shareUrns || !Array.isArray(shareUrns)) {
        return response.status(400).json({ error: 'Missing accessToken, authorUrn, or shareUrns in payload.' });
    }

    const shareUrnsForApi = shareUrns.filter(u => u.includes(':share:'));
    const ugcPostUrnsForApi = shareUrns.filter(u => u.includes(':ugcPost:') || u.includes(':carousel:'));

    const fetchPromises = [];
    const baseUrl = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(authorUrn)}`;

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_API_VERSION
    };

    // Create a fetch promise for share URNs if they exist
    if (shareUrnsForApi.length > 0) {
        const sharesQueryParam = `shares=List(${shareUrnsForApi.map(urn => encodeURIComponent(urn)).join(',')})`;
        const url = `${baseUrl}&${sharesQueryParam}`;
        fetchPromises.push(fetchWithRetry(fetch, url, { method: 'GET', headers }));
    }

    // Create a fetch promise for UGC post URNs if they exist
    if (ugcPostUrnsForApi.length > 0) {
        const ugcPostsQueryParam = ugcPostUrnsForApi.map((urn, index) => `ugcPosts[${index}]=${encodeURIComponent(urn)}`).join('&');
        const url = `${baseUrl}&${ugcPostsQueryParam}`;
        fetchPromises.push(fetchWithRetry(fetch, url, { method: 'GET', headers }));
    }

    if (fetchPromises.length === 0) {
        return response.status(200).json({ elements: [] }); // Nothing to fetch
    }

    try {
        const responses = await Promise.all(fetchPromises);
        let allElements = [];
        let firstError = null;

        for (const res of responses) {
            const data = await res.json();
            if (res.ok) {
                if (data.elements) {
                    allElements = allElements.concat(data.elements);
                }
            } else {
                console.error(`[ERROR] LinkedIn Stats API responded with status ${res.status} for author ${authorUrn}:`, data);
                if (!firstError) {
                    firstError = { status: res.status, data };
                }
            }
        }

        if (firstError && allElements.length === 0) {
             return response.status(firstError.status).json(firstError.data);
        }

        return response.status(200).json({ elements: allElements });

    } catch (error) {
        console.error(`[FATAL] Error during handleGetShareStatistics:`, error.message, error.stack);
        return response.status(500).json({
            error: `Internal Server Error during GET to organizationalEntityShareStatistics`,
            details: error.message,
        });
    }
}

async function handleGetMemberPostStatistics(fetch, request, response) {
    const { accessToken, payload } = request.body;
    const { ugcPostUrn, queryType, aggregation, dateRange } = payload;

    if (!accessToken || !ugcPostUrn || !queryType || !aggregation || !dateRange) {
        return response.status(400).json({ error: 'Missing required parameters for member post statistics.' });
    }

    // This is the final attempt to fix the 404 error for this endpoint.
    // Instead of the complex `entity=(ugc:...)` format, we try a simpler `entity=urn` format.
    const url = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=entity&entity=${encodeURIComponent(ugcPostUrn)}&queryType=${queryType}&aggregation=${aggregation}&dateRange=(start:(day:${dateRange.start.day},month:${dateRange.start.month},year:${dateRange.start.year}),end:(day:${dateRange.end.day},month:${dateRange.end.month},year:${dateRange.end.year}))`;

    try {
        const linkedinResponse = await fetchWithRetry(fetch, url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
        });

        const data = await linkedinResponse.json();

        if (linkedinResponse.ok) {
            return response.status(200).json(data);
        } else {
            console.error(`[ERROR] LinkedIn Member Post Stats API responded with status ${linkedinResponse.status} for post ${ugcPostUrn}:`, data);
            return response.status(linkedinResponse.status).json(data);
        }
    } catch (error) {
        console.error(`[FATAL] Error during GET to ${url}:`, error.message, error.stack);
        return response.status(500).json({
            error: `Internal Server Error during GET to ${url}`,
            details: error.message,
        });
    }
}

const protectedHandler = async (request, response) => {
  const fetch = (await import('node-fetch')).default;
  const { action } = request.body;
  switch (action) {
    case 'tokenExchange': return handleTokenExchange(fetch, request, response);
    case 'refreshToken': return handleRefreshToken(fetch, request, response);
    case 'testConnection': return handleGetProfile(fetch, request, response);
    case 'getProfile': return handleGetProfile(fetch, request, response);
    case 'registerUpload': return handleGenericPost(fetch, request, response, 'https://api.linkedin.com/rest/images?action=initializeUpload');
    case 'uploadImage': return handleUploadImage(fetch, request, response);
    case 'createPost': return handleCreatePost(fetch, request, response);
    case 'getProfiles': return handleGetProfiles(fetch, request, response);
    case 'getShareStatistics': return handleGetShareStatistics(fetch, request, response);
    case 'getMemberPostStatistics': return handleGetMemberPostStatistics(fetch, request, response);
    case 'initializeVideoUpload': return handleGenericPost(fetch, request, response, 'https://api.linkedin.com/rest/videos?action=initializeUpload');
    case 'uploadVideo': return handleUploadVideo(fetch, request, response);
    case 'finalizeVideoUpload': return handleGenericPost(fetch, request, response, 'https://api.linkedin.com/rest/videos?action=finalizeUpload');
    case 'checkVideoStatus': return handleCheckVideoStatus(fetch, request, response);
    case 'getClientId': return response.status(200).json({ clientId: process.env.LINKEDIN_CLIENT_ID });
    default: return response.status(400).json({ error: `Invalid action specified: ${action}` });
  }
};

const SCHEDULER_ACTIONS = new Set([
  'refreshTokenInternal',
  'createPost',
  'registerUpload',
  'uploadImage',
  'initializeVideoUpload',
  'uploadVideo',
  'finalizeVideoUpload',
  'checkVideoStatus'
]);

// This handler is for requests that are authenticated via a shared secret.
const internalRequestHandler = async (request, response) => {
    const { action, userId } = request.body;
    const fetch = (await import('node-fetch')).default;

    if (action === 'refreshTokenInternal') {
        try {
            const result = await handleRefreshTokenInternal(fetch, userId);
            return response.status(200).json(result);
        } catch (error) {
            console.error(`[INTERNAL] Error refreshing token for user ${userId}:`, error.message);
            return response.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }

    // Other scheduler actions can be handled by the protectedHandler, which we call directly, bypassing withAuth.
    // The protectedHandler will get the accessToken from the request body, which is what the scheduler provides.
    return protectedHandler(request, response);
}


const mainHandler = async (request, response) => {
    const { action } = request.body;

    // Check for internal, server-to-server requests from the scheduler
    const internalSecret = request.headers['x-internal-secret'] || request.headers['X-Internal-Secret'];
    if (SCHEDULER_ACTIONS.has(action) && internalSecret && internalSecret === process.env.INTERNAL_API_SECRET) {
        console.log(`[Proxy] Executing internal action via secret: ${action}`);
        return internalRequestHandler(request, response);
    }

    // Default to the standard, user-facing authentication flow which requires a JWT cookie
    console.log(`[Proxy] Executing user-facing action: ${action}`);
    return withAuth(protectedHandler)(request, response);
};

export default mainHandler;
