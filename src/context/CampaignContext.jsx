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
  const [isCampaignLoading, setCampaignIsLoading] = useState(true);

  const setCampaignState = useCallback((arg) => {
    setCampaignStateInternal(prevState => {
      // This function now correctly handles both object updates and function updates,
      // mimicking the behavior of a standard React state setter.
      const newState = typeof arg === 'function' ? arg(prevState) : arg;
      const updatedState = { ...prevState, ...newState };
      console.log('[CampaignContext] State updated:', { prevState, newState, updatedState });
      return updatedState;
    });
  }, []);

  const applyLoadedCampaign = useCallback((loadedData) => {
    console.log('[CampaignContext] Applying loaded campaign data:', loadedData);

    // Start with a clean slate to avoid merging with old, unrelated campaign data
    const newCampaignState = safeDeepClone(initialState);

    // Merge the loaded campaign data (from campaign_data blob)
    const campaignData = safeDeepClone(loadedData.campaign_data || {});
    Object.assign(newCampaignState, campaignData);

    // --- CRITICAL DATA SYNCHRONIZATION ---

    // 1. Ensure `csvData` is always a valid array.
    // This is the source of truth for page records.
    const sanitizedCsvData = (newCampaignState.csvData || []).map(record => record || {});
    newCampaignState.csvData = sanitizedCsvData;

    // 2. Synchronize `generatedPagesData` with the sanitized `csvData`.
    // This guarantees that for every record in `csvData`, there is a corresponding page entry.
    const synchronizedPages = sanitizedCsvData.map((record, index) => {
      const existingPage = (newCampaignState.generatedPagesData || [])[index] || {};
      return {
        ...existingPage,
        index,
        record, // Overwrite the record to ensure consistency with csvData
      };
    });
    newCampaignState.generatedPagesData = synchronizedPages;

    // --- FINAL STATE ASSEMBLY ---

    // Set campaign metadata
    newCampaignState.currentCampaign = loadedData.id ? { id: loadedData.id, name: loadedData.name } : null;

    // Always clear pending assets on load to prevent cross-campaign contamination
    newCampaignState.pendingAssets = {};

    // Atomically update the state
    setCampaignStateInternal(newCampaignState);
    console.log('[CampaignContext] State after applying loaded campaign:', newCampaignState);
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
    isCampaignLoading,
    setCampaignIsLoading,
  }), [
    campaignState,
    setCampaignState,
    applyLoadedCampaign,
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    isCampaignLoading,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};