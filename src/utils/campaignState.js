import pako from 'pako';

const CURRENT_STATE_VERSION = "3.0";

/**
 * Serializes, compresses, and triggers the download of the application state.
 * @param {object} state - The application state to save.
 */
export const saveCampaignState = async (state) => {
  // Helper to convert Blob to Base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Create a serializable version of the state
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

  // Handle brand elements
  const serializableBrandElements = await Promise.all(
    (state.brandElements || []).map(async (el) => {
      if (el.url && el.url.startsWith('blob:')) {
        try {
          const response = await fetch(el.url);
          const blob = await response.blob();
          const urlBase64 = await blobToBase64(blob);
          return { ...el, url: undefined, urlBase64 };
        } catch (error) {
          console.error(`Could not fetch and serialize brand element blob for element ID ${el.id}:`, error);
          return { ...el, url: undefined };
        }
      }
      return el;
    })
  );

  // Handle the main background image
  let backgroundImageBase64 = null;
  if (state.backgroundImageUrl && state.backgroundImageUrl.startsWith('blob:')) {
    try {
      const response = await fetch(state.backgroundImageUrl);
      const blob = await response.blob();
      backgroundImageBase64 = await blobToBase64(blob);
    } catch (error) {
      console.error("Could not fetch and serialize background image:", error);
      backgroundImageBase64 = state.backgroundImageUrl; // Keep original if fetch fails
    }
  } else {
      backgroundImageBase64 = state.backgroundImageUrl; // It might be a data URL or other already serialized format
  }


  // Handle the AI-generated image
  let generatedImageBase64 = null;
  if (state.generatedImageUrl && state.generatedImageUrl.startsWith('blob:')) {
      try {
          const response = await fetch(state.generatedImageUrl);
          const blob = await response.blob();
          generatedImageBase64 = await blobToBase64(blob);
      } catch (error) {
          console.error("Could not fetch and serialize AI-generated image:", error);
          generatedImageBase64 = state.generatedImageUrl;
      }
  } else {
      generatedImageBase64 = state.generatedImageUrl;
  }

  const stateToSave = {
    version: CURRENT_STATE_VERSION,
    ...state,
    // Replace original data with serializable versions
    generatedImagesData: serializableGeneratedImages,
    generatedAudioData: serializableGeneratedAudio,
    generatedVideosData: serializableGeneratedVideos,
    brandElements: serializableBrandElements,
    backgroundImageUrl: undefined, // Remove the original URL
    backgroundImageBase64: backgroundImageBase64, // Add the base64 version
    generatedImageUrl: undefined, // Remove the original URL
    generatedImageBase64: generatedImageBase64, // Add the base64 version
  };

  // Remove non-serializable parts from the top-level state object before stringifying
  delete stateToSave.isSaving;
  delete stateToSave.isLoading;

  const jsonString = JSON.stringify(stateToSave, null, 2);
  const compressedData = pako.gzip(jsonString);
  const blob = new Blob([compressedData], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeTitle = state.campaignContent?.titulo?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'sem-titulo';
  link.download = `${safeTitle}.midiator`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Reads a .midiator file, decompresses, and parses it into a state object.
 * @param {File} file - The file to load.
 * @returns {Promise<object>} A promise that resolves to the loaded state object.
 */
export const loadCampaignState = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const compressedData = new Uint8Array(e.target.result);
        const decompressedData = pako.ungzip(compressedData, { to: 'string' });
        const loadedState = JSON.parse(decompressedData);

        // Verify version and essential fields
        if (loadedState.version !== CURRENT_STATE_VERSION) {
          reject(new Error(`Versão do arquivo incompatível. Esperado: ${CURRENT_STATE_VERSION}, Encontrado: ${loadedState.version || 'N/A'}.`));
          return;
        }
        if (!loadedState.fieldPositions || !loadedState.fieldStyles || !loadedState.csvHeaders) {
            reject(new Error("Arquivo de estado inválido. Faltam campos essenciais (posições, estilos ou cabeçalhos)."));
            return;
        }

        // Helper to convert Base64 back to Blob
        const base64ToBlob = async (base64) => {
            if (!base64) return null;
            // Handle both data URLs and raw base64 strings
            const fetchString = base64.startsWith('data:') ? base64 : `data:application/octet-stream;base64,${base64}`;
            const res = await fetch(fetchString);
            return res.blob();
        };

        // Restore the main background image
        if (loadedState.backgroundImageBase64) {
          const blob = await base64ToBlob(loadedState.backgroundImageBase64);
          if (blob) {
            loadedState.backgroundImageUrl = URL.createObjectURL(blob);
          }
        }

        // Restore the AI-generated image
        if (loadedState.generatedImageBase64) {
            const blob = await base64ToBlob(loadedState.generatedImageBase64);
            if (blob) {
                loadedState.generatedImageUrl = URL.createObjectURL(blob);
            }
        }

        // Restore blobs from base64 strings
        if (loadedState.generatedImagesData) {
            loadedState.generatedImagesData = await Promise.all(
                (loadedState.generatedImagesData || []).map(async (imgData) => {
                    const blob = await base64ToBlob(imgData.imageBase64);
                    return { ...imgData, blob, url: blob ? URL.createObjectURL(blob) : null, imageBase64: undefined };
                })
            );
        }

        if(loadedState.generatedAudioData) {
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

        // Restore brand elements
        if (loadedState.brandElements) {
            loadedState.brandElements = await Promise.all(
                (loadedState.brandElements || []).map(async (el) => {
                    if (el.urlBase64) {
                        try {
                            const blob = await base64ToBlob(el.urlBase64);
                            if (blob) {
                                const blobUrl = URL.createObjectURL(blob);
                                return { ...el, url: blobUrl, urlBase64: undefined };
                            }
                        } catch (error) {
                            console.error(`Could not deserialize brand element ID ${el.id}:`, error);
                            // Return element without URL if deserialization fails
                            return { ...el, url: undefined, urlBase64: undefined };
                        }
                    }
                    return el;
                })
            );
        }

        resolve(loadedState);

      } catch (error) {
        console.error("Erro ao carregar o arquivo de estado:", error);
        reject(new Error("Não foi possível ler o arquivo. Pode estar corrompido ou em um formato inválido."));
      }
    };

    reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(new Error("Falha ao ler o arquivo."));
    };

    reader.readAsArrayBuffer(file);
  });
};
