import * as jose from 'jose';

const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

class GoogleCloudTTSAPI {
  constructor() {
    this.credentials = null;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.isInitialized = false;
  }

  /**
   * Initializes the API with service account credentials.
   * @param {object} credentials - The service account JSON object.
   */
  initialize(credentials) {
    if (!credentials || !credentials.private_key || !credentials.client_email || !credentials.token_uri) {
      console.error("GoogleCloudTTSAPI: As credenciais fornecidas são inválidas ou incompletas.");
      this.isInitialized = false;
      return;
    }
    this.credentials = credentials;
    this.isInitialized = true;
    // Reset token info upon re-initialization
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Generates or retrieves a cached OAuth 2.0 access token.
   * @private
   * @returns {Promise<string>} The access token.
   */
  async _getAccessToken() {
    if (!this.isInitialized) {
      throw new Error('GoogleCloudTTSAPI não foi inicializado. Chame initialize() primeiro.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && this.tokenExpiry > now + 60) {
      return this.accessToken;
    }

    try {
      const privateKey = await jose.importPKCS8(this.credentials.private_key, 'RS256');

      const jwt = await new jose.SignJWT({
        scope: 'https://www.googleapis.com/auth/cloud-platform',
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer(this.credentials.client_email)
        .setAudience(this.credentials.token_uri)
        .setExpirationTime('1h')
        .sign(privateKey);

      const response = await fetch(this.credentials.token_uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData.error?.message || `Error ${response.status}`;
        throw new Error(`Erro ao buscar token de acesso: ${errorMessage}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = now + tokenData.expires_in;

      return this.accessToken;
    } catch (error) {
        console.error("Erro ao gerar token de acesso para TTS:", error);
        throw error;
    }
  }

  /**
   * Calls the Google Cloud Text-to-Speech API.
   * @param {string} text - The text to be synthesized.
   * @param {string} voice - The voice name (e.g., 'pt-BR-Wavenet-A').
   * @param {number} rate - The speaking rate.
   * @returns {Promise<string>} A base64-encoded audio string.
   */
  async synthesize(text, voice = 'pt-BR-Wavenet-A', rate = 1.0) {
    if (!this.isInitialized) {
      throw new Error('GoogleCloudTTSAPI não inicializado.');
    }
    if (!text) {
      throw new Error('O texto não pode ser vazio.');
    }

    const token = await this._getAccessToken();

    const requestBody = {
      input: {
        text: text,
      },
      voice: {
        languageCode: 'pt-BR',
        name: voice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: rate,
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
        console.error('Erro da API Google Cloud TTS:', errorData);
        throw new Error(`Erro da API Google Cloud TTS: ${errorMessage}`);
      }

      const responseData = await response.json();

      if (responseData.audioContent) {
        return responseData.audioContent;
      } else {
        console.error('Formato de resposta inesperado da API Google Cloud TTS:', responseData);
        throw new Error('Formato de resposta inesperado da API Google Cloud TTS.');
      }
    } catch (error) {
      console.error('Erro ao chamar a API Google Cloud TTS:', error);
      if (error instanceof Error && error.message.startsWith('Erro da API Google Cloud TTS:')) {
          throw error;
      }
      throw new Error(`Falha na comunicação com a API Google Cloud TTS: ${error.message}`);
    }
  }
}

// Export a single instance (singleton)
const googleCloudTTSAPI = new GoogleCloudTTSAPI();
export default googleCloudTTSAPI;
