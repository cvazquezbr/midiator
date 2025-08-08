export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).end('Method Not Allowed');
  }

  const { code, redirectUri } = request.body;

  // It's crucial that these are set as environment variables in your Vercel project.
  const clientId = process.env.VITE_LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.VITE_LINKEDIN_CLIENT_SECRET;

  if (!code) {
    return response.status(400).json({ error: 'Authorization code is missing.' });
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await linkedinResponse.json();

    if (!linkedinResponse.ok) {
      // Forward the error from LinkedIn
      return response.status(linkedinResponse.status).json(data);
    }

    // Send the successful response back to the frontend
    return response.status(200).json(data);
  } catch (error) {
    console.error('Error during token exchange:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
