import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';
import { traverseState } from './stateTraversal';

/**
 * Uploads a single Blob using the client-side upload method.
 * It first asks our server for a secure token, then uploads the file directly
 * to Vercel's Blob storage from the browser.
 * @param {Blob} blob The file blob to upload.
 * @param {string} filename The desired filename for the asset.
 * @param {string} campaignId The ID of the campaign for pathing.
 * @param {string} userId The ID of the user for pathing.
 * @returns {Promise<string>} The permanent URL of the uploaded asset.
 */
export const uploadAsset = async (blob, filename, campaignId, userId) => {
  console.log(`[uploadAsset] Preparing to upload: ${filename} via server-side handler.`);
  if (!blob) throw new Error(`Asset "${filename}" is not a valid Blob.`);

  // The userId is now read from the authenticated session on the server,
  // but we still construct the path here to pass as a query param.
  const fullPath = campaignId ? `${campaignId}/${filename}` : filename;

  try {
    const newBlob = await upload(fullPath, blob, {
      access: 'public',
      handleUploadUrl: '/api/upload-client',
      multipart: true,
    });

    console.log(`[uploadAsset] Successfully uploaded ${filename} via client-side method. Full response:`, newBlob);
    return newBlob;
  } catch (error) {
    console.error(`[uploadAsset] A critical error occurred during client-side upload for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}: ${error.message}`);
  }
};


/**
 * Refactored serialization function.
 * Traverses the campaign state, finds temporary asset URLs (blob: and data:),
 * uploads them to Vercel Blob Storage, and replaces the temporary URLs with
 * the permanent ones in a deep copy of the state.
 */
export const serializeCampaignData = async (state, pendingAssets, userId, campaignId = null, onProgress = () => {}) => {
  console.log('[serializeCampaignData] Starting refactored serialization and upload...');
  const workingState = JSON.parse(JSON.stringify(state)); // Deep copy to work on
  const allPendingAssets = { ...pendingAssets }; // Mutable copy of pending assets

  // --- Step 1: Convert all `data:` URIs to `blob:` URIs ---
  // This step ensures that assets represented as data URIs are also uploaded.
  console.log('[serializeCampaignData] Step 1: Converting data URIs to blobs...');
  const dataUriConversionPromises = [];
  const temporaryDataUriBlobs = []; // To track and revoke these specific blobs
  traverseState(workingState, (key, value, owner) => {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const conversionPromise = fetch(value)
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          allPendingAssets[blobUrl] = blob; // Add new blob to our asset map
          owner[key] = blobUrl; // Replace data: URI with blob: URI in the working state
          temporaryDataUriBlobs.push(blobUrl); // Track for cleanup
        })
        .catch(error => {
          console.error(`[serializeCampaignData] Failed to convert data URI to blob for key "${key}":`, error);
        });
      dataUriConversionPromises.push(conversionPromise);
    }
  });
  await Promise.all(dataUriConversionPromises);
  console.log('[serializeCampaignData] Step 1 COMPLETE.');

  // --- Step 2: Collect all unique `blob:` URLs to be uploaded ---
  console.log('[serializeCampaignData] Step 2: Collecting unique blob URLs...');
  const uniqueUrlsToUpload = new Map(); // Map<string, { blob: Blob }>
  traverseState(workingState, (key, value) => {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      if (allPendingAssets[value] && !uniqueUrlsToUpload.has(value)) {
        uniqueUrlsToUpload.set(value, { blob: allPendingAssets[value] });
      }
    }
  });
  console.log(`[serializeCampaignData] Found ${uniqueUrlsToUpload.size} unique assets to upload.`);

  // --- Step 3: Upload all unique assets and map temp URLs to Vercel's response ---
  console.log('[serializeCampaignData] Step 3: Uploading assets...');
  onProgress({ current: 0, total: uniqueUrlsToUpload.size });

  const tempToVercelResponseMap = new Map(); // Map<string, VercelBlob.BlobObject>
  const uploadPromises = [];
  let assetsUploadedCount = 0;

  for (const [tempUrl, { blob }] of uniqueUrlsToUpload.entries()) {
    const fileExtension = blob.type.split('/')[1] || 'bin';
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    // Add a more descriptive name if possible, fallback to random.
    const filename = `asset_${Date.now()}_${randomSuffix}.${fileExtension}`;

    const promise = uploadAsset(blob, filename, campaignId, userId)
      .then(vercelBlobResponse => {
        console.log(`[serializeCampaignData] Uploaded ${filename}. Temp URL: ${tempUrl}, Permanent URL: ${vercelBlobResponse.url}`);
        tempToVercelResponseMap.set(tempUrl, vercelBlobResponse); // Store the full response

        assetsUploadedCount++;
        onProgress({ current: assetsUploadedCount, total: uniqueUrlsToUpload.size });
      })
      .catch(error => {
        console.error(`Upload failed for asset from ${tempUrl}`, error);
        toast.error(`Upload failed for ${filename}: ${error.message}`);
        throw error; // Fail fast
      });
    uploadPromises.push(promise);
  }

  await Promise.all(uploadPromises);
  console.log('[serializeCampaignData] Step 3 COMPLETE.');

  // --- Clean up temporary blobs created from data URIs ---
  temporaryDataUriBlobs.forEach(url => {
    console.log(`[serializeCampaignData] Revoking temporary data-uri blob: ${url}`);
    URL.revokeObjectURL(url);
  });

  // --- Step 4: Replace all temporary `blob:` URLs with permanent URLs ---
  console.log('[serializeCampaignData] Step 4: Replacing temporary URLs with permanent ones...');
  traverseState(workingState, (key, value, owner) => {
    if (typeof value === 'string' && tempToVercelResponseMap.has(value)) {
      const vercelBlobResponse = tempToVercelResponseMap.get(value);
      const permanentUrl = vercelBlobResponse.url;

      // Generic replacement
      owner[key] = permanentUrl;

      // Special handling for video objects to update related properties.
      // This is necessary because the video object stores more metadata from Vercel.
      if (owner.type === 'video' && (key === 'url' || key === 'vercelBlobUrl')) {
        owner.url = permanentUrl;
        owner.vercelBlobUrl = permanentUrl;
        owner.vercelBlobId = vercelBlobResponse.pathname;
        owner.mimeType = vercelBlobResponse.contentType;
        owner.size = vercelBlobResponse.size;
      }
    }
  });
  console.log('[serializeCampaignData] Step 4 COMPLETE.');

  console.log('[serializeCampaignData] All uploads and serialization complete.');
  return workingState;
};


