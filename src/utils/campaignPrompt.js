const CAMPAIGN_PROMPT_STORAGE_KEY = 'campaignPrompt';

/**
 * Salva o objeto do prompt de campanha no localStorage.
 * @param {object} promptData - O objeto com os dados do prompt ({ autor, instrucoes, formato, colors, persona_id }).
 */
export function saveCampaignPrompt(promptData) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Create a shallow copy and remove the full persona object before saving, keeping persona_id
      const dataToStore = { ...promptData };
      if (dataToStore.persona) {
        delete dataToStore.persona;
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
 * @returns {{autor: object, instrucoes: string, formato: string, colors: string[], persona_id: number|null}} O objeto do prompt ou um objeto com campos vazios.
 */
export function getCampaignPrompt() {
  const defaultPrompt = {
    autor: {
      identidade: '',
      descricao: '',
      tipo: '',
      tipoOrganizacaoOutro: '',
      objetivoEstrategico: '',
      objetivoEngajamento: '',
      dominioReferencia: '',
      siteExclusao: '',
    },
    instrucoes: '',
    formato: '',
    colors: [],
    persona_id: null,
  };

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
        console.log("Migrando prompt do formato antigo (string) para o novo (objeto).");
        const migratedData = { ...defaultPrompt, instrucoes: storedData };
        saveCampaignPrompt(migratedData);
        return migratedData;
      }

      if (typeof parsedData !== 'object' || parsedData === null) {
        return defaultPrompt;
      }

      // Migração para o campo autor: se for uma string, converte para o novo formato de objeto.
      if (typeof parsedData.autor === 'string') {
        console.log("Migrando autor do formato antigo (string) para o novo (objeto).");
        parsedData.autor = {
          ...defaultPrompt.autor,
          identidade: parsedData.autor,
        };
      } else if (typeof parsedData.autor !== 'object' || parsedData.autor === null) {
        parsedData.autor = { ...defaultPrompt.autor };
      }


      // Ensure full persona object is not carried over from old localStorage data
      if (parsedData.persona) {
        // if persona_id is not set, try to get it from the old persona object
        if (!parsedData.persona_id && parsedData.persona.id) {
            parsedData.persona_id = parsedData.persona.id;
        }
        delete parsedData.persona;
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
        // Garante que a estrutura aninhada de autor também seja mesclada
        autor: {
          ...defaultPrompt.autor,
          ...(parsedData.autor || {}),
        },
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
