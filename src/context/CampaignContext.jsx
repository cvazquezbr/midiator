import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { createNewImageElement } from '../utils/elementFactory';

const defaultPageTemplate = {
    backgroundColor: '#FFFFFF',
    gradient: null,
    images: [],
};

export const CampaignContext = createContext(null);

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

const initialCampaignState = {
  csvData: [],
  csvHeaders: [],
  fieldPositions: {},
  fieldStyles: {},
  brandElements: [],
  pageTemplate: defaultPageTemplate,
  selectedField: null,
  currentCampaign: null,
  generatedPagesData: [],
  generatedVideos: [],
  aspectRatio: '1:1',
  pendingAssets: {},
  colors: [],
  paletteId: null,
  customPalette: null,
  imageColorPalette: [],
};

export const CampaignProvider = ({ children }) => {
  const [campaignState, setCampaignState] = useState(initialCampaignState);

  const applyLoadedCampaign = useCallback((loaded) => {
    if (!loaded || !loaded.campaignData) {
      console.warn("[CampaignContext] applyLoadedCampaign received invalid data.");
      return;
    }
    console.log("[CampaignContext] Applying loaded campaign state:", loaded);
    const { campaignData: state, pendingAssets: newPendingAssets, campaign } = loaded;

    const newPageTemplate = state.pageTemplate
      ? {
          ...defaultPageTemplate,
          ...state.pageTemplate,
          images: (state.pageTemplate.images || []).map(img => ({
              ...createNewImageElement(null),
              ...img
          })),
        }
      : defaultPageTemplate;

    setCampaignState({
      ...initialCampaignState, // Start from a clean slate
      pendingAssets: newPendingAssets || {},
      currentCampaign: campaign,
      csvData: Array.isArray(state.csvData) ? state.csvData : [],
      csvHeaders: Array.isArray(state.csvHeaders) ? state.csvHeaders : [],
      generatedPagesData: Array.isArray(state.generatedPagesData) ? state.generatedPagesData : [],
      brandElements: Array.isArray(state.brandElements) ? state.brandElements : [],
      pageTemplate: newPageTemplate,
      aspectRatio: state.aspectRatio ?? '1:1',
      fieldPositions: state.fieldPositions ?? {},
      fieldStyles: state.fieldStyles ?? {},
      // Note: paletteId, autorId, personaId are managed in HomePage state, not context
    });
  }, []);

  // Centralized asset handlers
  const addPendingAsset = useCallback((blob) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    setCampaignState(prev => ({
      ...prev,
      pendingAssets: { ...prev.pendingAssets, [blobUrl]: blob },
    }));
    console.log(`[CampaignContext] Synchronously added new asset: ${blobUrl}`);
    return blobUrl;
  }, []);

  const addPendingAssetMap = useCallback((assetMap) => {
    setCampaignState(prev => ({
      ...prev,
      pendingAssets: { ...prev.pendingAssets, ...assetMap },
    }));
    console.log('[CampaignContext] Synchronously added asset map.');
  }, []);

  const removePendingAsset = useCallback((blobUrl) => {
    if (typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) {
      console.error("[removePendingAsset] Invalid argument. Expected a blob URL string.", blobUrl);
      return;
    }
    setCampaignState(prev => {
      const newAssets = { ...prev.pendingAssets };
      if (newAssets[blobUrl]) {
        URL.revokeObjectURL(blobUrl);
        delete newAssets[blobUrl];
        console.log(`[CampaignContext] Removed and revoked asset: ${blobUrl}`);
      }
      return { ...prev, pendingAssets: newAssets };
    });
  }, []);

  // Effect to clean up all blob URLs on unmount
  useEffect(() => {
    return () => {
      setCampaignState(prev => {
        Object.keys(prev.pendingAssets).forEach(url => {
          console.log(`[CampaignContext] Revoking blob URL on unmount: ${url}`);
          URL.revokeObjectURL(url);
        });
        return { ...prev, pendingAssets: {} };
      });
    };
  }, []);

  const value = useMemo(() => ({
    ...campaignState,
    setCampaignState, // Expose the unified setter
    // Asset Management - these can remain as they modify a part of the unified state
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    applyLoadedCampaign,
    // Constants
    defaultPageTemplate,
  }), [
    campaignState,
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    applyLoadedCampaign,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
