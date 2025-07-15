const TTS_API_KEY_STORAGE_KEY = 'googleCloudTTSApiKey';

/**
 * Salva a chave da API do Google Cloud TTS no localStorage.
 * @param {string} apiKey - A chave da API a ser salva.
 */
export function saveGoogleCloudTTSApiKey(apiKey) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TTS_API_KEY_STORAGE_KEY, apiKey);
    } catch (error) {
      console.error("Erro ao salvar a chave da API do Google Cloud TTS:", error);
      // Opcional: Adicionar um fallback ou notificação para o usuário
    }
  }
}

/**
 * Recupera a chave da API do Google Cloud TTS do localStorage.
 * @returns {string|null} A chave da API ou null se não for encontrada.
 */
export function getGoogleCloudTTSApiKey() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(TTS_API_KEY_STORAGE_KEY);
  }
  return null;
}

/**
 * Remove a chave da API do Google Cloud TTS do localStorage.
 */
export function removeGoogleCloudTTSApiKey() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(TTS_API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error("Erro ao remover a chave da API do Google Cloud TTS:", error);
    }
  }
}
