// This file now handles the logic for serializing, deserializing,
// and communicating with the campaign API endpoints.

// Helper to upload a file (Blob, Data URL, or Blob URL) to Vercel Blob
const uploadFile = async (fileData, filenamePrefix = 'file') => {
  // If fileData is null, or already a Vercel Blob URL, do nothing.
  if (!fileData || (typeof fileData === 'string' && fileData.includes('.public.blob.vercel-storage.com'))) {
    return fileData;
  }

  let blob;
  // A more robust filename to avoid collisions.
  const filename = `${filenamePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  try {
    if (typeof fileData === 'string' && (fileData.startsWith('data:') || fileData.startsWith('blob:'))) {
      const response = await fetch(fileData);
      blob = await response.blob();
    } else if (fileData instanceof Blob) {
      blob = fileData;
    } else {
      // If the type is not supported for upload, return the original data.
      // This might be the case for non-file string data.
      return fileData;
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-vercel-filename': filename },
      body: blob,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Upload failed with no error body.' }));
      throw new Error(`Failed to upload file: ${errorBody.error}`);
    }

    const newBlob = await response.json();
    return newBlob.url;
  } catch (error) {
    console.error(`Error uploading file with prefix ${filenamePrefix}:`, error);
    // Re-throw the error so the calling function can handle it and show a toast.
    throw new Error(`Falha no upload do arquivo: ${error.message}. Verifique se um Blob Store está conectado ao projeto no Vercel.`);
  }
};


/**
 * Gathers and serializes the current application state for saving.
 * Local files (blobs, data URLs) are uploaded to Vercel Blob.
 * @param {object} state - The current application state from HomePage.
 * @returns {Promise<object>} A promise that resolves to a serializable object with public URLs.
 */
export const serializeCampaignData = async (state) => {
  // Process single image URLs
  const generatedImageUrl = await uploadFile(state.generatedImageUrl, 'campaign-image');
  const backgroundImage = await uploadFile(state.backgroundImage, 'background-image');

  // Process arrays of media data
  const generatedImagesData = await Promise.all(
    (state.generatedImagesData || []).map(async (img, index) => {
      const fileToUpload = img.url || (img.blob ? URL.createObjectURL(img.blob) : null);
      const newUrl = await uploadFile(fileToUpload, `gen-img-${index}`);
      return { ...img, url: newUrl, blob: undefined, imageBase64: undefined };
    })
  );

  const generatedAudioData = await Promise.all(
    (state.generatedAudioData || []).map(async (audio, index) => {
        const newUrl = await uploadFile(audio.blob, `gen-audio-${index}`);
        return { ...audio, url: newUrl, blob: undefined, audioBase64: undefined };
    })
  );

  const generatedVideosData = await Promise.all(
    (state.generatedVideosData || []).map(async (video, index) => {
      const fileToUpload = video.url || (video.blob ? URL.createObjectURL(video.blob) : null);
      const newUrl = await uploadFile(fileToUpload, `gen-video-${index}`);
      return { ...video, url: newUrl, blob: undefined, videoBase64: undefined };
    })
  );

  const brandElements = await Promise.all(
    (state.brandElements || []).map(async (el) => {
      const newUrl = await uploadFile(el.url, `brand-el-${el.id}`);
      return { ...el, url: newUrl, urlBase64: undefined };
    })
  );

  const stateToSave = {
    ...state,
    generatedImageUrl,
    backgroundImage,
    generatedImagesData,
    generatedAudioData,
    generatedVideosData,
    brandElements,
  };

  // Clean up properties that are no longer needed or should not be persisted
  delete stateToSave.backgroundImageBase64;
  delete stateToSave.generatedImageBase64;
  delete stateToSave.isSaving;
  delete stateToSave.isLoading;
  delete stateToSave.user;

  return stateToSave;
};

/**
 * Takes a loaded campaign state and prepares it for the application.
 * The new data format is much simpler, as URLs point directly to Vercel Blob.
 * @param {object} loadedState - The state object loaded from the database.
 * @returns {Promise<object>} The state ready for the application.
 */
export const deserializeCampaignData = async (loadedState) => {
  // No complex conversions are needed for the new data format.
  // The URLs in the loaded state are the public Vercel Blob URLs.
  // This function now mainly serves to ensure a clean state object and for any future transformations.
  return loadedState;
};

// --- API Functions ---

export const getCampaigns = async () => {
  const res = await fetch('/api/campaigns');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch campaigns.');
  }
  return res.json();
};

export const loadCampaign = async (id) => {
  const res = await fetch(`/api/campaigns/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load campaign.');
  }
  const campaign = await res.json();
  return deserializeCampaignData(campaign.campaign_data);
};

export const saveCampaign = async (name, campaignState) => {
  const serializableData = await serializeCampaignData(campaignState);
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: serializableData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save campaign.');
  }
  return res.json();
};

export const updateCampaign = async (id, name, campaignState) => {
  const serializableData = await serializeCampaignData(campaignState);
  const res = await fetch(`/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, campaign_data: serializableData }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Update campaign failed with status:", res.status, "and body:", errText);
    try {
        const err = JSON.parse(errText);
        throw new Error(err.error || 'Failed to update campaign.');
    } catch(e) {
        throw new Error(`Failed to update campaign. Server responded with: ${errText}`);
    }
  }
  return res.json();
};

export const deleteCampaign = async (id) => {
  const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete campaign.');
  }
  return res.json();
};
