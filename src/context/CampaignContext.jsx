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
  problema: '',
  solucao: '',
  objetivo: 'Gerar leads',
  tomDeVoz: 'Profissional e direto',
  campaignContent: null,
  followupPostsQuantity: 5,
  followupPosts: [],
  promptText: '',
  promptNumRecords: 10,
  generatedAudioData: [],
  templateFieldStyles: {},
  fontScale: 1,
  isGeneratingFollowup: false,
  initialFieldStyles: {},
  activeStep: 0,
  inputMethod: 'ia',
  generatedPageUrl: null,
  colors: [],
  selectedPersonaForCampaign: '',
  selectedAutorForCampaign: '',
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

  const setCampaignState = useCallback((arg) => {
    setCampaignStateInternal(prevState => {
      const newState = typeof arg === 'function' ? arg(prevState) : arg;
      return { ...prevState, ...newState };
    });
  }, []);

  const applyLoadedCampaign = useCallback((loadedData) => {
    console.log('[CampaignContext] Applying loaded campaign data:', loadedData);

    const campaignData = safeDeepClone(loadedData.campaign_data || {});

    // Ensure csvData is always a valid array of objects
    const sanitizedCsvData = (campaignData.csvData || []).map(record => record || {});

    // Synchronize generatedPagesData with csvData
    const synchronizedPages = sanitizedCsvData.map((record, index) => {
      const existingPage = (campaignData.generatedPagesData || [])[index] || {};
      return {
        ...existingPage,
        index,
        record,
      };
    });

    const newState = {
      ...initialState,
      ...campaignData,
      csvData: sanitizedCsvData,
      generatedPagesData: synchronizedPages,
      currentCampaign: loadedData.id ? { id: loadedData.id, name: loadedData.name } : null,
      pendingAssets: loadedData.pendingAssets || {}, // Correctly merge the loaded assets
      selectedAutorForCampaign: loadedData.autor_id || '',
      selectedPersonaForCampaign: loadedData.persona_id || '',
    };

    setCampaignStateInternal(newState);
    console.log('[CampaignContext] State after applying loaded campaign:', newState);
  }, []);

  const addPendingAsset = useCallback((blob) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    setCampaignStateInternal(prev => {
      const newPendingAssets = { ...prev.pendingAssets, [blobUrl]: blob };
      console.log(`%c[CampaignContext] ADDING asset. New pendingAssets count: ${Object.keys(newPendingAssets).length}`, 'color: #FFA500; font-weight: bold;', newPendingAssets);
      return { ...prev, pendingAssets: newPendingAssets };
    });
    console.log(`[CampaignContext] Created blob URL: ${blobUrl}`);
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
    console.log('%c[CampaignContext] Provider Mounted', 'color: green; font-weight: bold;');
    // This effect runs only once on mount to set up the cleanup function for when
    // the provider unmounts. An empty dependency array [] ensures this behavior.
    return () => {
      console.log('%c[CampaignContext] Provider Unmounting...', 'color: red; font-weight: bold;');
      // We use the functional form of the state setter here to guarantee access
      // to the most recent 'pendingAssets' state during cleanup, avoiding issues
      // with stale closures.
      setCampaignStateInternal(prev => {
        const assetCount = Object.keys(prev.pendingAssets).length;
        console.log(`[CampaignContext] Cleaning up ${assetCount} pending assets.`);
        Object.keys(prev.pendingAssets).forEach(url => {
          console.log(`[CampaignContext] Revoking blob URL on unmount: ${url}`);
          URL.revokeObjectURL(url);
        });
        // No state change is actually performed; we just use this to access the latest state.
        return prev;
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