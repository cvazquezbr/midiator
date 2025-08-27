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

  async publishPost(content, targetId, targetType = 'personal', images = [], video = null, title = '') {
    return this._proxyFetch('createPost', {
      payload: {
        content,
        targetId,
        targetType,
        images,
        video,
        title,
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

  // Video-specific methods
  async initializeVideoUpload(authorUrn, videoFile) {
    return this._proxyFetch('initializeVideoUpload', {
      payload: {
        initializeUploadRequest: {
          owner: authorUrn,
          fileSizeBytes: videoFile.size,
          videoSetting: {
            playerSetting: "EMBED",
            format: "H_264"
          }
        }
      }
    });
  }

  async uploadVideo(uploadUrl, videoFile) {
      const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: videoFile,
          headers: {
              'Content-Type': videoFile.type,
          }
      });
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to upload video chunk: ${response.status} ${response.statusText} - ${errorText}`);
      }
      // ETag is returned by the real PUT to S3, not our proxy.
      // The proxy call in the old implementation for video was incorrect.
      // The direct upload to S3 is what matters.
      return response;
  }

  async finalizeVideoUpload(authorUrn, videoUrn, uploadSignatures) {
    return this._proxyFetch('finalizeVideoUpload', {
      payload: {
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken: '', // Not needed for single-chunk upload
          uploadedPartIds: uploadSignatures
        }
      }
    });
  }

  async checkVideoStatus(videoUrn) {
    // This is a simplified version. A real implementation should poll.
    return this._proxyFetch('checkVideoStatus', { videoUrn });
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

    const { content, targetId, targetType, images, video, title } = campaignData;
    const api = new LinkedInAPI(linkedinConfig.accessToken);
    const result = await api.publishPost(content, targetId, targetType, images, video, title);

    console.log('Post created successfully on LinkedIn!', result);
    return result; // The proxy should return the final post object with an ID or link.
};

// Note: The complex video/image upload logic from the old file is being removed for now
// to align with the simplified structure from the user's report.
// The new proxy is expected to handle this complexity if needed.
// If media uploads are still a feature, the proxy and this client will need to be updated.
// For now, focusing on the core task: fixing profile listing and text publishing.

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

export const uploadVideoForLinkedIn = async (linkedinConfig, videoBlob, authorUrn, setStatus) => {
  if (!linkedinConfig || !linkedinConfig.accessToken) {
    throw new Error('LinkedIn configuration or Access Token not found.');
  }
  if (!videoBlob) {
    throw new Error('Video blob is required.');
  }

  const api = new LinkedInAPI(linkedinConfig.accessToken);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Step 1: Initialize Upload
  setStatus('Iniciando upload do vídeo...');
  const initResponse = await api.initializeVideoUpload(authorUrn, videoBlob);
  const videoUrn = initResponse.video;
  // For single-chunk uploads, there's one set of instructions.
  const uploadUrl = initResponse.uploadInstructions[0].uploadUrl;

  if (!videoUrn || !uploadUrl) {
      throw new Error('Failed to initialize video upload with LinkedIn.');
  }

  // Step 2: Upload Video file directly to the provided URL
  setStatus('Fazendo upload do arquivo de vídeo...');
  const uploadResponse = await api.uploadVideo(uploadUrl, videoBlob);
  const eTag = uploadResponse.headers.get('ETag');
  if (!eTag) {
      // This might happen with some cloud providers if ETag is not exposed.
      // Let's check if the proxy can get it. For now, we warn.
      console.warn('ETag not found in direct upload response header. This might be okay.');
  }

  // Step 3: Finalize Upload
  setStatus('Finalizando upload do vídeo...');
  // The finalize call for single-chunk uploads might not need an ETag,
  // but we pass it if we have it. The API seems to be inconsistent here.
  // The proxy will handle the actual finalization call.
  await api.finalizeVideoUpload(authorUrn, videoUrn, eTag ? [eTag.replace(/"/g, '')] : []);

  // Step 4: Poll for video status
  setStatus('Processando o vídeo...');
  let videoStatus = '';
  let attempts = 0;
  const maxAttempts = 20; // Poll for max 2 minutes (20 * 6s)
  while (videoStatus !== 'AVAILABLE' && attempts < maxAttempts) {
      await delay(6000); // wait 6 seconds
      const statusResponse = await api.checkVideoStatus(videoUrn);
      videoStatus = statusResponse.status;
      attempts++;
      setStatus(`Processando o vídeo... (Status: ${videoStatus}, Tentativa: ${attempts})`);
  }

  if (videoStatus !== 'AVAILABLE') {
      throw new Error(`Video processing did not complete in time. Final status: ${videoStatus}`);
  }

  setStatus('Vídeo pronto para publicação!');
  return videoUrn;
};


export default LinkedInAPI;
