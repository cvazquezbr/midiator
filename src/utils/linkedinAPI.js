class LinkedInAPI {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error("Access token is required to initialize LinkedInAPI.");
    }
    this.accessToken = accessToken;
  }

  async _proxyFetch(action, payload = {}) {
    const response = await fetch('/api/linkedin-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        accessToken: this.accessToken,
        ...payload
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
      let errorMessage = errorData.message || errorData.error || response.statusText;
      if (errorData.details) {
        errorMessage += ` | Details: ${errorData.details}`;
      }
      if (errorData.stack) {
        // For debugging, we can log the stack to the console
        console.error("LinkedIn Proxy Error Stack:", errorData.stack);
      }
      throw new Error(`LinkedIn Proxy Error for action '${action}': ${errorMessage}`);
    }

    return response.json();
  }

  async getAdministeredPages() {
    // This functionality is combined in the new 'getProfiles' proxy action.
    // This method is kept for potential future use if the proxy is split.
    const { organizations } = await this.getAllManagedProfiles();
    return organizations;
  }

  async getAllManagedProfiles(forceRefresh = false) {
    // The proxy now handles fetching both personal and organization profiles together.
    return this._proxyFetch('getProfiles', { forceRefresh });
  }

  async getPersonalProfile() {
    // This functionality is combined in the new 'getProfiles' proxy action.
    const { personal } = await this.getAllManagedProfiles();
    return personal;
  }

  async publishPost(content, targetId, targetType = 'person', images = [], video = null) {
    return this._proxyFetch('createPost', {
      payload: {
        content,
        targetId,
        targetType,
        images,
        video,
      }
    });
  }

  async registerUpload(authorUrn) {
    return this._proxyFetch('registerUpload', {
      payload: {
        "initializeUploadRequest": {
          "owner": authorUrn
        }
      }
    });
  }

  async uploadImage(uploadUrl, imageBlob) {
    const imageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    return this._proxyFetch('uploadImage', {
      uploadUrl,
      imageBase64,
      imageType: imageBlob.type,
    });
  }
}

// Wrapper function to handle caching, as requested.
export const getLinkedInProfiles = async (linkedinConfig, forceRefresh = false) => {
    const cacheKey = 'linkedin_profiles_cache_v2'; // v2 to invalidate old cache

    if (forceRefresh) {
        sessionStorage.removeItem(cacheKey);
        console.log('Forcing refresh of LinkedIn profiles, cache cleared.');
    } else {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const profiles = JSON.parse(cachedData);
                console.log('Returning cached LinkedIn profiles.');
                return profiles;
            } catch (e) {
                console.error('Failed to parse cached LinkedIn profiles, fetching again.', e);
                sessionStorage.removeItem(cacheKey);
            }
        }
    }

    console.log('Fetching fresh LinkedIn profiles from API.');
    if (!linkedinConfig || !linkedinConfig.accessToken) {
        throw new Error('LinkedIn configuration or Access Token not found. Please connect first.');
    }

    const api = new LinkedInAPI(linkedinConfig.accessToken);
    const profiles = await api.getAllManagedProfiles(forceRefresh);

    try {
        sessionStorage.setItem(cacheKey, JSON.stringify(profiles));
    } catch (e) {
        console.error('Failed to cache LinkedIn profiles.', e);
    }

    return profiles;
};

// The main publishing function that components will call.
// It abstracts away the class instantiation.
export const publishToLinkedIn = async (campaignData, linkedinConfig) => {
    if (!linkedinConfig || !linkedinConfig.accessToken) {
        throw new Error('LinkedIn configuration or Access Token not found.');
    }
    if (!campaignData || !campaignData.content || !campaignData.targetId) {
        throw new Error('Campaign data, content, and targetId are required for publishing.');
    }

    const { content, targetId, targetType, images, video } = campaignData;
    const api = new LinkedInAPI(linkedinConfig.accessToken);
    const result = await api.publishPost(content, targetId, targetType, images, video);

    console.log('Post created successfully on LinkedIn!', result);
    return result; // The proxy should return the final post object with an ID or link.
};

