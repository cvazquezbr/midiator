import { withAuth } from './middleware/auth.js';
import { query } from './db.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

// A general-purpose, action-based proxy for LinkedIn API calls.
// This is more secure than an endpoint-based proxy as it doesn't allow calling arbitrary URLs.

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
        const data = await linkedinResponse.json();

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

            // 🛑 CORREÇÃO DE SEGURANÇA AQUI: Retorna apenas o que o cliente precisa.
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

async function handleInitializeVideoUpload(request, response) {
    const { accessToken, payload } = request.body;
    if (!accessToken || !payload) {
        return response.status(400).json({ error: 'Missing accessToken or payload.' });
    }

    const initializeUrl = 'https://api.linkedin.com/rest/videos?action=initializeUpload';

    try {
        const linkedinResponse = await fetch(initializeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            },
            body: JSON.stringify(payload),
        });

        const data = await linkedinResponse.json();
        if (!linkedinResponse.ok) {
            return response.status(linkedinResponse.status).json(data);
        }
        // The client needs the 'value' object from the response
        return response.status(200).json(data.value);
    } catch (error) {
        console.error('Error during video upload initialization:', error);
        return response.status(500).json({ error: 'Internal Server Error during video upload initialization' });
    }
}


async function handleUploadVideo(request, response) {
    const { uploadUrl, videoBase64, videoContentType } = request.body;

    if (!uploadUrl || !videoBase64 || !videoContentType) {
        return response.status(400).json({ error: 'Missing parameters for video part upload.' });
    }

    const videoBuffer = Buffer.from(videoBase64, 'base64');

    try {
        const linkedinResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': videoContentType,
            },
            body: videoBuffer,
        });

        if (!linkedinResponse.ok) {
            const errorText = await linkedinResponse.text();
            console.error("LinkedIn Video Part Upload Error Body:", errorText);
            return response.status(linkedinResponse.status).json({ message: `Failed to upload video part to LinkedIn. Status: ${linkedinResponse.status}` });
        }

        const eTag = linkedinResponse.headers.get('ETag');
        if (!eTag) {
            console.error("LinkedIn Video Part Upload Error: ETag missing from response headers.");
            return response.status(500).json({ message: 'ETag missing from LinkedIn upload response.' });
        }

        return response.status(200).json({ eTag: eTag.replace(/"/g, '') });
    } catch (error) {
        console.error('Error during video part upload:', error);
        return response.status(500).json({ error: 'Internal Server Error during video part upload' });
    }
}

async function handleFinalizeVideoUpload(request, response) {
    const { accessToken, payload } = request.body;
    if (!accessToken || !payload) {
        return response.status(400).json({ error: 'Missing accessToken or payload for finalize.' });
    }

    const finalizeUrl = 'https://api.linkedin.com/rest/videos?action=finalizeUpload';

    try {
        const linkedinResponse = await fetch(finalizeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            },
            body: JSON.stringify(payload)
        });

        if (!linkedinResponse.ok) {
            const errorText = await linkedinResponse.text();
            console.error("LinkedIn Finalize Upload Error:", errorText);
            return response.status(linkedinResponse.status).json({ message: 'Failed to finalize video upload.', details: errorText });
        }
        return response.status(200).send();
    } catch (error) {
        console.error('Error finalizing video upload:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleCheckVideoStatus(request, response) {
    const { accessToken, videoUrn } = request.body; // Changed from assetUrn to videoUrn
    if (!videoUrn) {
        return response.status(400).json({ error: 'Missing videoUrn' });
    }
    const encodedUrn = encodeURIComponent(videoUrn);
    const statusUrl = `https://api.linkedin.com/rest/videos/${encodedUrn}`;

    try {
        const linkedinResponse = await fetch(statusUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            }
        });
        if (!linkedinResponse.ok) {
            const errorText = await linkedinResponse.text();
            return response.status(linkedinResponse.status).json({ message: 'Failed to check video status.', details: errorText });
        }
        const data = await linkedinResponse.json();
        return response.status(200).json({ status: data.status }); // The new API has a direct status field
    } catch (error) {
        console.error('Error checking video status:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}

async function handleGetProfile(request, response) {
    const { accessToken } = request.body;

    if (!accessToken) {
        return response.status(400).json({ error: 'Missing accessToken for getProfile.' });
    }

    const profileUrl = 'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))';

    try {
        const linkedinResponse = await fetch(profileUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            },
        });
        const data = await linkedinResponse.json();
        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error during proxied getProfile:', error);
        return response.status(500).json({ error: 'Internal Server Error during proxied API call' });
    }
}

