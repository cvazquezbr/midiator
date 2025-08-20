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

const GEMINI_IMAGE_MODEL_STORAGE_KEY = 'gemini_image_model';

/**
 * Salva o modelo de imagem Gemini selecionado no localStorage.
 * @param {string} model - O modelo a ser salvo.
 */
export const saveGeminiImageModel = (model) => {
    if (typeof model !== 'string' || model.trim() === '') {
        console.error('Modelo de imagem Gemini inválido fornecido para salvar.');
        return;
    }
    try {
        localStorage.setItem(GEMINI_IMAGE_MODEL_STORAGE_KEY, model);
    } catch (error) {
        console.error('Erro ao salvar o modelo de imagem Gemini no localStorage:', error);
    }
};

/**
 * Recupera o modelo de imagem Gemini selecionado do localStorage.
 * @returns {string | null} O modelo ou null se não estiver definido.
 */
export const getGeminiImageModel = () => {
    try {
        return localStorage.getItem(GEMINI_IMAGE_MODEL_STORAGE_KEY);
    } catch (error) {
        console.error('Erro ao recuperar o modelo de imagem Gemini do localStorage:', error);
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

const GEMINI_MODEL_STORAGE_KEY = 'gemini_model';

/**
 * Salva o modelo Gemini selecionado no localStorage.
 * @param {string} model - O modelo a ser salvo.
 */
export const saveGeminiModel = (model) => {
  if (typeof model !== 'string' || model.trim() === '') {
    console.error('Modelo Gemini inválido fornecido para salvar.');
    return;
  }
  try {
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
  } catch (error) {
    console.error('Erro ao salvar o modelo Gemini no localStorage:', error);
  }
};

/**
 * Recupera o modelo Gemini selecionado do localStorage.
 * @returns {string | null} O modelo ou null se não estiver definido.
 */
export const getGeminiModel = () => {
  try {
    return localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao recuperar o modelo Gemini do localStorage:', error);
    return null;
  }
};
