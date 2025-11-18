import fetchWithAuth from './fetchWithAuth';

class GeminiAPI {
  // The API key is now handled by the backend proxy,
  // so we don't need to initialize or store it here for text generation.
  // The initialize method is kept for now as generateImage might still use it
  // or other parts of the app might depend on it.
  constructor() {
    this.apiKey = null;
    this.isInitialized = false;
  }

  initialize(apiKey) {
    if (!apiKey) {
      console.warn("GeminiAPI: A chave da API não foi fornecida. Funções que dependem dela podem falhar.");
      this.isInitialized = false;
      return;
    }
    this.apiKey = apiKey;
    this.isInitialized = true;
  }

  async generateContent(promptString, model, purpose = 'Chamada Genérica') {
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }
    if (!model) {
      throw new Error('O modelo Gemini deve ser especificado.');
    }

    console.log(`[${purpose}] Iniciando chamada ao proxy Gemini com o modelo ${model}.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    try {
      const response = await fetchWithAuth('/api/google/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model, // Pass the selected model to the proxy
          contents: [{
            parts: [{
              text: promptString
            }]
          }],
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error?.message || responseData.details?.error?.message || `Erro ${response.status}`;
        console.error('Erro do proxy Gemini:', responseData);
        throw new Error(`Erro da API Gemini: ${errorMessage}`);
      }

      console.log(`[${purpose}] Resposta da API Gemini (bruta via proxy):`, responseData);

      if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = responseData.candidates[0].content.parts[0].text.trim();
        console.log(`[${purpose}] Resposta extraída:`, resultText);
        return resultText;
      } else {
        console.error('Formato de resposta inesperado da API Gemini:', responseData);
        throw new Error('Formato de resposta inesperado da API Gemini.');
      }
    } catch (error) {
      console.error('Erro ao chamar o proxy Gemini:', error);
      if (error instanceof Error && error.message.startsWith('Erro da API Gemini:')) {
        throw error;
      }
      throw new Error(`Falha na comunicação com a API Gemini: ${error.message}`);
    }
  }

  async generateImage(promptString, model, purpose = 'Geração de Imagem') {
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }
    if (!model) {
      throw new Error('O modelo de imagem deve ser especificado.');
    }

    console.log(`[${purpose}] Iniciando chamada ao proxy de imagem Gemini com o modelo ${model}.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    try {
      const response = await fetchWithAuth('/api/google/generateImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptString, model: model }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || `Erro ${response.status}`;
        console.error('Erro do proxy Gemini (Imagem):', responseData);
        throw new Error(errorMessage);
      }

      if (responseData.base64Image) {
        console.log(`[${purpose}] Imagem Base64 recebida do proxy (tamanho: ${responseData.base64Image.length} bytes).`);
        return responseData.base64Image;
      } else {
        console.error('Resposta inesperada do proxy Gemini (Imagem):', responseData);
        throw new Error('Nenhuma imagem foi retornada pelo serviço de proxy.');
      }
    } catch (error) {
      console.error('Erro ao chamar o proxy de imagem Gemini:', error);
      throw new Error(`Falha na comunicação com a API de imagem Gemini: ${error.message}`);
    }
  }
}

const geminiAPI = new GeminiAPI();
export default geminiAPI;