async function handleRegisterUpload(request, response) {
    // This is the old handler for image uploads, let's keep it for now.
    const { accessToken, payload } = request.body;

    if (!accessToken || !payload) {
        return response.status(400).json({ error: 'Missing accessToken or payload for registering upload.' });
    }

    const registerUploadUrl = 'https://api.linkedin.com/v2/assets?action=registerUpload';

    try {
        const linkedinResponse = await fetch(registerUploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            },
            body: JSON.stringify(payload),
        });

        const data = await linkedinResponse.json();

        if (!linkedinResponse.ok) {
            return response.status(linkedinResponse.status).json(data);
        }

        const simplifiedData = {
            uploadUrl: data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
            assetUrn: data.value.asset,
        };

        return response.status(200).json(simplifiedData);
    } catch (error) {
        console.error('Error during upload registration:', error);
        return response.status(500).json({ error: 'Internal Server Error during upload registration' });
    }
}

async function handleUploadAndCheckImage(request, response) {
    const { accessToken, authorUrn, imageBase64, imageType } = request.body;
    if (!accessToken || !authorUrn || !imageBase64 || !imageType) {
        return response.status(400).json({ error: 'Missing parameters for uploadAndCheckImage.' });
    }

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202411'
    };

    // Step 1: Register Upload (using the modern /rest/images endpoint)
    const registerUploadUrl = 'https://api.linkedin.com/rest/images?action=initializeUpload';
    const registerPayload = {
        initializeUploadRequest: {
            owner: authorUrn
        }
    };

    let uploadUrl, assetUrn;

    try {
        const registerResponse = await fetch(registerUploadUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(registerPayload),
        });
        const registerData = await registerResponse.json();
        if (!registerResponse.ok) {
            console.error('LinkedIn Register Upload Error:', registerData);
            return response.status(registerResponse.status).json({ error: 'Failed to register image upload.', details: registerData });
        }
        // Defensively parse the response to handle API variations
        uploadUrl = registerData.value?.uploadUrl ||
            registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;

        assetUrn = registerData.value?.asset || registerData.value?.image || registerData.value?.urn;

        if (!uploadUrl || !assetUrn) {
            console.error('Raw LinkedIn registration response:', JSON.stringify(registerData, null, 2));
            throw new Error('Missing uploadUrl or assetUrn in registration response.');
        }

    } catch (error) {
        console.error('Error during upload registration:', error);
        return response.status(500).json({ error: 'Internal Server Error during upload registration.' });
    }


    // Step 2: Upload Image Binary
    try {
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': imageType }, // No Auth header here
            body: imageBuffer,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("LinkedIn Image Upload Error:", errorText);
            return response.status(uploadResponse.status).json({ error: `Failed to upload image to LinkedIn.`, details: errorText });
        }
    } catch (error) {
        console.error('Error during image upload:', error);
        return response.status(500).json({ error: 'Internal Server Error during image upload.' });
    }


    // Step 3: Poll for Image Status
    const statusUrl = `https://api.linkedin.com/rest/images/${encodeURIComponent(assetUrn)}`;
    const maxRetries = 10; // ~30 seconds total
    const retryDelay = 3000;

    try {
        await delay(1000); // Initial delay before first poll

        for (let i = 0; i < maxRetries; i++) {
            const statusResponse = await fetch(statusUrl, { headers });

            if (statusResponse.status === 401) {
                return response.status(401).json({ error: 'Unauthorized while checking image status. Token may have expired.' });
            }

            if (!statusResponse.ok) {
                console.warn(`Polling attempt ${i + 1}/${maxRetries} failed for ${assetUrn} with status ${statusResponse.status}`);
                await delay(retryDelay);
                continue;
            }

            const statusData = await statusResponse.json();
            const processingState = statusData.processingState || statusData.status;

            if (processingState === 'AVAILABLE') {
                console.log(`Image ${assetUrn} is AVAILABLE.`);
                return response.status(200).json({ assetUrn });
            }
            console.log(`Polling attempt ${i + 1}/${maxRetries} for ${assetUrn}: Image status is ${processingState}.`);
            await delay(retryDelay);
        }

        console.error(`Polling timed out for asset ${assetUrn}.`);
        return response.status(500).json({ error: 'Image processing timed out.' });

    } catch (error) {
        console.error('Error while polling for image status:', error);
        return response.status(500).json({ error: 'Internal Server Error while polling image status.' });
    }
}


