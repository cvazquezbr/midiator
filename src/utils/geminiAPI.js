const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_IMAGE_MODEL = 'gemini-pro-vision'; // Corrected to a valid model for image-related tasks

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    this.isInitialized = false;
  }

  /**
   * Initializes the API with the user's API key.
   * @param {string} apiKey - The Gemini API key.
   */
  initialize(apiKey) {
    if (!apiKey) {
      console.error("GeminiAPI: A chave da API não foi fornecida para inicialização.");
      this.isInitialized = false;
      return;
    }
    this.apiKey = apiKey;
    this.isInitialized = true;
  }

  /**
   * Calls the Gemini API to generate text content.
   * @param {string} promptString - The complete prompt to be sent to the API.
   * @param {string} purpose - A descriptive purpose for logging.
   * @returns {Promise<string>} The response text from the AI.
   */
  async generateContent(promptString, purpose = 'Chamada Genérica') {
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    console.log(`[${purpose}] Iniciando chamada à API Gemini.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    const apiUrl = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptString
            }]
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData.error?.message || `Erro ${response.status}`;
        console.error('Erro da API Gemini:', errorData);
        throw new Error(`Erro da API Gemini: ${errorMessage}`);
      }

      const responseData = await response.json();
      console.log(`[${purpose}] Resposta da API Gemini (bruta):`, responseData);

      if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = responseData.candidates[0].content.parts[0].text.trim();
        console.log(`[${purpose}] Resposta extraída:`, resultText);
        return resultText;
      } else {
        console.error('Formato de resposta inesperado da API Gemini:', responseData);
        throw new Error('Formato de resposta inesperado da API Gemini.');
      }
    } catch (error) {
      console.error('Erro ao chamar a API Gemini:', error);
      if (error instanceof Error && error.message.startsWith('Erro da API Gemini:')) {
          throw error;
      }
      throw new Error(`Falha na comunicação com a API Gemini: ${error.message}`);
    }
  }

  /**
   * Calls the Gemini API to generate an image.
   * @param {string} promptString - The prompt for image generation.
   * @param {string} purpose - A descriptive purpose for logging.
   * @returns {Promise<string>} The base64 encoded image data.
   */
  async generateImage(promptString, purpose = 'Geração de Imagem') {
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    console.log(`[${purpose}] Iniciando chamada à API de Imagem Gemini.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    const apiUrl = `${GEMINI_API_BASE_URL}/${GEMINI_IMAGE_MODEL}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptString
            }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData.error?.message || `Erro ${response.status}`;
        console.error('Erro da API Gemini (Imagem):', errorData);
        throw new Error(`Erro da API Gemini (Imagem): ${errorMessage}`);
      }

      const responseData = await response.json();
      console.log(`[${purpose}] Resposta da API de Imagem Gemini (bruta):`, responseData);

      const imagePart = responseData.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart) {
        console.log(`[${purpose}] Imagem Base64 recebida (tamanho: ${imagePart.inlineData.data.length} bytes).`);
        return imagePart.inlineData.data;
      } else {
        console.error('Formato de resposta inesperado da API Gemini (Imagem):', responseData);
        throw new Error('Nenhuma imagem foi retornada pela API.');
      }
    } catch (error) {
      console.error('Erro ao chamar a API de imagem Gemini:', error);
      if (error instanceof Error && error.message.startsWith('Erro da API Gemini')) {
        throw error;
      }
      throw new Error(`Falha na comunicação com a API de imagem Gemini: ${error.message}`);
    }
  }
}

// Export a single instance (singleton)
const geminiAPI = new GeminiAPI();
export default geminiAPI;
