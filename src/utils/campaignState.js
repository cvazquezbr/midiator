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

const dataURLtoBlob = (dataurl) => {
  const arr = dataurl.split(',');
  if (arr.length < 2) {
    throw new Error('Invalid dataURL');
  }
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error('Could not determine mime type from dataURL');
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Manually handles the Vercel Blob upload process.
 * It now accepts a dataUrl, converts it to a blob, and then uploads.
 * This function is now exported to be used by components directly.
 */
export const uploadAsset = async (dataUrl, filename, campaignId, userId) => {
  console.log('[uploadAsset] Function called.');
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    console.error('[uploadAsset] Invalid dataUrl provided.', { dataUrl, filename });
    throw new Error(`Asset "${filename}" could not be uploaded because it is not a valid data URL.`);
  }
  if (!userId) {
    throw new Error("User ID is required to upload assets.");
  }
  console.log('[uploadAsset] Passed initial checks.');

  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;
  console.log(`[uploadAsset] Starting manual upload for: ${fullPath}`);

  try {
    console.log('[uploadAsset] PRE-CONVERSION: Converting data URL to blob...');
    const blob = dataURLtoBlob(dataUrl);
    console.log(`[uploadAsset] POST-CONVERSION: Conversion complete. Blob size: ${blob.size} bytes`);

    console.log(`[uploadAsset] PRE-FETCH-SIGNED-URL: Requesting signed URL for ${fullPath}...`);
    const signedUrlResponse = await fetchWithTimeout(`/api/upload?filename=${encodeURIComponent(fullPath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: fullPath, clientPayload: JSON.stringify({ campaignId }) }),
    }, 15000);
    console.log('[uploadAsset] POST-FETCH-SIGNED-URL: Got response from /api/upload.');

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      throw new Error(`Failed to get upload URL. Server responded with ${signedUrlResponse.status}: ${errorText}`);
    }

    console.log('[uploadAsset] PRE-JSON-PARSE: Parsing signed URL response...');
    const newBlobData = await signedUrlResponse.json();
    console.log(`[uploadAsset] POST-JSON-PARSE: Received signed URL data.`);

    console.log(`[uploadAsset] PRE-UPLOAD-BLOB: Uploading file to signed URL...`);
    const uploadResponse = await fetchWithTimeout(newBlobData.uploadUrl, {
      method: 'PUT',
      headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': blob.type },
      body: blob,
    }, 60000);
    console.log('[uploadAsset] POST-UPLOAD-BLOB: Got response from blob storage.');

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed. Storage provider responded with ${uploadResponse.status}: ${errorText}`);
    }

    console.log(`[uploadAsset] Final success log. Returning URL: ${newBlobData.url}`);
    return newBlobData.url;

  } catch (error) {
    console.error(`[uploadAsset] A network error or other exception occurred during upload for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}. Reason: ${error.message}`);
  }
};

/**
 * Prepares campaign data for saving by uploading all local media assets sequentially
 * and replacing their data URLs with permanent cloud URLs.
 */
