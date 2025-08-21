import { toast } from 'sonner';
import fetchWithAuth from './fetchWithAuth';

const fetchWithTimeout = (resource, options = {}, timeout = 15000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Request timed out')),
      timeout
    );
    fetch(resource, options)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

/**
 * Manually handles the Vercel Blob upload process.
 * It now accepts a dataUrl, converts it to a blob, and then uploads.
 */
const uploadAsset = async (dataUrl, filename, campaignId, userId) => {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    console.error('[uploadAsset] Invalid dataUrl provided.', { dataUrl, filename });
    throw new Error(`Asset "${filename}" could not be uploaded because it is not a valid data URL.`);
  }
  if (!userId) {
    throw new Error("User ID is required to upload assets.");
  }

  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;
  console.log(`[uploadAsset] Starting manual upload for: ${fullPath}`);

  try {
    // Convert dataUrl to blob before uploading
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Step 1: Request a signed URL from our serverless function.
    console.log(`[uploadAsset] Step 1: Requesting signed URL for ${fullPath}...`);
    const signedUrlResponse = await fetchWithTimeout(`/api/upload?filename=${encodeURIComponent(fullPath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: fullPath, clientPayload: JSON.stringify({ campaignId }) }),
    }, 15000);

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      throw new Error(`Failed to get upload URL. Server responded with ${signedUrlResponse.status}: ${errorText}`);
    }

    const newBlobData = await signedUrlResponse.json();
    console.log(`[uploadAsset] Step 1 complete. Received signed URL.`);

    // Step 2: Upload the file to the signed URL.
    console.log(`[uploadAsset] Step 2: Uploading file to signed URL...`);
    const uploadResponse = await fetchWithTimeout(newBlobData.uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': blob.type,
      },
      body: blob,
    }, 60000);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed. Storage provider responded with ${uploadResponse.status}: ${errorText}`);
    }

    console.log(`[uploadAsset] Step 2 complete. Successfully uploaded ${filename}. Final URL: ${newBlobData.url}`);
    return newBlobData.url;

  } catch (error) {
    console.error(`[uploadAsset] A network error occurred during upload for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}. Reason: ${error.message}`);
  }
};

export const serializeCampaignData = async (state, campaignId, setProgress, userId) => {
  console.log('[serializeCampaignData] Starting serialization...');
  try {
    const serializeAssetList = async (assetList) => {
      if (!assetList) return [];
      const serializedList = [];
      for (const asset of assetList) {
        const filename = asset.filename || `asset_${Date.now()}`;
        console.log(`[serializeAssetList] Processing asset: ${filename}`);

        // The main change: look for dataUrl instead of blob.
        if (asset && asset.dataUrl && asset.dataUrl.startsWith('data:')) {
          try {
            const newUrl = await uploadAsset(asset.dataUrl, filename, campaignId, userId);
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            // Store the new permanent URL and remove the temporary dataUrl.
            serializedList.push({ ...asset, url: newUrl, dataUrl: undefined });
            console.log(`[serializeAssetList] Successfully processed and uploaded asset: ${filename}`);
          } catch (error) {
            console.error(`[serializeAssetList] Failed to process asset ${filename}. Skipping this file.`, error);
            toast.error(`Failed to upload ${filename}: ${error.message}`);
            serializedList.push({ ...asset, dataUrl: undefined });
          }
        } else {
          serializedList.push({ ...asset, dataUrl: undefined });
          console.log(`[serializeAssetList] Asset ${filename} has no dataUrl, skipping upload.`);
        }
      }
      return serializedList;
    };

    const assetsToUpload = [
      ...(state.generatedImagesData || []).filter(a => a && a.dataUrl),
      ...(state.generatedAudioData || []).filter(a => a && a.dataUrl),
      ...(state.generatedVideosData || []).filter(a => a && a.dataUrl),
      ...(state.brandElements || []).filter(el => el && el.dataUrl),
    ];
    if (state.backgroundImage && state.backgroundImage.startsWith('data:')) {
        assetsToUpload.push({ isStandalone: true });
    }
    if (state.generatedImageUrl && state.generatedImageUrl.startsWith('data:')) {
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
    if (state.backgroundImage && state.backgroundImage.startsWith('data:')) {
      newBackgroundImageUrl = await uploadAsset(state.backgroundImage, 'background_image.png', campaignId, userId);
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    let newGeneratedImageUrl = state.generatedImageUrl;
    if (state.generatedImageUrl && state.generatedImageUrl.startsWith('data:')) {
      newGeneratedImageUrl = await uploadAsset(state.generatedImageUrl, 'generated_campaign_image.png', campaignId, userId);
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
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
  // Deserialization logic remains largely the same, as it already handles http URLs.
  // The main change is that we don't need to create blobs on load for display,
  // as data URLs can be used directly in `src` attributes.
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
  console.log(`[campaignState] Successfully loaded campaign ${id}.`);
  // No deserialization needed for data URLs, they are self-contained.
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
