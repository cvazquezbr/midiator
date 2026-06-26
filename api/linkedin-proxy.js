import { withAuth } from './middleware/auth.js';
import { query } from './db.js';
import { delay, fetchWithRetry, parseBody } from './utils.js';

const LINKEDIN_API_VERSION = '202601';

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
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
            body: JSON.stringify(payload),
        });

        const data = await linkedinResponse.json();
        if (!linkedinResponse.ok) {
            console.error(`[LinkedIn Proxy] initializeVideoUpload Error ${linkedinResponse.status}:`, JSON.stringify(data));
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
                'LinkedIn-Version': LINKEDIN_API_VERSION
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
                'LinkedIn-Version': LINKEDIN_API_VERSION
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

export async function handleGetProfile(request, response) {
    const { accessToken } = request.body;

    if (!accessToken) {
        return response.status(400).json({ error: 'Missing accessToken for getProfile.' });
    }

    // Version 202601 uses /rest/me with explicit fields
    const profileUrl = 'https://api.linkedin.com/rest/me?fields=id,givenName,familyName,picture';

    try {
        const linkedinResponse = await fetch(profileUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
        });

        const responseText = await linkedinResponse.text();
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            data = { raw: responseText };
        }

        if (!linkedinResponse.ok) {
            console.error(`[LinkedIn Proxy] getProfile Error ${linkedinResponse.status}:`, JSON.stringify(data));
        }

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
                'LinkedIn-Version': LINKEDIN_API_VERSION
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
        return response.status(400).json({ error: 'Missing parameters for image upload.' });
    }

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_API_VERSION
    };

    try {
        // Step 1: Register Upload (using the modern /rest/images endpoint)
        const registerUploadUrl = 'https://api.linkedin.com/rest/images?action=initializeUpload';
        const registerPayload = {
            initializeUploadRequest: {
                owner: authorUrn
            }
        };

        const registerResponse = await fetch(registerUploadUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(registerPayload),
        });

        const registerData = await registerResponse.json();
        if (!registerResponse.ok) {
            console.error('LinkedIn Image Registration Error:', registerData);
            return response.status(registerResponse.status).json(registerData);
        }

        const uploadUrl = registerData.value.uploadUrl;
        const imageUrn = registerData.value.image;

        // Step 2: Upload the image
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': imageType },
            body: imageBuffer,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('LinkedIn Image Upload Error:', errorText);
            return response.status(uploadResponse.status).json({ error: 'Failed to upload image to LinkedIn.' });
        }

        // Step 3: Check status (optional but good for robustness)
        // For images, they are usually available immediately after a successful PUT.
        return response.status(200).json({ assetUrn: imageUrn });

    } catch (error) {
        console.error('Error during image upload and check:', error);
        return response.status(500).json({ error: 'Internal Server Error during image upload' });
    }
}

