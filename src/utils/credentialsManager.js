import { getGeminiApiKey, saveGeminiApiKey, saveGeminiModel, saveGeminiImageModel, getGeminiModel, getGeminiImageModel } from './geminiCredentials';
import { getGoogleCloudTTSCredentials, saveGoogleCloudTTSCredentials } from './googleCloudTTSCredentials';
import { getWordpressConfig, saveWordpressConfig } from './wordpressCredentials';
import { getTimezone, saveTimezone } from './timezone';

// The keys for the credentials stored in localStorage.
const CREDENTIAL_KEYS = {
  GEMINI: 'gemini_api_key',
  GOOGLE_DRIVE_API_KEY: 'google_drive_api_key',
  GOOGLE_DRIVE_CLIENT_ID: 'google_drive_client_id',
  GOOGLE_TTS: 'googleCloudTTSCredentials',
  // LINKEDIN: 'linkedinConfig', // This is now handled by SettingsContext
  WORDPRESS: 'wordpressConfig',
  TIMEZONE: 'user_timezone',
  GEMINI_MODEL: 'gemini_model',
  GEMINI_IMAGE_MODEL: 'gemini_image_model',
};

/**
 * Gathers all known credentials from localStorage into a single object.
 * This function is still needed to collect the data before saving.
 * @returns {object} An object containing all the credentials.
 */
export const gatherCredentials = () => {
  const credentials = {};
  // Gemini
  const geminiApiKey = getGeminiApiKey();
  if (geminiApiKey) credentials[CREDENTIAL_KEYS.GEMINI] = geminiApiKey;

  // Google Drive
  const googleDriveApiKey = localStorage.getItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY);
  if (googleDriveApiKey) credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY] = googleDriveApiKey;

  const googleDriveClientId = localStorage.getItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID);
  if (googleDriveClientId) credentials[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID] = googleDriveClientId;

  // Google Cloud TTS
  const googleTts = getGoogleCloudTTSCredentials();
  if (googleTts) credentials[CREDENTIAL_KEYS.GOOGLE_TTS] = googleTts;

  // WordPress
  const wordpress = getWordpressConfig();
  if (wordpress && wordpress.wordpressUrl) credentials[CREDENTIAL_KEYS.WORDPRESS] = wordpress;

  // Timezone
  const timezone = getTimezone();
  if (timezone) credentials[CREDENTIAL_KEYS.TIMEZONE] = timezone;

  // Gemini Models
  const geminiModel = getGeminiModel();
  if (geminiModel) credentials[CREDENTIAL_KEYS.GEMINI_MODEL] = geminiModel;

  const geminiImageModel = getGeminiImageModel();
  if (geminiImageModel) credentials[CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL] = geminiImageModel;

  return credentials;
};

/**
 * Applies a settings object from the database to localStorage.
 * @param {object} settings - The settings object to apply.
 */
export const applySettings = (settings) => {
  if (!settings || typeof settings !== 'object') return;

  // Clear existing credentials before applying new ones to avoid stale data
  // This is a simple approach. A more granular approach might be needed if some
  // local-only settings should be preserved. For now, this is fine.
  Object.values(CREDENTIAL_KEYS).forEach(key => {
      // Be careful with complex keys that are objects
      if (typeof key === 'string') {
          localStorage.removeItem(key);
      }
  });


  if (settings[CREDENTIAL_KEYS.GEMINI]) {
    saveGeminiApiKey(settings[CREDENTIAL_KEYS.GEMINI]);
  }
  if (settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY]) {
    localStorage.setItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY, settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY]);
  }
  if (settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID]) {
    localStorage.setItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID, settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID]);
  }
  if (settings[CREDENTIAL_KEYS.GOOGLE_TTS]) {
    saveGoogleCloudTTSCredentials(settings[CREDENTIAL_KEYS.GOOGLE_TTS]);
  }
  if (settings[CREDENTIAL_KEYS.WORDPRESS]) {
    saveWordpressConfig(settings[CREDENTIAL_KEYS.WORDPRESS]);
  }
  if (settings[CREDENTIAL_KEYS.TIMEZONE]) {
    saveTimezone(settings[CREDENTIAL_KEYS.TIMEZONE]);
  }
  if (settings[CREDENTIAL_KEYS.GEMINI_MODEL]) {
    saveGeminiModel(settings[CREDENTIAL_KEYS.GEMINI_MODEL]);
  }
  if (settings[CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL]) {
    const validImageModels = ['gemini-2.0-flash-preview-image-generation'];
    if (validImageModels.includes(settings[CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL])) {
      saveGeminiImageModel(settings[CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL]);
    } else {
      // If the saved model is invalid (e.g., old 'imagen-3'), save the default valid one.
      saveGeminiImageModel('gemini-2.0-flash-preview-image-generation');
    }
  }
};

/**
 * Saves the current credentials from localStorage to the database via the API.
 */
export const saveSettingsToDb = async (settings) => {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Failed to save settings and could not parse error response.' }));
    throw new Error(errData.error || 'Failed to save settings.');
  }

  return await res.json();
};

/**
 * Loads settings from the database and applies them to localStorage.
 */
export const loadSettingsFromDb = async () => {
  const res = await fetch('/api/settings');

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Failed to load settings and could not parse error response.' }));
    throw new Error(errData.error || 'Failed to load settings.');
  }

  const settings = await res.json();
  if (settings && Object.keys(settings).length > 0) {
    applySettings(settings);
    console.log('Settings successfully loaded from database and applied.');
  } else {
    console.log('No settings found in the database for this user.');
  }

  return settings;
};
