// This file now handles the logic for serializing, deserializing,
// and communicating with the campaign API endpoints.
import { upload } from '@vercel/blob/client';
import { toast } from 'sonner';
import fetchWithAuth from './fetchWithAuth';

// Helper to upload a blob-like asset to Vercel Blob storage.
const uploadAsset = async (asset, filename, campaignId, userId) => {
  if (!asset) {
    return null;
  }
  if (!userId) {
    throw new Error("User ID is required to upload assets.");
  }

  // If it's already a permanent http(s) URL, do nothing.
  if (typeof asset === 'string' && asset.startsWith('http')) {
    return asset;
  }

  let fileToUpload;
  if (asset instanceof Blob) {
    // Asset is already a blob. Ensure it's a File object with a name.
    fileToUpload = new File([asset], filename, { type: asset.type });
  } else if (typeof asset === 'string' && (asset.startsWith('blob:') || asset.startsWith('data:'))) {
    // Asset is a temporary client-side URL. Fetch it and convert to a File.
    const response = await fetch(asset);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob URL: ${asset}`);
    }
    const blob = await response.blob();
    fileToUpload = new File([blob], filename, { type: blob.type });
  } else {
    console.warn(`Unsupported asset type for upload: ${typeof asset}`, asset);
    return asset;
  }

  if (!fileToUpload) {
    return null;
  }

  // Construct the full path for the blob storage.
  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;

  try {
    const newBlob = await upload(fullPath, fileToUpload, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ campaignId }), // Pass campaignId in payload for the backend
    });
    return newBlob.url;
  } catch (error) {
    console.error(`Error uploading asset to Vercel Blob: ${filename}`, error);
    throw new Error(`Failed to upload asset: ${filename}. Please try again.`);
  }
};


/**
 * Gathers and serializes the current application state for saving.
 * Blobs are uploaded to Vercel Blob storage.
 * @param {object} state - The current application state from HomePage.
 * @param {string} campaignId - The ID of the campaign for pathing.
 * @param {function} setProgress - A function to update the upload progress.
 * @param {string} userId - The ID of the user for pathing.
 * @returns {Promise<object>} A promise that resolves to a serializable object.
 */
export const serializeCampaignData = async (state, campaignId, setProgress, userId) => {
  try {
    // Helper to process a list of assets, uploading their blobs
    const serializeAssetList = async (assetList) => {
      if (!assetList) return [];
      return Promise.all(
        assetList.map(async (asset) => {
          // Only upload if the URL is a local blob/data URL.
          if (asset && asset.url && (asset.url.startsWith('blob:') || asset.url.startsWith('data:'))) {
            const newUrl = await uploadAsset(asset.url, asset.filename, campaignId, userId);
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            return { ...asset, url: newUrl, blob: undefined }; // Store URL, remove blob
          }
          // If asset has no URL or an http URL, just return it (without the blob).
          return { ...asset, blob: undefined };
        })
      );
    };

    // --- Determine which assets need uploading ---
    const assetsToUpload = [
      ...(state.generatedImagesData || []).filter(a => a && a.url && a.url.startsWith('blob:')),
      ...(state.generatedAudioData || []).filter(a => a && a.url && a.url.startsWith('blob:')),
      ...(state.generatedVideosData || []).filter(a => a && a.url && a.url.startsWith('blob:')),
      ...(state.brandElements || []).filter(el => el && el.url && (el.url.startsWith('blob:') || el.url.startsWith('data:'))),
    ];
    if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
      assetsToUpload.push({ url: state.backgroundImage, filename: 'background_image.png' });
    }
    if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
      assetsToUpload.push({ url: state.generatedImageUrl, filename: 'generated_campaign_image.png' });
    }
    setProgress({ current: 0, total: assetsToUpload.length });
    // --- End asset determination ---


    const serializableGeneratedImages = await serializeAssetList(state.generatedImagesData);
    const serializableGeneratedAudio = await serializeAssetList(state.generatedAudioData);
    const serializableGeneratedVideos = await serializeAssetList(state.generatedVideosData);

    const serializableBrandElements = await Promise.all(
      (state.brandElements || []).map(async (el) => {
        if (el && el.url && (el.url.startsWith('blob:') || el.url.startsWith('data:'))) {
          const newUrl = await uploadAsset(el.url, el.name || `brand_element_${el.id}`, campaignId, userId);
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          return { ...el, url: newUrl, blob: undefined };
        }
        return { ...el, blob: undefined };
      })
    );

    let newBackgroundImageUrl = state.backgroundImage;
    if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
      newBackgroundImageUrl = await uploadAsset(state.backgroundImage, 'background_image.png', campaignId, userId);
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    let newGeneratedImageUrl = state.generatedImageUrl;
    if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
      newGeneratedImageUrl = await uploadAsset(state.generatedImageUrl, 'generated_campaign_image.png', campaignId, userId);
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    // Return the state with blob URLs replaced by permanent Vercel URLs
    return {
      ...state,
      generatedImagesData: serializableGeneratedImages,
      generatedAudioData: serializableGeneratedAudio,
      generatedVideosData: serializableGeneratedVideos,
      brandElements: serializableBrandElements,
      backgroundImage: newBackgroundImageUrl,
      generatedImageUrl: newGeneratedImageUrl,
    };
  } catch (error) {
    toast.error(error.message);
    throw error;
  }
};

/**
 * Takes a loaded campaign state and deserializes it for the application.
 * For Vercel Blob, URLs are stored directly, so deserialization is simpler.
 * We just need to ensure local blob URLs are created for components that expect them.
 * @param {object} loadedState - The state object loaded from the database.
 * @returns {Promise<object>} The deserialized state ready for the application.
 */
export const deserializeCampaignData = async (loadedState) => {
  // Helper to convert a remote URL back to a blob and a blob URL
  const urlToBlob = async (url) => {
    if (!url || !url.startsWith('http')) return { blob: null, url: url };
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      const blob = await response.blob();
      return { blob, url: URL.createObjectURL(blob) };
    } catch (error) {
      console.error('Error converting URL to blob:', error);
      toast.error(`Could not load an asset: ${error.message}`);
      return { blob: null, url: url }; // Return original URL on failure
    }
  };

  const deserializeAssetList = async (assetList) => {
    if (!assetList) return [];
    return Promise.all(
      (assetList || []).map(async (asset) => {
        if (!asset) return null; // Handle null items in the array
        const { blob, url } = await urlToBlob(asset.url);
        return { ...asset, blob, url };
      })
    ).then(results => results.filter(Boolean)); // Filter out any nulls that were processed
  };

  loadedState.generatedImagesData = await deserializeAssetList(loadedState.generatedImagesData);
  loadedState.generatedAudioData = await deserializeAssetList(loadedState.generatedAudioData);
  loadedState.generatedVideosData = await deserializeAssetList(loadedState.generatedVideosData);

  if (loadedState.brandElements) {
    loadedState.brandElements = await Promise.all(
        (loadedState.brandElements || []).map(async (el) => {
            if (el && el.url && el.url.startsWith('http')) {
                const { url: localUrl } = await urlToBlob(el.url);
                return { ...el, url: localUrl };
            }
            return el;
        })
    );
  }

  if (loadedState.backgroundImage) {
      const { url } = await urlToBlob(loadedState.backgroundImage);
      loadedState.backgroundImage = url;
  }
  if (loadedState.generatedImageUrl) {
      const { url } = await urlToBlob(loadedState.generatedImageUrl);
      loadedState.generatedImageUrl = url;
  }

  // Backward compatibility for backgroundImage being a raw base64 string
  if (typeof loadedState.backgroundImage === 'string' && !loadedState.backgroundImage.startsWith('http') && !loadedState.backgroundImage.startsWith('blob:')) {
      console.log('[deserializeCampaignData] Found legacy base64 in backgroundImage. Converting to blob.');
      const fetchString = loadedState.backgroundImage.startsWith('data:') ? loadedState.backgroundImage : `data:image/png;base64,${loadedState.backgroundImage}`;
      try {
        const res = await fetch(fetchString);
        const blob = await res.blob();
        loadedState.backgroundImage = URL.createObjectURL(blob);
      } catch (e) {
        console.error("Failed to convert legacy backgroundImage to blob", e);
        loadedState.backgroundImage = null;
      }
  }

  // Backward compatibility for old data structure
  if (loadedState.backgroundImageBase64) {
    const fetchString = loadedState.backgroundImageBase64.startsWith('data:') ? loadedState.backgroundImageBase64 : `data:application/octet-stream;base64,${loadedState.backgroundImageBase64}`;
    const res = await fetch(fetchString);
    const blob = await res.blob();
    loadedState.backgroundImage = URL.createObjectURL(blob);
    delete loadedState.backgroundImageBase64;
  }


  return loadedState;
};

// --- API Functions ---

export const getCampaigns = async () => {
  const res = await fetchWithAuth('/api/campaigns');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch campaigns.');
  }
  return res.json();
};

export const loadCampaign = async (id) => {
  const res = await fetchWithAuth(`/api/campaigns/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load campaign.');
  }
  const campaign = await res.json();
  // Deserialize the campaign_data part, but return the whole campaign object
  // so we have access to top-level properties like `name` and `id`.
  campaign.campaign_data = await deserializeCampaignData(campaign.campaign_data);
  return campaign;
};

export const saveCampaign = async (name, campaignData, setProgress, userId) => {
  // The campaignData from HomePage is already a minimal, clean object.
  // First, serialize it to upload any new assets.
  const stateWithAssetUrls = await serializeCampaignData(campaignData, null, setProgress, userId);

  // We do an initial POST with this data to get a campaign ID.
  const createRes = await fetchWithAuth('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: stateWithAssetUrls }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create campaign entry.');
  }

  return createRes.json();
};

export const updateCampaign = async (id, name, campaignData, setProgress, userId) => {
  // The campaignData is already pre-sanitized by the caller.
  // First, serialize it, which uploads assets and returns a state with public URLs.
  const stateWithAssetUrls = await serializeCampaignData(campaignData, id, setProgress, userId);

  // Now, send the final, clean data to the server.
  const res = await fetchWithAuth(`/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: stateWithAssetUrls }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update campaign.');
  }
  return res.json();
};

export const deleteCampaign = async (id) => {
  const res = await fetchWithAuth(`/api/campaigns/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete campaign.');
  }
  return res.json();
};
