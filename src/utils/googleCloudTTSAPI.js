import { KJUR, KEYUTIL } from 'jsrsasign';

const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
let accessToken = null;
let tokenExpiry = 0;

/**
 * Generates an OAuth 2.0 access token from a Google service account JSON key.
 * @param {object} serviceAccount - The service account JSON object.
 * @returns {Promise<string>} The access token.
 */
async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (accessToken && tokenExpiry > now + 60) {
    return accessToken;
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const stringifiedHeader = JSON.stringify(header);
  const stringifiedPayload = JSON.stringify(payload);
  const privateKey = KEYUTIL.getKey(serviceAccount.private_key);
  const jwt = KJUR.jws.JWS.sign('RS256', stringifiedHeader, stringifiedPayload, privateKey);

  const response = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMessage = errorData.error?.message || `Error ${response.status}`;
    throw new Error(`Error fetching access token: ${errorMessage}`);
  }

  const tokenData = await response.json();
  accessToken = tokenData.access_token;
  tokenExpiry = now + tokenData.expires_in;

  return accessToken;
}

/**
 * Calls the Google Cloud Text-to-Speech API.
 * @param {string} text - The text to be synthesized.
 * @param {object} credentials - The service account JSON object.
 * @returns {Promise<string>} A base64-encoded audio string.
 * @throws {Error} If the API call fails or the response is not in the expected format.
 */
export async function callGoogleCloudTTSAPI(text, credentials) {
  if (!text) {
    throw new Error('Text cannot be empty.');
  }
  if (!credentials) {
    throw new Error('Google Cloud TTS credentials were not provided.');
  }

  const token = await getAccessToken(credentials);

  const requestBody = {
    input: {
      text: text,
    },
    voice: {
      languageCode: 'pt-BR',
      name: 'pt-BR-Wavenet-A', // Using a WaveNet voice for better quality
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  };

  try {
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const errorMessage = errorData.error?.message || `Error ${response.status}`;
      console.error('Google Cloud TTS API Error:', errorData);
      throw new Error(`Google Cloud TTS API Error: ${errorMessage}`);
    }

    const responseData = await response.json();

    if (responseData.audioContent) {
      return responseData.audioContent;
    } else {
      console.error('Unexpected response format from Google Cloud TTS API:', responseData);
      throw new Error('Unexpected response format from Google Cloud TTS API.');
    }
  } catch (error) {
    console.error('Error calling Google Cloud TTS API:', error);
    if (error instanceof Error && error.message.startsWith('Google Cloud TTS API Error:')) {
        throw error;
    }
    throw new Error(`Communication failure with Google Cloud TTS API: ${error.message}`);
  }
}
