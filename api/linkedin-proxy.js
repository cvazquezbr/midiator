import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { kv } from './kv.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(fetch, url, options, retries = 5, initialBackoff = 3000) {
  let backoff = initialBackoff;
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : backoff;
      const jitter = Math.random() * 1000;

      console.warn(`Rate limit hit. Retrying after ${Math.round((retryAfter + jitter)/1000)}s... (Attempt ${i + 1}/${retries})`);
      await delay(retryAfter + jitter);

      backoff *= 2;
      continue;
    }
    return response;
  }
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts due to rate limiting.`);
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

async function handleGenericPost(fetch, request, response, url) {
    const { accessToken, payload } = request.body;
    if (!accessToken || !payload) return response.status(400).json({ error: 'Missing accessToken or payload.' });
    try {
        const linkedinResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': '202507' },
            body: JSON.stringify(payload),
        });
        const data = await linkedinResponse.json();
        return response.status(linkedinResponse.status).json(linkedinResponse.ok ? data.value || data : data);
    } catch (error) {
        console.error(`Error during POST to ${url}:`, error);
        return response.status(500).json({ error: 'Internal Server Error' });
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
        const linkedinResponse = await fetch(statusUrl, { headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': '202507' } });
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
    return response.status(linkedinResponse.status).send();
  } catch (error) {
    console.error('Error during image upload:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleCreatePost(fetch, request, response) {
    const { accessToken, payload } = request.body;
    if (!accessToken || !payload) return response.status(400).json({ error: 'Missing accessToken or payload for creating post.' });
    const { author, content, images } = payload;
    if (!author || !content) return response.status(400).json({ error: 'Missing author or content for creating post.' });
    const shareContent = { shareCommentary: { text: content }, shareMediaCategory: (images && images.length > 0) ? 'IMAGE' : 'NONE' };
    if (images && images.length > 0) {
        shareContent.media = images.map(assetURN => ({ status: 'READY', media: assetURN }));
    }
    const postData = { author, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': shareContent }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } };
    return handleGenericPost(fetch, { ...request, body: { accessToken, payload: postData } }, response, 'https://api.linkedin.com/rest/posts');
}

async function handleGetProfiles(fetch, request, response) {
  const { accessToken, forceRefresh } = request.body;
  if (!accessToken) return response.status(400).json({ error: 'Missing accessToken for getProfiles.' });
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': '202507' };
  try {
    const [personalResponse, orgAclsResponse] = await Promise.all([
      fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', { headers }),
      fetch('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED', { headers })
    ]);
    if (!personalResponse.ok) throw new Error(`Failed to fetch personal profile: ${personalResponse.status}`);
    const personalData = await personalResponse.json();
    const personal = { id: personalData.id, name: `${personalData.firstName.localized.pt_BR || personalData.firstName.localized.en_US} ${personalData.lastName.localized.pt_BR || personalData.lastName.localized.en_US}`, type: 'personal', profilePicture: personalData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier };
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

async function handleRefreshToken(fetch, request, response) {
    const userId = request.user?.sub || request.body.userId;
    if (!userId) return response.status(400).json({ error: 'User ID not provided.' });
    try {
        const { rows } = await query('SELECT linkedin_refresh_token FROM users WHERE id = $1', [userId]);
        if (rows.length === 0 || !rows[0].linkedin_refresh_token) return response.status(400).json({ error: 'Refresh token not found.' });
        const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } = process.env;
        if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) return response.status(400).json({ error: 'LinkedIn credentials not configured.' });
        const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rows[0].linkedin_refresh_token, client_id: LINKEDIN_CLIENT_ID, client_secret: LINKEDIN_CLIENT_SECRET });
        const linkedinResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
        const data = await linkedinResponse.json();
        if (linkedinResponse.ok) {
            const { access_token, expires_in } = data;
            await query('UPDATE users SET linkedin_access_token = $1, linkedin_access_token_expiry = $2 WHERE id = $3', [access_token, new Date(Date.now() + expires_in * 1000), userId]);
            return response.status(200).json({ accessToken: access_token });
        }
        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error refreshing LinkedIn token:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

const mainHandler = async (request, response) => {
  const fetch = (await import('node-fetch')).default;
  const { action } = request.body;
  switch (action) {
    case 'tokenExchange': return handleTokenExchange(fetch, request, response);
    case 'refreshToken': return handleRefreshToken(fetch, request, response);
    case 'testConnection': return handleGetProfile(fetch, request, response);
    case 'getProfile': return handleGetProfile(fetch, request, response);
    case 'registerUpload': return handleGenericPost(fetch, request, response, 'https://api.linkedin.com/v2/assets?action=registerUpload');
    case 'uploadImage': return handleUploadImage(fetch, request, response);
    case 'createPost': return handleCreatePost(fetch, request, response);
    case 'getProfiles': return handleGetProfiles(fetch, request, response);
    case 'initializeVideoUpload': return handleGenericPost(fetch, request, response, 'https://api.linkedin.com/rest/videos?action=initializeUpload');
    case 'uploadVideo': return handleUploadVideo(fetch, request, response);
    case 'finalizeVideoUpload': return handleGenericPost(fetch, request, response, 'https://api.linkedin.com/rest/videos?action=finalizeUpload');
    case 'checkVideoStatus': return handleCheckVideoStatus(fetch, request, response);
    case 'getClientId': return response.status(200).json({ clientId: process.env.LINKEDIN_CLIENT_ID });
    default: return response.status(400).json({ error: `Invalid action specified: ${action}` });
  }
};

export default withAuth(mainHandler);
