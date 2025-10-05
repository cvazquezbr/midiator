import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';

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

  // Fingerprint cache to prevent duplicate asset additions.
  const assetFingerprintCache = useRef(new Map());

  // Centralized asset handlers
  const addPendingAsset = useCallback((blob) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }

    // Create a fingerprint to prevent duplicates.
    // The File object has a name, but a generic Blob might not.
    const fingerprint = `${blob.name || ''}-${blob.size}-${blob.type}`;
    if (assetFingerprintCache.current.has(fingerprint)) {
      const existingUrl = assetFingerprintCache.current.get(fingerprint);
      return existingUrl;
    }

    const blobUrl = URL.createObjectURL(blob);
    setPendingAssets(prev => ({
      ...prev,
      [blobUrl]: blob,
    }));
    assetFingerprintCache.current.set(fingerprint, blobUrl);
    return blobUrl;
  }, []);

  const addPendingAssetMap = useCallback((assetMap) => {
    setPendingAssets(prev => ({ ...prev, ...assetMap }));
    Object.entries(assetMap).forEach(([url, blob]) => {
      const fingerprint = `${blob.name || ''}-${blob.size}-${blob.type}`;
      if (!assetFingerprintCache.current.has(fingerprint)) {
        assetFingerprintCache.current.set(fingerprint, url);
      }
    });
  }, []);

  const removePendingAsset = useCallback((blobUrl) => {
    if (typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) {
      return;
    }

    setPendingAssets(prev => {
      const newAssets = { ...prev };
      if (newAssets[blobUrl]) {
        const blob = newAssets[blobUrl];
        const fingerprint = `${blob.name || ''}-${blob.size}-${blob.type}`;
        assetFingerprintCache.current.delete(fingerprint);
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
        URL.revokeObjectURL(url);
      });
      assetFingerprintCache.current.clear();
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
    addPendingAssetMap,
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
    addPendingAssetMap,
    removePendingAsset,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
