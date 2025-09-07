import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';

/**
 * Handles the Vercel Blob upload process using the official client SDK.
 * This version includes hyper-granular logging and explicit catch handlers.
 */
export const uploadAsset = async (dataUrl, filename, campaignId, userId) => {
  console.log(`[uploadAsset] Preparing to upload: ${filename}.`);

  if (!dataUrl || (!dataUrl.startsWith('data:') && !dataUrl.startsWith('blob:'))) {
    console.error('[uploadAsset] Invalid dataUrl provided (must be a data: or blob: URL).', { filename });
    throw new Error(`Asset "${filename}" is not a valid data URL.`);
  }
  if (!userId) {
    throw new Error("User ID is required for upload.");
  }

  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;

  try {
    console.log('[uploadAsset] Step 1: Fetching data URL...');
    const response = await fetch(dataUrl).catch(e => {
      console.error('[uploadAsset] FATAL: The `fetch(dataUrl)` promise rejected.', e);
      throw e;
    });
    console.log('[uploadAsset] Step 1 COMPLETE. Fetch status:', response.status);

    console.log('[uploadAsset] Step 2: Converting response to blob...');
    const blob = await response.blob().catch(e => {
      console.error('[uploadAsset] FATAL: The `response.blob()` promise rejected.', e);
      throw e;
    });
    console.log('[uploadAsset] Step 2 COMPLETE. Blob size:', blob.size);

    console.log('[uploadAsset] Step 3: Calling Vercel upload SDK...');
    const newBlob = await upload(fullPath, blob, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ campaignId }),
    }).catch(e => {
      console.error('[uploadAsset] FATAL: The Vercel `upload()` promise rejected.', e);
      throw e;
    });
    console.log('[uploadAsset] Step 3 COMPLETE. Vercel SDK returned.');

    console.log(`[uploadAsset] Successfully uploaded ${filename}. URL: ${newBlob.url}`);
    return newBlob.url;

  } catch (error) {
    console.error(`[uploadAsset] A critical error occurred in the upload chain for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}. An operation failed silently. Check the logs above for a FATAL message.`);
  }
};


/**
 * Prepares campaign data for saving by uploading all local media assets sequentially
 * and replacing their data URLs with permanent cloud URLs.
 */
export const serializeCampaignData = async (state, userId, campaignId = null, onProgress = () => {}) => {
  console.log('[serializeCampaignData] Starting serialization and upload...');

  const cleanState = JSON.parse(JSON.stringify(state));
  let assetsToUploadCount = 0;
  let assetsUploadedCount = 0;

  // 1. Count all assets that need uploading for the progress bar.
  const needsUpload = (url) => url && (url.startsWith('data:') || url.startsWith('blob:'));

  if (needsUpload(cleanState.backgroundImage)) {
    assetsToUploadCount++;
  }
  if (needsUpload(cleanState.generatedImageUrl)) {
    assetsToUploadCount++;
  }
  if (Array.isArray(cleanState.brandElements)) {
    assetsToUploadCount += cleanState.brandElements.filter(el => needsUpload(el.url)).length;
  }
  if (Array.isArray(cleanState.generatedImagesData)) {
    assetsToUploadCount += cleanState.generatedImagesData.filter(img => needsUpload(img.backgroundImage)).length;
  }
  if (Array.isArray(cleanState.generatedAudioData)) {
    assetsToUploadCount += cleanState.generatedAudioData.filter(audio => needsUpload(audio.url)).length;
  }
  if (Array.isArray(cleanState.generatedVideosData)) {
    assetsToUploadCount += cleanState.generatedVideosData.filter(video => needsUpload(video.url)).length;
  }

  console.log(`[serializeCampaignData] Found ${assetsToUploadCount} assets to upload.`);
  onProgress({ current: 0, total: assetsToUploadCount });

  // 2. Process each asset type sequentially.
  try {
    // Background Image (legacy)
    if (needsUpload(cleanState.backgroundImage)) {
      const filename = `background_${Date.now()}.png`;
      console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
      const permanentUrl = await uploadAsset(cleanState.backgroundImage, filename, campaignId, userId);
      cleanState.backgroundImage = permanentUrl;
      assetsUploadedCount++;
      onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
    }

    // Main Campaign Image
    if (needsUpload(cleanState.generatedImageUrl)) {
      const filename = `campaign_image_${Date.now()}.png`;
      console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
      const permanentUrl = await uploadAsset(cleanState.generatedImageUrl, filename, campaignId, userId);
      cleanState.generatedImageUrl = permanentUrl;
      assetsUploadedCount++;
      onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
    }

    // Brand Elements
    if (Array.isArray(cleanState.brandElements)) {
      for (const [index, element] of cleanState.brandElements.entries()) {
        if (needsUpload(element.url)) {
          const filename = `brand_${element.name || index}_${Date.now()}.png`;
          console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
          const permanentUrl = await uploadAsset(element.url, filename, campaignId, userId);
          element.url = permanentUrl;
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
        }
      }
    }

    // Generated Post Images
    if (Array.isArray(cleanState.generatedImagesData)) {
      for (const image of cleanState.generatedImagesData) {
        // Upload the background image if it's a data URL, and keep the property.
        if (needsUpload(image.backgroundImage)) {
          const filename = `background_post_${image.index}_${Date.now()}.png`;
          console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
          const permanentUrl = await uploadAsset(image.backgroundImage, filename, campaignId, userId);
          image.backgroundImage = permanentUrl;
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
        }
        // The merged image 'url' is temporary and will be removed in the final cleanup.
      }
    }

    // Generated Audio
    if (Array.isArray(cleanState.generatedAudioData)) {
      for (const audio of cleanState.generatedAudioData) {
        if (needsUpload(audio.url)) {
          const filename = audio.filename || `audio_${audio.index}_${Date.now()}.mp3`;
          console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
          const dataUrlToUpload = audio.url;
          const permanentUrl = await uploadAsset(dataUrlToUpload, filename, campaignId, userId);
          audio.url = permanentUrl;
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
        }
      }
    }

    // Generated Videos
    if (Array.isArray(cleanState.generatedVideosData)) {
      for (const video of cleanState.generatedVideosData) {
        if (needsUpload(video.url)) {
          const filename = video.filename || `video_${video.index}_${Date.now()}.mp4`;
          console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
          const dataUrlToUpload = video.url;
          const permanentUrl = await uploadAsset(dataUrlToUpload, filename, campaignId, userId);
          video.url = permanentUrl;
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
        }
      }
    }

  } catch (error) {
    console.error(`[serializeCampaignData] A failure occurred during sequential upload.`, error);
    toast.error(`Upload failed: ${error.message}`);
    throw error;
  }

  // 3. Final cleanup of any remaining temporary fields
  const finalCleanup = (assetArray) => {
    if (Array.isArray(assetArray)) {
      assetArray.forEach(asset => {
        delete asset.dataUrl;
        delete asset.blob;
        // The `url` for generated images is a temporary merged image, don't save it.
        // For audio/video it's the final URL, so we only delete it from images.
        if (asset.hasOwnProperty('backgroundImage')) { // A simple way to identify an image object
            delete asset.url;
        }
      });
    }
  };
  finalCleanup(cleanState.generatedImagesData);
  finalCleanup(cleanState.generatedAudioData);
  finalCleanup(cleanState.generatedVideosData);

  console.log('[serializeCampaignData] All uploads and cleanup complete.');
  return cleanState;
};

