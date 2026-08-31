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

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      data = { raw: responseText };
    }

    if (!response.ok) {
      let errorMessage = data.message || data.error || response.statusText;
      if (data.details) {
        errorMessage += ` | Details: ${data.details}`;
      }
      if (data.stack) {
        console.error("LinkedIn Proxy Error Stack:", data.stack);
      }
      throw new Error(`LinkedIn Proxy Error for action '${action}': ${errorMessage}`);
    }

    return data;
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

  async publishPost(content, targetId, targetType = 'person', images = [], video = null, title = 'Vídeo') {
    const authorUrn = `urn:li:${targetType}:${targetId}`;

    const payload = {
        author: authorUrn,
        commentary: content,
        visibility: 'PUBLIC',
        distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
    };

    if (video) {
        payload.content = { media: { id: video, title: title || 'Vídeo' } };
    } else if (images && images.length > 0) {
        if (images.length === 1) {
            payload.content = { media: { id: images[0] } };
        } else {
            payload.content = { multiImage: { images: images.map(id => ({ id })) } };
        }
    }

    return this._proxyFetch('createPost', { payload });
  }

  async registerUpload(authorUrn) {
    return this._proxyFetch('registerUpload', {
      payload: {
        "registerUploadRequest": {
          "owner": authorUrn,
          "recipes": [
              "urn:li:digitalmediaRecipe:feedshare-image"
          ],
          "serviceRelationships": [
              {
                  "relationshipType": "OWNER",
                  "identifier": "urn:li:userGeneratedContent"
              }
          ]
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

export const publishToLinkedIn = async (campaignData, linkedinConfig) => {
    if (!linkedinConfig || !linkedinConfig.accessToken) {
        throw new Error('LinkedIn configuration or Access Token not found.');
    }
    if (!campaignData || !campaignData.content || !campaignData.targetId) {
        throw new Error('Campaign data, content, and targetId are required for publishing.');
    }

    const { content, targetId, targetType, images, video, title } = campaignData;

    const api = new LinkedInAPI(linkedinConfig.accessToken);
    // A lógica de construção do payload agora está centralizada no método publishPost.
    const result = await api.publishPost(content, targetId, targetType, images, video, title);

    console.log('Post created successfully on LinkedIn!', result);
    return result;
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
    const videoUrn = initializeResponse.video || initializeResponse.value?.video || initializeResponse.asset || initializeResponse.value?.asset;
    const uploadInstructions = initializeResponse.uploadInstructions || initializeResponse.value?.uploadInstructions;
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
    const maxAttempts = 40; // Poll for 4 minutes max (40 * 6s = 240s)
    while (videoStatus !== 'AVAILABLE' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
        const statusResponse = await api._proxyFetch('checkVideoStatus', { videoUrn });
        videoStatus = statusResponse.status;
        attempts++;
        if (videoStatus === 'PROCESSING_FAILED' || videoStatus === 'FAILED') {
            throw new Error(`Processamento do vídeo falhou no LinkedIn (Status: ${videoStatus}).`);
        }
        setStatus(`Processando vídeo no LinkedIn... (${videoStatus} - ${attempts}/${maxAttempts})`);
    }

    if (videoStatus !== 'AVAILABLE') {
        throw new Error(`O vídeo ainda está em processamento pelo LinkedIn (Status: ${videoStatus}). Aguarde alguns instantes e tente publicar novamente.`);
    }

    setStatus('Vídeo pronto para publicação!');
    return videoUrn;
};


export const uploadImagesForLinkedIn = async (linkedinConfig, imageBlobs, authorUrn, setStatus) => {
    if (!linkedinConfig || !linkedinConfig.accessToken) {
        throw new Error('LinkedIn configuration or Access Token not found.');
    }
    if (!imageBlobs || imageBlobs.length === 0) {
        return [];
    }

    const api = new LinkedInAPI(linkedinConfig.accessToken);
    const assetUrns = [];

    // The LinkedIn image upload API expects each image to be sent in a separate call.
    // Do not deduplicate blobs here, even if they are the same file.
    for (let i = 0; i < imageBlobs.length; i++) {
        const blob = imageBlobs[i];
        setStatus(`Uploading image ${i + 1} of ${imageBlobs.length}...`);

        try {
            const imageBase64 = await blobToBase64(blob);
            const response = await api._proxyFetch('uploadAndCheckImage', {
                authorUrn,
                imageBase64,
                imageType: blob.type,
            });

            if (!response.assetUrn) {
                throw new Error('Asset URN was not returned from the proxy after image upload.');
            }
            assetUrns.push(response.assetUrn);
            // Add a short delay to avoid undocumented rate limit issues.
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Failed to upload image ${i + 1}:`, error);
            // Throw the error up so the caller can handle it (e.g., show a notification).
            throw new Error(`Error uploading image ${i + 1}/${imageBlobs.length}: ${error.message}`);
        }
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
    startDate.setDate(endDate.getDate() - 35);

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
