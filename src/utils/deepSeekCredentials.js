const DEEPSEEK_API_KEY_STORAGE_KEY = 'deepseek_api_key';

/**
 * Salva a chave da API DeepSeek no localStorage.
 * @param {string} key - A chave da API a ser salva.
 */
export const saveDeepSeekApiKey = (key) => {
  if (typeof key !== 'string' || key.trim() === '') {
    console.error('Chave da API DeepSeek inválida fornecida para salvar.');
    return;
  }
  try {
    localStorage.setItem(DEEPSEEK_API_KEY_STORAGE_KEY, key);
  } catch (error) {
    console.error('Erro ao salvar a chave da API DeepSeek no localStorage:', error);
  }
};

/**
 * Recupera a chave da API DeepSeek do localStorage.
 * @returns {string | null} A chave da API ou null se não estiver definida.
 */
export const getDeepSeekApiKey = () => {
  try {
    return localStorage.getItem(DEEPSEEK_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao recuperar a chave da API DeepSeek do localStorage:', error);
    return null;
  }
};

/**
 * Remove a chave da API DeepSeek do localStorage.
 */
export const removeDeepSeekApiKey = () => {
  try {
    localStorage.removeItem(DEEPSEEK_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao remover a chave da API DeepSeek do localStorage:', error);
  }
};
