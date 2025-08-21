import { upload } from '@vercel/blob/client';
import { toast } from 'sonner';
import fetchWithAuth from './fetchWithAuth';

/**
 * A simplified and robust asset uploader.
 * It now expects a Blob object directly.
 */
const uploadAsset = async (blob, filename, campaignId, userId) => {
  if (!blob || !(blob instanceof Blob)) {
    console.error('[uploadAsset] Invalid blob provided.', { blob, filename });
    throw new Error(`Asset "${filename}" could not be uploaded because it is not a valid file.`);
  }
  if (!userId) {
    throw new Error("User ID is required to upload assets.");
  }

  const fileToUpload = new File([blob], filename, { type: blob.type });
  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;

  console.log(`[uploadAsset] Uploading file: ${filename} to path: ${fullPath}`);

  try {
    const newBlob = await upload(fullPath, fileToUpload, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ campaignId }),
    });
    console.log(`[uploadAsset] Successfully uploaded ${filename}, URL: ${newBlob.url}`);
    return newBlob.url;
  } catch (error) {
    console.error(`[uploadAsset] Error uploading asset to Vercel Blob: ${filename}`, error);
    throw new Error(`Failed to upload asset: ${filename}. Please try again.`);
  }
};

/**
 * Gathers and serializes the current application state for saving.
 * Blobs are uploaded to Vercel Blob storage.
 */
export const serializeCampaignData = async (state, campaignId, setProgress, userId) => {
  console.log('[serializeCampaignData] Starting serialization...');
  try {
    // Helper to process a list of assets, uploading their blobs
    const serializeAssetList = async (assetList) => {
      if (!assetList) return [];
      return Promise.all(
        assetList.map(async (asset) => {
          // Check for the blob object directly. This is the main fix.
          if (asset && asset.blob instanceof Blob) {
            const newUrl = await uploadAsset(asset.blob, asset.filename, campaignId, userId);
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            return { ...asset, url: newUrl, blob: undefined }; // Store URL, remove blob
          }
          // If asset has no blob, it might already have a permanent URL.
          // Ensure blob property is removed.
          return { ...asset, blob: undefined };
        })
      );
    };

    // Helper to fetch a blob/data URL and convert it to a Blob object.
    // This is now only used for standalone URLs like backgroundImage.
    const fetchUrlAsBlob = async (url) => {
        if (!url || !(url.startsWith('blob:') || url.startsWith('data:'))) return null;
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.blob();
        } catch (error) {
            console.error(`Failed to fetch URL for conversion: ${url}`, error);
            return null;
        }
    }

    // --- Determine which assets need uploading ---
    const assetsToUpload = [
      ...(state.generatedImagesData || []).filter(a => a && a.blob instanceof Blob),
      ...(state.generatedAudioData || []).filter(a => a && a.blob instanceof Blob),
      ...(state.generatedVideosData || []).filter(a => a && a.blob instanceof Blob),
      ...(state.brandElements || []).filter(el => el && el.blob instanceof Blob),
    ];
    if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
        assetsToUpload.push({ isStandalone: true }); // Add placeholders for progress counting
    }
    if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
        assetsToUpload.push({ isStandalone: true });
    }
    setProgress({ current: 0, total: assetsToUpload.length });
    console.log(`[serializeCampaignData] Determined ${assetsToUpload.length} assets need uploading.`);
    // --- End asset determination ---

    const serializableGeneratedImages = await serializeAssetList(state.generatedImagesData);
    const serializableGeneratedAudio = await serializeAssetList(state.generatedAudioData);
    const serializableGeneratedVideos = await serializeAssetList(state.generatedVideosData);
    const serializableBrandElements = await serializeAssetList(state.brandElements);

    let newBackgroundImageUrl = state.backgroundImage;
    if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
      const blob = await fetchUrlAsBlob(state.backgroundImage);
      if(blob) {
        newBackgroundImageUrl = await uploadAsset(blob, 'background_image.png', campaignId, userId);
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }

    let newGeneratedImageUrl = state.generatedImageUrl;
    if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
        const blob = await fetchUrlAsBlob(state.generatedImageUrl);
        if(blob) {
            newGeneratedImageUrl = await uploadAsset(blob, 'generated_campaign_image.png', campaignId, userId);
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
    }
    console.log('[serializeCampaignData] All assets processed.');

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
    toast.error(`Error during asset serialization: ${error.message}`);
    throw error;
  }
};

