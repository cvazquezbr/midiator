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
  const [pendingAssets, setPendingAssets] = useState({});
  const [colors, setColors] = useState([]);
  const [paletteId, setPaletteId] = useState(null);
  const [customPalette, setCustomPalette] = useState(null);
  const [imageColorPalette, setImageColorPalette] = useState([]);

  // Centralized asset handlers
  const addPendingAsset = useCallback((blob) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    setPendingAssets(prev => ({ ...prev, [blobUrl]: blob }));
    return blobUrl;
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
      }
      return newAssets;
    });
  }, []);

  // Effect to clean up all blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.keys(pendingAssets).forEach(url => {
        console.log(`[CampaignContext] Revoking blob URL on unmount: ${url}`);
        URL.revokeObjectURL(url);
      });
    };
  }, [pendingAssets]);

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
    removePendingAsset,

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
    removePendingAsset,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
