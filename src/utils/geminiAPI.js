const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_IMAGE_MODEL = 'gemini-pro-vision';

class GeminiAPI {
  constructor() {
    // Stateless
  }

  /**
   * Calls the backend proxy to generate text content.
   * @param {string} promptString - The complete prompt to be sent.
   * @param {string} purpose - A descriptive purpose for logging.
   * @returns {Promise<string>} The response text from the AI.
   */
  async generateContent(promptString, purpose = 'Chamada Genérica') {
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    console.log(`[${purpose}] Enviando prompt para o proxy Gemini.`);

    try {
      const response = await fetch('/api/gemini/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptString, model: GEMINI_MODEL }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Erro ${response.status}`);
      }

      if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        return responseData.candidates[0].content.parts[0].text.trim();
      } else {
        console.error('Formato de resposta inesperado do proxy Gemini:', responseData);
        throw new Error('Formato de resposta inesperado do proxy Gemini.');
      }
    } catch (error) {
      console.error('Erro ao chamar o proxy Gemini:', error);
      throw new Error(`Falha na comunicação com o servidor: ${error.message}`);
    }
  }

  /**
   * Calls the backend proxy to generate an image.
   * @param {string} promptString - The prompt for image generation.
   * @param {string} purpose - A descriptive purpose for logging.
   * @returns {Promise<string>} The base64 encoded image data.
   */
  async generateImage(promptString, purpose = 'Geração de Imagem') {
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    console.log(`[${purpose}] Enviando prompt de imagem para o proxy Gemini.`);

    try {
      const response = await fetch('/api/gemini/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptString, model: GEMINI_IMAGE_MODEL }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Erro ${response.status}`);
      }

      const imagePart = responseData.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart) {
        return imagePart.inlineData.data;
      } else {
        console.error('Formato de resposta inesperado do proxy Gemini (Imagem):', responseData);
        throw new Error('Nenhuma imagem foi retornada pelo proxy.');
      }
    } catch (error) {
      console.error('Erro ao chamar o proxy de imagem Gemini:', error);
      throw new Error(`Falha na comunicação com o servidor: ${error.message}`);
    }
  }
}

// Export a single instance (singleton)
const geminiAPI = new GeminiAPI();
export default geminiAPI;
