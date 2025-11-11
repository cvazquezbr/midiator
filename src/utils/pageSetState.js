
import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';
import { traverseState } from './stateTraversal';

// --- Utility Functions ---

const uploadPageSetAsset = async (blob, filename, pageSetId) => {
  if (!blob) throw new Error(`Asset "${filename}" is not a valid Blob.`);
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

  if (uniqueUrlsToUpload.size === 0) {
    return workingState; // No assets to upload
  }

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
  if (!loadedState) return { finalState: { pages: [], aspectRatio: '1:1' }, newlyCreatedAssets: {} };

  const finalState = JSON.parse(JSON.stringify(loadedState));
  const newlyCreatedAssets = {};
  const isVercelUrl = (url) => typeof url === 'string' && url.includes('blob.vercel-storage.com');
  const uniqueUrlsToDownload = new Map();

  traverseState(finalState, (key, value) => {
    if (isVercelUrl(value) && !uniqueUrlsToDownload.has(value)) {
      uniqueUrlsToDownload.set(value, null);
    }
  });

  if (uniqueUrlsToDownload.size === 0) {
    return { finalState, newlyCreatedAssets };
  }

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
    const response = await fetchWithAuth('/api/page-sets');
    if (!response.ok) {
      throw new Error(`Failed to fetch page sets: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch page sets:", error);
    toast.error("Não foi possível carregar os conjuntos de páginas.");
    return [];
  }
};

export const loadPageSet = async (id) => {
  if (!id) throw new Error("Cannot load a PageSet without an ID.");
  const response = await fetchWithAuth(`/api/page-sets/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load PageSet: ${response.status}`);
  }
  const pageSet = await response.json();
  const { finalState, newlyCreatedAssets } = await deserializePageSetData(pageSet.page_set_data);
  return { ...pageSet, page_set_data: finalState, pendingAssets: newlyCreatedAssets };
};

export const savePageSet = async (name, pageSetData, pendingAssets) => {
  // A temporary ID for asset path generation before we have the real one.
  const tempId = `temp_${Date.now()}`;
  const serializedState = await serializePageSetData(pageSetData, pendingAssets, tempId);

  // Now, create the PageSet in one go.
  const response = await fetchWithAuth('/api/page-sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, page_set_data: serializedState }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to save PageSet: ${response.status} ${errorBody}`);
  }
  const savedPageSet = await response.json();

  // Deserialize the saved data to get local blob URLs for immediate UI use.
  const { finalState } = await deserializePageSetData(savedPageSet.page_set_data);
  // Return the flattened, deserialized pageSet object.
  // The component is responsible for managing its own pending assets state.
  return { ...savedPageSet, page_set_data: finalState };
};

export const updatePageSet = async (id, name, pageSetData, pendingAssets) => {
  const serializedState = await serializePageSetData(pageSetData, pendingAssets, id);

  const response = await fetchWithAuth(`/api/page-sets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, page_set_data: serializedState }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update PageSet: ${response.status} ${errorBody}`);
  }
  const updatedPageSet = await response.json();

  // Re-deserialize for immediate use in the frontend and return the flat object.
  const { finalState } = await deserializePageSetData(updatedPageSet.page_set_data);
  return { ...updatedPageSet, page_set_data: finalState };
};

export const deletePageSet = async (id) => {
  return fetchWithAuth(`/api/page-sets/${id}`, { method: 'DELETE' });
};
