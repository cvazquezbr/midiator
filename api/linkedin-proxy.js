import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { delay, fetchWithRetry, parseBody } from './utils.js';
import fetch from 'node-fetch';

const LINKEDIN_API_VERSION = '202504';

export async function getPostDetails(accessToken, postUrn) {
    const prefixes = ['ugcPost', 'share'];
    const id = postUrn.split(':').pop();

    let result = { status: 404, data: {} };

    for (const prefix of prefixes) {
        const currentUrn = `urn:li:${prefix}:${id}`;
        const url = `https://api.linkedin.com/rest/posts/${encodeURIComponent(currentUrn)}`;

        console.log(`[LinkedIn Proxy] Trying fetch with prefix ${prefix}: ${url}`);

        const res = await fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
        });

        const text = await res.text();
        let data = {};
        try { data = JSON.parse(text); } catch(e) {}

        if (res.ok) {
            return { ...data, resolvedUrn: currentUrn };
        }
        result = { status: res.status, data };
    }

    throw new Error(`LinkedIn Get Post Error: ${result.status} - ${JSON.stringify(result.data)}`);
}

export async function getAuthorDetails(accessToken, authorUrn) {
    const baseHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
    };

    if (authorUrn.includes(':person:')) {
        const personId = authorUrn.split(':').pop();
        const profileUrl = `https://api.linkedin.com/rest/people/${personId}?fields=id,givenName,familyName,headline,picture`;
        const res = await fetchWithRetry(profileUrl, {
            headers: { ...baseHeaders, 'LinkedIn-Version': LINKEDIN_API_VERSION }
        });
        if (!res.ok) throw new Error(`Failed to fetch person: ${res.status}`);
        return res.json();
    } else if (authorUrn.includes(':organization:')) {
        const orgId = authorUrn.split(':').pop();
        const urls = [
            `https://api.linkedin.com/v2/organizations/${orgId}?fields=id,localizedName,logoV2`,
            `https://api.linkedin.com/rest/organizations/${orgId}?fields=id,localizedName,logoV2`
        ];
        const versions = [null, LINKEDIN_API_VERSION, '202501', '202410', '202407', '202404'];

        for (const url of urls) {
            const isRest = url.includes('/rest/');
            for (const version of versions) {
                if (!isRest && version !== null) continue;
                if (isRest && version === null) continue;

                const headers = { ...baseHeaders };
                if (version) headers['LinkedIn-Version'] = version;

                try {
                    const res = await fetchWithRetry(url, { headers }, 1, 1000);
                    if (res.ok) return res.json();
                } catch (_) {}
            }
        }
        throw new Error(`Failed to fetch organization ${orgId} after all attempts.`);
    } else {
        throw new Error('Unsupported author URN type.');
    }
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
        const meRes = await fetchWithRetry('https://api.linkedin.com/rest/me', { headers });

        const data = await meRes.json();
        if (!meRes.ok) {
            if (meRes.status === 401) {
                return response.status(401).json({ error: 'Invalid or expired LinkedIn access token.' });
            }
            return response.status(meRes.status).json(data);
        }

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

    const baseHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
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
        // Step 1: Fetch personal profile via /rest
        const meRes = await fetchWithRetry('https://api.linkedin.com/rest/me', {
            headers: { ...baseHeaders, 'LinkedIn-Version': LINKEDIN_API_VERSION }
        });

        const personalData = await meRes.json();
        if (!meRes.ok) {
            if (meRes.status === 401) {
                return response.status(401).json({ error: 'Invalid or expired LinkedIn access token.' });
            }
            throw new Error(`Failed to fetch personal profile: ${meRes.status} - ${JSON.stringify(personalData)}`);
        }
        const personId = personalData.id;

        const personal = {
            id: personId,
            name: `${getLocalized(personalData.givenName || personalData.firstName)} ${getLocalized(personalData.familyName || personalData.lastName)}`.trim() || 'Usuário do LinkedIn',
            type: 'person',
            profilePicture: personalData.picture || personalData.profilePicture || ''
        };

        // Step 2: Fetch organization ACLs with fallback strategy
        const personUrn = `urn:li:person:${personId}`;
        const aclUrls = [
            `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}&state=APPROVED`,
            `https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}&state=APPROVED`,
            `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}`,
            `https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee&roleAssignee=${encodeURIComponent(personUrn)}`
        ];

        const versionsToTry = [null, LINKEDIN_API_VERSION, '202501', '202410', '202407', '202404'];

        let aclData = null;
        let lastAclStatus = null;
        let lastAclError = null;
        let successfulAclUrl = null;

        for (const url of aclUrls) {
            const isRest = url.includes('/rest/');
            for (const version of versionsToTry) {
                if (!isRest && version !== null) continue;
                if (isRest && version === null) continue;

                const currentHeaders = { ...baseHeaders };
                if (version) currentHeaders['LinkedIn-Version'] = version;

                console.log(`[LinkedIn Proxy] Fetching ACLs: ${url} (Version: ${version || 'v2/Legacy'})`);

                try {
                    const res = await fetchWithRetry(url, { headers: currentHeaders }, 1, 1000);
                    const text = await res.text();
                    lastAclStatus = res.status;

                    if (res.ok) {
                        const tempAclData = JSON.parse(text);
                        // Only break if we actually found elements, or if we want to stick with this successful response
                        if (tempAclData.elements && tempAclData.elements.length > 0) {
                            aclData = tempAclData;
                            successfulAclUrl = `${url} (${version || 'v2'})`;
                            console.log(`[LinkedIn Proxy] ACL success with ${tempAclData.elements.length} elements via ${successfulAclUrl}`);
                            break;
                        } else {
                            console.log(`[LinkedIn Proxy] ACL success but 0 elements via ${url} (${version || 'v2'}). Continuing search...`);
                            // Keep the first successful empty response just in case nothing else works
                            if (!aclData) aclData = tempAclData;
                        }
                    } else {
                        lastAclError = text;
                        console.warn(`[LinkedIn Proxy] ACL failed (${res.status}) for ${url} (${version})`);
                    }
                } catch (err) {
                    console.error(`[LinkedIn Proxy] ACL error for ${url}: ${err.message}`);
                }
            }
            if (aclData && aclData.elements && aclData.elements.length > 0) break;
        }

        if (!aclData) {
            console.error('[LinkedIn Proxy] All ACL attempts failed.', { lastAclStatus, lastAclError });
            return response.status(200).json({
                personal,
                organizations: [],
                hasOrganizations: false,
                _debug: {
                    aclStatus: lastAclStatus,
                    aclRaw: lastAclError?.slice(0, 500),
                    message: 'All API version attempts failed for organizationalEntityAcls'
                }
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
                _debug: { aclStatus: 200, info: 'No elements in ACL', successfulUrl: successfulAclUrl }
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

        // Step 4: Batch fetch org details with fallback
        const batchUrls = [
            `https://api.linkedin.com/v2/organizations?ids=List(${orgIds.join(',')})`,
            `https://api.linkedin.com/rest/organizations?ids=List(${orgIds.join(',')})`
        ];

        let orgResults = {};
        for (const url of batchUrls) {
            const isRest = url.includes('/rest/');
            const versions = isRest ? [LINKEDIN_API_VERSION, '202501', '202410', '202407', '202404'] : [null];

            for (const version of versions) {
                const currentHeaders = { ...baseHeaders };
                if (version) currentHeaders['LinkedIn-Version'] = version;

                console.log(`[LinkedIn Proxy] Batch org fetch: ${url} (Version: ${version || 'v2/Legacy'})`);
                try {
                    const res = await fetchWithRetry(url, { headers: currentHeaders }, 1, 1000);
                    if (res.ok) {
                        const batchData = await res.json();
                        orgResults = batchData.results || {};
                        if (Object.keys(orgResults).length > 0) break;
                    }
                } catch (_) {}
            }
            if (Object.keys(orgResults).length > 0) break;
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
            hasOrganizations: organizations.length > 0,
            _debug: { successfulAclUrl }
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
        const res = await fetchWithRetry(initializeUrl, {
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

        const rawETag = res.headers.get('ETag');
        if (!rawETag) {
            console.warn('[LinkedIn Proxy] Upload video: ETag header missing in response.');
            return response.status(502).json({ error: 'ETag not returned by LinkedIn after video upload.' });
        }

        return response.status(200).json({ eTag: rawETag.replace(/"/g, '') });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleFinalizeVideoUpload(request, response) {
    const { accessToken, payload } = request.body;
    const finalizeUrl = 'https://api.linkedin.com/rest/videos?action=finalizeUpload';
    try {
        const res = await fetchWithRetry(finalizeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[LinkedIn Proxy] Finalize video upload failed: ${res.status} - ${errText.slice(0, 300)}`);
            let errData = {};
            try { errData = JSON.parse(errText); } catch (_) { errData = { raw: errText }; }
            return response.status(res.status).json(errData);
        }

        return response.status(res.status).send();
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleCheckVideoStatus(request, response) {
    const { accessToken, videoUrn } = request.body;
    const statusUrl = `https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`;
    try {
        const res = await fetchWithRetry(statusUrl, {
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
        const res = await fetchWithRetry(createPostUrl, {
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

        const restliId = res.headers.get('x-restli-id');
        return response.status(res.status).json(restliId ? { ...data, id: restliId } : data);
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
        const initRes = await fetchWithRetry('https://api.linkedin.com/rest/images?action=initializeUpload', {
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
        const res = await fetchWithRetry(url, {
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

async function handleGetPost(request, response) {
    const { accessToken, postUrn } = request.body;
    if (!accessToken || !postUrn) {
        return response.status(400).json({ error: 'Missing accessToken or postUrn.' });
    }
    try {
        const data = await getPostDetails(accessToken, postUrn);
        return response.status(200).json(data);
    } catch (error) {
        console.error('Error during get post:', error);
        return response.status(500).json({ error: error.message });
    }
}

async function handleGetAuthorProfile(request, response) {
    const { accessToken, authorUrn } = request.body;
    if (!accessToken || !authorUrn) {
        return response.status(400).json({ error: 'Missing accessToken or authorUrn.' });
    }
    try {
        const data = await getAuthorDetails(accessToken, authorUrn);
        return response.status(200).json(data);
    } catch (error) {
        console.error('Error during get author profile:', error);
        return response.status(500).json({ error: error.message });
    }
}

async function handleCreateComment(request, response) {
    const { accessToken, postUrn, actorUrn, text } = request.body;
    if (!accessToken || !postUrn || !actorUrn || !text) {
        return response.status(400).json({ error: 'Missing parameters for comment creation.' });
    }
    const encodedPostUrn = encodeURIComponent(postUrn);
    const commentUrl = `https://api.linkedin.com/rest/socialActions/${encodedPostUrn}/comments`;
    try {
        const res = await fetchWithRetry(commentUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
            body: JSON.stringify({
                actor: actorUrn,
                message: { text: text }
            }),
        });
        const respText = await res.text();
        let data = {};
        try { data = JSON.parse(respText); } catch (e) { data = { raw: respText }; }
        if (!res.ok) return response.status(res.status).json(data);
        const commentId = res.headers.get('x-restli-id');
        if (commentId) data.id = commentId;
        return response.status(res.status).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}

async function handleSearchPostsByHashtag(request, response) {
    const { accessToken, hashtag, count = 10 } = request.body;
    if (!accessToken || !hashtag) {
        return response.status(400).json({ error: 'Missing accessToken or hashtag.' });
    }
    const url = `https://api.linkedin.com/rest/posts?q=hashtag&hashtag=${encodeURIComponent(hashtag)}&count=${count}`;
    try {
        const res = await fetchWithRetry(url, {
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
        const res = await fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            }
        });
        const data = await res.json();
        return response.status(res.status).json({ ...data, urn: ugcPostUrn });
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
