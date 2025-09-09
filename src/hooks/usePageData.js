import { useCampaign } from '../context/CampaignContext';

/**
 * Hook para abstrair a lógica de dados da página.
 * Ele determina se uma página usa dados globais ou customizados.
 * @param {number} pageIndex - O índice da página a ser consultada.
 * @returns {object} - Um objeto contendo os dados corretos para a página.
 */
export const usePageData = (pageIndex) => {
  const {
    generatedPagesData,
    pageTemplate,
    fieldPositions,
    fieldStyles,
    brandElements,
  } = useCampaign();

  // Lógica para determinar os dados corretos (será implementada a seguir)
  const pageData = generatedPagesData.find(p => p.index === pageIndex);

  const isCustom = Boolean(pageData?.customPageTemplate || pageData?.customFieldPositions || pageData?.customFieldStyles);

  // Por enquanto, retorna um placeholder. A lógica completa será adicionada.
  const data = {
    isCustom,
    effectivePageTemplate: pageData?.customPageTemplate || pageTemplate,
    effectiveFieldPositions: pageData?.customFieldPositions || fieldPositions,
    effectiveFieldStyles: pageData?.customFieldStyles || fieldStyles,
    effectiveBrandElements: pageData?.customBrandElements || brandElements,
    record: pageData?.record,
  };

  return data;
};
