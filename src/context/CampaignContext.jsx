import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';

// A simple debounce utility
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

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

  // Asset queue for debounced updates
  const assetQueue = useRef({});

  // Debounced function to flush the asset queue into the main state
  const flushAssetQueue = useCallback(() => {
    if (Object.keys(assetQueue.current).length > 0) {
      console.log('[CampaignContext] Debounced update. Flushing asset queue...', assetQueue.current);
      setPendingAssets(prev => ({ ...prev, ...assetQueue.current }));
      assetQueue.current = {}; // Clear the queue after flushing
    }
  }, []);

  // Create a memoized debounced version of the flush function
  const debouncedFlush = useMemo(() => debounce(flushAssetQueue, 300), [flushAssetQueue]);


  // Centralized asset handlers
    /**
   * @description Creates a `blob:` URL for a given Blob and adds it to a queue for batch processing.
   * The queue is flushed automatically after a short delay to prevent race conditions and improve performance.
   * This function no longer requires an `isSaving` flag.
   *
   * ---
   * **Blob Lifecycle:**
   * 1. **Creation:** A `blob:` URL is created using `URL.createObjectURL(blob)`.
   * 2. **Queueing:** The URL and Blob are added to a temporary queue (`assetQueue`).
   * 3. **Batch Update:** A debounced function (`debouncedFlush`) merges the queue into the main
   *    `pendingAssets` state after a 300ms delay.
   * 4. **Serialization:** During a campaign save, `serializeCampaignData` uses the stable `pendingAssets` state.
   * 5. **Revocation:** The `blob:` URL **must** be revoked using `URL.revokeObjectURL(url)`. This is handled
   *    by `removePendingAsset` or the component's unmount effect.
   * ---
   *
   * @param {Blob} blob The Blob object to add.
   * @returns {string|null} The generated `blob:` URL, or null if the input was invalid.
   */
  const addPendingAsset = useCallback((blob) => {
    if (!(blob instanceof Blob)) {
      console.error("[addPendingAsset] Invalid argument. Expected a Blob.", blob);
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    assetQueue.current[blobUrl] = blob;
    debouncedFlush();
    return blobUrl;
  }, [debouncedFlush]);

    /**
   * @description Adds a map of pre-existing `blob:` URLs and their Blobs to the asset queue.
   * This is a batch version of `addPendingAsset` for efficiency.
   * @param {Object<string, Blob>} assetMap A map of `blob:` URLs to Blob objects.
   */
  const addPendingAssetMap = useCallback((assetMap) => {
    assetQueue.current = { ...assetQueue.current, ...assetMap };
    debouncedFlush();
  }, [debouncedFlush]);

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
    // Also remove from the queue in case it hasn't been flushed yet
    if (assetQueue.current[blobUrl]) {
        delete assetQueue.current[blobUrl];
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
      // Clean up assets in the main state
      Object.keys(pendingAssets).forEach(url => {
        console.log(`[CampaignContext] Revoking blob URL on unmount: ${url}`);
        URL.revokeObjectURL(url);
      });
      // Clean up any assets still in the queue
      Object.keys(assetQueue.current).forEach(url => {
          console.log(`[CampaignContext] Revoking queued blob URL on unmount: ${url}`);
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
