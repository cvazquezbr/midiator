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
  const allPendingAssets = { ...pendingAssets }; // Use a mutable copy

  // --- Step 1: Convert all `data:` URIs to `blob:` URIs ---
  console.log('[serializeCampaignData] Step 1a: Converting data URIs to blobs...');
  const convertDataUris = async (currentObj) => {
    if (!currentObj || typeof currentObj !== 'object') {
      return;
    }
    if (Array.isArray(currentObj)) {
      await Promise.all(currentObj.map(item => convertDataUris(item)));
      return;
    }

    const promises = Object.keys(currentObj).map(async (key) => {
      const value = currentObj[key];
      if (typeof value === 'string' && value.startsWith('data:')) {
        try {
          const blob = await fetch(value).then(res => res.blob());
          console.log('[serializeCampaignData] Converted data URI to blob with type:', blob.type);
          const blobUrl = URL.createObjectURL(blob);
          allPendingAssets[blobUrl] = blob; // Add the new blob to our asset map
          currentObj[key] = blobUrl; // Replace the data: URI with a blob: URI
        } catch (error) {
          console.error(`[serializeCampaignData] Failed to convert data URI to blob for key "${key}":`, error);
          // Decide if you want to throw or just log the error
        }
      } else {
        await convertDataUris(value); // Recurse
      }
    });
    await Promise.all(promises);
  };

  await convertDataUris(cleanState);
  console.log('[serializeCampaignData] Step 1a COMPLETE.');

  // --- Step 2: Find all `blob:` URIs that need to be uploaded ---
  const uploadPromises = [];
  const assetsToUpload = []; // Will store { obj, key, url }

  const findAssets = (currentObj) => {
    if (!currentObj || typeof currentObj !== 'object') return;
    if (Array.isArray(currentObj)) {
      currentObj.forEach(findAssets);
      return;
    }
    for (const key in currentObj) {
      if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
        const value = currentObj[key];
        if (typeof value === 'string' && value.startsWith('blob:')) {
          assetsToUpload.push({ obj: currentObj, key, url: value });
        } else {
          findAssets(value);
        }
      }
    }
  };

  findAssets(cleanState);
  console.log(`[serializeCampaignData] Found ${assetsToUpload.length} assets to upload.`);

  // --- Step 3: Upload all unique blob URLs ---
  const uniqueUrlsToUpload = new Map();
  for (const asset of assetsToUpload) {
    // Only upload if the blob actually exists in our map.
    // This prevents trying to re-upload an already-persisted asset
    // whose blob data is not in pendingAssets.
    if (allPendingAssets[asset.url]) {
      if (!uniqueUrlsToUpload.has(asset.url)) {
        uniqueUrlsToUpload.set(asset.url, {
          blob: allPendingAssets[asset.url],
          targets: [],
        });
      }
      uniqueUrlsToUpload.get(asset.url).targets.push({ obj: asset.obj, key: asset.key });
    }
  }

  onProgress({ current: 0, total: uniqueUrlsToUpload.size });

  let assetsUploadedCount = 0;
  for (const [tempUrl, { blob, targets }] of uniqueUrlsToUpload.entries()) {
    if (blob) {
      const targetWithId = targets.find(t => t.obj.id);
      const fileExtension = blob.type.split('/')[1] || 'bin';
      const randomSuffix = Math.random().toString(36).substring(2, 9);
      const filename = targetWithId
        ? `${targetWithId.obj.id}.${fileExtension}`
        : `asset_${Date.now()}_${randomSuffix}.${fileExtension}`;

      const promise = uploadAsset(blob, filename, campaignId, userId)
        .then(permanentUrl => {
          targets.forEach(target => {
            target.obj[target.key] = permanentUrl;
          });
          assetsUploadedCount++;
          onProgress({ current: assetsUploadedCount, total: uniqueUrlsToUpload.size });
        })
        .catch(error => {
          console.error(`Failed to upload asset from ${tempUrl}`, error);
          toast.error(`Upload failed for asset ${filename}: ${error.message}`);
          throw error;
        });
      uploadPromises.push(promise);
    }
  }

  await Promise.all(uploadPromises);

  console.log('[serializeCampaignData] All uploads and serialization complete.');
  return cleanState;
};


export const deserializeCampaignData = async (loadedState) => {
  console.log('[deserializeCampaignData] Starting deserialization and asset download...');
  const state = JSON.parse(JSON.stringify(loadedState)); // Deep copy
  const newlyCreatedAssets = {};
  const downloadPromises = [];
  const uniqueUrlsToDownload = new Map();

  const isVercelUrl = (url) => typeof url === 'string' && url.includes('blob.vercel-storage.com');

  // 1. Recursively find all Vercel URLs to download.
  const findUrls = (currentObj) => {
    if (!currentObj || typeof currentObj !== 'object') {
      return;
    }

    if (Array.isArray(currentObj)) {
      currentObj.forEach(findUrls);
      return;
    }

    for (const key in currentObj) {
      if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
        const value = currentObj[key];
        if (isVercelUrl(value)) {
          // Found a Vercel URL, store it for download.
          if (!uniqueUrlsToDownload.has(value)) {
            uniqueUrlsToDownload.set(value, { targets: [] });
          }
          uniqueUrlsToDownload.get(value).targets.push({ obj: currentObj, key });
        } else {
          // Recurse into nested objects/arrays.
          findUrls(value);
        }
      }
    }
  };

  findUrls(state);

  // 2. Create download promises for all unique URLs.
  for (const [downloadUrl, { targets }] of uniqueUrlsToDownload.entries()) {
    const promise = fetch(downloadUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} fetching ${downloadUrl}`);
        }
        return response.blob();
      })
      .then(blob => {
        const tempUrl = URL.createObjectURL(blob);
        newlyCreatedAssets[tempUrl] = blob;
        // Update all occurrences of this URL with the new local blob URL.
        targets.forEach(target => {
          target.obj[target.key] = tempUrl;
        });
      })
      .catch(error => {
        console.error(`[deserializeCampaignData] Failed to download or process asset: ${downloadUrl}`, error);
        toast.error(`Não foi possível carregar o recurso: ${error.message}`);
      });
    downloadPromises.push(promise);
  }

  // 3. Wait for all downloads to complete.
  await Promise.all(downloadPromises);

  console.log(`[deserializeCampaignData] Deserialization complete. ${Object.keys(newlyCreatedAssets).length} assets downloaded and converted.`);
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
