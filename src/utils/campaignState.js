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
      handleUploadUrl: '/api/upload-client.js',
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

      // ADDED: Special handling for audio objects from AudioGenerator.jsx
      if (owner.source && (owner.source === 'google-tts' || owner.source === 'browser') && key === 'url') {
        owner.url = permanentUrl;
        owner.vercelBlobUrl = permanentUrl; // Keep a consistent vercel-specific property
        owner.vercelBlobPathname = vercelBlobResponse.pathname;
        owner.mimeType = vercelBlobResponse.contentType;
        owner.size = vercelBlobResponse.size;

        // The original `blob` property is now invalid and points to a local blob that
        // won't exist on reload. It must be removed to prevent confusion.
        delete owner.blob;
      }
    }
  });
  console.log('[serializeCampaignData] Step 4 COMPLETE.');

  // --- Step 5: Clean up stale audio blobs ---
  // After URLs are replaced, the local audioBlob is no longer valid for the next session.
  if (workingState.csvData && Array.isArray(workingState.csvData)) {
    workingState.csvData.forEach(record => {
      // If the audioUrl was uploaded and replaced, it will no longer start with 'blob:'.
      // In this case, we must delete the stale local blob reference.
      if (record && record.audioUrl && !record.audioUrl.startsWith('blob:')) {
        delete record.audioBlob;
      }
    });
  }
  console.log('[serializeCampaignData] Step 5: Stale audio blobs cleaned up.');


  console.log('[serializeCampaignData] All uploads and serialization complete.');
  return workingState;
};


/**
 * Refactored deserialization function.
 * Traverses the loaded campaign state, finds permanent Vercel Storage URLs,
 * downloads the assets, and replaces the permanent URLs with local, temporary
 * blob: URLs. This "hydrates" the state for use in the UI.
 */
export const deserializeCampaignData = async (loadedState, onHydrationProgress) => {
  // `onHydrationProgress` is an optional callback. If provided, it will be called
  // with the newly created local assets. This allows the calling component (`Publisher.jsx`)
  // to update its state without creating a `useEffect` dependency loop.
  console.log('[deserializeCampaignData] Starting refactored deserialization and asset download...');
  const finalState = JSON.parse(JSON.stringify(loadedState)); // Deep copy to modify
  const newlyCreatedAssets = {}; // This will become the new `pendingAssets` map in the UI

  // --- Data Sanitization ---
  // Replace null/undefined entries in critical arrays to preserve indexing.
  if (finalState.csvData && Array.isArray(finalState.csvData)) {
    finalState.csvData = finalState.csvData.map(record => record || {});
  }
  if (finalState.generatedPagesData && Array.isArray(finalState.generatedPagesData)) {
    const sanitizedCsvData = finalState.csvData || [];

    // Defensive header generation: If headers are missing, derive them from the data.
    let headers = finalState.csvHeaders || [];
    if (headers.length === 0 && sanitizedCsvData.length > 0) {
      // Create a set of all possible keys from all records.
      const allKeys = sanitizedCsvData.reduce((keys, record) => {
        if (record) {
          Object.keys(record).forEach(key => keys.add(key));
        }
        return keys;
      }, new Set());
      headers = Array.from(allKeys);
      // Persist the derived headers back into the state.
      finalState.csvHeaders = headers;
    }

    const defaultRecord = headers.reduce((acc, header) => {
      acc[header] = '';
      return acc;
    }, {});

    finalState.generatedPagesData = finalState.generatedPagesData.map((page, index) => {
      const baseRecord = sanitizedCsvData[index] || { ...defaultRecord };

      if (!page) {
        return {
          index: index,
          record: baseRecord,
          url: null,
          blob: null,
          filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        };
      }

      if (!page.record) {
        page.record = baseRecord;
      } else {
        // Ensure all header fields exist on the record to prevent crashes.
        headers.forEach(header => {
          if (!(header in page.record)) {
            page.record[header] = '';
          }
        });
      }

      page.index = index;
      return page;
    });
  }
  if (finalState.followupPosts && Array.isArray(finalState.followupPosts)) {
    finalState.followupPosts = finalState.followupPosts.map(post => post || {});
  }

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
    const promise = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`[deserializeCampaignData] Timeout fetching asset: ${downloadUrl}`);
        toast.error(`O carregamento do recurso demorou demais e foi cancelado: ${downloadUrl}`);
      }, 25000); // Increased timeout to 25 seconds

      try {
        // First, try a direct CORS request, which is faster and more reliable if allowed.
        const response = await fetch(downloadUrl, {
          signal: controller.signal,
          mode: 'cors',
        });

        if (!response.ok) {
          throw new Error(`Direct fetch failed with HTTP error ${response.status}.`);
        }
        const blob = await response.blob();
        const filename = downloadUrl.split('/').pop().split('?')[0] || `downloaded_asset_${Date.now()}`;
        const file = new File([blob], filename, { type: blob.type });
        const tempUrl = URL.createObjectURL(file);
        newlyCreatedAssets[tempUrl] = file;
        permanentToTempUrlMap.set(downloadUrl, tempUrl);
      } catch (error) {
        // Non-critical error: log it, toast it, but don't stop other downloads.
        console.error(`[deserializeCampaignData] Failed to download asset: ${downloadUrl}`, error);
        if (error.name !== 'AbortError') { // AbortError already has a toast
          toast.error(`Não foi possível carregar um recurso: ${error.message}`);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    })();
    downloadPromises.push(promise);
  }

  // Promise.all ensures we wait for all fetches, even the failed ones, to complete.
  await Promise.all(downloadPromises);
  console.log('[deserializeCampaignData] Step 2 COMPLETE.');

  // --- Step 3: Replace all permanent URLs with their new temporary blob: URLs ---
  console.log('[deserializeCampaignData] Step 3: Replacing permanent URLs with local blob URLs...');
  traverseState(finalState, (key, value, owner) => {
    if (typeof value === 'string' && permanentToTempUrlMap.has(value)) {
      const tempUrl = permanentToTempUrlMap.get(value);

      // Generic replacement for simple URL fields
      owner[key] = tempUrl;

      // Special handling for audio objects to ensure the `blob` property is restored
      // for the `getPlayableBlob` utility to find it.
      if (owner.source && (owner.source === 'google-tts' || owner.source === 'browser') && key === 'url') {
        owner.url = tempUrl;
        // The `getPlayableBlob` function needs the `blob` property to be present on the object
        // after deserialization. We can get it from the `newlyCreatedAssets` map we just populated.
        const downloadedFile = newlyCreatedAssets[tempUrl];
        if (downloadedFile) {
          owner.blob = downloadedFile;
        }
      }
    }
  });
  console.log('[deserializeCampaignData] Step 3 COMPLETE.');

  console.log(`[deserializeCampaignData] Deserialization complete. ${Object.keys(newlyCreatedAssets).length} assets downloaded.`);

  // If a callback was provided, call it with the map of newly downloaded assets.
  // This is the key to breaking the useEffect dependency loop in Publisher.jsx.
  if (onHydrationProgress) {
    onHydrationProgress(newlyCreatedAssets);
  }

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
