// A general-purpose proxy for LinkedIn API calls.
// It handles two main cases:
// 1. OAuth Token Exchange: If a 'code' is provided in the body, it exchanges it for an access token.
// 2. Proxied API Calls: If an 'endpoint' and 'accessToken' are provided, it makes a GET request to that endpoint.

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
  }

  const { code, redirectUri, endpoint, accessToken } = request.body;

  // Case 1: OAuth Token Exchange
  if (code) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!redirectUri) {
      return response.status(400).json({ error: 'Redirect URI is missing for token exchange.' });
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

  // Case 2: Proxied API Call
  if (endpoint && accessToken) {
    // Basic validation to ensure we only proxy to LinkedIn's API
    if (!endpoint.startsWith('https://api.linkedin.com/')) {
      return response.status(400).json({ error: 'Invalid API endpoint.' });
    }

    try {
      const linkedinResponse = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await linkedinResponse.json();
      return response.status(linkedinResponse.status).json(data);
    } catch (error) {
      console.error('Error during proxied API call:', error);
      return response.status(500).json({ error: 'Internal Server Error during proxied API call' });
    }
  }

  // If neither case is met, it's a bad request.
  return response.status(400).json({ error: 'Invalid request. Provide either a "code" for token exchange or an "endpoint" and "accessToken" for a proxied call.' });
}
