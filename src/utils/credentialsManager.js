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
  if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) return;

  // Only clear or set keys that are actually present in the incoming settings
  // to avoid wiping out other local data that might not be in the DB yet.
  if (settings[CREDENTIAL_KEYS.GEMINI] !== undefined) {
    localStorage.removeItem(CREDENTIAL_KEYS.GEMINI);
    if (settings[CREDENTIAL_KEYS.GEMINI]) {
      saveGeminiApiKey(settings[CREDENTIAL_KEYS.GEMINI]);
    }
  }
  if (settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY] !== undefined) {
    if (settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY]) {
      localStorage.setItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY, settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY]);
    } else {
      localStorage.removeItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_API_KEY);
    }
  }
  if (settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID] !== undefined) {
    if (settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID]) {
      localStorage.setItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID, settings[CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID]);
    } else {
      localStorage.removeItem(CREDENTIAL_KEYS.GOOGLE_DRIVE_CLIENT_ID);
    }
  }
  if (settings[CREDENTIAL_KEYS.GOOGLE_TTS] !== undefined) {
    if (settings[CREDENTIAL_KEYS.GOOGLE_TTS]) {
      const tts = settings[CREDENTIAL_KEYS.GOOGLE_TTS];
      saveGoogleCloudTTSCredentials(typeof tts === 'string' ? JSON.parse(tts) : tts);
    } else {
      localStorage.removeItem(CREDENTIAL_KEYS.GOOGLE_TTS);
    }
  }
  if (settings[CREDENTIAL_KEYS.WORDPRESS] !== undefined) {
    if (settings[CREDENTIAL_KEYS.WORDPRESS]) {
      const wp = settings[CREDENTIAL_KEYS.WORDPRESS];
      saveWordpressConfig(typeof wp === 'string' ? JSON.parse(wp) : wp);
    } else {
      localStorage.removeItem(CREDENTIAL_KEYS.WORDPRESS);
    }
  }
  if (settings[CREDENTIAL_KEYS.TIMEZONE] !== undefined) {
    if (settings[CREDENTIAL_KEYS.TIMEZONE]) {
      saveTimezone(settings[CREDENTIAL_KEYS.TIMEZONE]);
    } else {
      localStorage.removeItem(CREDENTIAL_KEYS.TIMEZONE);
    }
  }
  if (settings[CREDENTIAL_KEYS.GEMINI_MODEL] !== undefined) {
    if (settings[CREDENTIAL_KEYS.GEMINI_MODEL]) {
      saveGeminiModel(settings[CREDENTIAL_KEYS.GEMINI_MODEL]);
    } else {
      localStorage.removeItem(CREDENTIAL_KEYS.GEMINI_MODEL);
    }
  }
  if (settings[CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL] !== undefined) {
    if (settings[CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL]) {
      saveGeminiImageModel(settings[CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL]);
    } else {
      localStorage.removeItem(CREDENTIAL_KEYS.GEMINI_IMAGE_MODEL);
    }
  }
  // LinkedIn handled separately via direct settings object in Context
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
    console.log('Settings successfully loaded from database and applied:', JSON.stringify(settings, null, 2));
  } else {
    console.log('No settings found in the database for this user.');
  }

  return settings;
};
