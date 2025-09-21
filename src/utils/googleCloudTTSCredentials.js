const TTS_CREDENTIALS_STORAGE_KEY = 'googleCloudTTSCredentials';

/**
 * Salva o JSON de credenciais do Google Cloud TTS no localStorage.
 * @param {object} credentials - O objeto JSON de credenciais a ser salvo.
 */
export function saveGoogleCloudTTSCredentials(credentials) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TTS_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error("Erro ao salvar as credenciais do Google Cloud TTS:", error);
    }
  }
}

/**
 * Recupera as credenciais do Google Cloud TTS do localStorage.
 * @returns {object|null} O objeto de credenciais ou null se não for encontrado.
 */
export function getGoogleCloudTTSCredentials() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const credentialsString = window.localStorage.getItem(TTS_CREDENTIALS_STORAGE_KEY);
    if (credentialsString) {
      try {
        return JSON.parse(credentialsString);
      } catch (error) {
        console.error("Erro ao analisar as credenciais do Google Cloud TTS:", error);
        return null;
      }
    }
  }
  return null;
}

/**
 * Remove as credenciais do Google Cloud TTS do localStorage.
 */
export function removeGoogleCloudTTSCredentials() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(TTS_CREDENTIALS_STORAGE_KEY);
    } catch (error) {
      console.error("Erro ao remover as credenciais do Google Cloud TTS:", error);
    }
  }
}