export const deserializeCampaignData = async (loadedState) => {
  // For now, this function is a placeholder. In the future, it could
  // be used to pre-fetch or transform URLs if needed.
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
  if (campaign.campaign_data) {
    campaign.campaign_data = await deserializeCampaignData(campaign.campaign_data);
  }
  return campaign;
};

export const saveCampaign = async (name, campaignData, setProgress, userId, autorId, personaId) => {
  console.log('[campaignState] Starting saveCampaign process...');
  try {
    console.log('[campaignState] Step 1: Serializing and uploading assets...');
    const stateToSave = await serializeCampaignData(campaignData, userId, null, setProgress);
    console.log('[campaignState] Step 1 COMPLETE.');

    console.log('[campaignState] Step 2: Sending campaign data to server...');
    const requestBody = JSON.stringify({
      name,
      campaign_data: stateToSave,
      autor_id: autorId,
      persona_id: personaId
    });

    const createRes = await fetchWithAuth('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error('[campaignState] Server returned an error on create:', errorBody);
      throw new Error(`Failed to create campaign entry. Server says: ${errorBody}`);
    }

    const result = await createRes.json();
    console.log('[campaignState] Campaign created successfully:', result);
    return result;
  } catch (error) {
      console.error('[campaignState] An error occurred during the save process:', error);
      // Toast is now handled in serializeCampaignData, but keep one here for other errors.
      toast.error(`Save failed: ${error.message}`);
      throw error;
  }
};

export const updateCampaign = async (id, name, campaignData, setProgress, userId, autorId, personaId) => {
    console.log(`[campaignState] Starting updateCampaign process for ID: ${id}...`);
    try {
        console.log('[campaignState] Step 1: Serializing and uploading assets...');
        const stateToSave = await serializeCampaignData(campaignData, userId, id, setProgress);
        console.log('[campaignState] Step 1 COMPLETE.');

        console.log('[campaignState] Step 2: Sending updated campaign data to server...');
        const requestBody = JSON.stringify({
          name,
          campaign_data: stateToSave,
          autor_id: autorId,
          persona_id: personaId
        });

        const res = await fetchWithAuth(`/api/campaigns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error(`[campaignState] Server returned an error on update for campaign ${id}:`, errorBody);
            throw new Error(`Failed to update campaign. Server says: ${errorBody}`);
        }

        const result = await res.json();
        console.log(`[campaignState] Campaign ${id} updated successfully:`, result);
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

export const getCampaignPublications = async (campaignId) => {
  if (!campaignId) {
    throw new Error('A campaign ID is required to fetch publications.');
  }
  const res = await fetchWithAuth(`/api/campaigns/${campaignId}/publications`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch campaign publications.');
  }
  return res.json();
};
