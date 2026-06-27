import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { delay, fetchWithRetry, parseBody } from './utils.js';

const LINKEDIN_API_VERSION = '202601';

// A general-purpose, action-based proxy for LinkedIn API calls.
async function handleTokenExchange(request, response) {
    const { code, redirectUri } = request.body;
    const userId = request.user.sub;

    if (!code || !redirectUri) {
        return response.status(400).json({ error: 'Missing code or redirectUri for token exchange.' });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return response.status(400).json({ error: 'LinkedIn credentials not configured in environment variables.' });
    }

    const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
    });

    try {
        const linkedinResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        const responseText = await linkedinResponse.text();
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            data = { raw: responseText };
        }

        if (linkedinResponse.ok) {
            const { access_token, expires_in, refresh_token } = data;
            const expiryDate = new Date(Date.now() + expires_in * 1000);

            await query(
                `UPDATE users SET
                    linkedin_access_token = $1,
                    linkedin_access_token_expiry = $2,
                    linkedin_refresh_token = $3
                WHERE id = $4`,
                [access_token, expiryDate, refresh_token, userId]
            );

            return response.status(200).json({
                access_token: access_token,
                expires_in: expires_in
            });
        }

        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error during token exchange:', error);
        return response.status(500).json({ error: 'Internal Server Error during token exchange' });
    }
}

async function handleGetProfiles(request, response) {
    const { accessToken } = request.body;

    if (!accessToken) {
        return response.status(400).json({ error: 'Missing accessToken for getProfiles.' });
    }

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_API_VERSION
    };

    try {
        // Step 1: Fetch personal profile (me?fields=...) - This usually works with 202601
        let personalResponse = await fetch('https://api.linkedin.com/rest/me?fields=id,givenName,familyName,picture', { headers });

        if (!personalResponse.ok && personalResponse.status === 400) {
            console.warn('[LinkedIn Proxy] getProfiles: Projection failed, retrying me without fields.');
            personalResponse = await fetch('https://api.linkedin.com/rest/me', { headers });
        }

        if (!personalResponse.ok) {
            const errorText = await personalResponse.text();
            if (personalResponse.status === 401) {
                return response.status(401).json({ error: 'Invalid or expired LinkedIn access token.' });
            }
            throw new Error(`Failed to fetch personal profile: ${personalResponse.status} - ${errorText}`);
        }

        const personalData = await personalResponse.json();

        const getLocalized = (obj) => {
            if (!obj) return '';
            if (typeof obj === 'string') return obj;
            if (obj.localized) {
                const locale = Object.keys(obj.localized)[0];
                return obj.localized[locale] || '';
            }
            if (obj.preferredLocale && obj.localized) {
               const localeKey = `${obj.preferredLocale.language}_${obj.preferredLocale.country}`;
               return obj.localized[localeKey] || obj.localized[Object.keys(obj.localized)[0]] || '';
            }
            return '';
        };

        const firstName = getLocalized(personalData.givenName || personalData.firstName || personalData.localizedFirstName);
        const lastName = getLocalized(personalData.familyName || personalData.lastName || personalData.localizedLastName);
        const profilePicture = personalData.picture || personalData.profilePicture || '';

        const personal = {
            id: personalData.id,
            name: `${firstName} ${lastName}`.trim() || 'Usuário do LinkedIn',
            type: 'person',
            profilePicture: profilePicture
        };

        // Step 2: Fetch organization ACLs
        // We will try an exhaustive search across endpoints and URN types.
        const tryFetchAcls = async (endpoint, assigneeUrn, useVersion = true) => {
            const baseUrl = useVersion ? 'https://api.linkedin.com/rest' : 'https://api.linkedin.com/v2';
            let q = 'roleAssignee';
            if (endpoint === 'memberAssignments') q = 'member';

            const url = `${baseUrl}/${endpoint}?q=${q}&${q}=${encodeURIComponent(assigneeUrn)}`;

            const requestHeaders = { ...headers };
            if (!useVersion) delete requestHeaders['LinkedIn-Version'];

            console.log(`[LinkedIn Proxy] Fetching ACLs: ${url} (v:${useVersion})`);
            try {
                const res = await fetch(url, { headers: requestHeaders });
                let data = null;
                let text = '';
                try {
                    text = await res.text();
                    data = JSON.parse(text);
                } catch (e) {
                    // If JSON parse fails, we still have the text or at least the status
                }
                return { ok: res.ok, status: res.status, data, endpoint, assigneeUrn, useVersion, text };
            } catch (e) {
                console.error(`[LinkedIn Proxy] Fetch Error for ${endpoint}:`, e.message);
                return { ok: false, status: 'error', message: e.message, endpoint, assigneeUrn, useVersion };
            }
        };

        const assigneeUrns = [`urn:li:person:${personalData.id}`, `urn:li:member:${personalData.id}`];
        const endpoints = ['organizationalEntityAcls', 'organizationAcls', 'brandAcls', 'memberAssignments'];

        let allAclElements = [];
        let debugInfo = [];

        for (const urn of assigneeUrns) {
            for (const endpoint of endpoints) {
                // Try versioned first (if requested version is supported)
                let result = await tryFetchAcls(endpoint, urn, true);

                // If versioned fails or returns nothing, try unversioned
                if (!result.ok || !result.data?.elements || result.data.elements.length === 0) {
                    const v2Result = await tryFetchAcls(endpoint, urn, false);
                    if (v2Result.ok && v2Result.data?.elements?.length > 0) {
                        result = v2Result;
                    }
                    debugInfo.push({ endpoint: `${endpoint}${result.useVersion ? '' : ' (v2)'}`, status: result.status, count: result.data?.elements?.length || 0, urn });
                } else {
                    debugInfo.push({ endpoint, status: result.status, count: result.data.elements.length, urn });
                }

                if (result.ok && result.data && result.data.elements) {
                    allAclElements = allAclElements.concat(result.data.elements);
                }
            }
        }

        // Deduplicate elements by organization URN
        const uniqueAclElements = [];
        const seenOrgUrns = new Set();
        for (const el of allAclElements) {
            const urn = el.organizationalEntity || el.organization || el.brand || el.organizationalTarget;
            if (urn && !seenOrgUrns.has(urn)) {
                uniqueAclElements.push(el);
                seenOrgUrns.add(urn);
            }
        }

        let organizations = [];
        if (uniqueAclElements.length > 0) {
            const orgUrns = uniqueAclElements.map(el => el.organizationalEntity || el.organization || el.brand || el.organizationalTarget).filter(Boolean);
            const orgIds = [...new Set(orgUrns.map(urn => urn.split(':').pop()))];

            // Fetch organization details in batch (202601 usually works for this)
            const batchOrgUrl = `https://api.linkedin.com/rest/organizations?ids=List(${orgIds.join(',')})`;
            const batchOrgResponse = await fetch(batchOrgUrl, { headers });

            if (batchOrgResponse.ok) {
                const batchOrgData = await batchOrgResponse.json();
                organizations = uniqueAclElements.map(acl => {
                    const orgUrn = acl.organizationalEntity || acl.organization || acl.brand || acl.organizationalTarget;
                    const orgId = orgUrn.split(':').pop();
                    const orgDetails = batchOrgData.results[orgId] || batchOrgData.results[orgUrn] || batchOrgData.results[`urn:li:organization:${orgId}`];
                    const orgName = getLocalized(orgDetails?.localizedName || orgDetails?.name);

                    return {
                        id: orgId,
                        name: orgName || `Página ${orgId}`,
                        role: acl.role,
                        logo: orgDetails?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier,
                        type: 'organization'
                    };
                });
            } else {
                console.warn(`[LinkedIn Proxy] Failed to fetch organization details: ${batchOrgResponse.status}`);
                // Fallback to stubs
                organizations = uniqueAclElements.map(acl => {
                    const orgUrn = acl.organizationalEntity || acl.organization || acl.brand || acl.organizationalTarget;
                    const orgId = orgUrn.split(':').pop();
                    return { id: orgId, name: `Página (ID: ${orgId})`, role: acl.role, type: 'organization' };
                });
            }
        }

        return response.status(200).json({
            personal,
            organizations,
            hasOrganizations: organizations.length > 0,
            _debug: debugInfo
        });

    } catch (error) {
        console.error('Error in handleGetProfiles:', error);
        return response.status(500).json({ error: 'Internal Server Error while fetching profiles.' });
    }
}

