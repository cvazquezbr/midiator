import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { delay, fetchWithRetry, parseBody } from './utils.js';
import fetch from 'node-fetch';

/**
 * Dynamically derives the current LinkedIn API version (YYYYMM).
 */
function getCurrentLinkedInVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
}

/**
 * Generates a list of fallback versions, including known active releases
 * and a sliding window of the last 6 months.
 */
function getLinkedInVersionFallbacks() {
    const versions = ['202606', '202602', '202510', '202506'];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const v = `${year}${month}`;
        if (!versions.includes(v)) versions.push(v);
    }
    return versions;
}

const LINKEDIN_API_VERSION = getCurrentLinkedInVersion();

/**
 * Centralized utility to fetch from LinkedIn with systematic version and endpoint fallbacks.
 * This ensures consistency across all API calls and resolves 'NONEXISTENT_VERSION' errors.
 */
async function fetchLinkedInWithFallback(baseUrl, accessToken, options = {}) {
    const isRest = baseUrl.includes('/rest/');
    const baseHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        ...(options.headers || {})
    };

    // For /v2/ endpoints, we try without version header first.
    // For /rest/ endpoints, we try dynamic versions.
    const versions = isRest ? getLinkedInVersionFallbacks() : [null];

    // If it's a critical organizational resource, we might want to try both /rest/ and /v2/
    // but this utility focuses on the versions for the provided URL type.

    let lastStatus = 404;
    let lastError = '';

    for (const version of versions) {
        const headers = { ...baseHeaders };
        if (version) headers['LinkedIn-Version'] = version;

        try {
            const res = await fetchWithRetry(baseUrl, { ...options, headers }, 1, 1000);
            const text = await res.text();
            lastStatus = res.status;

            if (res.ok) {
                try {
                    return { ok: true, status: res.status, data: JSON.parse(text), headers: res.headers, versionUsed: version };
                } catch (e) {
                    return { ok: true, status: res.status, data: text, headers: res.headers, versionUsed: version };
                }
            } else {
                lastError = text;
                console.warn(`[LinkedIn Proxy] Attempt failed (${res.status}) for ${baseUrl} [Version: ${version || 'None'}]: ${text.slice(0, 100)}`);
                // Stop if it's an auth error - version switching won't help
                if (res.status === 401) break;
            }
        } catch (err) {
            console.error(`[LinkedIn Proxy] Request error for ${baseUrl}: ${err.message}`);
        }
    }

    return { ok: false, status: lastStatus, error: lastError };
}

export async function getPostDetails(accessToken, postUrn) {
    const prefixes = ['ugcPost', 'share'];
    const id = postUrn.split(':').pop();

    for (const prefix of prefixes) {
        const currentUrn = `urn:li:${prefix}:${id}`;
        const url = `https://api.linkedin.com/rest/posts/${encodeURIComponent(currentUrn)}`;

        const result = await fetchLinkedInWithFallback(url, accessToken, { method: 'GET' });
        if (result.ok) {
            return { ...result.data, resolvedUrn: currentUrn };
        }
    }

    throw new Error(`LinkedIn Get Post Error: Could not resolve post details after all attempts.`);
}

export async function getAuthorDetails(accessToken, authorUrn) {
    if (authorUrn.includes(':person:')) {
        const personId = authorUrn.split(':').pop();
        const url = `https://api.linkedin.com/rest/people/${personId}?fields=id,givenName,familyName,headline,picture`;
        const result = await fetchLinkedInWithFallback(url, accessToken);
        if (result.ok) return result.data;
    } else if (authorUrn.includes(':organization:')) {
        const orgId = authorUrn.split(':').pop();
        // Priority to legacy v2 for organizations
        const urls = [
            `https://api.linkedin.com/v2/organizations/${orgId}?fields=id,localizedName,logoV2`,
            `https://api.linkedin.com/rest/organizations/${orgId}?fields=id,localizedName,logoV2`
        ];

        for (const url of urls) {
            const result = await fetchLinkedInWithFallback(url, accessToken);
            if (result.ok) return result.data;
        }
    } else {
        throw new Error('Unsupported author URN type.');
    }
    throw new Error(`Failed to fetch author profile for ${authorUrn}`);
}

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

            return response.status(200).json({ access_token, expires_in });
        }

        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error during token exchange:', error);
        return response.status(500).json({ error: 'Internal Server Error during token exchange' });
    }
}

