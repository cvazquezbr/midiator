import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';

/**
 * Handles the Vercel Blob upload process using the official client SDK.
 * This version includes hyper-granular logging and explicit catch handlers.
 */
export const uploadAsset = async (dataUrl, pendingAssets, filename, campaignId, userId) => {
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
    let blobToUpload;
    if (dataUrl.startsWith('blob:')) {
      console.log('[uploadAsset] Found blob: URL. Looking up in pendingAssets.');
      blobToUpload = pendingAssets[dataUrl];
      if (!blobToUpload) {
        throw new Error(`Asset with blob URL ${dataUrl} not found in pending assets.`);
      }
    } else {
      console.log('[uploadAsset] Found data: URL. Fetching to convert to blob.');
      const response = await fetch(dataUrl).catch(e => {
        console.error('[uploadAsset] FATAL: The `fetch(dataUrl)` promise rejected.', e);
        throw e;
      });
      blobToUpload = await response.blob().catch(e => {
        console.error('[uploadAsset] FATAL: The `response.blob()` promise rejected.', e);
        throw e;
      });
    }
    console.log('[uploadAsset] Blob ready for upload. Size:', blobToUpload.size);

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
export const serializeCampaignData = async (state, pendingAssets, userId, campaignId = null, onProgress = () => {}) => {
  console.log('[serializeCampaignData] Starting serialization and upload...');

  const cleanState = JSON.parse(JSON.stringify(state));
  let assetsToUploadCount = 0;
  let assetsUploadedCount = 0;

  // 1. Count all assets that need uploading for the progress bar.
  const needsUpload = (url) => url && (url.startsWith('data:') || url.startsWith('blob:'));

  if (cleanState.pageTemplate?.images) {
    assetsToUploadCount += cleanState.pageTemplate.images.filter(img => needsUpload(img.src)).length;
  }
  if (Array.isArray(cleanState.brandElements)) {
    assetsToUploadCount += cleanState.brandElements.filter(el => needsUpload(el.url)).length;
  }
  if (Array.isArray(cleanState.generatedPagesData)) {
    assetsToUploadCount += cleanState.generatedPagesData.filter(img => needsUpload(img.url)).length;
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
    // Page Template Images (new)
    if (cleanState.pageTemplate?.images) {
      for (const image of cleanState.pageTemplate.images) {
        if (needsUpload(image.src)) {
          const filename = `template-image_${Date.now()}.png`;
          console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
          const permanentUrl = await uploadAsset(image.src, pendingAssets, filename, campaignId, userId);
          image.src = permanentUrl;
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
        }
      }
    }

    // Brand Elements
    if (Array.isArray(cleanState.brandElements)) {
      for (const [index, element] of cleanState.brandElements.entries()) {
        if (needsUpload(element.url)) {
          const filename = `brand_${element.name || index}_${Date.now()}.png`;
          console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
          const permanentUrl = await uploadAsset(element.url, pendingAssets, filename, campaignId, userId);
          element.url = permanentUrl;
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
        }
      }
    }

    // Generated Pages (the final carousels/images)
    if (Array.isArray(cleanState.generatedPagesData)) {
        for (const page of cleanState.generatedPagesData) {
            if (needsUpload(page.url)) {
                const filename = page.filename || `page_${page.index}_${Date.now()}.png`;
                console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
                const permanentUrl = await uploadAsset(page.url, filename, campaignId, userId);
                page.url = permanentUrl; // Replace temporary URL with permanent one
                assetsUploadedCount++;
                onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
            }
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
  const finalCleanup = (assetArray, keepUrl = false) => {
    if (Array.isArray(assetArray)) {
      assetArray.forEach(asset => {
        delete asset.dataUrl;
        delete asset.blob;
        if (!keepUrl) {
            delete asset.url;
        }
      });
    }
  };
  // For generatedPagesData, we keep the URL as it's now the permanent one.
  finalCleanup(cleanState.generatedPagesData, true);
  finalCleanup(cleanState.generatedAudioData, true);
  finalCleanup(cleanState.generatedVideosData, true);

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

export const saveCampaign = async (name, campaignData, pendingAssets, setProgress, userId, autorId, personaId) => {
  console.log('[campaignState] Starting saveCampaign process...');
  try {
    console.log('[campaignState] Step 1: Serializing and uploading assets...');
    const stateToSave = await serializeCampaignData(campaignData, pendingAssets, userId, null, setProgress);
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

export const updateCampaign = async (id, name, campaignData, pendingAssets, setProgress, userId, autorId, personaId) => {
    console.log(`[campaignState] Starting updateCampaign process for ID: ${id}...`);
    try {
        console.log('[campaignState] Step 1: Serializing and uploading assets...');
        const stateToSave = await serializeCampaignData(campaignData, pendingAssets, userId, id, setProgress);
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
