const CAMPAIGN_PROMPT_STORAGE_KEY = 'campaignPrompt';

/**
 * Salva o objeto do prompt de campanha no localStorage.
 * @param {object} promptData - O objeto com os dados do prompt ({ persona, autor, instrucoes, formato, colors }).
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
 * Lida com a migração de formatos de dados antigos.
 * @returns {{persona: object, autor: string, instrucoes: string, formato: string, colors: string[]}} O objeto do prompt ou um objeto com campos vazios.
 */
export function getCampaignPrompt() {
  const defaultPrompt = { persona: {}, autor: '', instrucoes: '', formato: '', colors: [] };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedData = window.localStorage.getItem(CAMPAIGN_PROMPT_STORAGE_KEY);
      if (!storedData) {
        return defaultPrompt;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(storedData);
      } catch (e) {
        // Lida com o caso em que storedData não é um JSON válido (formato antigo de string)
        console.log("Migrando prompt do formato antigo (string) para o novo (objeto).");
        const migratedData = { ...defaultPrompt, instrucoes: storedData };
        saveCampaignPrompt(migratedData);
        return migratedData;
      }

      if (typeof parsedData !== 'object' || parsedData === null) {
        // O valor armazenado é JSON válido, mas não um objeto (ex: "null", "true", "123")
        return defaultPrompt;
      }

      // Migração para o campo persona: se não for um objeto não nulo, reseta.
      if (typeof parsedData.persona !== 'object' || parsedData.persona === null) {
        parsedData.persona = {};
      }

      // Migração para remover o campo aspectRatio
      if (parsedData.aspectRatio) {
        delete parsedData.aspectRatio;
        // O objeto atualizado será salvo na próxima vez que o usuário salvar.
      }

      // Mescla com os padrões para garantir que todas as chaves estejam presentes
      return {
        ...defaultPrompt,
        ...parsedData,
      };

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
