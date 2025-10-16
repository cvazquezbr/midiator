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

export const CampaignProvider = ({ children }) => {
  // Estado da Campanha
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [brandElements, setBrandElements] = useState([]);
  const [pageTemplate, setPageTemplate] = useState(defaultPageTemplate);
  const [selectedField, setSelectedField] = useState(null);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [generatedPagesData, setGeneratedPagesData] = useState([]);
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  /**
   * @type {[Object<string, Blob>, Function]}
   * @description Holds a map of local `blob:` URLs to their corresponding Blob objects.
   * This state is the single source of truth for all temporary assets that have been
   * generated or uploaded by the user but not yet saved to the backend.
   * The `blob:` URL is created via `URL.createObjectURL()` and must be manually revoked
   * using `URL.revokeObjectURL()` when the asset is no longer needed to prevent memory leaks.
   */
  const [pendingAssets, setPendingAssets] = useState({});
  const [colors, setColors] = useState([]);
  const [paletteId, setPaletteId] = useState(null);
  const [customPalette, setCustomPalette] = useState(null);
  const [imageColorPalette, setImageColorPalette] = useState([]);

  const applyLoadedCampaign = useCallback((loaded) => {
    if (!loaded || !loaded.campaignData) {
      console.warn("[CampaignContext] applyLoadedCampaign received invalid data.");
      return;
    }
    console.log("[CampaignContext] Applying loaded campaign state:", loaded);
    const { campaignData: state, pendingAssets: newPendingAssets, autorId, personaId, paletteId: newPaletteId, campaign } = loaded;

    React.startTransition(() => {
        setPendingAssets(newPendingAssets || {});
        setCurrentCampaign(campaign);
        // setSelectedAutorForCampaign(autorId); // This state lives in HomePage
        // setSelectedPersonaForCampaign(personaId); // This state lives in HomePage
        setPaletteId(newPaletteId);

        // setActiveStep(state.activeStep ?? 1); // This state lives in HomePage
        // setSidebarOpen(state.sidebarOpen ?? !isMobile); // This state lives in HomePage

        setCsvData(Array.isArray(state.csvData) ? state.csvData : []);
        setCsvHeaders(Array.isArray(state.csvHeaders) ? state.csvHeaders : []);
        setGeneratedPagesData(Array.isArray(state.generatedPagesData) ? state.generatedPagesData : []);
        setBrandElements(Array.isArray(state.brandElements) ? state.brandElements : []);

        if (state.pageTemplate) {
            const loadedTemplate = state.pageTemplate;
            setPageTemplate({
                ...defaultPageTemplate,
                ...loadedTemplate,
                images: (loadedTemplate.images || []).map(img => ({
                    ...createNewImageElement(null),
                    ...img
                }))
            });
        } else {
            setPageTemplate(defaultPageTemplate);
        }

        setAspectRatio(state.aspectRatio ?? '1:1');
        setFieldPositions(state.fieldPositions ?? {});
        setFieldStyles(state.fieldStyles ?? {});
    });
  }, []);

  // Centralized asset handlers
  const addPendingAsset = useCallback((blob) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    setPendingAssets(prev => ({
      ...prev,
      [blobUrl]: blob,
    }));
    console.log(`[CampaignContext] Synchronously added new asset: ${blobUrl}`);
    return blobUrl;
  }, []);

  const addPendingAssetMap = useCallback((assetMap) => {
    setPendingAssets(prev => ({
      ...prev,
      ...assetMap,
    }));
    console.log('[CampaignContext] Synchronously added asset map.');
  }, []);

  const removePendingAsset = useCallback((blobUrl) => {
    if (typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) {
      console.error("[removePendingAsset] Invalid argument. Expected a blob URL string.", blobUrl);
      return;
    }
    setPendingAssets(prev => {
      const newAssets = { ...prev };
      if (newAssets[blobUrl]) {
        URL.revokeObjectURL(blobUrl);
        delete newAssets[blobUrl];
        console.log(`[CampaignContext] Removed and revoked asset: ${blobUrl}`);
      }
      return newAssets;
    });
  }, []);

  // Effect to clean up all blob URLs on unmount
  useEffect(() => {
    return () => {
      setPendingAssets(currentAssets => {
        Object.keys(currentAssets).forEach(url => {
          console.log(`[CampaignContext] Revoking blob URL on unmount: ${url}`);
          URL.revokeObjectURL(url);
        });
        return {}; // Return an empty object to clear the state
      });
    };
  }, []);

  const value = useMemo(() => ({
    // State
    csvData,
    csvHeaders,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    selectedField,
    currentCampaign,
    generatedPagesData,
    generatedVideos,
    aspectRatio,
    pendingAssets,
    colors,
    paletteId,
    customPalette,
    imageColorPalette,

    // Setters
    setCsvData,
    setCsvHeaders,
    setFieldPositions,
    setFieldStyles,
    setBrandElements,
    setPageTemplate,
    setSelectedField,
    setCurrentCampaign,
    setGeneratedPagesData,
    setGeneratedVideos,
    setAspectRatio,
    setPendingAssets, // Kept for direct manipulation if needed, e.g., on load
    setColors,
    setPaletteId,
    setCustomPalette,
    setImageColorPalette,

    // Asset Management
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    applyLoadedCampaign,

    // Constants
    defaultPageTemplate,
  }), [
    csvData,
    csvHeaders,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    selectedField,
    currentCampaign,
    generatedPagesData,
    generatedVideos,
    aspectRatio,
    pendingAssets,
    colors,
    paletteId,
    customPalette,
    imageColorPalette,
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
