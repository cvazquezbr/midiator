import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

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

export const CampaignProvider = ({ children }) => {
  const [campaignState, setCampaignStateInternal] = useState({
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
    // New state to track unsaved changes
    isDirty: false,
  });

  const setCampaignState = useCallback((updater) => {
    setCampaignStateInternal(currentState => {
      const newState = typeof updater === 'function' ? updater(currentState) : updater;
      return { ...currentState, ...newState, isDirty: true };
    });
  }, []);

  const applyLoadedCampaign = useCallback((loadedState) => {
    setCampaignStateInternal(currentState => {
      const finalState = {
        // Start with a clean slate based on the default structure
        ...{
          csvData: [], csvHeaders: [], fieldPositions: {}, fieldStyles: {},
          brandElements: [], pageTemplate: defaultPageTemplate, selectedField: null,
          currentCampaign: null, generatedPagesData: [], generatedVideos: [],
          aspectRatio: '1:1', pendingAssets: {}, colors: [], paletteId: null,
          customPalette: null, imageColorPalette: [], isDirty: false,
        },
        // Apply the loaded state on top
        ...loadedState,
      };
      // Revoke any old pending assets that are not in the new state
      Object.keys(currentState.pendingAssets).forEach(url => {
        if (!finalState.pendingAssets[url]) {
          URL.revokeObjectURL(url);
        }
      });
      return finalState;
    });
  }, []);


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
    return blobUrl;
  }, [setCampaignState]);

  const addPendingAssetMap = useCallback((assetMap) => {
    setCampaignState(prev => ({
      ...prev,
      pendingAssets: { ...prev.pendingAssets, ...assetMap },
    }));
  }, [setCampaignState]);

  const removePendingAsset = useCallback((blobUrl) => {
    setCampaignState(prev => {
      const newAssets = { ...prev.pendingAssets };
      if (newAssets[blobUrl]) {
        URL.revokeObjectURL(blobUrl);
        delete newAssets[blobUrl];
      }
      return { ...prev, pendingAssets: newAssets };
    });
  }, [setCampaignState]);

  useEffect(() => {
    return () => {
      setCampaignStateInternal(currentAssets => {
        Object.keys(currentAssets.pendingAssets).forEach(url => {
          URL.revokeObjectURL(url);
        });
        return { ...currentAssets, pendingAssets: {} };
      });
    };
  }, []);

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
