import { getGeminiModel } from './geminiCredentials';
import fetchWithAuth from './fetchWithAuth';

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    this.isInitialized = false;
  }

  initialize(apiKey) {
    if (!apiKey) {
      console.warn("GeminiAPI: A chave da API não foi fornecida. A API usará o proxy backend.");
      this.isInitialized = false; // It's not truly initialized with a key, but can still function.
      return;
    }
    this.apiKey = apiKey;
    this.isInitialized = true;
  }

  async generateContent(promptString, purpose = 'Chamada Genérica') {
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    const model = getGeminiModel() || 'gemini-1.5-pro';
    console.log(`[${purpose}] Iniciando chamada ao proxy de conteúdo Gemini com o modelo ${model}.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    try {
      const response = await fetchWithAuth('/api/google/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promptString }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || `Erro ${response.status}`;
        console.error('Erro do proxy Gemini (Conteúdo):', responseData);
        throw new Error(errorMessage);
      }

      if (responseData.generatedText) {
        const resultText = responseData.generatedText.trim();
        console.log(`[${purpose}] Resposta extraída:`, resultText);
        return resultText;
      } else {
        console.error('Resposta inesperada do proxy Gemini (Conteúdo):', responseData);
        throw new Error('Nenhum texto foi retornado pelo serviço de proxy.');
      }
    } catch (error) {
      console.error('Erro ao chamar o proxy de conteúdo Gemini:', error);
      throw new Error(`Falha na comunicação com a API Gemini: ${error.message}`);
    }
  }

  async generateImage(promptString, purpose = 'Geração de Imagem') {
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    console.log(`[${purpose}] Iniciando chamada ao proxy de imagem Gemini.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    try {
      const response = await fetchWithAuth('/api/google/generateImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptString }),
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