async function handleGetProfile(request, response) {
    const { accessToken } = request.body;
    if (!accessToken) return response.status(400).json({ error: 'Missing accessToken.' });

    const result = await fetchLinkedInWithFallback('https://api.linkedin.com/rest/me', accessToken);
    if (result.ok) return response.status(200).json(result.data);
    return response.status(result.status).json({ error: result.error });
}

async function handleGetProfiles(request, response) {
    const { accessToken } = request.body;
    if (!accessToken) return response.status(400).json({ error: 'Missing accessToken for getProfiles.' });

    const getLocalized = (obj) => {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        if (obj.localized) {
            const locale = obj.preferredLocale
                ? `${obj.preferredLocale.language}_${obj.preferredLocale.country}`
                : Object.keys(obj.localized)[0];
            return obj.localized[locale] || obj.localized[Object.keys(obj.localized)[0]] || '';
        }
        return '';
    };

    const extractLogoUrl = (orgDetails) => {
        try {
            const elements = orgDetails?.logoV2?.['original~']?.elements;
            if (Array.isArray(elements) && elements.length > 0) {
                const identifier = elements[0]?.identifiers?.[0]?.identifier;
                if (typeof identifier === 'string') return identifier;
            }
        } catch (_) {}
        return null;
    };

    try {
        // Step 1: Fetch personal profile
        const meRes = await fetchLinkedInWithFallback('https://api.linkedin.com/rest/me', accessToken);
        if (!meRes.ok) {
            if (meRes.status === 401) return response.status(401).json({ error: 'Invalid or expired token.' });
            throw new Error(`Failed to fetch personal profile: ${meRes.status}`);
        }
        const personId = meRes.data.id;
        const personal = {
            id: personId,
            name: `${getLocalized(meRes.data.givenName || meRes.data.firstName)} ${getLocalized(meRes.data.familyName || meRes.data.lastName)}`.trim() || 'Usuário',
            type: 'person',
            profilePicture: meRes.data.picture || meRes.data.profilePicture || ''
        };

        // Step 2: Fetch organization ACLs with fallback
        const personUrn = `urn:li:person:${personId}`;
        const aclUrls = [
            `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}&state=APPROVED`,
            `https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}&state=APPROVED`,
            `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}`,
            `https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}`
        ];

        let aclData = null;
        let lastAclStatus = 404;
        let lastAclError = '';
        let successfulAclUrl = '';

        for (const url of aclUrls) {
            const res = await fetchLinkedInWithFallback(url, accessToken);
            if (res.ok && res.data.elements && res.data.elements.length > 0) {
                aclData = res.data;
                successfulAclUrl = `${url} [${res.versionUsed || 'v2'}]`;
                break;
            }
            lastAclStatus = res.status;
            lastAclError = res.error;
        }

        if (!aclData) {
            return response.status(200).json({
                personal,
                organizations: [],
                hasOrganizations: false,
                _debug: { aclStatus: lastAclStatus, aclRaw: lastAclError?.slice(0, 200) }
            });
        }

        const elements = aclData.elements.filter(el => !el.state || el.state === 'APPROVED');
        const orgUrnMap = new Map();
        for (const el of elements) {
            const orgUrn = el.organizationalTarget || el.organizationalEntity || el.organization;
            if (orgUrn && !orgUrnMap.has(orgUrn)) orgUrnMap.set(orgUrn, el);
        }

        const orgUrns = [...orgUrnMap.keys()];
        const orgIds = orgUrns.map(urn => urn.split(':').pop());

        // Step 4: Batch fetch org details
        const batchUrls = [
            `https://api.linkedin.com/v2/organizations?ids=List(${orgIds.join(',')})`,
            `https://api.linkedin.com/rest/organizations?ids=List(${orgIds.join(',')})`
        ];

        let orgResults = {};
        for (const url of batchUrls) {
            const res = await fetchLinkedInWithFallback(url, accessToken);
            if (res.ok) {
                orgResults = res.data.results || {};
                if (Object.keys(orgResults).length > 0) break;
            }
        }

        const organizations = orgUrns.map(orgUrn => {
            const acl = orgUrnMap.get(orgUrn);
            const orgId = orgUrn.split(':').pop();
            const orgDetails = orgResults[orgId] || orgResults[`urn:li:organization:${orgId}`] || orgResults[orgUrn] || null;
            return {
                id: orgId,
                urn: orgUrn,
                name: orgDetails ? getLocalized(orgDetails.localizedName || orgDetails.name) : `Página (${orgId})`,
                role: acl.role,
                logo: extractLogoUrl(orgDetails),
                type: 'organization'
            };
        });

        return response.status(200).json({ personal, organizations, hasOrganizations: organizations.length > 0, _debug: { successfulAclUrl } });
    } catch (error) {
        console.error('Error in handleGetProfiles:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleInitializeVideoUpload(request, response) {
    const { accessToken, payload } = request.body;
    const url = 'https://api.linkedin.com/rest/videos?action=initializeUpload';
    const result = await fetchLinkedInWithFallback(url, accessToken, { method: 'POST', body: JSON.stringify(payload) });
    if (result.ok) return response.status(200).json(result.data.value);
    return response.status(result.status).json({ error: result.error });
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
        const rawETag = res.headers.get('ETag');
        if (!rawETag) return response.status(502).json({ error: 'ETag not returned' });
        return response.status(200).json({ eTag: rawETag.replace(/"/g, '') });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleFinalizeVideoUpload(request, response) {
    const { accessToken, payload } = request.body;
    const url = 'https://api.linkedin.com/rest/videos?action=finalizeUpload';
    const result = await fetchLinkedInWithFallback(url, accessToken, { method: 'POST', body: JSON.stringify(payload) });
    if (result.ok) return response.status(result.status).send();
    return response.status(result.status).json({ error: result.error });
}

async function handleCheckVideoStatus(request, response) {
    const { accessToken, videoUrn } = request.body;
    const url = `https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`;
    const result = await fetchLinkedInWithFallback(url, accessToken);
    if (result.ok) return response.status(200).json({ status: result.data.status });
    return response.status(result.status).json({ error: result.error });
}

async function handleCreatePost(request, response) {
    const { accessToken, payload } = request.body;
    const url = 'https://api.linkedin.com/rest/posts';
    const result = await fetchLinkedInWithFallback(url, accessToken, { method: 'POST', body: JSON.stringify(payload) });
    if (result.ok) {
        const restliId = result.headers.get('x-restli-id');
        return response.status(result.status).json(restliId ? { ...result.data, id: restliId } : result.data);
    }
    return response.status(result.status).json({ error: result.error });
}

async function handleUploadAndCheckImage(request, response) {
    const { accessToken, authorUrn, imageBase64, imageType } = request.body;
    try {
        const initUrl = 'https://api.linkedin.com/rest/images?action=initializeUpload';
        const initRes = await fetchLinkedInWithFallback(initUrl, accessToken, {
            method: 'POST',
            body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } })
        });
        if (!initRes.ok) return response.status(initRes.status).json({ error: initRes.error });

        const uploadRes = await fetch(initRes.data.value.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': imageType },
            body: Buffer.from(imageBase64, 'base64'),
        });
        if (!uploadRes.ok) return response.status(uploadRes.status).json({ error: 'Image upload failed' });
        return response.status(200).json({ assetUrn: initRes.data.value.image });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleRefreshToken(request, response) {
    const userId = request.user?.sub || request.body.userId;
    if (!userId) return response.status(400).json({ error: 'User ID not provided.' });

    try {
        const { rows } = await query('SELECT linkedin_refresh_token FROM users WHERE id = $1', [userId]);
        if (rows.length === 0 || !rows[0].linkedin_refresh_token) {
            return response.status(400).json({ error: 'Refresh token not found.' });
        }

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
            await query(
                'UPDATE users SET linkedin_access_token = $1, linkedin_access_token_expiry = $2 WHERE id = $3',
                [data.access_token, expiryDate, userId]
            );
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

    const result = await fetchLinkedInWithFallback(url, accessToken);
    if (result.ok) return response.status(200).json(result.data);
    return response.status(result.status).json({ error: result.error });
}

async function handleGetPost(request, response) {
    const { accessToken, postUrn } = request.body;
    if (!accessToken || !postUrn) return response.status(400).json({ error: 'Missing accessToken or postUrn.' });
    try {
        const data = await getPostDetails(accessToken, postUrn);
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleGetAuthorProfile(request, response) {
    const { accessToken, authorUrn } = request.body;
    if (!accessToken || !authorUrn) return response.status(400).json({ error: 'Missing accessToken or authorUrn.' });
    try {
        const data = await getAuthorDetails(accessToken, authorUrn);
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleCreateComment(request, response) {
    const { accessToken, postUrn, actorUrn, text } = request.body;
    if (!accessToken || !postUrn || !actorUrn || !text) return response.status(400).json({ error: 'Missing parameters.' });
    const url = `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`;
    const result = await fetchLinkedInWithFallback(url, accessToken, {
        method: 'POST',
        body: JSON.stringify({ actor: actorUrn, message: { text: text } })
    });
    if (result.ok) {
        const commentId = result.headers.get('x-restli-id');
        return response.status(result.status).json(commentId ? { ...result.data, id: commentId } : result.data);
    }
    return response.status(result.status).json({ error: result.error });
}

async function handleSearchPostsByHashtag(request, response) {
    const { accessToken, hashtag, count = 10 } = request.body;
    if (!accessToken || !hashtag) return response.status(400).json({ error: 'Missing accessToken or hashtag.' });
    const url = `https://api.linkedin.com/rest/posts?q=hashtag&hashtag=${encodeURIComponent(hashtag)}&count=${count}`;
    const result = await fetchLinkedInWithFallback(url, accessToken);
    if (result.ok) return response.status(200).json(result.data);
    return response.status(result.status).json({ error: result.error });
}

async function handleGetMemberPostStatistics(request, response) {
    const { accessToken, payload } = request.body;
    const { ugcPostUrn, queryType, aggregation, dateRange } = payload;
    const url = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=ugcPost&ugcPost=${encodeURIComponent(ugcPostUrn)}&queryType=${queryType}&aggregation=${aggregation}&dateRange=(start:(day:${dateRange.start.day},month:${dateRange.start.month},year:${dateRange.start.year}),end:(day:${dateRange.end.day},month:${dateRange.end.month},year:${dateRange.end.year}))`;
    const result = await fetchLinkedInWithFallback(url, accessToken);
    if (result.ok) return response.status(200).json({ ...result.data, urn: ugcPostUrn });
    return response.status(result.status).json({ error: result.error });
}

const protectedHandler = async (request, response) => {
    const { action } = request.body;
    switch (action) {
        case 'tokenExchange':          return handleTokenExchange(request, response);
        case 'refreshToken':           return handleRefreshToken(request, response);
        case 'testConnection':
        case 'getProfile':             return handleGetProfile(request, response);
        case 'getProfiles':            return handleGetProfiles(request, response);
        case 'createPost':             return handleCreatePost(request, response);
        case 'initializeVideoUpload':  return handleInitializeVideoUpload(request, response);
        case 'uploadVideo':            return handleUploadVideo(request, response);
        case 'finalizeVideoUpload':    return handleFinalizeVideoUpload(request, response);
        case 'checkVideoStatus':       return handleCheckVideoStatus(request, response);
        case 'getClientId':            return response.status(200).json({ clientId: process.env.LINKEDIN_CLIENT_ID });
        case 'getShareStatistics':     return handleGetShareStatistics(request, response);
        case 'getMemberPostStatistics':return handleGetMemberPostStatistics(request, response);
        case 'getPost':                return handleGetPost(request, response);
        case 'getAuthorProfile':       return handleGetAuthorProfile(request, response);
        case 'createComment':          return handleCreateComment(request, response);
        case 'searchPostsByHashtag':   return handleSearchPostsByHashtag(request, response);
        case 'uploadImage':
        case 'uploadAndCheckImage':    return handleUploadAndCheckImage(request, response);
        default:                       return response.status(400).json({ error: `Invalid action: ${action}` });
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
            return protectedHandler(request, response);
        }
        if (action === 'refreshTokenInternal') return handleRefreshToken(request, response);
        return response.status(400).json({ error: `Invalid internal action: ${action}` });
    }

    return withAuth((req, res) => protectedHandler(req, res))(request, response);
};

export default mainHandler;
