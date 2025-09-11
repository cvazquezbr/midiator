import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';

/**
 * Uploads a single Blob to Vercel's Blob store.
 * @param {Blob} blob The file blob to upload.
 * @param {string} filename The desired filename for the asset.
 * @param {string} campaignId The ID of the campaign for pathing.
 * @param {string} userId The ID of the user for pathing.
 * @returns {Promise<string>} The permanent URL of the uploaded asset.
 */
export const uploadAsset = async (blob, filename, campaignId, userId) => {
  console.log(`[uploadAsset] Preparing to upload: ${filename}.`);
  if (!blob) throw new Error(`Asset "${filename}" is not a valid Blob.`);
  if (!userId) throw new Error("User ID is required for upload.");

  const fullPath = campaignId ? `${userId}/${campaignId}/${filename}` : `${userId}/${filename}`;

  try {
    const newBlob = await upload(fullPath, blob, {
      access: 'public',
      handleUploadUrl: '/api/upload',
    });
    console.log(`[uploadAsset] Successfully uploaded ${filename}. URL: ${newBlob.url}`);
    return newBlob.url;
  } catch (error) {
    console.error(`[uploadAsset] A critical error occurred during Vercel upload for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}.`);
  }
};


/**
 * Recursively traverses the campaign state, finds 'blob:' URLs,
 * uploads the corresponding assets from the pendingAssets map, and replaces
 * the 'blob:' URLs with the permanent URLs returned by the server.
 */
export const serializeCampaignData = async (state, pendingAssets, userId, campaignId = null, onProgress = () => {}) => {
  console.log('[serializeCampaignData] Starting serialization and upload...');
  const cleanState = JSON.parse(JSON.stringify(state)); // Deep copy to avoid mutation
  const uploadPromises = [];
  const assetsToUpload = [];

  // 1. Recursively find all assets that need uploading.
  const findAssets = (obj) => {
    if (!obj) return;
    if (Array.isArray(obj)) {
      obj.forEach(findAssets);
    } else if (typeof obj === 'object') {
      if (obj.src && typeof obj.src === 'string' && obj.src.startsWith('blob:')) {
        assetsToUpload.push(obj);
      }
      if (obj.url && typeof obj.url === 'string' && obj.url.startsWith('blob:')) {
        assetsToUpload.push(obj);
      }
      Object.values(obj).forEach(findAssets);
    }
  };

  findAssets(cleanState);
  console.log(`[serializeCampaignData] Found ${assetsToUpload.length} assets to upload.`);
  onProgress({ current: 0, total: assetsToUpload.length });

  // 2. Create an array of upload promises.
  let assetsUploadedCount = 0;
  for (const asset of assetsToUpload) {
    const tempUrl = asset.src || asset.url;
    const blob = pendingAssets[tempUrl];
    if (blob) {
      const fileExtension = blob.type.split('/')[1] || 'png';
      const filename = asset.id ? `${asset.id}.${fileExtension}` : `asset_${Date.now()}.${fileExtension}`;

      const promise = uploadAsset(blob, filename, campaignId, userId)
        .then(permanentUrl => {
          if (asset.src) asset.src = permanentUrl;
          if (asset.url) asset.url = permanentUrl;
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: assetsToUpload.length });
        })
        .catch(error => {
          console.error(`Failed to upload asset ${filename}`, error);
          toast.error(`Upload failed for ${filename}: ${error.message}`);
          // We throw to stop the whole save process if one asset fails.
          throw error;
        });
      uploadPromises.push(promise);
    }
  }

  // 3. Execute all uploads in parallel and wait for them to complete.
  await Promise.all(uploadPromises);

  console.log('[serializeCampaignData] All uploads and serialization complete.');
  return cleanState;
};


export const deserializeCampaignData = async (loadedState) => {
  console.log('[deserializeCampaignData] Starting deserialization and asset download...');
  // Deep copy to avoid mutating the original state object received.
  const state = JSON.parse(JSON.stringify(loadedState));
  const newlyCreatedAssets = {};
  const downloadPromises = [];

  // Helper to check if a URL is a Vercel blob storage URL.
  const isVercelUrl = (url) => typeof url === 'string' && url.includes('blob.vercel-storage.com');

  // Recursively traverses the state object to find and convert asset URLs.
  const findAndConvertUrls = (obj) => {
    if (!obj) return;

    if (Array.isArray(obj)) {
      // If it's an array, recurse into each item.
      obj.forEach(findAndConvertUrls);
    } else if (typeof obj === 'object') {
      // If it's an object, check for properties that might contain asset URLs.
      const urlFields = ['src', 'url'];

      for (const field of urlFields) {
        if (obj[field] && isVercelUrl(obj[field])) {
          // This is a URL that needs to be converted.
          const downloadUrl = obj[field];

          const promise = fetch(downloadUrl)
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error ${response.status} fetching ${downloadUrl}`);
              }
              return response.blob();
            })
            .then(blob => {
              // Create a local blob URL that the browser can render immediately.
              const tempUrl = URL.createObjectURL(blob);
              // Add the new blob to our map of assets.
              newlyCreatedAssets[tempUrl] = blob;
              // Replace the permanent URL with the temporary local blob URL in the state.
              obj[field] = tempUrl;
            })
            .catch(error => {
              console.error(`[deserializeCampaignData] Failed to download or process asset: ${downloadUrl}`, error);
              toast.error(`Não foi possível carregar o recurso: ${error.message}`);
              // If download fails, we leave the original URL in place.
            });

          downloadPromises.push(promise);
        }
      }

      // After checking the known URL fields, recurse into all other properties of the object.
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && !urlFields.includes(key)) {
          findAndConvertUrls(obj[key]);
        }
      }
    }
  };

  // Start the recursive conversion process.
  findAndConvertUrls(state);

  // Wait for all download and conversion promises to complete.
  await Promise.all(downloadPromises);

  console.log(`[deserializeCampaignData] Deserialization complete. ${Object.keys(newlyCreatedAssets).length} assets downloaded and converted.`);

  // Return both the modified state and the map of newly created assets.
  return { finalState: state, newlyCreatedAssets };
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
    // The deserialize function now returns an object containing the modified state
    // and a map of any newly created local assets (blobs).
    const { finalState, newlyCreatedAssets } = await deserializeCampaignData(campaign.campaign_data);

    // Replace the campaign data with the state that has local blob URLs.
    campaign.campaign_data = finalState;
    // Attach the newly created assets so the UI can update its pendingAssets state.
    campaign.pendingAssets = newlyCreatedAssets;
  } else {
    // Ensure pendingAssets is initialized even if there's no campaign data.
    campaign.pendingAssets = {};
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
