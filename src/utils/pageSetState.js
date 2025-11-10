
import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';
import { traverseState } from './stateTraversal';

// --- Utility Functions (Adapted from campaignState.js) ---

const uploadPageSetAsset = async (blob, filename, pageSetId) => {
  if (!blob) throw new Error(`Asset "${filename}" is not a valid Blob.`);

  // Differentiate PageSet assets by storing them in a 'pageset/' prefixed folder.
  const fullPath = `pageset/${pageSetId}/${filename}`;

  try {
    const newBlob = await upload(fullPath, blob, {
      access: 'public',
      handleUploadUrl: '/api/upload-client.js',
    });
    return newBlob;
  } catch (error) {
    console.error(`[uploadPageSetAsset] Error during client-side upload for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}: ${error.message}`);
  }
};

export const serializePageSetData = async (state, pendingAssets, pageSetId, onProgress = () => {}) => {
  const workingState = JSON.parse(JSON.stringify(state));
  const uniqueUrlsToUpload = new Map();

  traverseState(workingState, (key, value) => {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      if (pendingAssets[value] && !uniqueUrlsToUpload.has(value)) {
        uniqueUrlsToUpload.set(value, { blob: pendingAssets[value] });
      }
    }
  });

  onProgress({ current: 0, total: uniqueUrlsToUpload.size });
  const tempToPermanentUrlMap = new Map();
  const uploadPromises = [];
  let assetsUploadedCount = 0;

  for (const [tempUrl, { blob }] of uniqueUrlsToUpload.entries()) {
    const fileExtension = blob.type.split('/')[1] || 'bin';
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const filename = `asset_${Date.now()}_${randomSuffix}.${fileExtension}`;

    const promise = uploadPageSetAsset(blob, filename, pageSetId)
      .then(response => {
        tempToPermanentUrlMap.set(tempUrl, response.url);
        assetsUploadedCount++;
        onProgress({ current: assetsUploadedCount, total: uniqueUrlsToUpload.size });
      })
      .catch(error => {
        toast.error(`Upload failed for ${filename}: ${error.message}`);
        throw error;
      });
    uploadPromises.push(promise);
  }

  await Promise.all(uploadPromises);

  traverseState(workingState, (key, value, owner) => {
    if (typeof value === 'string' && tempToPermanentUrlMap.has(value)) {
      owner[key] = tempToPermanentUrlMap.get(value);
    }
  });

  return workingState;
};

export const deserializePageSetData = async (loadedState) => {
  const finalState = JSON.parse(JSON.stringify(loadedState));
  const newlyCreatedAssets = {};
  const isVercelUrl = (url) => typeof url === 'string' && url.includes('blob.vercel-storage.com');
  const uniqueUrlsToDownload = new Map();

  traverseState(finalState, (key, value) => {
    if (isVercelUrl(value) && !uniqueUrlsToDownload.has(value)) {
      uniqueUrlsToDownload.set(value, null);
    }
  });

  const downloadPromises = [];
  const permanentToTempUrlMap = new Map();

  for (const downloadUrl of uniqueUrlsToDownload.keys()) {
    const promise = fetch(downloadUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to download asset: ${res.statusText}`);
        return res.blob();
      })
      .then(blob => {
        const tempUrl = URL.createObjectURL(blob);
        newlyCreatedAssets[tempUrl] = blob;
        permanentToTempUrlMap.set(downloadUrl, tempUrl);
      })
      .catch(error => {
        console.error(`[deserializePageSetData] Failed to download asset: ${downloadUrl}`, error);
        toast.error(`Não foi possível carregar um recurso do PageSet: ${error.message}`);
      });
    downloadPromises.push(promise);
  }

  await Promise.all(downloadPromises);

  traverseState(finalState, (key, value, owner) => {
    if (typeof value === 'string' && permanentToTempUrlMap.has(value)) {
      owner[key] = permanentToTempUrlMap.get(value);
    }
  });

  return { finalState, newlyCreatedAssets };
};


// --- API Functions ---

export const getPageSets = async () => {
    try {
        // fetchWithAuth returns the parsed JSON data directly on success.
        const data = await fetchWithAuth('/api/page-sets');
        // Ensure we always return an array. If data is null or not an array, return [].
        return Array.isArray(data) ? data : [];
    } catch (error) {
        // In case of a network error or if fetchWithAuth throws an exception,
        // log the error and return an empty array to prevent UI crashes.
        console.error("Failed to fetch page sets:", error);
        toast.error("Não foi possível carregar os conjuntos de páginas.");
        return [];
    }
};

export const loadPageSet = async (id) => {
    const pageSet = await fetchWithAuth(`/api/page-sets?id=${id}`, { method: 'PATCH' });
    if (pageSet.page_set_data) {
        const { finalState, newlyCreatedAssets } = await deserializePageSetData(pageSet.page_set_data);
        pageSet.page_set_data = finalState;
        pageSet.pendingAssets = newlyCreatedAssets;
    } else {
        pageSet.pendingAssets = {};
    }
    return pageSet;
};

export const savePageSet = async (name, pageSetData, pendingAssets) => {
    // First, save the PageSet to get an ID
    const initialSave = await fetchWithAuth('/api/page-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, page_set_data: {} }), // Save with empty data first
    });

    if (!initialSave) throw new Error('Failed to create initial PageSet entry.');

    const pageSetId = initialSave.id;

    // Now, serialize and upload assets using the new ID
    const serializedState = await serializePageSetData(pageSetData, pendingAssets, pageSetId);

    // Finally, update the PageSet with the data containing permanent asset URLs
    const updatedPageSet = await updatePageSet(pageSetId, name, serializedState, {});

    // Re-deserialize to return a usable state to the frontend
    return await loadPageSet(pageSetId);
};

export const updatePageSet = async (id, name, pageSetData, pendingAssets) => {
    const serializedState = await serializePageSetData(pageSetData, pendingAssets, id);

    const pageSet = await fetchWithAuth('/api/page-sets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, page_set_data: serializedState }),
    });

    // Re-deserialize for immediate use in the frontend
    return await loadPageSet(id);
};

export const deletePageSet = async (id) => {
    return fetchWithAuth(`/api/page-sets?id=${id}`, { method: 'DELETE' });
};