async function handleCreatePost(request, response) {
    const { accessToken, payload } = request.body;

    if (!accessToken || !payload) {
        return response.status(400).json({ error: 'Missing accessToken or payload for post creation.' });
    }

    const createPostUrl = 'https://api.linkedin.com/rest/posts';

    try {
        const linkedinResponse = await fetch(createPostUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
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
            console.error(`[LinkedIn Proxy] createPost Error ${linkedinResponse.status}:`, JSON.stringify(responseData));
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
        'LinkedIn-Version': LINKEDIN_API_VERSION
    };

    try {
        const [personalResponse, orgAclsResponse] = await Promise.all([
            fetch('https://api.linkedin.com/rest/me?fields=id,givenName,familyName,picture', { headers }),
            fetch('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED', { headers })
        ]);

        if (!personalResponse.ok) {
            const errorText = await personalResponse.text();
            // If the token is invalid, return a 401 Unauthorized
            if (personalResponse.status === 401) {
                return response.status(401).json({ error: 'Invalid or expired LinkedIn access token.' });
            }
            throw new Error(`Failed to fetch personal profile: ${personalResponse.status} - ${errorText}`);
        }

        const personalData = await personalResponse.json();

        // Map new field names from /rest/me (givenName, familyName, picture)
        const firstName = personalData.givenName || '';
        const lastName = personalData.familyName || '';
        const profilePicture = personalData.picture || '';

        const personal = {
            id: personalData.id,
            name: `${firstName} ${lastName}`.trim(),
            type: 'person',
            profilePicture: profilePicture
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
                        const orgUrn = acl.organization;
                        const orgId = orgUrn.split(':').pop();
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
            const errorText = await orgAclsResponse.text();
            console.warn(`Could not fetch organization ACLs: ${orgAclsResponse.status} - ${errorText}`);
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

        const responseText = await linkedinResponse.text();
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            data = { raw: responseText };
        }

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
                'LinkedIn-Version': LINKEDIN_API_VERSION
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


export async function handleSearchPostsByHashtag(request, response) {
    const { accessToken, hashtag, count = 20 } = request.body;
    if (!accessToken || !hashtag) {
        return response.status(400).json({ error: 'Missing accessToken or hashtag.' });
    }

    const searchUrl = `https://api.linkedin.com/rest/posts?q=hashtag&hashtag=${encodeURIComponent(hashtag)}&count=${count}&fields=id,author,commentary,publishedAt`;

    try {
        const linkedinResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
        });

        const data = await linkedinResponse.json();
        if (!linkedinResponse.ok) {
            console.error(`[LinkedIn Proxy] Search Error: ${linkedinResponse.status}`, data);
        }
        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error during hashtag search:', error);
        return response.status(500).json({ error: 'Internal Server Error during hashtag search' });
    }
}

export async function getPostDetails(accessToken, postUrn) {
    const tryFetch = async (urn) => {
        const postUrl = `https://api.linkedin.com/rest/posts/${encodeURIComponent(urn)}?fields=id,author,commentary,publishedAt`;
        const linkedinResponse = await fetchWithRetry(postUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
        });

        const responseText = await linkedinResponse.text();
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            data = { raw: responseText };
        }

        return { ok: linkedinResponse.ok, status: linkedinResponse.status, data };
    };

    // Attempt 1: Provided URN (usually normalized to ugcPost)
    let result = await tryFetch(postUrn);
    if (result.ok) return { ...result.data, resolvedUrn: postUrn };

    console.warn(`[LinkedIn Proxy] Initial fetch failed for ${postUrn} (Status: ${result.status}). Checking for fallbacks...`);

    // If 404 or 400 (invalid URN type), try fallbacks for different URN types
    // The guide says to try ugcPost and share as recommended prefixes.
    if ((result.status === 404 || result.status === 400) && postUrn.includes(':')) {
        const parts = postUrn.split(':');
        const id = parts.pop();

        // New Resolution: socialActions for activity URNs
        // This is necessary because some IDs are activity IDs, not ugcPost IDs.
        const activityUrn = postUrn.includes(':activity:') ? postUrn : `urn:li:activity:${id}`;
        const resolveUrl = `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(activityUrn)}?fields=object`;

        try {
            console.log(`[LinkedIn Proxy] Attempting socialActions resolution for: ${activityUrn}`);
            const resolveResponse = await fetchWithRetry(resolveUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                    'LinkedIn-Version': LINKEDIN_API_VERSION
                }
            });

            const resolveData = await resolveResponse.json();
            console.log(`[LinkedIn Proxy] socialActions response:`, JSON.stringify(resolveData));

            if (resolveResponse.ok && resolveData.object) {
                console.log(`[LinkedIn Proxy] Resolved via socialActions: ${resolveData.object}`);
                result = await tryFetch(resolveData.object);
                if (result.ok) return { ...result.data, resolvedUrn: resolveData.object };
            }
        } catch (resolveErr) {
            console.warn(`[LinkedIn Proxy] socialActions resolution failed: ${resolveErr.message}`);
        }

        // Prioritize ugcPost and share as per the technical guide.
        const prefixes = ['ugcPost', 'share']; // activity e post não são válidos na /rest/posts API

        for (const prefix of prefixes) {
            const fallbackUrn = `urn:li:${prefix}:${id}`;
            if (fallbackUrn === postUrn) continue;

            console.log(`[LinkedIn Proxy] Fallback Attempt: ${fallbackUrn} (Previous error: ${result.status})`);
            result = await tryFetch(fallbackUrn);
            if (result.ok) {
                console.log(`[LinkedIn Proxy] Fallback SUCCESS: ${fallbackUrn}`);
                return { ...result.data, resolvedUrn: fallbackUrn };
            }
        }
    }

    throw new Error(`LinkedIn Get Post Error: ${result.status} - ${JSON.stringify(result.data)}`);
}