export const deserializeCampaignData = async (loadedState) => {
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
      return { blob: null, url: url };
    }
  };

  const deserializeAssetList = async (assetList) => {
    if (!assetList) return [];
    return Promise.all(
      (assetList || []).map(async (asset) => {
        if (!asset) return null;
        const { blob, url } = await urlToBlob(asset.url);
        return { ...asset, blob, url };
      })
    ).then(results => results.filter(Boolean));
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
  console.log('[campaignState] Fetching all campaigns...');
  const res = await fetchWithAuth('/api/campaigns');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[campaignState] Failed to fetch campaigns:', err);
    throw new Error(err.error || 'Failed to fetch campaigns.');
  }
  console.log('[campaignState] Successfully fetched campaigns.');
  return res.json();
};

export const loadCampaign = async (id) => {
  console.log(`[campaignState] Loading campaign with ID: ${id}`);
  const res = await fetchWithAuth(`/api/campaigns/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[campaignState] Failed to load campaign ${id}:`, err);
    throw new Error(err.error || 'Failed to load campaign.');
  }
  const campaign = await res.json();
  console.log(`[campaignState] Successfully loaded campaign ${id}, now deserializing...`);
  campaign.campaign_data = await deserializeCampaignData(campaign.campaign_data);
  console.log(`[campaignState] Deserialization complete for campaign ${id}.`);
  return campaign;
};

export const saveCampaign = async (name, campaignData, setProgress, userId) => {
  console.log('[campaignState] Starting saveCampaign process...');
  try {
    console.log('[campaignState] Step 1: Serializing campaign data and uploading assets...');
    const stateWithAssetUrls = await serializeCampaignData(campaignData, null, setProgress, userId);
    console.log('[campaignState] Step 1 COMPLETE. Assets uploaded and URLs replaced.');

    console.log('[campaignState] Step 2: Sending campaign data to server...');
    const requestBody = JSON.stringify({ name, campaign_data: stateWithAssetUrls });
    console.log('[campaignState] Request body to be sent:', requestBody.substring(0, 500) + '...');

    const createRes = await fetchWithAuth('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    console.log(`[campaignState] Server responded with status: ${createRes.status}`);

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error('[campaignState] Server returned an error on create:', errorBody);
      throw new Error(`Failed to create campaign entry. Server says: ${errorBody}`);
    }

    console.log('[campaignState] Step 2 COMPLETE. Campaign created successfully.');
    const result = await createRes.json();
    console.log('[campaignState] Final result:', result);
    return result;
  } catch (error) {
      console.error('[campaignState] An error occurred during the save process:', error);
      toast.error(`Save failed: ${error.message}`);
      throw error;
  }
};

export const updateCampaign = async (id, name, campaignData, setProgress, userId) => {
    console.log(`[campaignState] Starting updateCampaign process for ID: ${id}...`);
    try {
        console.log('[campaignState] Step 1: Serializing campaign data and uploading assets...');
        const stateWithAssetUrls = await serializeCampaignData(campaignData, id, setProgress, userId);
        console.log('[campaignState] Step 1 COMPLETE. Assets uploaded and URLs replaced.');

        console.log('[campaignState] Step 2: Sending updated campaign data to server...');
        const requestBody = JSON.stringify({ name, campaign_data: stateWithAssetUrls });
        console.log('[campaignState] Request body to be sent:', requestBody.substring(0, 500) + '...');

        const res = await fetchWithAuth(`/api/campaigns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
        });

        console.log(`[campaignState] Server responded with status: ${res.status}`);

        if (!res.ok) {
            const errorBody = await res.text();
            console.error(`[campaignState] Server returned an error on update for campaign ${id}:`, errorBody);
            throw new Error(`Failed to update campaign. Server says: ${errorBody}`);
        }

        console.log(`[campaignState] Step 2 COMPLETE. Campaign ${id} updated successfully.`);
        const result = await res.json();
        console.log('[campaignState] Final result:', result);
        return result;
    } catch (error) {
        console.error(`[campaignState] An error occurred during the update process for campaign ${id}:`, error);
        toast.error(`Update failed: ${error.message}`);
        throw error;
    }
};

export const deleteCampaign = async (id) => {
  console.log(`[campaignState] Deleting campaign with ID: ${id}`);
  const res = await fetchWithAuth(`/api/campaigns/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[campaignState] Failed to delete campaign ${id}:`, err);
    throw new Error(err.error || 'Failed to delete campaign.');
  }
  console.log(`[campaignState] Successfully deleted campaign ${id}.`);
  return res.json();
};
