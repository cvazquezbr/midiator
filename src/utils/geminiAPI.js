// TODO: Confirmar o endpoint exato e o nome do modelo para a API gratuita do Gemini.
// O exemplo abaixo usa um endpoint comum para gemini-pro.
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.5-pro'; // Ou outro modelo gratuito disponível, ex: 'gemini-1.0-pro'

/**
 * Chama a API Gemini (Google Generative Language).
 * @param {string} promptString - O prompt completo a ser enviado para a API.
 * @param {string} apiKey - A chave da API Gemini do usuário.
 * @returns {Promise<string>} O texto da mensagem de resposta da IA.
 * @throws {Error} Se a chamada da API falhar ou a resposta não estiver no formato esperado.
 */
export async function callGeminiApi(promptString, apiKey) {
  if (!promptString) {
    throw new Error('O prompt não pode ser vazio.');
  }
  if (!apiKey) {
    throw new Error('A chave da API Gemini não foi fornecida.');
  }

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

    // A estrutura da resposta do Gemini pode variar, mas geralmente o texto está em candidates[0].content.parts[0].text
    if (responseData.candidates && responseData.candidates.length > 0 &&
        responseData.candidates[0].content && responseData.candidates[0].content.parts &&
        responseData.candidates[0].content.parts.length > 0 && responseData.candidates[0].content.parts[0].text) {
      return responseData.candidates[0].content.parts[0].text.trim();
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