export async function getAuthorDetails(accessToken, authorUrn) {
    let profileUrl;
    if (authorUrn.includes(':person:')) {
        const personId = authorUrn.split(':').pop();
        profileUrl = `https://api.linkedin.com/rest/people/${personId}?fields=id,givenName,familyName,headline,picture`;
    } else if (authorUrn.includes(':organization:')) {
        const orgId = authorUrn.split(':').pop();
        profileUrl = `https://api.linkedin.com/rest/organizations/${orgId}?fields=id,localizedName,logoV2`;
    } else {
        throw new Error('Unsupported author URN type.');
    }

    const linkedinResponse = await fetchWithRetry(profileUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': LINKEDIN_API_VERSION
        },
    });

    const data = await linkedinResponse.json();
    if (!linkedinResponse.ok) {
        throw new Error(`LinkedIn Get Author Profile Error: ${linkedinResponse.status} - ${JSON.stringify(data)}`);
    }
    return data;
}

export async function handleGetPost(request, response) {
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

export async function handleGetAuthorProfile(request, response) {
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

export async function handleCreateComment(request, response) {
    const { accessToken, postUrn, actorUrn, text } = request.body;
    if (!accessToken || !postUrn || !actorUrn || !text) {
        return response.status(400).json({ error: 'Missing parameters for comment creation.' });
    }

    const encodedPostUrn = encodeURIComponent(postUrn);
    const commentUrl = `https://api.linkedin.com/rest/socialActions/${encodedPostUrn}/comments`;

    try {
        const linkedinResponse = await fetch(commentUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': LINKEDIN_API_VERSION
            },
            body: JSON.stringify({
                actor: actorUrn,
                message: {
                    text: text
                }
            }),
        });

        const responseText = await linkedinResponse.text();
        let responseData;
        try {
            responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            responseData = { raw: responseText };
        }

        if (!linkedinResponse.ok) {
            console.error('LinkedIn Comment Creation Error:', responseData);
            return response.status(linkedinResponse.status).json(responseData);
        }

        const commentId = linkedinResponse.headers.get('x-restli-id');
        if (commentId) {
            responseData.id = commentId;
        }

        return response.status(linkedinResponse.status).json(responseData);
    } catch (error) {
        console.error('Error during comment creation:', error);
        return response.status(500).json({ error: 'Internal Server Error during comment creation' });
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
                'LinkedIn-Version': LINKEDIN_API_VERSION
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
        case 'searchPostsByHashtag':
            return handleSearchPostsByHashtag(request, response);
        case 'getPost':
            return handleGetPost(request, response);
        case 'getAuthorProfile':
            return handleGetAuthorProfile(request, response);
        case 'createComment':
            return handleCreateComment(request, response);
        case 'uploadImage':
        case 'uploadAndCheckImage':
            return handleUploadAndCheckImage(request, response);

        default:
            return response.status(400).json({ error: `Invalid protected action: ${action}` });
    }
};

const mainHandler = async (request, response) => {
    // Ensure body is parsed robustly
    const body = await parseBody(request);
    request.body = body;

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
