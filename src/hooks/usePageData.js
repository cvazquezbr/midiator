import { useMemo } from 'react';
import { useCampaign } from '../context/CampaignContext';

/**
 * Hook para abstrair a lógica de dados da página.
 * Ele determina se uma página usa dados globais ou customizados.
 * @param {number} pageIndex - O índice da página a ser consultada.
 * @returns {object} - Um objeto contendo os dados corretos para a página.
 */
export const usePageData = (pageIndex) => {
  const { campaignState } = useCampaign();
  const {
    generatedPagesData,
    pageTemplate,
    fieldPositions,
    fieldStyles,
    brandElements,
  } = campaignState;

  const pageData = useMemo(() => {
    const foundPageData = (generatedPagesData || []).find(p => p.index === pageIndex);
    console.log(`%c[usePageData] Finding data for index ${pageIndex}:`, 'color: orange;', {
      generatedPagesData,
      foundPageData,
    });
    return foundPageData;
  }, [generatedPagesData, pageIndex]);

  const data = useMemo(() => {
    const isCustom = Boolean(pageData?.customPageTemplate || pageData?.customFieldPositions || pageData?.customFieldStyles);

    const result = {
      isCustom,
      effectivePageTemplate: pageData?.customPageTemplate || pageTemplate || {},
      effectiveFieldPositions: pageData?.customFieldPositions || fieldPositions,
      effectiveFieldStyles: pageData?.customFieldStyles || fieldStyles,
      effectiveBrandElements: pageData?.customBrandElements || brandElements,
      record: pageData?.record,
      effectiveFontScale: pageData?.fontScale || 1,
    };
    console.log(`%c[usePageData] Computed data for index ${pageIndex}:`, 'color: orange; font-weight: bold;', result);
    return result;
  }, [pageData, pageTemplate, fieldPositions, fieldStyles, brandElements, pageIndex]);

  return data;
};
