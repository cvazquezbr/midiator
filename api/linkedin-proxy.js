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

async function handleTestConnection(request, response) {
    const { accessToken } = request.body;

    if (!accessToken) {
        return response.status(400).json({ error: 'Missing accessToken for test connection.' });
    }

    const testUrl = 'https://api.linkedin.com/v2/connections?q=viewer&start=0&count=0';

    try {
        const linkedinResponse = await fetch(testUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        const data = await linkedinResponse.json();
        return response.status(linkedinResponse.status).json(data);
    } catch (error) {
        console.error('Error during proxied test connection:', error);
        return response.status(500).json({ error: 'Internal Server Error during proxied API call' });
    }
}


export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
  }

  const { action } = request.body;

  switch (action) {
    case 'tokenExchange':
      return handleTokenExchange(request, response);
    case 'testConnection':
      return handleTestConnection(request, response);
    default:
      return response.status(400).json({ error: 'Invalid action specified.' });
  }
}
