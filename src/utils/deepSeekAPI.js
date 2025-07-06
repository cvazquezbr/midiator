const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat'; // Ou o modelo que você pretende usar

/**
 * Chama a API DeepSeek Chat Completions.
 * @param {string} promptString - O prompt completo a ser enviado para a API.
 * @param {string} apiKey - A chave da API DeepSeek do usuário.
 * @returns {Promise<string>} O texto da mensagem de resposta da IA.
 * @throws {Error} Se a chamada da API falhar ou a resposta não estiver no formato esperado.
 */
export async function callDeepSeekApi(promptString, apiKey) {
  if (!promptString) {
    throw new Error('O prompt não pode ser vazio.');
  }
  if (!apiKey) {
    throw new Error('A chave da API DeepSeek não foi fornecida.');
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'user', content: promptString }
        ],
        stream: false, // Para garantir uma resposta completa, não um stream
        // Outros parâmetros opcionais como temperature, max_tokens, etc., podem ser adicionados aqui se necessário
        // temperature: 0.7,
        // max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Erro da API DeepSeek: ${response.status} ${errorData.message || 'Erro desconhecido'}`);
    }

    const responseData = await response.json();

    if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message && responseData.choices[0].message.content) {
      return responseData.choices[0].message.content.trim();
    } else {
      console.error('Resposta inesperada da API DeepSeek:', responseData);
      throw new Error('Formato de resposta inesperado da API DeepSeek.');
    }
  } catch (error) {
    console.error('Erro ao chamar a API DeepSeek:', error);
    // Re-lança o erro para que possa ser tratado pela função chamadora (handleGenerateIAContent)
    if (error instanceof Error && error.message.startsWith('Erro da API DeepSeek:')) {
        throw error; // Mantém o erro específico da API
    }
    throw new Error(`Falha na comunicação com a API DeepSeek: ${error.message}`);
  }
}
