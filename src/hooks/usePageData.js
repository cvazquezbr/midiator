import { useMemo } from 'react';
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

  const pageData = useMemo(() => {
    return (generatedPagesData || []).find(p => p.index === pageIndex);
  }, [generatedPagesData, pageIndex]);

  const data = useMemo(() => {
    console.log(`[usePageData] Recalculando para pageIndex: ${pageIndex}`, { pageData });
    const isCustom = Boolean(pageData?.customPageTemplate || pageData?.customFieldPositions || pageData?.customFieldStyles);

    const record = pageData?.record;
    if (!record) {
      console.error(`[usePageData] ALERTA: 'record' está indefinido para pageIndex: ${pageIndex}.`, { pageData });
    }

    return {
      isCustom,
      effectivePageTemplate: pageData?.customPageTemplate || pageTemplate || {},
      effectiveFieldPositions: pageData?.customFieldPositions || fieldPositions,
      effectiveFieldStyles: pageData?.customFieldStyles || fieldStyles,
      effectiveBrandElements: pageData?.customBrandElements || brandElements,
      record: pageData?.record,
      effectiveFontScale: pageData?.fontScale || 1,
    };
  }, [pageData, pageTemplate, fieldPositions, fieldStyles, brandElements]);

  return data;
};
