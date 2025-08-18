// A general-purpose, action-based proxy for LinkedIn API calls.
// This is more secure than an endpoint-based proxy as it doesn't allow calling arbitrary URLs.

async function handleTokenExchange(request, response) {
  const { code, redirectUri } = request.body;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!code || !redirectUri) {
    return response.status(400).json({ error: 'Missing code or redirectUri for token exchange.' });
  }

  if (!clientId || !clientSecret) {
    console.error("Server-side environment variables for LinkedIn are not set.");
    return response.status(500).json({ error: 'Server configuration error.' });
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
        'LinkedIn-Version': '202501'
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
                'LinkedIn-Version': '202501'
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
                'LinkedIn-Version': '202501'
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

    const profileUrl = 'https://api.linkedin.com/v2/me';

    try {
        const linkedinResponse = await fetch(profileUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202501'
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
        'LinkedIn-Version': '202501'
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

async function handleUploadImage(request, response) {
  const { accessToken, uploadUrl, imageBase64, imageType } = request.body;

  if (!accessToken || !uploadUrl || !imageBase64 || !imageType) {
    return response.status(400).json({ error: 'Missing parameters for image upload.' });
  }

  const imageBuffer = Buffer.from(imageBase64, 'base64');

  try {
    const linkedinResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': imageType,
      },
      body: imageBuffer,
    });

    if (!linkedinResponse.ok) {
      const errorText = await linkedinResponse.text();
      console.error("LinkedIn Image Upload Error Body:", errorText);
      return response.status(linkedinResponse.status).json({ message: `Falha no upload da imagem para o LinkedIn. Status: ${linkedinResponse.status}` });
    }

    return response.status(201).send();

  } catch (error) {
    console.error('Error during image upload:', error);
    return response.status(500).json({ error: 'Internal Server Error during image upload' });
  }
}

async function handleCreatePost(request, response) {
  const { accessToken, payload } = request.body;

  if (!accessToken || !payload) {
    return response.status(400).json({ error: 'Missing accessToken or payload for creating post.' });
  }

  const createPostUrl = 'https://api.linkedin.com/v2/ugcPosts';

  try {
    const linkedinResponse = await fetch(createPostUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202501'
      },
      body: JSON.stringify(payload),
    });

    const data = await linkedinResponse.json();
    return response.status(linkedinResponse.status).json(data);
  } catch (error) {
    console.error('Error during post creation:', error);
    return response.status(500).json({ error: 'Internal Server Error during post creation' });
  }
}

async function handleGetOrganizations(request, response) {
  const { accessToken } = request.body;

  if (!accessToken) {
    return response.status(400).json({ error: 'Missing accessToken for getOrganizations.' });
  }

  try {
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202501'
      },
    });
    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch user profile: ${profileResponse.status}`);
    }
    const profileData = await profileResponse.json();
    const profiles = [{
      urn: `urn:li:person:${profileData.id}`,
      name: `${profileData.localizedFirstName} ${profileData.localizedLastName} (Pessoal)`,
    }];

    const aclsUrl = 'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED';
    const aclsHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202501',
      'Content-Type': 'application/json'
    };
    const aclsResponse = await fetch(aclsUrl, { headers: aclsHeaders });

    if (!aclsResponse.ok) {
      const errorBody = await aclsResponse.text();
      console.warn(`ACLs API failed: ${aclsResponse.status}, body: ${errorBody}`);
      return response.status(200).json(profiles);
    }

    const aclsData = await aclsResponse.json();
    const orgIds = (aclsData.elements || []).map(acl => acl.organization).map(urn => urn.split(':')[3]);

    if (orgIds.length === 0) {
      return response.status(200).json(profiles);
    }

    const orgDetailsUrl = `https://api.linkedin.com/rest/organizations?ids=List(${orgIds.join(',')})`;
    const orgDetailsHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202501',
        'Content-Type': 'application/json'
    };
    const orgDetailsResponse = await fetch(orgDetailsUrl, { headers: orgDetailsHeaders });

    if (!orgDetailsResponse.ok) {
      const errorBody = await orgDetailsResponse.text();
      console.warn(`Organizations API failed: ${orgDetailsResponse.status}, body: ${errorBody}`);
      return response.status(200).json(profiles);
    }

    const orgDetailsData = await orgDetailsResponse.json();

    Object.values(orgDetailsData.results || {}).forEach(org => {
      profiles.push({
        urn: `urn:li:organization:${org.id}`,
        name: org.localizedName || org.name?.localized?.en_US,
      });
    });

    return response.status(200).json(profiles);

  } catch (error) {
    console.error('Error during proxied getOrganizations:', error);
    return response.status(500).json({ error: 'Internal Server Error during proxied API call' });
  }
}


export async function handleGetProfileForTest(req, res) {
    return await handleGetProfile(req, res);
}

export default async function handler(request, response) {
  console.log(`[${new Date().toISOString()}] /api/linkedin-proxy invoked. Action: ${request.body?.action}`);

  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
  }

  const { action } = request.body;

  switch (action) {
    case 'tokenExchange':
      return handleTokenExchange(request, response);
    case 'testConnection':
      return handleGetProfile(request, response);
    case 'getProfile':
        return handleGetProfile(request, response);
    case 'registerUpload': // For images
      return handleRegisterUpload(request, response);
    case 'uploadImage':
      return handleUploadImage(request, response);
    case 'createPost':
        return handleCreatePost(request, response);
    case 'getOrganizations':
        return handleGetOrganizations(request, response);
    case 'initializeVideoUpload':
        return handleInitializeVideoUpload(request, response);
    case 'uploadVideo':
        return handleUploadVideo(request, response);
    case 'finalizeVideoUpload':
        return handleFinalizeVideoUpload(request, response);
    case 'checkVideoStatus':
        return handleCheckVideoStatus(request, response);
    default:
      return response.status(400).json({ error: `Invalid action specified: ${action}` });
  }
}
