import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const defaultPageTemplate = {
    backgroundColor: '#FFFFFF',
    gradient: null,
    images: [],
};

// Define the initial structure of our campaign state
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
  pendingAssets: {}, // Holds temporary blob: URLs and their corresponding File/Blob objects
  colors: [],
  paletteId: null,
  customPalette: null,
  imageColorPalette: [],
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
  // A single state object to hold all campaign-related data
  const [campaignState, setCampaignStateInternal] = useState(initialState);

  // A unified function to update parts of the campaign state.
  // This ensures that updates are merged into the existing state.
  const setCampaignState = useCallback((newState) => {
    setCampaignStateInternal(prev => ({ ...prev, ...newState }));
  }, []);

  // A dedicated function to load a complete campaign state, replacing the old one.
  // This is the key to atomic state updates when loading from the database.
  const applyLoadedCampaign = useCallback((loadedState) => {
    console.log('[CampaignContext] Applying loaded campaign state:', loadedState);
    // IMPORTANT: Before applying the new state, revoke all blob URLs from the *previous* state
    // to prevent memory leaks when switching campaigns.
    Object.keys(campaignState.pendingAssets).forEach(url => {
        if (url.startsWith('blob:')) {
            console.log(`[CampaignContext] Revoking old asset upon new campaign load: ${url}`);
            URL.revokeObjectURL(url);
        }
    });
    // Now, set the new, complete state.
    setCampaignStateInternal(loadedState);
  }, [campaignState.pendingAssets]); // Dependency ensures we have the latest pendingAssets to clean up.

  // --- Refactored Asset Handlers ---

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
      toast.error(`Internal error: Attempted to remove an invalid asset URL: ${blobUrl}`);
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

  // Effect to clean up all remaining blob URLs when the provider itself unmounts.
  // This is a final safety net.
  useEffect(() => {
    return () => {
      Object.keys(campaignState.pendingAssets).forEach(url => {
        if (url.startsWith('blob:')) {
          console.log(`[CampaignContext] Revoking blob URL on unmount: ${url}`);
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [campaignState.pendingAssets]);

  // The value provided to consumers of the context.
  const value = useMemo(() => ({
    // Spread the entire state object
    ...campaignState,
    // Provide the new state management functions
    setCampaignState,
    applyLoadedCampaign,
    // Asset handlers
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    // Constants
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