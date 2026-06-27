import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { delay, fetchWithRetry, parseBody } from './utils.js';

const LINKEDIN_API_VERSION = '202601';

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
        code,
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

    if (!accessToken) {
        return response.status(400).json({ error: 'Missing accessToken.' });
    }

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_API_VERSION
    };

    try {
        const meRes = await fetch('https://api.linkedin.com/rest/me', { headers });

        if (!meRes.ok) {
            const errorText = await meRes.text();
            if (meRes.status === 401) {
                return response.status(401).json({ error: 'Invalid or expired LinkedIn access token.' });
            }
            throw new Error(`Failed to fetch profile: ${meRes.status} - ${errorText}`);
        }

        const data = await meRes.json();
        return response.status(200).json(data);
    } catch (error) {
        console.error('Error in handleGetProfile:', error);
        return response.status(500).json({ error: 'Internal Server Error while fetching profile.' });
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
        const meRes = await fetch('https://api.linkedin.com/rest/me', { headers });

        if (!meRes.ok) {
            const errorText = await meRes.text();
            if (meRes.status === 401) {
                return response.status(401).json({ error: 'Invalid or expired LinkedIn access token.' });
            }
            throw new Error(`Failed to fetch personal profile: ${meRes.status} - ${errorText}`);
        }

        const personalData = await meRes.json();
        const personId = personalData.id;

        const personal = {
            id: personId,
            name: `${getLocalized(personalData.givenName || personalData.firstName)} ${getLocalized(personalData.familyName || personalData.lastName)}`.trim() || 'Usuário do LinkedIn',
            type: 'person',
            profilePicture: personalData.picture || personalData.profilePicture || ''
        };

        // Step 2: Fetch organization ACLs
        const personUrn = `urn:li:person:${personId}`;
        const aclUrl = `https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}`;

        console.log(`[LinkedIn Proxy] Fetching ACLs: ${aclUrl}`);

        const aclRes = await fetch(aclUrl, { headers });
        const aclText = await aclRes.text();
        let aclData = {};
        try {
            aclData = JSON.parse(aclText);
        } catch (e) {
            console.error('[LinkedIn Proxy] Failed to parse ACL response:', aclText);
        }

        console.log(`[LinkedIn Proxy] ACL status: ${aclRes.status}, elements: ${aclData?.elements?.length ?? 0}`);

        if (!aclRes.ok) {
            console.error('[LinkedIn Proxy] ACL error body:', aclText.slice(0, 500));
            return response.status(200).json({
                personal,
                organizations: [],
                hasOrganizations: false,
                _debug: { aclStatus: aclRes.status, aclRaw: aclText.slice(0, 500) }
            });
        }

        const elements = (aclData?.elements || []).filter(el =>
            !el.state || el.state === 'APPROVED'
        );

        if (elements.length === 0) {
            return response.status(200).json({
                personal,
                organizations: [],
                hasOrganizations: false,
                _debug: { aclStatus: aclRes.status, aclRaw: aclText.slice(0, 500) }
            });
        }

        // Step 3: Extract unique org URNs
        const orgUrnMap = new Map();
        for (const el of elements) {
            const orgUrn = el.organizationalTarget || el.organizationalEntity || el.organization;
            if (orgUrn && !orgUrnMap.has(orgUrn)) {
                orgUrnMap.set(orgUrn, el);
            }
        }

        const orgUrns = [...orgUrnMap.keys()];
        const orgIds = orgUrns.map(urn => urn.split(':').pop());

        // Step 4: Batch fetch org details
        const batchUrl = `https://api.linkedin.com/rest/organizations?ids=List(${orgIds.join(',')})`;
        const batchRes = await fetch(batchUrl, { headers });

        let orgResults = {};
        if (batchRes.ok) {
            const batchData = await batchRes.json();
            orgResults = batchData.results || {};
        } else {
            const batchErrText = await batchRes.text();
            console.warn(`[LinkedIn Proxy] Batch org fetch failed: ${batchRes.status} - ${batchErrText.slice(0, 300)}`);
        }

        const organizations = orgUrns.map(orgUrn => {
            const acl = orgUrnMap.get(orgUrn);
            const orgId = orgUrn.split(':').pop();

            const orgDetails = orgResults[orgId]
                || orgResults[`urn:li:organization:${orgId}`]
                || orgResults[orgUrn]
                || null;

            const orgName = orgDetails
                ? getLocalized(orgDetails.localizedName || orgDetails.name)
                : null;

            return {
                id: orgId,
                urn: orgUrn,
                name: orgName || `Página (ID: ${orgId})`,
                role: acl.role,
                logo: extractLogoUrl(orgDetails),
                type: 'organization'
            };
        });

        return response.status(200).json({
            personal,
            organizations,
            hasOrganizations: organizations.length > 0
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

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            }
        });
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
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            }
        });
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
