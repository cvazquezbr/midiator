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
    const blob = await response.blob();
    fileToUpload = new File([blob], filename, { type: blob.type });
  } else {
    // If it's any other type of string or an unsupported type, we don't upload.
    console.warn(`Unsupported asset type for upload: ${typeof asset}`, asset);
    return asset;
  }

  if (!fileToUpload) {
    console.error('[uploadAsset] fileToUpload is null or undefined for filename:', filename);
    return null;
  }

  console.log(`[uploadAsset] Attempting to upload ${filename}. Size: ${fileToUpload.size} bytes.`);

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
  const assetsToUpload = [
    ...(state.generatedImagesData || []).filter(a => a.blob),
    ...(state.generatedAudioData || []).filter(a => a.blob),
    ...(state.generatedVideosData || []).filter(a => a.blob),
    ...(state.brandElements || []).filter(el => el.url && (el.url.startsWith('blob:') || el.url.startsWith('data:'))),
  ];
  if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
    assetsToUpload.push({ blob: state.backgroundImage, filename: 'background_image.png' });
  }
  if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
    assetsToUpload.push({ blob: state.generatedImageUrl, filename: 'generated_campaign_image.png' });
  }


  const totalAssets = assetsToUpload.length;
  let uploadedCount = 0;

  const updateProgress = () => {
    uploadedCount++;
    setProgress({ current: uploadedCount, total: totalAssets });
  };

  // Helper to process a list of assets, uploading their blobs
  const serializeAssetList = async (assetList) => {
    if (!assetList) return [];
    return Promise.all(
      assetList.map(async (asset) => {
        if (!asset.blob) return asset; // Skip if no blob to upload
        const newUrl = await uploadAsset(asset.blob, asset.filename, campaignId, userId);
        updateProgress();
        return { ...asset, url: newUrl, blob: undefined }; // Store URL, remove blob
      })
    );
  };

  try {
    const serializableGeneratedImages = await serializeAssetList(state.generatedImagesData);
    const serializableGeneratedAudio = await serializeAssetList(state.generatedAudioData);
    const serializableGeneratedVideos = await serializeAssetList(state.generatedVideosData);

    const serializableBrandElements = await Promise.all(
      (state.brandElements || []).map(async (el) => {
        if (el.url && (el.url.startsWith('blob:') || el.url.startsWith('data:'))) {
          const newUrl = await uploadAsset(el.url, el.name || `brand_element_${el.id}`, campaignId, userId);
          updateProgress();
          return { ...el, url: newUrl };
        }
        return el;
      })
    );

    let newBackgroundImageUrl = state.backgroundImage;
    if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
      newBackgroundImageUrl = await uploadAsset(state.backgroundImage, 'background_image.png', campaignId, userId);
      updateProgress();
    }

    let newGeneratedImageUrl = state.generatedImageUrl;
    if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
      newGeneratedImageUrl = await uploadAsset(state.generatedImageUrl, 'generated_campaign_image.png', campaignId, userId);
      updateProgress();
    }


    const stateToSave = {
      ...state,
      generatedImagesData: serializableGeneratedImages,
      generatedAudioData: serializableGeneratedAudio,
      generatedVideosData: serializableGeneratedVideos,
      brandElements: serializableBrandElements,
      backgroundImage: newBackgroundImageUrl,
      generatedImageUrl: newGeneratedImageUrl,
    };

  // Remove props that shouldn't be persisted
  delete stateToSave.isSaving;
  delete stateToSave.isLoading;
  delete stateToSave.user;
  // These are client-side only representations
  delete stateToSave.backgroundImageUrl;

  const jsonString = JSON.stringify(stateToSave);
  console.log(`[serializeCampaignData] Final state size: ~${(jsonString.length / 1024).toFixed(2)} KB`);

  return stateToSave;
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
      assetList.map(async (asset) => {
        const { blob, url } = await urlToBlob(asset.url);
        return { ...asset, blob, url };
      })
    );
  };

  loadedState.generatedImagesData = await deserializeAssetList(loadedState.generatedImagesData);
  loadedState.generatedAudioData = await deserializeAssetList(loadedState.generatedAudioData);
  loadedState.generatedVideosData = await deserializeAssetList(loadedState.generatedVideosData);

  if (loadedState.brandElements) {
    loadedState.brandElements = await Promise.all(
        (loadedState.brandElements || []).map(async (el) => {
            if (el.url && el.url.startsWith('http')) {
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
      // It's not a URL, so it's likely a legacy base64 string.
      console.log('[deserializeCampaignData] Found legacy base64 in backgroundImage. Converting to blob.');
      // It might not have the data: prefix, so we add a generic one.
      const fetchString = loadedState.backgroundImage.startsWith('data:') ? loadedState.backgroundImage : `data:image/png;base64,${loadedState.backgroundImage}`;
      try {
        const res = await fetch(fetchString);
        const blob = await res.blob();
        loadedState.backgroundImage = URL.createObjectURL(blob);
      } catch (e) {
        console.error("Failed to convert legacy backgroundImage to blob", e);
        loadedState.backgroundImage = null; // Clear the invalid data
      }
  }

  // Backward compatibility for old data structure
  if (loadedState.backgroundImageBase64) {
    const fetchString = loadedState.backgroundImageBase64.startsWith('data:') ? loadedState.backgroundImageBase64 : `data:application/octet-stream;base64,${loadedState.backgroundImageBase64}`;
    const res = await fetch(fetchString);
    const blob = await res.blob();
    // This sets the image to a local blob URL, which the uploadAsset function can handle.
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
  return deserializeCampaignData(campaign.campaign_data);
};

// Helper to create a version of the state safe for the initial save,
// without any local blobs that would cause serialization issues.
const cleanStateForInitialSave = (state) => {
  const cleanedState = { ...state };

  // Remove properties that shouldn't be persisted or are heavy
  delete cleanedState.isSaving;
  delete cleanedState.isLoading;
  delete cleanedState.user;

  // Replace asset data with placeholders or remove them
  cleanedState.generatedImagesData = (state.generatedImagesData || []).map(d => ({ ...d, blob: null, url: d.url || '' }));
  cleanedState.generatedAudioData = (state.generatedAudioData || []).map(d => ({ ...d, blob: null, url: d.url || '' }));
  cleanedState.generatedVideosData = (state.generatedVideosData || []).map(d => ({ ...d, blob: null, url: d.url || '' }));
  cleanedState.brandElements = (state.brandElements || []).map(el => ({ ...el, url: el.url && el.url.startsWith('http') ? el.url : '' }));
  cleanedState.backgroundImage = state.backgroundImage && state.backgroundImage.startsWith('http') ? state.backgroundImage : null;
  cleanedState.generatedImageUrl = state.generatedImageUrl && state.generatedImageUrl.startsWith('http') ? state.generatedImageUrl : null;

  return cleanedState;
};

export const saveCampaign = async (name, campaignState, setProgress, userId) => {
  // 1. Create a clean state object for the initial save to get an ID.
  const initialState = cleanStateForInitialSave(campaignState);

  // 2. Make the initial request to create the campaign entry.
  const createRes = await fetchWithAuth('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: initialState }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create campaign entry.');
  }
  const newCampaign = await createRes.json();
  const campaignId = newCampaign.id;

  // 3. Now that we have a campaign ID, serialize the full state, which includes uploading assets.
  const finalSerializableData = await serializeCampaignData(campaignState, campaignId, setProgress, userId);

  // 4. Update the campaign with the final data including asset URLs.
  const updateRes = await fetchWithAuth(`/api/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: finalSerializableData }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    // We could try to delete the created campaign entry here as a cleanup step, but for now, we'll just report the error.
    throw new Error(err.error || 'Failed to update campaign with assets.');
  }

  // 5. Return the final, updated campaign data.
  return updateRes.json();
};

export const updateCampaign = async (id, name, campaignState, setProgress, userId) => {
  console.log('[updateCampaign] Starting.');
  // For an existing campaign, we already have the ID.
  // We can directly serialize the data, which will upload any new/changed assets.
  const serializableData = await serializeCampaignData(campaignState, id, setProgress, userId);

  console.log(`[updateCampaign] About to PUT to /api/campaigns/${id}.`);
  const res = await fetchWithAuth(`/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: serializableData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update campaign.');
  }
  console.log('[updateCampaign] PUT request successful.');
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