async function handleInitializeVideoUpload(request, response) {
    const { accessToken, payload } = request.body;
    const initializeUrl = 'https://api.linkedin.com/rest/videos?action=initializeUpload';
    try {
        const res = await fetch(initializeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        return response.status(res.status).json(res.ok ? data.value : data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleUploadVideo(request, response) {
    const { uploadUrl, videoBase64, videoContentType } = request.body;
    try {
        const res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': videoContentType },
            body: Buffer.from(videoBase64, 'base64'),
        });
        if (!res.ok) return response.status(res.status).json({ error: 'Upload failed' });
        const eTag = res.headers.get('ETag');
        return response.status(200).json({ eTag: eTag.replace(/"/g, '') });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleFinalizeVideoUpload(request, response) {
    const { accessToken, payload } = request.body;
    const finalizeUrl = 'https://api.linkedin.com/rest/videos?action=finalizeUpload';
    try {
        const res = await fetch(finalizeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
            body: JSON.stringify(payload)
        });
        return response.status(res.status).send();
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleCheckVideoStatus(request, response) {
    const { accessToken, videoUrn } = request.body;
    const statusUrl = `https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`;
    try {
        const res = await fetch(statusUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            }
        });
        const data = await res.json();
        return response.status(res.status).json({ status: data.status });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleCreatePost(request, response) {
    const { accessToken, payload } = request.body;
    const createPostUrl = 'https://api.linkedin.com/rest/posts';
    try {
        const res = await fetch(createPostUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data = {};
        try { data = JSON.parse(text); } catch(e) {}
        if (res.headers.get('x-restli-id')) data.id = res.headers.get('x-restli-id');
        return response.status(res.status).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleUploadAndCheckImage(request, response) {
    const { accessToken, authorUrn, imageBase64, imageType } = request.body;
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_API_VERSION
    };
    try {
        const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
            method: 'POST',
            headers,
            body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
        });
        const initData = await initRes.json();
        if (!initRes.ok) return response.status(initRes.status).json(initData);

        const uploadRes = await fetch(initData.value.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': imageType },
            body: Buffer.from(imageBase64, 'base64'),
        });
        if (!uploadRes.ok) return response.status(uploadRes.status).json({ error: 'Image upload failed' });

        return response.status(200).json({ assetUrn: initData.value.image });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleRefreshToken(request, response) {
    const userId = request.user?.sub || request.body.userId;
    if (!userId) return response.status(400).json({ error: 'User ID not provided.' });

    try {
        const { rows } = await query('SELECT linkedin_refresh_token FROM users WHERE id = $1', [userId]);
        if (rows.length === 0 || !rows[0].linkedin_refresh_token) return response.status(400).json({ error: 'Refresh token not found.' });

        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: rows[0].linkedin_refresh_token,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        });

        const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });
        const data = await res.json();
        if (res.ok) {
            const expiryDate = new Date(Date.now() + data.expires_in * 1000);
            await query('UPDATE users SET linkedin_access_token = $1, linkedin_access_token_expiry = $2 WHERE id = $3', [data.access_token, expiryDate, userId]);
            return response.status(200).json({ accessToken: data.access_token });
        }
        return response.status(res.status).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleGetShareStatistics(request, response) {
    const { accessToken, payload } = request.body;
    const { authorUrn, shareUrns } = payload;
    const shares = shareUrns.filter(u => u.includes(':share:'));
    const ugcPosts = shareUrns.filter(u => u.includes(':ugcPost:') || u.includes(':carousel:'));
    let url = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(authorUrn)}`;
    if (shares.length > 0) url += `&shares=List(${shares.map(u => encodeURIComponent(u)).join(',')})`;
    if (ugcPosts.length > 0) url += `&ugcPosts=List(${ugcPosts.map(u => encodeURIComponent(u)).join(',')})`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': LINKEDIN_API_VERSION } });
        const data = await res.json();
        return response.status(res.status).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleGetMemberPostStatistics(request, response) {
    const { accessToken, payload } = request.body;
    const { ugcPostUrn, queryType, aggregation, dateRange } = payload;
    const url = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=ugcPost&ugcPost=${encodeURIComponent(ugcPostUrn)}&queryType=${queryType}&aggregation=${aggregation}&dateRange=(start:(day:${dateRange.start.day},month:${dateRange.start.month},year:${dateRange.start.year}),end:(day:${dateRange.end.day},month:${dateRange.end.month},year:${dateRange.end.year}))`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': LINKEDIN_API_VERSION } });
        const data = await res.json();
        data.urn = ugcPostUrn;
        return response.status(res.status).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

const protectedHandler = async (request, response) => {
    const { action } = request.body;
    switch (action) {
        case 'tokenExchange': return handleTokenExchange(request, response);
        case 'refreshToken': return handleRefreshToken(request, response);
        case 'testConnection':
        case 'getProfile': return handleGetProfile(request, response);
        case 'createPost': return handleCreatePost(request, response);
        case 'getProfiles': return handleGetProfiles(request, response);
        case 'initializeVideoUpload': return handleInitializeVideoUpload(request, response);
        case 'uploadVideo': return handleUploadVideo(request, response);
        case 'finalizeVideoUpload': return handleFinalizeVideoUpload(request, response);
        case 'checkVideoStatus': return handleCheckVideoStatus(request, response);
        case 'getClientId': return response.status(200).json({ clientId: process.env.LINKEDIN_CLIENT_ID });
        case 'getShareStatistics': return handleGetShareStatistics(request, response);
        case 'getMemberPostStatistics': return handleGetMemberPostStatistics(request, response);
        case 'uploadImage':
        case 'uploadAndCheckImage': return handleUploadAndCheckImage(request, response);
        default: return response.status(400).json({ error: `Invalid action: ${action}` });
    }
};

const mainHandler = async (request, response) => {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end('Method Not Allowed');
    }

    const body = await parseBody(request);
    request.body = body;

    if (process.env.INTERNAL_API_SECRET && request.headers['x-internal-secret'] === process.env.INTERNAL_API_SECRET) {
        const { action } = body;
        if (['uploadImage', 'uploadAndCheckImage', 'createPost', 'getShareStatistics', 'getMemberPostStatistics'].includes(action)) {
            return protectedHandler(request, response); // Reuse logic
        }
        if (action === 'refreshTokenInternal') return handleRefreshToken(request, response);
        return response.status(400).json({ error: `Invalid internal action: ${action}` });
    }

    return withAuth((req, res) => protectedHandler(req, res))(request, response);
};

export default mainHandler;
