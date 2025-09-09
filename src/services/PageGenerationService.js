import { drawAndComposeImage } from '../utils/imageComposer';

/**
 * Centraliza a lógica de alto nível para gerar uma página.
 * Este serviço reúne todos os dados necessários e chama a função de baixo nível.
 */
const PageGenerationService = {
  /**
   * Gera uma única imagem de página.
   * @param {object} params - Parâmetros necessários para a geração.
   * @param {object} params.record - O registro de dados (linha do CSV).
   * @param {number} params.index - O índice da página.
   * @param {object} params.campaignContext - O estado do CampaignContext.
   * @returns {Promise<object>} Uma promessa que resolve com os dados da imagem gerada.
   */
  async generatePageImage({ record, index, campaignContext }) {
    console.log(`[PageGenerationService] Generating page for index: ${index}`);

    const {
      brandElements,
      fieldPositions,
      fieldStyles,
      aspectRatio, // Este virá do contexto no futuro
      pageTemplate,
      fontScale = 1, // Este pode vir de dados da página individual
    } = campaignContext;

    try {
      const finalPageData = await drawAndComposeImage({
        record,
        index,
        brandElements,
        fieldPositions,
        fieldStyles,
        aspectRatio: aspectRatio || '1:1', // Fallback
        pageTemplate,
        fontScale,
      });
      return finalPageData;
    } catch (error) {
      console.error(`[PageGenerationService] Error generating page ${index}:`, error);
      throw new Error(`Falha na geração para o post #${index + 1}: ${error.message}`);
    }
  }
};

export default PageGenerationService;