// Note: The complex video/image upload logic from the old file is being removed for now
// to align with the simplified structure from the user's report.
// The new proxy is expected to handle this complexity if needed.
// If media uploads are still a feature, the proxy and this client will need to be updated.
// For now, focusing on the core task: fixing profile listing and text publishing.

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const uploadVideoForLinkedIn = async (linkedinConfig, videoBlob, authorUrn, setStatus) => {
    if (!linkedinConfig || !linkedinConfig.accessToken) {
        throw new Error('LinkedIn configuration or Access Token not found.');
    }
    if (!videoBlob) {
        throw new Error('Video blob is required.');
    }

    const api = new LinkedInAPI(linkedinConfig.accessToken);

    // Step 1: Initialize Upload
    setStatus('Iniciando upload de vídeo...');
    const initializeResponse = await api._proxyFetch('initializeVideoUpload', {
        payload: { "initializeUploadRequest": { "owner": authorUrn, "fileSizeBytes": videoBlob.size } }
    });
    const { video: videoUrn, uploadInstructions, mediaArtifact } = initializeResponse;
    if (!videoUrn || !uploadInstructions || uploadInstructions.length === 0) {
        throw new Error('A resposta de inicialização do upload de vídeo é inválida.');
    }

    // Step 2: Upload Parts
    const etags = [];
    for (const instruction of uploadInstructions) {
        const { uploadUrl, firstByte, lastByte } = instruction;
        setStatus(`Fazendo upload da parte ${etags.length + 1}/${uploadInstructions.length} do vídeo...`);

        const videoPartBlob = videoBlob.slice(firstByte, lastByte + 1);

        // Use the new streaming proxy endpoint
        const proxyResponse = await fetch('/api/linkedin-video-upload', {
            method: 'POST', // POST to our proxy
            headers: {
                'Content-Type': videoBlob.type,
                'X-Upload-URL': encodeURIComponent(uploadUrl),
                // The withAuth middleware uses the Authorization header from the cookie, so we don't need to set it manually
            },
            body: videoPartBlob,
        });

        if (!proxyResponse.ok) {
            const errorData = await proxyResponse.json();
            throw new Error(`Falha no upload da parte do vídeo através do proxy: ${errorData.message || proxyResponse.statusText}`);
        }

        const { eTag } = await proxyResponse.json();
        if (!eTag) {
            throw new Error('ETag não encontrado na resposta do proxy de upload.');
        }

        etags.push(eTag);
    }

    // Step 3: Finalize Upload
    setStatus('Finalizando upload do vídeo...');
    await api._proxyFetch('finalizeVideoUpload', {
        payload: { "finalizeUploadRequest": { "video": videoUrn, "uploadToken": "", "uploadedPartIds": etags } }
    });

    // Step 4: Wait for Processing
    setStatus('Aguardando processamento do vídeo pelo LinkedIn...');
    let videoStatus = '';
    let attempts = 0;
    const maxAttempts = 20; // Poll for 2 minutes max (20 * 6s = 120s)
    while (videoStatus !== 'AVAILABLE' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
        const statusResponse = await api._proxyFetch('checkVideoStatus', { videoUrn });
        videoStatus = statusResponse.status;
        attempts++;
        setStatus(`Verificando status do vídeo... (${videoStatus})`);
    }

    if (videoStatus !== 'AVAILABLE') {
        throw new Error(`O vídeo não ficou disponível a tempo. Status final: ${videoStatus}`);
    }

    setStatus('Vídeo pronto para publicação!');
    return videoUrn;
};


export const uploadImagesForLinkedIn = async (linkedinConfig, imageBlobs, authorUrn, setStatus) => {
  if (!linkedinConfig || !linkedinConfig.accessToken) {
    throw new Error('LinkedIn configuration or Access Token not found.');
  }
  if (!imageBlobs || imageBlobs.length === 0) {
    return []; // No images to upload
  }

  const api = new LinkedInAPI(linkedinConfig.accessToken);
  const assetUrns = [];

  for (let i = 0; i < imageBlobs.length; i++) {
    const blob = imageBlobs[i];
    setStatus(`Registering image ${i + 1} of ${imageBlobs.length}...`);

    const registerResponse = await api.registerUpload(authorUrn);
    if (!registerResponse || !registerResponse.uploadUrl || !registerResponse.image) {
      throw new Error('Failed to register image upload with LinkedIn. The response from the server was invalid.');
    }
    const { uploadUrl, image: assetUrn } = registerResponse;

    setStatus(`Uploading image ${i + 1} of ${imageBlobs.length}...`);
    await api.uploadImage(uploadUrl, blob);

    assetUrns.push(assetUrn);
  }

  setStatus('Image uploads complete.');
  return assetUrns;
};

export const getLinkedInShareStatistics = async (linkedinConfig, authorUrn, shareUrns) => {
  if (!linkedinConfig || !linkedinConfig.accessToken) {
    throw new Error('LinkedIn configuration or Access Token not found.');
  }
  if (!authorUrn || !shareUrns || shareUrns.length === 0) {
    throw new Error('Author URN and at least one Share URN are required.');
  }

  const api = new LinkedInAPI(linkedinConfig.accessToken);
  const result = await api._proxyFetch('getShareStatistics', {
    payload: {
        authorUrn,
        shareUrns,
    }
  });

  return result;
};

export const getLinkedInMemberPostStatistics = async (linkedinConfig, ugcPostUrn) => {
    if (!linkedinConfig || !linkedinConfig.accessToken) {
        throw new Error('LinkedIn configuration or Access Token not found.');
    }
    if (!ugcPostUrn) {
        throw new Error('Post URN is required.');
    }

    const api = new LinkedInAPI(linkedinConfig.accessToken);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    const payload = {
        ugcPostUrn,
        queryType: 'TOTAL',
        aggregation: 'TOTAL',
        dateRange: {
            start: { day: startDate.getUTCDate(), month: startDate.getUTCMonth() + 1, year: startDate.getUTCFullYear() },
            end: { day: endDate.getUTCDate(), month: endDate.getUTCMonth() + 1, year: endDate.getUTCFullYear() }
        }
    };

    const result = await api._proxyFetch('getMemberPostStatistics', { payload });
    return { ...result, urn: ugcPostUrn }; // Add urn to result for easy mapping
};


export default LinkedInAPI;
