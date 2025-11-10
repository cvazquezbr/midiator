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

const clearPendingAssets = (assets) => {
  Object.keys(assets).forEach(url => {
    URL.revokeObjectURL(url);
  });
};

export const CampaignProvider = ({ children }) => {
  const [campaignState, setCampaignStateInternal] = useState(initialState);
  // This effect is the new gatekeeper for cleaning up blob URLs.
  // It runs ONLY when the component unmounts, preventing premature revocation.
  // The actual cleanup of old assets now happens inside `applyLoadedCampaign`
  // BEFORE the new state is set.
  useEffect(() => {
    // Return a cleanup function that will be called on component unmount.
    return () => {
      clearPendingAssets(campaignState.pendingAssets);
    };
  }, []); // Empty dependency array means this effect runs only once on mount.


  const setCampaignState = useCallback((arg) => {
    setCampaignStateInternal(prevState => {
      const newState = typeof arg === 'function' ? arg(prevState) : arg;
      return { ...prevState, ...newState };
    });
  }, []);

  const applyLoadedCampaign = useCallback((loadedData) => {
    // CRITICAL FIX: The cleanup of old assets must happen HERE, before setting
    // the new state. We get the CURRENT assets from the state updater function,
    // clear them, and then return the NEW state. This avoids race conditions.
    setCampaignStateInternal(prevState => {
      // Revoke URLs from the PREVIOUS state.
      if (prevState.currentCampaign?.id !== loadedData.id) {
        clearPendingAssets(prevState.pendingAssets);
      }

    const campaignData = loadedData.campaign_data || {};

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

    const campaignColors = campaignData.customPalette?.colors || [];
    const newState = {
      ...initialState,
      ...campaignData,
      csvData: sanitizedCsvData,
      generatedPagesData: synchronizedPages,
      currentCampaign: loadedData.id ? { id: loadedData.id, name: loadedData.name } : null,
      pendingAssets: loadedData.pendingAssets || {}, // This is the fix: Overwrite, don't merge.
      selectedAutorForCampaign: loadedData.autor_id || '',
      selectedPersonaForCampaign: loadedData.persona_id || '',
      campaignContent: campaignData.campaignContent || null,
      // Ensure specific fields are initialized correctly to prevent app crashes
      generatedVideos: campaignData.generatedVideos || [],
      generatedAudioData: campaignData.generatedAudioData || [],
      fieldPositions: campaignData.fieldPositions || {},
      colors: campaignColors,
    };
    return newState;
    });
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
      }
      return { ...prev, pendingAssets: newAssets };
    });
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