/**
 * Refactored deserialization function.
 * Traverses the loaded campaign state, finds permanent Vercel Storage URLs,
 * downloads the assets, and replaces the permanent URLs with local, temporary
 * blob: URLs. This "hydrates" the state for use in the UI.
 */
export const deserializeCampaignData = async (loadedState) => {
  console.log('[deserializeCampaignData] Starting refactored deserialization and asset download...');
  const finalState = JSON.parse(JSON.stringify(loadedState)); // Deep copy to modify
  const newlyCreatedAssets = {}; // This will become the new `pendingAssets` map in the UI

  const isVercelUrl = (url) => typeof url === 'string' && url.includes('blob.vercel-storage.com');

  // --- Step 1: Collect all unique Vercel URLs to download ---
  console.log('[deserializeCampaignData] Step 1: Collecting unique Vercel URLs...');
  const uniqueUrlsToDownload = new Map();
  traverseState(finalState, (key, value) => {
    if (isVercelUrl(value) && !uniqueUrlsToDownload.has(value)) {
      uniqueUrlsToDownload.set(value, null); // Value will be the downloaded blob later
    }
  });
  console.log(`[deserializeCampaignData] Found ${uniqueUrlsToDownload.size} unique assets to download.`);

  // --- Step 2: Download all unique assets and create local blobs ---
  console.log('[deserializeCampaignData] Step 2: Downloading assets...');
  const downloadPromises = [];
  const permanentToTempUrlMap = new Map();

  for (const downloadUrl of uniqueUrlsToDownload.keys()) {
    // Use the proxy for Vercel URLs to avoid CORS issues
    const fetchUrl = isVercelUrl(downloadUrl)
      ? `/api/asset-proxy?url=${encodeURIComponent(downloadUrl)}`
      : downloadUrl;

    const promise = fetch(fetchUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} fetching ${downloadUrl}`);
        }
        return response.blob();
      })
      .then(blob => {
        const filename = downloadUrl.split('/').pop().split('?')[0] || `downloaded_asset_${Date.now()}`;
        const file = new File([blob], filename, { type: blob.type });
        const tempUrl = URL.createObjectURL(file);

        newlyCreatedAssets[tempUrl] = file; // For the UI's pendingAssets state
        permanentToTempUrlMap.set(downloadUrl, tempUrl); // For replacement in the next step
      })
      .catch(error => {
        console.error(`[deserializeCampaignData] Failed to download asset: ${downloadUrl}`, error);
        toast.error(`Não foi possível carregar o recurso: ${error.message}`);
        // Don't throw, allow other assets to load
      });
    downloadPromises.push(promise);
  }

  await Promise.all(downloadPromises);
  console.log('[deserializeCampaignData] Step 2 COMPLETE.');

  // --- Step 3: Replace all permanent URLs with their new temporary blob: URLs ---
  console.log('[deserializeCampaignData] Step 3: Replacing permanent URLs with local blob URLs...');
  traverseState(finalState, (key, value, owner) => {
    if (typeof value === 'string' && permanentToTempUrlMap.has(value)) {
      owner[key] = permanentToTempUrlMap.get(value);
    }
  });
  console.log('[deserializeCampaignData] Step 3 COMPLETE.');

  console.log(`[deserializeCampaignData] Deserialization complete. ${Object.keys(newlyCreatedAssets).length} assets downloaded.`);
  return { finalState, newlyCreatedAssets };
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

export const saveCampaign = async (name, campaignData, pendingAssets, setProgress, userId, autorId, personaId, paletteId) => {
  console.log('[campaignState] Starting saveCampaign process...');
  try {
    // --- Step 1: Serialize and upload all pending assets ---
    console.log('[campaignState] Step 1: Serializing and uploading assets...');
    const serializedState = await serializeCampaignData(campaignData, pendingAssets, userId, null, setProgress);
    console.log('[campaignState] Step 1 COMPLETE.');

    // --- Step 2: Save the campaign data with permanent URLs to the database ---
    console.log('[campaignState] Step 2: Sending campaign data to server...');
    const requestBody = JSON.stringify({
      name,
      campaign_data: serializedState,
      autor_id: autorId,
      persona_id: personaId,
      palette_id: paletteId
    });
    const createRes = await fetchWithAuth('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });
    if (!createRes.ok) {
      const errorBody = await createRes.text();
      throw new Error(`Failed to create campaign entry. Server says: ${errorBody}`);
    }
    const savedCampaign = await createRes.json();
    console.log('[campaignState] Campaign created successfully:', savedCampaign);

    // --- Step 3: Post-save re-hydration ---
    // Immediately deserialize the just-saved data to get a fresh, playable state.
    // This ensures the UI can continue seamlessly without a manual reload.
    console.log('[campaignState] Step 3: Re-hydrating campaign state post-save...');
    if (savedCampaign.campaign_data) {
      const { finalState, newlyCreatedAssets } = await deserializeCampaignData(savedCampaign.campaign_data);
      console.log('[campaignState] Step 3 COMPLETE. State re-hydrated.');
      return {
        campaign: { ...savedCampaign, campaign_data: finalState },
        pendingAssets: newlyCreatedAssets,
      };
    }

    // Fallback if there was no data to re-hydrate
    return { campaign: savedCampaign, pendingAssets: {} };

  } catch (error) {
      console.error('[campaignState] An error occurred during the save process:', error);
      toast.error(`Save failed: ${error.message}`);
      throw error;
  }
};

export const updateCampaign = async (id, name, campaignData, pendingAssets, setProgress, userId, autorId, personaId, paletteId) => {
    console.log(`[campaignState] Starting updateCampaign process for ID: ${id}...`);
    try {
        // --- Step 1: Serialize and upload all pending assets ---
        console.log('[campaignState] Step 1: Serializing and uploading assets...');
        const serializedState = await serializeCampaignData(campaignData, pendingAssets, userId, id, setProgress);
        console.log('[campaignState] Step 1 COMPLETE.');

        // --- Step 2: Save the updated campaign data to the database ---
        console.log('[campaignState] Step 2: Sending updated campaign data to server...');
        const requestBody = JSON.stringify({
          name,
          campaign_data: serializedState,
          autor_id: autorId,
          persona_id: personaId,
          palette_id: paletteId
        });
        const updateRes = await fetchWithAuth(`/api/campaigns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
        });
        if (!updateRes.ok) {
            const errorBody = await updateRes.text();
            throw new Error(`Failed to update campaign. Server says: ${errorBody}`);
        }
        const updatedCampaign = await updateRes.json();
        console.log(`[campaignState] Campaign ${id} updated successfully:`, updatedCampaign);

        // --- Step 3: Post-update re-hydration ---
        console.log('[campaignState] Step 3: Re-hydrating campaign state post-update...');
        if (updatedCampaign.campaign_data) {
            const { finalState, newlyCreatedAssets } = await deserializeCampaignData(updatedCampaign.campaign_data);
            console.log('[campaignState] Step 3 COMPLETE. State re-hydrated.');
            return {
                campaign: { ...updatedCampaign, campaign_data: finalState },
                pendingAssets: newlyCreatedAssets,
            };
        }

        // Fallback if there was no data to re-hydrate
        return { campaign: updatedCampaign, pendingAssets: {} };

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
