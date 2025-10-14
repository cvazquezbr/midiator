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
  async generatePageImage({ record, index, campaignContext, pageData = {} }) {
    console.log(`[PageGenerationService] Generating page for index: ${index}`);

    const {
      brandElements: globalBrandElements,
      fieldPositions: globalFieldPositions,
      fieldStyles: globalFieldStyles,
      aspectRatio: globalAspectRatio,
      pageTemplate: globalPageTemplate,
    } = campaignContext;

    // Prioritize page-specific customizations over global campaign settings
    const brandElements = pageData.customBrandElements !== undefined ? pageData.customBrandElements : globalBrandElements;
    const fieldPositions = pageData.customFieldPositions || globalFieldPositions;
    const fieldStyles = pageData.customFieldStyles || globalFieldStyles;
    const pageTemplate = pageData.customPageTemplate || globalPageTemplate;
    const aspectRatio = globalAspectRatio; // Aspect ratio is likely always global for a campaign

    try {
      const finalPageData = await drawAndComposeImage({
        record,
        index,
        brandElements,
        fieldPositions,
        fieldStyles,
        aspectRatio: aspectRatio || '1:1', // Fallback
        pageTemplate,
      });
      return finalPageData;
    } catch (error) {
      console.error(`[PageGenerationService] Error generating page ${index}:`, error);
      throw new Error(`Falha na geração para o post #${index + 1}: ${error.message}`);
    }
  }
};

export default PageGenerationService;
