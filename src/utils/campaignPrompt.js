const CAMPAIGN_PROMPT_STORAGE_KEY = 'campaignPrompt';

/**
 * Salva o objeto do prompt de campanha no localStorage.
 * @param {object} promptData - O objeto com os dados do prompt ({ persona, autor, instrucoes }).
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
 * @returns {{persona: string, autor: string, instrucoes: string}|null} O objeto do prompt ou um objeto com campos vazios.
 */
export function getCampaignPrompt() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedData = window.localStorage.getItem(CAMPAIGN_PROMPT_STORAGE_KEY);
      if (!storedData) {
        return { persona: '', autor: '', instrucoes: '' };
      }
      // Tenta parsear como JSON (novo formato)
      try {
        const parsedData = JSON.parse(storedData);
        if (typeof parsedData === 'object' && parsedData !== null) {
          return {
            persona: parsedData.persona || '',
            autor: parsedData.autor || '',
            instrucoes: parsedData.instrucoes || '',
          };
        }
      } catch (e) {
        // Se falhar o parse, assume que é o formato antigo (string)
        // e o coloca no campo 'instrucoes' do novo formato.
        console.log("Migrando prompt do formato antigo para o novo.");
        const migratedData = { persona: '', autor: '', instrucoes: storedData };
        saveCampaignPrompt(migratedData); // Salva no novo formato
        return migratedData;
      }
      // Se o dado armazenado não for um objeto JSON válido nem uma string (caso estranho), retorna o padrão.
      return { persona: '', autor: '', instrucoes: '' };
    } catch (error) {
      console.error("Erro ao recuperar o prompt de campanha:", error);
      return { persona: '', autor: '', instrucoes: '' };
    }
  }
  return { persona: '', autor: '', instrucoes: '' };
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
