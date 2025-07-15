const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/**
 * Calls the Google Cloud Text-to-Speech API.
 * @param {string} text - The text to be synthesized.
 * @param {string} apiKey - The user's Google Cloud TTS API key.
 * @returns {Promise<string>} A base64-encoded audio string.
 * @throws {Error} If the API call fails or the response is not in the expected format.
 */
export async function callGoogleCloudTTSAPI(text, apiKey) {
  if (!text) {
    throw new Error('Text cannot be empty.');
  }
  if (!apiKey) {
    throw new Error('Google Cloud TTS API key was not provided.');
  }

  const apiUrl = `${TTS_API_URL}?key=${apiKey}`;

  const requestBody = {
    input: {
      text: text,
    },
    voice: {
      languageCode: 'pt-BR',
      name: 'pt-BR-Standard-A', // "Vozes Chirp HD" is a product name, not an API voice name. Using a standard voice.
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
