import { getGeminiModel } from './geminiCredentials';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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

    const model = getGeminiModel() || 'gemini-1.5-flash-latest';
    console.log(`[${purpose}] Iniciando chamada à API Gemini com o modelo ${model}.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    const apiUrl = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${this.apiKey}`;

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
    // A análise do log do usuário e da documentação da API Gemini indica que
    // a API `generativelanguage.googleapis.com` com um modelo como 'gemini-1.5-flash-latest'
    // não suporta a geração de imagens de texto para imagem. Ela retorna uma resposta de texto.
    // A implementação atual está chamando o endpoint de geração de texto por engano.
    // A correção adequada exigiria a integração com uma API diferente (como a Vertex AI com um modelo Imagen),
    // o que é uma mudança arquitetônica significativa.
    // Para evitar mais confusão e falhas, esta função agora lançará um erro informativo.

    console.error(`[${purpose}] A função de geração de imagem foi chamada, mas está configurada incorretamente.`);
    console.error(`[${purpose}] O modelo configurado (provavelmente um modelo de texto como 'gemini-1.5-flash') e o endpoint ':generateContent' não podem criar imagens.`);

    throw new Error('Funcionalidade de geração de imagem não está configurada corretamente. A API chamada é para geração de texto, não de imagem. É necessária uma alteração na configuração da API para um serviço de imagem como o Vertex AI Imagen.');
  }
}

// Export a single instance (singleton)
const geminiAPI = new GeminiAPI();
export default geminiAPI;
