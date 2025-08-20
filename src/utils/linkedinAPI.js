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
      throw new Error(`LinkedIn Proxy Error for action '${action}': ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  async getAdministeredPages() {
    // This functionality is combined in the new 'getProfiles' proxy action.
    // This method is kept for potential future use if the proxy is split.
    const { organizations } = await this.getAllManagedProfiles();
    return organizations;
  }

  async getAllManagedProfiles() {
    // The proxy now handles fetching both personal and organization profiles together.
    return this._proxyFetch('getProfiles');
  }

  async getPersonalProfile() {
    // This functionality is combined in the new 'getProfiles' proxy action.
    const { personal } = await this.getAllManagedProfiles();
    return personal;
  }

  async publishPost(content, targetId, targetType = 'personal') {
    return this._proxyFetch('createPost', {
      payload: {
        content,
        targetId,
        targetType,
      }
    });
  }
}

// Wrapper function to handle caching, as requested.
export const getLinkedInProfiles = async (linkedinConfig, forceRefresh = false) => {
    const cacheKey = 'linkedin_profiles_cache';

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
    const profiles = await api.getAllManagedProfiles();

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

    const { content, targetId, targetType } = campaignData;
    const api = new LinkedInAPI(linkedinConfig.accessToken);
    const result = await api.publishPost(content, targetId, targetType);

    console.log('Post created successfully on LinkedIn!', result);
    return result; // The proxy should return the final post object with an ID or link.
};

// Note: The complex video/image upload logic from the old file is being removed for now
// to align with the simplified structure from the user's report.
// The new proxy is expected to handle this complexity if needed.
// If media uploads are still a feature, the proxy and this client will need to be updated.
// For now, focusing on the core task: fixing profile listing and text publishing.

export default LinkedInAPI;
