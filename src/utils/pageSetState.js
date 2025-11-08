import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import fetchWithAuth from './fetchWithAuth';
import { traverseState } from './stateTraversal';

/**
 * Uploads a single Blob for a PageSet.
 * @param {Blob} blob The file blob to upload.
 * @param {string} filename The desired filename for the asset.
 * @param {string} pageSetId The ID of the page set for pathing.
 * @returns {Promise<object>} The Vercel Blob object of the uploaded asset.
 */
export const uploadPageSetAsset = async (blob, filename, pageSetId) => {
  if (!blob) throw new Error(`Asset "${filename}" is not a valid Blob.`);
  if (!pageSetId) throw new Error('A PageSet ID is required to upload assets.');

  const fullPath = `pageset/${pageSetId}/${filename}`;

  try {
    const newBlob = await upload(fullPath, blob, {
      access: 'public',
      handleUploadUrl: '/api/upload-client.js',
    });
    return newBlob;
  } catch (error) {
    console.error(`[uploadPageSetAsset] A critical error occurred for ${filename}:`, error);
    throw new Error(`Failed to upload ${filename}: ${error.message}`);
  }
};

/**
 * Serializes PageSet data, uploading temporary assets to Vercel Blob Storage.
 */
export const serializePageSetData = async (state, pendingAssets, pageSetId, onProgress = () => {}) => {
  const workingState = JSON.parse(JSON.stringify(state));
  const allPendingAssets = { ...pendingAssets };

  const uniqueUrlsToUpload = new Map();
  traverseState(workingState, (key, value) => {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      if (allPendingAssets[value] && !uniqueUrlsToUpload.has(value)) {
        uniqueUrlsToUpload.set(value, { blob: allPendingAssets[value] });
      }
    }
  });

  if (uniqueUrlsToUpload.size === 0) return workingState;

  onProgress({ current: 0, total: uniqueUrlsToUpload.size });
  const tempToVercelResponseMap = new Map();
  const uploadPromises = [];
  let assetsUploadedCount = 0;

  for (const [tempUrl, { blob }] of uniqueUrlsToUpload.entries()) {
    const fileExtension = blob.type.split('/')[1] || 'bin';
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const filename = `asset_${Date.now()}_${randomSuffix}.${fileExtension}`;

    const promise = uploadPageSetAsset(blob, filename, pageSetId)
      .then(vercelBlobResponse => {
        tempToVercelResponseMap.set(tempUrl, vercelBlobResponse);
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
    if (typeof value === 'string' && tempToVercelResponseMap.has(value)) {
      owner[key] = tempToVercelResponseMap.get(value).url;
    }
  });

  return workingState;
};

/**
 * Deserializes PageSet data, downloading assets from Vercel to create local blobs.
 */
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

  if (uniqueUrlsToDownload.size === 0) return { finalState, newlyCreatedAssets };

  const downloadPromises = [];
  const permanentToTempUrlMap = new Map();

  for (const downloadUrl of uniqueUrlsToDownload.keys()) {
    const promise = (async () => {
      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const blob = await response.blob();
        const filename = downloadUrl.split('/').pop().split('?')[0] || `downloaded_asset_${Date.now()}`;
        const file = new File([blob], filename, { type: blob.type });
        const tempUrl = URL.createObjectURL(file);
        newlyCreatedAssets[tempUrl] = file;
        permanentToTempUrlMap.set(downloadUrl, tempUrl);
      } catch (error) {
        toast.error(`Não foi possível carregar um recurso: ${error.message}`);
      }
    })();
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
  const res = await fetchWithAuth('/api/page-sets');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch page sets.');
  }
  return res.json();
};

export const loadPageSet = async (id) => {
  const res = await fetchWithAuth(`/api/page-sets/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load page set.');
  }
  const pageSet = await res.json();

  if (pageSet.page_set_data) {
    const { finalState, newlyCreatedAssets } = await deserializePageSetData(pageSet.page_set_data);
    pageSet.page_set_data = finalState;
    pageSet.pendingAssets = newlyCreatedAssets;
  } else {
    pageSet.pendingAssets = {};
  }

  return pageSet;
};

export const savePageSet = async (name, pageSetData, pendingAssets = {}) => {
  try {
    // Para salvar, precisamos primeiro de um ID para construir o caminho do asset.
    // Etapa 1: Criar a entrada do PageSet no banco de dados com dados provisórios (sem assets).
    const initialPayload = { ...pageSetData, pageTemplate: { ...pageSetData.pageTemplate, images: [] }}; // Remove images temporarily
    const initialRes = await fetchWithAuth('/api/page-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, page_set_data: initialPayload }),
    });
    if (!initialRes.ok) throw new Error('Failed to create initial page set entry.');
    const newPageSet = await initialRes.json();
    const pageSetId = newPageSet.id;

    // Etapa 2: Agora com um ID, serializar e fazer upload dos assets.
    const serializedState = await serializePageSetData(pageSetData, pendingAssets, pageSetId);

    // Etapa 3: Atualizar a entrada com os URLs permanentes dos assets.
    return await updatePageSet(pageSetId, name, serializedState);
  } catch (error) {
    toast.error(`Save failed: ${error.message}`);
    throw error;
  }
};

export const updatePageSet = async (id, name, pageSetData, pendingAssets = {}) => {
  try {
    const serializedState = await serializePageSetData(pageSetData, pendingAssets, id);

    const requestBody = JSON.stringify({ name, page_set_data: serializedState });

    const updateRes = await fetchWithAuth(`/api/page-sets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!updateRes.ok) {
      const errorBody = await updateRes.text();
      throw new Error(`Failed to update page set. Server says: ${errorBody}`);
    }

    // Pós-atualização, re-hidratar para ter os blobs locais mais recentes
    const updatedPageSet = await updateRes.json();
    if (updatedPageSet.page_set_data) {
        const { finalState, newlyCreatedAssets } = await deserializePageSetData(updatedPageSet.page_set_data);
        return {
            pageSet: { ...updatedPageSet, page_set_data: finalState },
            pendingAssets: newlyCreatedAssets
        };
    }
    return { pageSet: updatedPageSet, pendingAssets: {} };

  } catch (error) {
    toast.error(`Update failed: ${error.message}`);
    throw error;
  }
};

export const deletePageSet = async (id) => {
  const res = await fetchWithAuth(`/api/page-sets/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete page set.');
  }
  return res.json();
};
