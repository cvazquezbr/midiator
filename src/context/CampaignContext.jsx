import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { safeDeepClone } from '../lib/utils';

const defaultPageTemplate = {
  backgroundColor: '#FFFFFF',
  gradient: null,
  images: [],
};

const initialState = {
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
  paletteId: null,
  customPalette: null,
  imageColorPalette: [],
  // Keep non-campaign-data specific state separate if needed
  // For example, UI state could live here, but for now, we keep it all together.
};

export const CampaignContext = createContext(null);

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

export const CampaignProvider = ({ children }) => {
  const [campaignState, setCampaignStateInternal] = useState(initialState);

  const setCampaignState = useCallback((newState) => {
    setCampaignStateInternal(prevState => {
      const updatedState = { ...prevState, ...newState };
      console.log('[CampaignContext] State updated:', { prevState, newState, updatedState });
      return updatedState;
    });
  }, []);

  const applyLoadedCampaign = useCallback((loadedData) => {
    console.log('[CampaignContext] Applying loaded campaign data:', loadedData);
    const campaignData = safeDeepClone(loadedData.campaign_data || {});
    const newState = {
      ...initialState, // Start from a clean slate
      ...campaignData, // Apply campaign-specific data
      currentCampaign: loadedData.currentCampaign || null,
      pendingAssets: loadedData.pendingAssets || {},
    };
    // --- Definitive Fix ---
    // Ensure csvData and generatedPagesData are synchronized after loading.
    const sanitizedCsvData = Array.from(campaignData.csvData || [], record => record || {});
    newState.csvData = sanitizedCsvData;

    // If generatedPagesData is empty or unsynced, create it from csvData.
    if (!campaignData.generatedPagesData || campaignData.generatedPagesData.length !== sanitizedCsvData.length) {
        newState.generatedPagesData = sanitizedCsvData.map((record, index) => {
            const existingPage = (campaignData.generatedPagesData || [])[index] || {};
            return {
                ...existingPage,
                index,
                record,
            };
        });
    }

    setCampaignStateInternal(newState);
    console.log('[CampaignContext] State after applying loaded campaign:', newState);
  }, []);

  const addPendingAsset = useCallback((blob) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    setCampaignStateInternal(prev => ({
      ...prev,
      pendingAssets: {
        ...prev.pendingAssets,
        [blobUrl]: blob,
      }
    }));
    console.log(`[CampaignContext] Synchronously added new asset: ${blobUrl}`);
    return blobUrl;
  }, []);

  const addPendingAssetMap = useCallback((assetMap) => {
    setCampaignStateInternal(prev => ({
      ...prev,
      pendingAssets: {
        ...prev.pendingAssets,
        ...assetMap,
      }
    }));
    console.log('[CampaignContext] Synchronously added asset map.');
  }, []);

  const removePendingAsset = useCallback((blobUrl) => {
    if (typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) {
      console.error("[removePendingAsset] Invalid argument. Expected a blob URL string.", blobUrl);
      return;
    }
    setCampaignStateInternal(prev => {
      const newAssets = { ...prev.pendingAssets };
      if (newAssets[blobUrl]) {
        URL.revokeObjectURL(blobUrl);
        delete newAssets[blobUrl];
        console.log(`[CampaignContext] Removed and revoked asset: ${blobUrl}`);
      }
      return { ...prev, pendingAssets: newAssets };
    });
  }, []);

  useEffect(() => {
    return () => {
      const currentAssets = campaignState.pendingAssets;
      Object.keys(currentAssets).forEach(url => {
        console.log(`[CampaignContext] Revoking blob URL on unmount: ${url}`);
        URL.revokeObjectURL(url);
      });
    };
  }, [campaignState.pendingAssets]);

  const value = useMemo(() => ({
    campaignState,
    setCampaignState,
    applyLoadedCampaign,
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    defaultPageTemplate,
  }), [
    campaignState,
    setCampaignState,
    applyLoadedCampaign,
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};