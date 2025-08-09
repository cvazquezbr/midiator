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
    if (!linkedinResponse.ok) {
      console.error('LinkedIn API Error during token exchange:', data);
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
        return response.status(400).json({ error: 'Missing accessToken for getProfile.' });
    }

    const profileUrl = 'https://api.linkedin.com/v2/me';

    try {
        const linkedinResponse = await fetch(profileUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
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
        'LinkedIn-Version': '202405',
      },
      body: JSON.stringify(payload),
    });

    const data = await linkedinResponse.json();

    if (!linkedinResponse.ok) {
        return response.status(linkedinResponse.status).json(data);
    }

    // The client expects a simplified response, so we parse the complex one from LinkedIn.
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

  // Convert base64 to a Buffer for the binary upload
  const imageBuffer = Buffer.from(imageBase64, 'base64');

  try {
    const linkedinResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        // Note: The official LinkedIn docs say to include the Bearer token, so we do.
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

    // Successful upload returns 201 Created with no body.
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

  const createPostUrl = 'https://api.linkedin.com/rest/posts';

  try {
    const linkedinResponse = await fetch(createPostUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202405',
      },
      body: JSON.stringify(payload),
    });

    if (!linkedinResponse.ok) {
        const errorData = await linkedinResponse.json().catch(() => ({ message: 'Could not parse error response from LinkedIn.' }));
        console.error('LinkedIn Post Creation Error:', errorData);
        return response.status(linkedinResponse.status).json(errorData);
    }

    // On success (201 Created), the new Posts API returns the ID in the header.
    const postId = linkedinResponse.headers.get('x-restli-id');
    if (postId) {
        return response.status(201).json({ id: postId });
    } else {
        // Fallback in case the header is missing, though it shouldn't be.
        return response.status(201).json({ id: 'urn:li:share:UNKNOWN_ID_HEADER_MISSING' });
    }
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
    // 1. Get user's own profile to start the list
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) throw new Error('Failed to fetch user profile.');
    const profileData = await profileResponse.json();
    const profiles = [{
      urn: `urn:li:person:${profileData.id}`,
      name: `${profileData.localizedFirstName} ${profileData.localizedLastName} (Pessoal)`,
    }];

    // 2. Find organizations the user has an approved role for.
    // We fetch all roles and de-duplicate, as a user might have multiple roles for one page.
    const aclUrl = 'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED';
    const aclResponse = await fetch(aclUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202405',
      },
    });

    if (!aclResponse.ok) {
       // It's possible the user has no organizations, so don't throw an error, just log it.
       console.warn(`Could not fetch organization ACLs, status: ${aclResponse.status}`);
       return response.status(200).json(profiles); // Return at least the personal profile
    }

    const aclData = await aclResponse.json();
    const organizationUrns = aclData.elements?.map(el => el.organization) || [];

    if (organizationUrns.length === 0) {
      return response.status(200).json(profiles);
    }

    // 3. Fetch details for each organization
    const organizationPromises = organizationUrns.map(urn =>
      fetch(`https://api.linkedin.com/v2/organizations/${urn.split(':').pop()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(res => res.ok ? res.json() : null)
    );

    const organizationResults = await Promise.all(organizationPromises);

    organizationResults.forEach(orgData => {
      if (orgData) {
        profiles.push({
          urn: `urn:li:organization:${orgData.id}`,
          name: orgData.localizedName,
        });
      }
    });

    return response.status(200).json(profiles);

  } catch (error) {
    console.error('Error during proxied getOrganizations:', error);
    return response.status(500).json({ error: 'Internal Server Error during proxied API call' });
  }
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
    case 'testConnection': // Re-route testConnection to use the same logic as getProfile
      return handleGetProfile(request, response);
    case 'getProfile':
        return handleGetProfile(request, response);
    case 'registerUpload':
      return handleRegisterUpload(request, response);
    case 'uploadImage':
      return handleUploadImage(request, response);
    case 'createPost':
        return handleCreatePost(request, response);
    case 'getOrganizations':
        return handleGetOrganizations(request, response);
    default:
      return response.status(400).json({ error: 'Invalid action specified.' });
  }
}
