import { getGeminiModel } from './geminiCredentials';
import fetchWithAuth from './fetchWithAuth'; // Importar fetchWithAuth

// A URL base da API do Google não é mais necessária no frontend para imagens.
// Mantido para generateContent, mas poderia ser refatorado também.
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    this.isInitialized = false;
  }

  initialize(apiKey) {
    if (!apiKey) {
      console.error("GeminiAPI: A chave da API não foi fornecida para inicialização.");
      this.isInitialized = false;
      return;
    }
    this.apiKey = apiKey;
    this.isInitialized = true;
  }

  async generateContent(promptString, purpose = 'Chamada Genérica') {
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    const model = getGeminiModel() || 'gemini-1.5-pro';
    console.log(`[${purpose}] Iniciando chamada à API Gemini com o modelo ${model}.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    const apiUrl = `${GEMINI_API_BASE_URL}/${model}:generateContent`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
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

  async generateImage(promptString, purpose = 'Geração de Imagem') {
    // A inicialização ainda é necessária para outras chamadas, então mantemos a verificação.
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    console.log(`[${purpose}] Iniciando chamada ao proxy de imagem Gemini.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    try {
      // Chamar nosso próprio endpoint de proxy
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
        // O erro do proxy já deve ser amigável, então apenas o lançamos.
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
      // Reformular a mensagem para ser mais clara para o usuário final.
      throw new Error(`Falha na comunicação com a API de imagem Gemini: ${error.message}`);
    }
  }
}

const geminiAPI = new GeminiAPI();
export default geminiAPI;
