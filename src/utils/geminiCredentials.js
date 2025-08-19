const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key';

/**
 * Salva a chave da API Gemini no localStorage.
 * @param {string} key - A chave da API a ser salva.
 */
export const saveGeminiApiKey = (key) => {
  if (typeof key !== 'string' || key.trim() === '') {
    console.error('Chave da API Gemini inválida fornecida para salvar.');
    return;
  }
  try {
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
  } catch (error) {
    console.error('Erro ao salvar a chave da API Gemini no localStorage:', error);
  }
};

/**
 * Recupera a chave da API Gemini do localStorage.
 * @returns {string | null} A chave da API ou null se não estiver definida.
 */
export const getGeminiApiKey = () => {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao recuperar a chave da API Gemini do localStorage:', error);
    return null;
  }
};

/**
 * Remove a chave da API Gemini do localStorage.
 */
export const removeGeminiApiKey = () => {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao remover a chave da API Gemini do localStorage:', error);
  }
};
