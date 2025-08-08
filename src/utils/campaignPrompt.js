const CAMPAIGN_PROMPT_STORAGE_KEY = 'campaignPrompt';

/**
 * Salva o objeto do prompt de campanha no localStorage.
 * @param {object} promptData - O objeto com os dados do prompt ({ persona, autor, instrucoes, formato, aspectRatio }).
 */
export function saveCampaignPrompt(promptData) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CAMPAIGN_PROMPT_STORAGE_KEY, JSON.stringify(promptData));
    } catch (error) {
      console.error("Erro ao salvar o prompt de campanha:", error);
    }
  }
}

/**
 * Recupera o objeto do prompt de campanha do localStorage.
 * Lida com a migração do formato antigo (string) para o novo (JSON).
 * @returns {{persona: string, autor: string, instrucoes: string, formato: string, aspectRatio: string}|null} O objeto do prompt ou um objeto com campos vazios.
 */
export function getCampaignPrompt() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedData = window.localStorage.getItem(CAMPAIGN_PROMPT_STORAGE_KEY);
      const defaultPrompt = { persona: '', autor: '', instrucoes: '', formato: '', aspectRatio: '1:1' };
      if (!storedData) {
        return defaultPrompt;
      }
      // Tenta parsear como JSON (novo formato)
      try {
        const parsedData = JSON.parse(storedData);
        if (typeof parsedData === 'object' && parsedData !== null) {
          return {
            ...defaultPrompt,
            ...parsedData,
          };
        }
      } catch (e) {
        // Se falhar o parse, assume que é o formato antigo (string)
        // e o coloca no campo 'instrucoes' do novo formato.
        console.log("Migrando prompt do formato antigo para o novo.");
        const migratedData = { ...defaultPrompt, instrucoes: storedData };
        saveCampaignPrompt(migratedData); // Salva no novo formato
        return migratedData;
      }
      // Se o dado armazenado não for um objeto JSON válido nem uma string (caso estranho), retorna o padrão.
      return defaultPrompt;
    } catch (error) {
      console.error("Erro ao recuperar o prompt de campanha:", error);
      return { persona: '', autor: '', instrucoes: '', formato: '', aspectRatio: '1:1' };
    }
  }
  return { persona: '', autor: '', instrucoes: '', formato: '', aspectRatio: '1:1' };
}

/**
 * Remove o prompt de campanha do localStorage.
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
