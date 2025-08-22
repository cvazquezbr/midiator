import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';

/**
 * Asynchronously converts a data URL to a Blob object.
 * This is non-blocking and preferred for performance over synchronous methods.
 */
const dataURLtoBlob = async (dataUrl) => {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('[dataURLtoBlob] Failed to convert data URL to Blob:', error);
    throw new Error('Could not convert image data before upload.');
  }
};

/**
 * Handles the Vercel Blob upload process using the official client SDK.
 */
export const uploadAsset = async (dataUrl, filename, campaignId, userId) => {
  console.log(`[uploadAsset] Preparing to upload: ${filename}`);

  if (!dataUrl || !dataUrl.startsWith('data:')) {
    console.error('[uploadAsset] Invalid dataUrl provided.', { filename });
    throw new Error(`Asset "${filename}" is not a valid data URL.`);
  }
  if (!userId) {
    throw new Error("User ID is required for upload.");
  }

  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;

  try {
    console.log('[uploadAsset] Converting dataURL to Blob asynchronously...');
    const blob = await dataURLtoBlob(dataUrl);
    console.log(`[uploadAsset] Converted dataURL to Blob. Size: ${blob.size} bytes. Path: ${fullPath}`);

    console.log('[uploadAsset] Calling Vercel SDK upload function...');
    const newBlob = await upload(fullPath, blob, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ campaignId }),
    });
    console.log('[uploadAsset] Vercel SDK upload function returned.');

    console.log(`[uploadAsset] Successfully uploaded ${filename}. URL: ${newBlob.url}`);
    return newBlob.url;

  } catch (error) {
    console.error(`[uploadAsset] Vercel upload failed for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}. Please check the console for details.`);
  }
};


/**
 * Prepares campaign data for saving by uploading all local media assets sequentially
 * and replacing their data URLs with permanent cloud URLs.
 */
export const serializeCampaignData = async (state, userId, campaignId = null, onProgress = () => {}) => {
  console.log('[serializeCampaignData] Starting serialization and upload...');

  // Deep copy to avoid mutating the original state object directly.
  const cleanState = JSON.parse(JSON.stringify(state));
  let assetsToUploadCount = 0;
  let assetsUploadedCount = 0;

  // 1. Count all assets that need uploading for the progress bar.
  if (cleanState.backgroundImage && cleanState.backgroundImage.startsWith('data:')) {
    assetsToUploadCount++;
  }
  if (cleanState.generatedImageUrl && cleanState.generatedImageUrl.startsWith('data:')) {
    assetsToUploadCount++;
  }
  if (Array.isArray(cleanState.brandElements)) {
    assetsToUploadCount += cleanState.brandElements.filter(el => el.url && el.url.startsWith('data:')).length;
  }
  if (Array.isArray(cleanState.generatedImagesData)) {
    assetsToUploadCount += cleanState.generatedImagesData.filter(img => img.dataUrl && img.dataUrl.startsWith('data:')).length;
  }
  // Future asset types can be counted here.

  console.log(`[serializeCampaignData] Found ${assetsToUploadCount} assets to upload.`);
  onProgress({ current: 0, total: assetsToUploadCount });

  // 2. Process each asset type sequentially.
  try {
    // Background Image
    if (cleanState.backgroundImage && cleanState.backgroundImage.startsWith('data:')) {
      const filename = `background_${Date.now()}.png`;
      console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
      const permanentUrl = await uploadAsset(cleanState.backgroundImage, filename, campaignId, userId);
      cleanState.backgroundImage = permanentUrl;
      assetsUploadedCount++;
      onProgress({ current: assetsUploadedCount, total: assetsToUploadCount });
    }

    // Main Campaign Image
    if (cleanState.generatedImageUrl && cleanState.generatedImageUrl.startsWith('data:')) {
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
        if (element.url && element.url.startsWith('data:')) {
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
        if (image.dataUrl && image.dataUrl.startsWith('data:')) {
          const filename = image.filename || `post_image_${image.index}_${Date.now()}.png`;
          console.log(`[serializeCampaignData] Uploading asset ${assetsUploadedCount + 1}/${assetsToUploadCount}: ${filename}`);
          const permanentUrl = await uploadAsset(image.dataUrl, filename, campaignId, userId);
          image.url = permanentUrl;
          delete image.dataUrl; // Clean up the temporary field
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
      });
    }
  };
  finalCleanup(cleanState.generatedImagesData);

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

export const saveCampaign = async (name, campaignData, setProgress, userId) => {
  console.log('[campaignState] Starting saveCampaign process...');
  try {
    console.log('[campaignState] Step 1: Serializing and uploading assets...');
    const stateToSave = await serializeCampaignData(campaignData, userId, null, setProgress);
    console.log('[campaignState] Step 1 COMPLETE.');

    console.log('[campaignState] Step 2: Sending campaign data to server...');
    const requestBody = JSON.stringify({ name, campaign_data: stateToSave });

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

export const updateCampaign = async (id, name, campaignData, setProgress, userId) => {
    console.log(`[campaignState] Starting updateCampaign process for ID: ${id}...`);
    try {
        console.log('[campaignState] Step 1: Serializing and uploading assets...');
        const stateToSave = await serializeCampaignData(campaignData, userId, id, setProgress);
        console.log('[campaignState] Step 1 COMPLETE.');

        console.log('[campaignState] Step 2: Sending updated campaign data to server...');
        const requestBody = JSON.stringify({ name, campaign_data: stateToSave });

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