export const serializeCampaignData = async (state, userId, campaignId = null, onProgress = () => {}) => {
  console.log('[serializeCampaignData] Starting serialization and upload process...');

  const cleanState = JSON.parse(JSON.stringify(state));
  const assetsToUpload = [];

  // 1. Gather all assets that need uploading
  // Main background image
  if (cleanState.backgroundImage && cleanState.backgroundImage.startsWith('data:')) {
    assetsToUpload.push({
      type: 'backgroundImage',
      dataUrl: cleanState.backgroundImage,
      filename: `background_${Date.now()}.png`,
    });
  }

  // Brand elements
  if (cleanState.brandElements && Array.isArray(cleanState.brandElements)) {
    cleanState.brandElements.forEach((element, index) => {
      if (element.url && element.url.startsWith('data:')) {
        assetsToUpload.push({
          type: 'brandElement',
          dataUrl: element.url,
          filename: `brand_${element.name || index}_${Date.now()}.png`,
          index: index,
        });
      }
    });
  }

  // Generated images
  if (cleanState.generatedImagesData && Array.isArray(cleanState.generatedImagesData)) {
    cleanState.generatedImagesData.forEach((image, index) => {
      // The frontend now saves the dataUrl property for uploads
      if (image.dataUrl && image.dataUrl.startsWith('data:')) {
        assetsToUpload.push({
          type: 'generatedImage',
          dataUrl: image.dataUrl,
          filename: image.filename || `image_${index}_${Date.now()}.png`,
          index: index,
        });
      }
    });
  }

  // Placeholder for future media types
  // if (cleanState.generatedAudioData) { ... }
  // if (cleanState.generatedVideosData) { ... }

  console.log(`[serializeCampaignData] Found ${assetsToUpload.length} assets to upload.`);
  onProgress({ current: 0, total: assetsToUpload.length });

  // 2. Upload assets sequentially
  for (let i = 0; i < assetsToUpload.length; i++) {
    const asset = assetsToUpload[i];
    console.log(`[serializeCampaignData] Uploading asset ${i + 1}/${assetsToUpload.length}: ${asset.filename}`);
    try {
      const permanentUrl = await uploadAsset(asset.dataUrl, asset.filename, campaignId, userId);

      // 3. Update the cleanState with the new permanent URL
      switch (asset.type) {
        case 'backgroundImage':
          cleanState.backgroundImage = permanentUrl;
          break;
        case 'brandElement':
          cleanState.brandElements[asset.index].url = permanentUrl;
          break;
        case 'generatedImage':
          cleanState.generatedImagesData[asset.index].url = permanentUrl;
          // Important: Clean up the temporary data from the object that will be saved
          delete cleanState.generatedImagesData[asset.index].dataUrl;
          break;
        // ... other cases
      }
      console.log(`[serializeCampaignData] Upload successful for ${asset.filename}`);
      onProgress({ current: i + 1, total: assetsToUpload.length });
    } catch (error) {
      console.error(`[serializeCampaignData] Failed to upload ${asset.filename}:`, error);
      throw new Error(`O upload do arquivo ${asset.filename} falhou. A campanha não foi salva.`);
    }
  }

  // 4. Final cleanup of any remaining temporary fields
  // This is a safeguard. The primary cleanup happens after each successful upload.
  const finalCleanup = (assetArray) => {
    if (assetArray && Array.isArray(assetArray)) {
      assetArray.forEach(asset => {
        delete asset.dataUrl;
        delete asset.blob;
        delete asset.backgroundImage; // Old field, good to keep cleaning
      });
    }
  };
  finalCleanup(cleanState.brandElements);
  finalCleanup(cleanState.generatedImagesData);

  console.log('[serializeCampaignData] All uploads and cleanup complete.');
  return cleanState;
};

export const deserializeCampaignData = async (loadedState) => {
  return loadedState;
};

// --- API Functions ---
export const getCampaigns = async () => {
  // ... (omitted for brevity, no changes)
};

export const loadCampaign = async (id) => {
  // ... (omitted for brevity, no changes)
};

export const saveCampaign = async (name, campaignData, setProgress, userId) => {
  console.log('[campaignState] Starting saveCampaign process...');
  try {
    console.log('[campaignState] Step 1: Serializing and uploading assets...');
    const stateToSave = await serializeCampaignData(campaignData, userId, null, setProgress);
    console.log('[campaignState] Step 1 COMPLETE.');

    console.log('[campaignState] Step 2: Sending campaign data to server...');
    const requestBody = JSON.stringify({ name, campaign_data: stateToSave });
    console.log('[campaignState] Request body to be sent:', requestBody.substring(0, 500) + '...');

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
        console.log('[campaignState] Request body to be sent:', requestBody.substring(0, 500) + '...');

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