async function handleCreatePost(request, response) {
    const { accessToken, payload } = request.body;

    if (!accessToken || !payload) {
        return response.status(400).json({ error: 'Missing accessToken or payload for createPost.' });
    }

    console.log('[LinkedIn Proxy] Received createPost request with payload:', JSON.stringify(payload, null, 2));

    const createPostUrl = 'https://api.linkedin.com/rest/posts';

    try {
        const linkedinResponse = await fetch(createPostUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            },
            body: JSON.stringify(payload),
        });

        const responseText = await linkedinResponse.text();
        let responseData;
        try {
            responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            responseData = { raw: responseText };
        }

        if (!linkedinResponse.ok) {
            console.error('LinkedIn Post Creation Error:', responseData);
            return response.status(linkedinResponse.status).json(responseData);
        }

        const postIdFromHeader = linkedinResponse.headers.get('x-restli-id');
        if (postIdFromHeader) {
            responseData.id = postIdFromHeader;
        }

        return response.status(linkedinResponse.status).json(responseData);
    } catch (error) {
        console.error('Error during post creation:', error);
        return response.status(500).json({ error: 'Internal Server Error during post creation' });
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
        'LinkedIn-Version': '202411'
    };

    try {
        const [personalResponse, orgAclsResponse] = await Promise.all([
            fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', { headers }),
            fetch('https://api.linkedin.com/v2/organizationAcls?q=roleAssignee', { headers })
        ]);

        if (!personalResponse.ok) {
            const errorText = await personalResponse.text();
            throw new Error(`Failed to fetch personal profile: ${personalResponse.status} - ${errorText}`);
        }

        const personalData = await personalResponse.json();
        const personal = {
            id: personalData.id,
            name: `${personalData.firstName.localized.pt_BR || personalData.firstName.localized.en_US} ${personalData.lastName.localized.pt_BR || personalData.lastName.localized.en_US}`,
            type: 'personal',
            profilePicture: personalData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier
        };

        let organizations = [];
        if (orgAclsResponse.ok) {
            const orgAclsData = await orgAclsResponse.json();
            const orgUrns = orgAclsData.elements?.map(el => el.organization) || [];
            const orgIds = orgUrns.map(urn => urn.split(':').pop());

            if (orgIds.length > 0) {
                const batchOrgUrl = `https://api.linkedin.com/rest/organizations?ids=List(${orgIds.join(',')})`;
                const batchOrgResponse = await fetch(batchOrgUrl, { headers });

                if (batchOrgResponse.ok) {
                    const batchOrgData = await batchOrgResponse.json();
                    organizations = orgAclsData.elements.map(acl => {
                        const orgId = acl.organization.split(':').pop();
                        const orgDetails = batchOrgData.results[orgId];
                        const orgName = orgDetails?.localizedName || orgDetails?.name?.localized?.en_US || 'Nome da Página Indisponível';

                        return {
                            id: orgId,
                            name: orgName,
                            role: acl.role,
                            logo: orgDetails?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier,
                            type: 'organization'
                        };
                    });
                } else {
                    console.warn('Could not fetch batch organization details:', batchOrgResponse.status);
                }
            }
        } else {
            console.warn('Could not fetch organization ACLs:', orgAclsResponse.status);
        }

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


async function handleRefreshToken(request, response) {
    // The scheduler will pass userId in the body, while a logged-in user will have it in the token.
    const userId = request.user?.sub || request.body.userId;

    if (!userId) {
        return response.status(400).json({ error: 'User ID not provided.' });
    }

    try {
        const { rows } = await query('SELECT linkedin_refresh_token FROM users WHERE id = $1', [userId]);
        if (rows.length === 0 || !rows[0].linkedin_refresh_token) {
            return response.status(400).json({ error: 'LinkedIn refresh token not found for this user.' });
        }
        const refreshToken = rows[0].linkedin_refresh_token;

        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return response.status(400).json({ error: 'LinkedIn credentials not configured in environment variables.' });
        }

        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
        });

        const linkedinResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        const data = await linkedinResponse.json();

        if (linkedinResponse.ok) {
            const { access_token, expires_in } = data;
            const expiryDate = new Date(Date.now() + expires_in * 1000);

            await query(
                `UPDATE users SET
                    linkedin_access_token = $1,
                    linkedin_access_token_expiry = $2
                WHERE id = $3`,
                [access_token, expiryDate, userId]
            );
            return response.status(200).json({ accessToken: access_token });
        } else {
            return response.status(linkedinResponse.status).json(data);
        }
    } catch (error) {
        console.error('Error refreshing LinkedIn token:', error);
        return response.status(500).json({ error: 'Internal Server Error during token refresh' });
    }
}


