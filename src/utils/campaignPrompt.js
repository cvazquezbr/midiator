const CAMPAIGN_PROMPT_STORAGE_KEY = 'campaignPrompt';

/**
 * Salva o texto do prompt de campanha no localStorage.
 * @param {string} promptText - O texto do prompt a ser salvo.
 */
export function saveCampaignPrompt(promptText) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CAMPAIGN_PROMPT_STORAGE_KEY, promptText);
    } catch (error) {
      console.error("Erro ao salvar o prompt de campanha:", error);
    }
  }
}

/**
 * Recupera o texto do prompt de campanha do localStorage.
 * @returns {string|null} O texto do prompt ou null se não for encontrado.
 */
export function getCampaignPrompt() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(CAMPAIGN_PROMPT_STORAGE_KEY);
    } catch (error) {
      console.error("Erro ao recuperar o prompt de campanha:", error);
      return null;
    }
  }
  return null;
}

/**
 * Remove o texto do prompt de campanha do localStorage.
 */
export function removeCampaignPrompt() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(CAMPAIGN_PROMPT_STORAGE_KEY);
    } catch (error) {
      console.error("Erro ao remover o prompt de campanha:", error);
    }
  }
}
