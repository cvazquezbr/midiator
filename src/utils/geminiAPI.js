import { getGeminiModel, getGeminiImageModel } from './geminiCredentials';

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

  async generateImage(promptString, purpose = 'Geração de Imagem') {
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    const model = getGeminiImageModel() || 'gemini-2.0-flash-preview-image-generation';
    console.log(`[${purpose}] Iniciando chamada à API de Imagem Gemini com o modelo ${model}.`);
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
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
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

      // Check for prompt feedback which indicates a safety block
      if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
        const blockReason = responseData.promptFeedback.blockReason;
        const safetyRatings = responseData.promptFeedback.safetyRatings;
        console.error(`[${purpose}] A solicitação foi bloqueada pela API Gemini. Razão: ${blockReason}`);
        console.error(`[${purpose}] Detalhes de Segurança:`, safetyRatings);
        throw new Error(`A geração de imagem foi bloqueada por questões de segurança: ${blockReason}. Verifique o conteúdo do seu prompt.`);
      }

      const imagePart = responseData.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart) {
        console.log(`[${purpose}] Imagem Base64 recebida (tamanho: ${imagePart.inlineData.data.length} bytes).`);
        return imagePart.inlineData.data;
      } else {
        // This case handles when there are no candidates, but it wasn't explicitly blocked.
        console.error('Formato de resposta inesperado da API Gemini (Imagem). Nenhum candidato ou parte de imagem encontrada:', responseData);
        throw new Error('Nenhuma imagem foi retornada pela API. A resposta não continha dados de imagem.');
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

const geminiAPI = new GeminiAPI();
export default geminiAPI;