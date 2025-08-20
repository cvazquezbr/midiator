// This file now handles the logic for serializing, deserializing,
// and communicating with the campaign API endpoints.
import { upload } from '@vercel/blob/client';
import { toast } from 'sonner';

// Helper to upload a blob-like asset to Vercel Blob storage.
const uploadAsset = async (asset, filename) => {
  if (!asset) {
    return null;
  }

  // If it's already a permanent http(s) URL, do nothing.
  if (typeof asset === 'string' && asset.startsWith('http')) {
    return asset;
  }

  let fileToUpload;
  if (asset instanceof Blob) {
    // Asset is already a blob (e.g. from an input field).
    fileToUpload = asset;
  } else if (typeof asset === 'string' && (asset.startsWith('blob:') || asset.startsWith('data:'))) {
    // Asset is a temporary client-side URL. Fetch it and convert to a File.
    const response = await fetch(asset);
    const blob = await response.blob();
    fileToUpload = new File([blob], filename, { type: blob.type });
  } else {
    // If it's any other type of string or an unsupported type, we don't upload.
    // This prevents saving invalid data.
    console.warn(`Unsupported asset type for upload: ${typeof asset}`, asset);
    return asset; // Return the original asset to avoid breaking the state shape.
  }

  if (!fileToUpload) {
    return null;
  }

  try {
    const newBlob = await upload(filename, fileToUpload, {
      access: 'public',
      handleUploadUrl: '/api/upload',
    });
    // Return the public URL of the uploaded file.
    return newBlob.url;
  } catch (error) {
    console.error('Error uploading asset to Vercel Blob:', error);
    throw new Error(`Failed to upload asset: ${filename}`);
  }
};


/**
 * Gathers and serializes the current application state for saving.
 * Blobs are uploaded to Vercel Blob storage.
 * @param {object} state - The current application state from HomePage.
 * @param {function} setProgress - A function to update the upload progress.
 * @returns {Promise<object>} A promise that resolves to a serializable object.
 */
export const serializeCampaignData = async (state, setProgress) => {
  const assetsToUpload = [
    ...(state.generatedImagesData || []).filter(a => a.blob),
    ...(state.generatedAudioData || []).filter(a => a.blob),
    ...(state.generatedVideosData || []).filter(a => a.blob),
    ...(state.brandElements || []).filter(el => el.url && el.url.startsWith('blob:')),
  ];
  if (state.backgroundImage && state.backgroundImage.startsWith('blob:')) {
    assetsToUpload.push({ blob: state.backgroundImage, filename: 'background_image' });
  }
  if (state.generatedImageUrl && state.generatedImageUrl.startsWith('blob:')) {
    assetsToUpload.push({ blob: state.generatedImageUrl, filename: 'generated_campaign_image' });
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
        const newUrl = await uploadAsset(asset.blob, asset.filename);
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
        if (el.url && el.url.startsWith('blob:')) {
          const newUrl = await uploadAsset(el.url, el.name || `brand_element_${el.id}`);
          updateProgress();
          return { ...el, url: newUrl };
        }
        return el;
      })
    );

    let newBackgroundImageUrl = state.backgroundImage;
    if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
      newBackgroundImageUrl = await uploadAsset(state.backgroundImage, 'background_image');
      updateProgress();
    }

    let newGeneratedImageUrl = state.generatedImageUrl;
    if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
      newGeneratedImageUrl = await uploadAsset(state.generatedImageUrl, 'generated_campaign_image');
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
  const res = await fetch('/api/campaigns');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch campaigns.');
  }
  return res.json();
};

export const loadCampaign = async (id) => {
  const res = await fetch(`/api/campaigns/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load campaign.');
  }
  const campaign = await res.json();
  return deserializeCampaignData(campaign.campaign_data);
};

export const saveCampaign = async (name, campaignState, setProgress) => {
  const serializableData = await serializeCampaignData(campaignState, setProgress);
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: serializableData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save campaign.');
  }
  return res.json();
};

export const updateCampaign = async (id, name, campaignState, setProgress) => {
  const serializableData = await serializeCampaignData(campaignState, setProgress);
  const res = await fetch(`/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: serializableData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update campaign.');
  }
  return res.json();
};

export const deleteCampaign = async (id) => {
  const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete campaign.');
  }
  return res.json();
};
