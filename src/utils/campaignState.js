import { toast } from 'sonner';
import fetchWithAuth from './fetchWithAuth';

/**
 * Manually handles the Vercel Blob upload process to provide better error handling and timeouts.
 * This function replaces the direct use of `@vercel/blob/client`'s `upload` function.
 */
const uploadAsset = async (blob, filename, campaignId, userId) => {
  if (!blob || !(blob instanceof Blob)) {
    console.error('[uploadAsset] Invalid blob provided.', { blob, filename });
    throw new Error(`Asset "${filename}" could not be uploaded because it is not a valid file.`);
  }
  if (!userId) {
    throw new Error("User ID is required to upload assets.");
  }

  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;
  console.log(`[uploadAsset] Starting manual upload for: ${fullPath}`);

  try {
    // Step 1: Request a signed URL from our serverless function.
    console.log(`[uploadAsset] Step 1: Requesting signed URL for ${fullPath}...`);
    const response = await fetch(`/api/upload?filename=${encodeURIComponent(fullPath)}`, {
      method: 'POST', // The server handler expects a POST
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: fullPath, clientPayload: JSON.stringify({ campaignId }) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get upload URL. Server responded with ${response.status}: ${errorText}`);
    }

    const newBlob = await response.json();
    console.log(`[uploadAsset] Step 1 complete. Received signed URL:`, { url: newBlob.url, uploadUrl: newBlob.uploadUrl });

    // Step 2: Upload the file to the signed URL.
    console.log(`[uploadAsset] Step 2: Uploading file to signed URL...`);
    const uploadResponse = await fetch(newBlob.uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob', // Required header for Vercel Blob (Azure)
        'Content-Type': blob.type,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed. Storage provider responded with ${uploadResponse.status}: ${errorText}`);
    }

    console.log(`[uploadAsset] Step 2 complete. Successfully uploaded ${filename}. Final URL: ${newBlob.url}`);
    return newBlob.url;

  } catch (error) {
    console.error(`[uploadAsset] A network error occurred during upload for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}. Reason: ${error.message}`);
  }
};


/**
 * Gathers and serializes the current application state for saving.
 * Blobs are uploaded to Vercel Blob storage.
 */
export const serializeCampaignData = async (state, campaignId, setProgress, userId) => {
  console.log('[serializeCampaignData] Starting serialization...');
  try {
    // Helper to process a list of assets, uploading their blobs sequentially and resiliently.
    const serializeAssetList = async (assetList) => {
      if (!assetList) return [];
      const serializedList = [];
      for (const asset of assetList) {
        const filename = asset.filename || `asset_${Date.now()}`;
        console.log(`[serializeAssetList] Processing asset: ${filename}`);

        if (asset && asset.blob instanceof Blob) {
          try {
            const newUrl = await uploadAsset(asset.blob, filename, campaignId, userId);
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            serializedList.push({ ...asset, url: newUrl, blob: undefined });
            console.log(`[serializeAssetList] Successfully processed and uploaded asset: ${filename}`);
          } catch (error) {
            console.error(`[serializeAssetList] Failed to process asset ${filename}. Skipping this file.`, error);
            toast.error(`Failed to upload ${filename}: ${error.message}`);
            serializedList.push({ ...asset, blob: undefined });
          }
        } else {
          serializedList.push({ ...asset, blob: undefined });
          console.log(`[serializeAssetList] Asset ${filename} has no blob, skipping upload.`);
        }
      }
      return serializedList;
    };

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

    const assetsToUpload = [
      ...(state.generatedImagesData || []).filter(a => a && a.blob instanceof Blob),
      ...(state.generatedAudioData || []).filter(a => a && a.blob instanceof Blob),
      ...(state.generatedVideosData || []).filter(a => a && a.blob instanceof Blob),
      ...(state.brandElements || []).filter(el => el && el.blob instanceof Blob),
    ];
    if (state.backgroundImage && (state.backgroundImage.startsWith('blob:') || state.backgroundImage.startsWith('data:'))) {
        assetsToUpload.push({ isStandalone: true });
    }
    if (state.generatedImageUrl && (state.generatedImageUrl.startsWith('blob:') || state.generatedImageUrl.startsWith('data:'))) {
        assetsToUpload.push({ isStandalone: true });
    }
    setProgress({ current: 0, total: assetsToUpload.length });
    console.log(`[serializeCampaignData] Determined ${assetsToUpload.length} assets need uploading.`);

    await new Promise(resolve => setTimeout(resolve, 0));
    console.log('[serializeCampaignData] Continuing after yield. Starting asset serialization...');

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
