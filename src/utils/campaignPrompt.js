const CAMPAIGN_PROMPT_STORAGE_KEY = 'campaignPrompt';

/**
 * Salva o objeto do prompt de campanha no localStorage.
 * @param {object} promptData - O objeto com os dados do prompt ({ instrucoes, formato, colors }).
 */
export function saveCampaignPrompt(promptData) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Create a shallow copy and remove persona-related attributes before saving
      const dataToStore = { ...promptData };
      if (dataToStore.persona) {
        delete dataToStore.persona;
      }
      if (dataToStore.persona_id) {
        delete dataToStore.persona_id;
      }
      if (dataToStore.autor) {
        delete dataToStore.autor;
      }
      window.localStorage.setItem(CAMPAIGN_PROMPT_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Erro ao salvar o prompt de campanha:", error);
    }
  }
}

/**
 * Recupera o objeto do prompt de campanha do localStorage.
 * Lida com a migração de formatos de dados antigos.
 * @returns {{instrucoes: string, formato: string, colors: string[]}} O objeto do prompt ou um objeto com campos vazios.
 */
export function getCampaignPrompt() {
  const defaultPrompt = {
    formato: '',
    colors: [],
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedData = window.localStorage.getItem(CAMPAIGN_PROMPT_STORAGE_KEY);
      if (!storedData) {
        return defaultPrompt;
      }

      let parsedData = JSON.parse(storedData);

      if (typeof parsedData !== 'object' || parsedData === null) {
        return defaultPrompt;
      }


      // Migração para remover o campo aspectRatio
      if (parsedData.aspectRatio) {
        delete parsedData.aspectRatio;
      }

      // Garante que 'colors' seja sempre um array.
      if (!Array.isArray(parsedData.colors)) {
        parsedData.colors = [];
      }

      // Mescla com os padrões para garantir que todas as chaves estejam presentes
      const finalData = {
        ...defaultPrompt,
        ...parsedData,
      };

      return finalData;

    } catch (error) {
      console.error("Erro ao recuperar o prompt de campanha:", error);
      return defaultPrompt;
    }
  }
  return defaultPrompt;
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
