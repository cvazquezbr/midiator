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
  /**
   * @type {[Object<string, Blob>, Function]}
   * @description Holds a map of local `blob:` URLs to their corresponding Blob objects.
   * This state is the single source of truth for all temporary assets that have been
   * generated or uploaded by the user but not yet saved to the backend.
   * The `blob:` URL is created via `URL.createObjectURL()` and must be manually revoked
   * using `URL.revokeObjectURL()` when the asset is no longer needed to prevent memory leaks.
   */
  const [pendingAssets, setPendingAssets] = useState({});
    /**
   * @type {[Object<string, Blob>, Function]}
   * @description A temporary queue for assets that are created while a save operation
   * (`saveCampaign` or `updateCampaign`) is in progress. This prevents race conditions
   * where a new asset might be added to `pendingAssets` after serialization has already
   * begun, causing the asset to be missed in the upload process. Once the save is complete,
   * assets from this queue are merged into the main `pendingAssets` state.
   */
  const [assetQueue, setAssetQueue] = useState({});
  const [colors, setColors] = useState([]);
  const [paletteId, setPaletteId] = useState(null);
  const [customPalette, setCustomPalette] = useState(null);
  const [imageColorPalette, setImageColorPalette] = useState([]);

    /**
   * @description Processes the asset queue, moving any queued assets into the main
   * `pendingAssets` state. This should be called after a save/update operation
   * is successfully completed.
   */
  const processAssetQueue = useCallback(() => {
    if (Object.keys(assetQueue).length > 0) {
      console.log('[CampaignContext] Processing asset queue...', assetQueue);
      setPendingAssets(prev => ({ ...prev, ...assetQueue }));
      setAssetQueue({}); // Clear the queue
    }
  }, [assetQueue]);

  // Centralized asset handlers
    /**
   * @description Creates a `blob:` URL for a given Blob and adds it to the asset management system.
   * If a save operation is in progress (`isSaving` is true), the asset is added to a temporary
   * queue (`assetQueue`) to prevent race conditions. Otherwise, it's added directly to the
   * main `pendingAssets` state.
   *
   * ---
   * **Blob Lifecycle:**
   * 1. **Creation:** A `blob:` URL is created using `URL.createObjectURL(blob)`. This URL is a
   *    temporary, local reference to the Blob data held in memory.
   * 2. **Management:** The URL and Blob are stored in the `pendingAssets` map. The URL can now be
   *    used in `src` attributes of `<img>`, `<video>`, etc.
   * 3. **Serialization:** During a campaign save, `serializeCampaignData` finds all `blob:` URLs in the
   *    campaign state, retrieves their corresponding Blobs from `pendingAssets`, uploads them to
   *    permanent storage, and replaces the `blob:` URLs with the new permanent URLs.
   * 4. **Revocation:** The `blob:` URL **must** be revoked using `URL.revokeObjectURL(url)` to free up
   *    memory. This is handled automatically by `removePendingAsset` or by the component's unmount effect.
   * ---
   *
   * @param {Blob} blob The Blob object to add.
   * @param {boolean} [isSaving=false] A flag indicating if a campaign save is in progress.
   * @returns {string|null} The generated `blob:` URL, or null if the input was invalid.
   */
  const addPendingAsset = useCallback((blob, isSaving = false) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);

    if (isSaving) {
      console.log('[addPendingAsset] App is saving. Queuing asset:', blobUrl);
      setAssetQueue(prev => ({ ...prev, [blobUrl]: blob }));
    } else {
      setPendingAssets(prev => ({ ...prev, [blobUrl]: blob }));
    }
    return blobUrl;
  }, []);

    /**
   * @description Adds a map of pre-existing `blob:` URLs and their Blobs to the asset management system.
   * This is a batch version of `addPendingAsset` for efficiency.
   * @param {Object<string, Blob>} assetMap A map of `blob:` URLs to Blob objects.
   * @param {boolean} [isSaving=false] A flag indicating if a campaign save is in progress.
   */
  const addPendingAssetMap = useCallback((assetMap, isSaving = false) => {
    if (isSaving) {
      console.log('[addPendingAssetMap] App is saving. Queuing asset map:', assetMap);
      setAssetQueue(prev => ({ ...prev, ...assetMap }));
    } else {
      setPendingAssets(prev => ({ ...prev, ...assetMap }));
    }
  }, []);

    /**
   * @description Removes a pending asset from the state and revokes its associated `blob:` URL
   * to free up memory. This is the primary method for manually cleaning up a temporary asset.
   * @param {string} blobUrl The `blob:` URL of the asset to remove.
   */
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
    /**
   * @description A safety-net effect that runs when the CampaignProvider is unmounted.
   * It iterates through any remaining assets in `pendingAssets` and revokes their URLs,
   * preventing memory leaks if the component is unexpectedly destroyed.
   */
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
    addPendingAssetMap,
    removePendingAsset,
    processAssetQueue,

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
    processAssetQueue,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
