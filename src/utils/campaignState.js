// This file now handles the logic for serializing, deserializing,
// and communicating with the campaign API endpoints.

// Helper to convert Blob to Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to convert Base64 back to Blob
const base64ToBlob = async (base64) => {
  if (!base64) return null;
  const fetchString = base64.startsWith('data:') ? base64 : `data:application/octet-stream;base64,${base64}`;
  try {
    const res = await fetch(fetchString);
    return res.blob();
  } catch (error) {
    console.error("Error converting base64 to blob:", error);
    return null;
  }
};

/**
 * Gathers and serializes the current application state for saving.
 * Blobs are converted to Base64 strings.
 * @param {object} state - The current application state from HomePage.
 * @returns {Promise<object>} A promise that resolves to a serializable object.
 */
export const serializeCampaignData = async (state) => {
  const serializableGeneratedImages = await Promise.all(
    (state.generatedImagesData || []).map(async (img) => {
      const imageBase64 = img.blob ? await blobToBase64(img.blob) : null;
      return { ...img, blob: undefined, url: undefined, imageBase64 };
    })
  );
  const serializableGeneratedAudio = await Promise.all(
    (state.generatedAudioData || []).map(async (audio) => {
      const audioBase64 = audio.blob ? await blobToBase64(audio.blob) : null;
      return { ...audio, blob: undefined, audioBase64 };
    })
  );
  const serializableGeneratedVideos = await Promise.all(
    (state.generatedVideosData || []).map(async (video) => {
      const videoBase64 = video.blob ? await blobToBase64(video.blob) : null;
      return { ...video, blob: undefined, url: undefined, videoBase64 };
    })
  );
  const serializableBrandElements = await Promise.all(
    (state.brandElements || []).map(async (el) => {
      if (el.url && el.url.startsWith('blob:')) {
        const response = await fetch(el.url);
        const blob = await response.blob();
        const urlBase64 = await blobToBase64(blob);
        return { ...el, url: undefined, urlBase64 };
      }
      return el;
    })
  );
  let backgroundImageBase64 = null;
  if (state.backgroundImageUrl && state.backgroundImageUrl.startsWith('blob:')) {
    const response = await fetch(state.backgroundImageUrl);
    const blob = await response.blob();
    backgroundImageBase64 = await blobToBase64(blob);
  } else {
    backgroundImageBase64 = state.backgroundImageUrl;
  }
  let generatedImageBase64 = null;
  if (state.generatedImageUrl && state.generatedImageUrl.startsWith('blob:')) {
    const response = await fetch(state.generatedImageUrl);
    const blob = await response.blob();
    generatedImageBase64 = await blobToBase64(blob);
  } else {
    generatedImageBase64 = state.generatedImageUrl;
  }

  const stateToSave = {
    ...state,
    generatedImagesData: serializableGeneratedImages,
    generatedAudioData: serializableGeneratedAudio,
    generatedVideosData: serializableGeneratedVideos,
    brandElements: serializableBrandElements,
    backgroundImageUrl: undefined,
    backgroundImageBase64: backgroundImageBase64,
    generatedImageUrl: undefined,
    generatedImageBase64: generatedImageBase64,
  };

  // Remove props that shouldn't be persisted
  delete stateToSave.isSaving;
  delete stateToSave.isLoading;
  delete stateToSave.user;

  return stateToSave;
};

/**
 * Takes a loaded campaign state and deserializes it for the application.
 * @param {object} loadedState - The state object loaded from the database.
 * @returns {Promise<object>} The deserialized state ready for the application.
 */
export const deserializeCampaignData = async (loadedState) => {
  if (loadedState.backgroundImageBase64) {
    const blob = await base64ToBlob(loadedState.backgroundImageBase64);
    if (blob) loadedState.backgroundImageUrl = URL.createObjectURL(blob);
  }
  if (loadedState.generatedImageBase64) {
    const blob = await base64ToBlob(loadedState.generatedImageBase64);
    if (blob) loadedState.generatedImageUrl = URL.createObjectURL(blob);
  }
  if (loadedState.generatedImagesData) {
    loadedState.generatedImagesData = await Promise.all(
      (loadedState.generatedImagesData || []).map(async (imgData) => {
        const blob = await base64ToBlob(imgData.imageBase64);
        return { ...imgData, blob, url: blob ? URL.createObjectURL(blob) : null, imageBase64: undefined };
      })
    );
  }
  if (loadedState.generatedAudioData) {
    loadedState.generatedAudioData = await Promise.all(
      (loadedState.generatedAudioData || []).map(async (audioData) => {
        const blob = await base64ToBlob(audioData.audioBase64);
        return { ...audioData, blob, audioBase64: undefined };
      })
    );
  }
  if (loadedState.generatedVideosData) {
    loadedState.generatedVideosData = await Promise.all(
      (loadedState.generatedVideosData || []).map(async (videoData) => {
        const blob = await base64ToBlob(videoData.videoBase64);
        return { ...videoData, blob, url: blob ? URL.createObjectURL(blob) : null, videoBase64: undefined };
      })
    );
  }
  if (loadedState.brandElements) {
    loadedState.brandElements = await Promise.all(
      (loadedState.brandElements || []).map(async (el) => {
        if (el.urlBase64) {
          const blob = await base64ToBlob(el.urlBase64);
          if (blob) return { ...el, url: URL.createObjectURL(blob), urlBase64: undefined };
        }
        return el;
      })
    );
  }
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update campaign.');
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