export async function handleGetProfileForTest(req, res) {
    return await handleGetProfile(req, res);
}

async function fetchWithRetry(url, options, retries = 5, initialBackoff = 3000) {
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
            console.warn(`${reason}. Retrying after ${Math.round((retryAfter + jitter) / 1000)}s... (Attempt ${i + 1}/${retries})`);
            await delay(retryAfter + jitter);

            backoff *= 2;
            continue;
        }
        return response;
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

async function handleGetShareStatistics(request, response) {
    const { accessToken, payload } = request.body;
    const { authorUrn, shareUrns } = payload;

    if (!accessToken || !authorUrn || !shareUrns || !Array.isArray(shareUrns)) {
        return response.status(400).json({ error: 'Missing accessToken, authorUrn, or shareUrns in payload.' });
    }

    // Separate URNs by type.
    const shares = shareUrns.filter(u => u.includes(':share:'));
    const ugcPosts = shareUrns.filter(u => u.includes(':ugcPost:') || u.includes(':carousel:'));

    let url = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(authorUrn)}`;
    const queryParams = [];

    // Use the standard List() format for both parameter types.
    if (shares.length > 0) {
        queryParams.push(`shares=List(${shares.map(urn => encodeURIComponent(urn)).join(',')})`);
    }
    if (ugcPosts.length > 0) {
        queryParams.push(`ugcPosts=List(${ugcPosts.map(urn => encodeURIComponent(urn)).join(',')})`);
    }

    if (queryParams.length === 0) {
        return response.status(200).json({ elements: [] }); // Nothing to fetch.
    }

    url += `&${queryParams.join('&')}`;

    try {
        const res = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            }
        });

        const data = await res.json();

        if (res.ok) {
            return response.status(200).json(data);
        } else {
            console.error(`[ERROR] LinkedIn Stats API responded with status ${res.status} for author ${authorUrn}:`, data);
            return response.status(res.status).json(data);
        }

    } catch (error) {
        console.error(`[FATAL] Error during handleGetShareStatistics:`, error.message, error.stack);
        return response.status(500).json({
            error: `Internal Server Error during GET to organizationalEntityShareStatistics`,
            details: error.message,
        });
    }
}


async function handleGetMemberPostStatistics(request, response) {
    const { accessToken, payload } = request.body;
    const { ugcPostUrn, queryType, aggregation, dateRange } = payload;

    if (!accessToken || !ugcPostUrn || !queryType || !aggregation || !dateRange) {
        return response.status(400).json({ error: 'Missing required parameters for member post statistics.' });
    }

    // A URN do post (ugcPostUrn) deve ser usada como o parâmetro 'ugcPost' na query string.
    const encodedUgcPost = encodeURIComponent(ugcPostUrn);

    // 🛑 CORREÇÃO: Usar 'q=ugcPost' e o parâmetro 'ugcPost' na URL.
    const url = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=ugcPost&ugcPost=${encodedUgcPost}&queryType=${queryType}&aggregation=${aggregation}&dateRange=(start:(day:${dateRange.start.day},month:${dateRange.start.month},year:${dateRange.start.year}),end:(day:${dateRange.end.day},month:${dateRange.end.month},year:${dateRange.end.year}))`;

    try {
        const linkedinResponse = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202411'
            },
        });

        const data = await linkedinResponse.json();
        if (linkedinResponse.ok) {
            // Add urn to the response for mapping, as this API doesn't return it.
            data.urn = ugcPostUrn;
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


// Handler for requests coming from the cron scheduler, authenticated with a secret.
const internalRequestHandler = async (request, response) => {
    const { action } = request.body;
    switch (action) {
        case 'uploadImage':
        case 'uploadAndCheckImage':
            return handleUploadAndCheckImage(request, response);
        case 'createPost':
            return handleCreatePost(request, response);
        case 'getShareStatistics':
            return handleGetShareStatistics(request, response);
        case 'getMemberPostStatistics':
            return handleGetMemberPostStatistics(request, response);
        case 'refreshTokenInternal': // <-- NOVO CASE NECESSÁRIO!
            return handleRefreshToken(request, response); // Usa a função existente
        default:
            return response.status(400).json({ error: `Invalid internal action: ${action}` });
    }
};

// Handler for requests from the frontend, authenticated with user session.
const protectedHandler = async (request, response) => {
    const { action } = request.body;
    switch (action) {
        case 'tokenExchange':
            return handleTokenExchange(request, response);
        case 'refreshToken':
            return handleRefreshToken(request, response);
        case 'testConnection':
        case 'getProfile':
            return handleGetProfile(request, response);
        case 'registerUpload':
            return handleRegisterUpload(request, response);
        case 'createPost':
            return handleCreatePost(request, response);
        case 'getProfiles':
            return handleGetProfiles(request, response);
        case 'initializeVideoUpload':
            return handleInitializeVideoUpload(request, response);
        case 'uploadVideo':
            return handleUploadVideo(request, response);
        case 'finalizeVideoUpload':
            return handleFinalizeVideoUpload(request, response);
        case 'checkVideoStatus':
            return handleCheckVideoStatus(request, response);
        case 'getClientId':
            return response.status(200).json({ clientId: process.env.LINKEDIN_CLIENT_ID });
        case 'getShareStatistics':
            return handleGetShareStatistics(request, response);
        case 'getMemberPostStatistics':
            return handleGetMemberPostStatistics(request, response);
        case 'uploadAndCheckImage':
            return handleUploadAndCheckImage(request, response);

        default:
            return response.status(400).json({ error: `Invalid protected action: ${action}` });
    }
};

const mainHandler = async (request, response) => {
    console.log(`[${new Date().toISOString()}] /api/linkedin-proxy invoked. Action: ${request.body?.action}`);

    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end('Method Not Allowed');
    }

    // Check for the internal secret for cron jobs
    if (request.headers['x-internal-secret'] === process.env.INTERNAL_API_SECRET) {
        return internalRequestHandler(request, response);
    }

    // For all other requests, apply the standard authentication middleware.
    return withAuth(protectedHandler)(request, response);
};

export default mainHandler;