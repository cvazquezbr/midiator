// TODO: Confirmar o endpoint exato e o nome do modelo para a API gratuita do Gemini.
// O exemplo abaixo usa um endpoint comum para gemini-pro.
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash'//'gemini-1.5-flash-latest';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';

/**
 * Chama a API Gemini (Google Generative Language).
 * @param {string} promptString - O prompt completo a ser enviado para a API.
 * @param {string} apiKey - A chave da API Gemini do usuário.
 * @returns {Promise<string>} O texto da mensagem de resposta da IA.
 * @throws {Error} Se a chamada da API falhar ou a resposta não estiver no formato esperado.
 */
export async function callGeminiApi(promptString, apiKey, purpose = 'Chamada Genérica') {
  if (!promptString) {
    throw new Error('O prompt não pode ser vazio.');
  }
  if (!apiKey) {
    throw new Error('A chave da API Gemini não foi fornecida.');
  }

  console.log(`[${purpose}] Iniciando chamada à API Gemini.`);
  console.log(`[${purpose}] Prompt:`, promptString);


  const apiUrl = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
        // Configurações de geração opcionais podem ser adicionadas aqui, se necessário
        // "generationConfig": {
        //   "temperature": 0.7,
        //   "maxOutputTokens": 2048,
        // }
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

    // A estrutura da resposta do Gemini pode variar, mas geralmente o texto está em candidates[0].content.parts[0].text
    if (responseData.candidates && responseData.candidates.length > 0 &&
        responseData.candidates[0].content && responseData.candidates[0].content.parts &&
        responseData.candidates[0].content.parts.length > 0 && responseData.candidates[0].content.parts[0].text) {
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
        throw error; // Mantém o erro específico da API
    }
    throw new Error(`Falha na comunicação com a API Gemini: ${error.message}`);
  }
}

/**
 * Chama a API Gemini para gerar uma imagem.
 * @param {string} promptString - O prompt para a geração da imagem.
 * @param {string} apiKey - A chave da API Gemini do usuário.
 * @returns {Promise<string>} A imagem em formato base64.
 * @throws {Error} Se a chamada da API falhar ou a resposta não contiver uma imagem.
 */
export async function generateImage(promptString, apiKey, purpose = 'Geração de Imagem') {
  if (!promptString) {
    throw new Error('O prompt não pode ser vazio.');
  }
  if (!apiKey) {
    throw new Error('A chave da API Gemini não foi fornecida.');
  }

  console.log(`[${purpose}] Iniciando chamada à API de Imagem Gemini.`);
  console.log(`[${purpose}] Prompt:`, promptString);

  const apiUrl = `${GEMINI_API_BASE_URL}/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;

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
