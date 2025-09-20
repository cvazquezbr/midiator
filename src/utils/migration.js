import { saveSettingsToDb } from './credentialsManager';

const MIGRATION_KEY = 'settings_migration_v2_complete';

// These are the keys for the credentials that were previously stored directly in localStorage.
const LEGACY_CREDENTIAL_KEYS = {
  GEMINI: 'gemini_api_key',
  GOOGLE_DRIVE_API_KEY: 'google_drive_api_key',
  GOOGLE_DRIVE_CLIENT_ID: 'google_drive_client_id',
  GOOGLE_TTS: 'googleCloudTTSCredentials',
  WORDPRESS: 'wordpressConfig',
  TIMEZONE: 'user_timezone',
  GEMINI_MODEL: 'gemini_model',
  GEMINI_IMAGE_MODEL: 'gemini_image_model',
  // Add other legacy keys here if any were missed.
};

/**
 * Reads a value from localStorage, parsing it as JSON if it's a stringified object.
 * @param {string} key The key to read from localStorage.
 * @returns {any} The value, or null if not found or on error.
 */
const getLegacySetting = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return null;
    }
    // Attempt to parse it as JSON, but fall back to the raw value if it fails.
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  } catch (error) {
    console.error(`Error reading legacy setting for key "${key}" from localStorage:`, error);
    return null;
  }
};

/**
 * Gathers all known legacy settings from localStorage into a single object.
 * @returns {object} An object containing all the found legacy settings.
 */
const gatherLegacySettings = () => {
  const legacySettings = {};
  console.log('Gathering legacy settings from localStorage...');

  Object.entries(LEGACY_CREDENTIAL_KEYS).forEach(([name, key]) => {
    const value = getLegacySetting(key);
    if (value !== null) {
      legacySettings[key] = value;
      console.log(`Found legacy setting: ${key}`);
    }
  });

  return legacySettings;
};

/**
 * Runs a one-time migration of settings from localStorage to the database.
 */
export const runSettingsMigration = async () => {
  // 1. Check if migration has already been completed.
  if (getLegacySetting(MIGRATION_KEY)) {
    // console.log('Settings migration has already been completed. Skipping.');
    return;
  }

  console.log('Starting one-time settings migration from localStorage to database...');

  // 2. Gather all legacy settings from localStorage.
  const settingsToMigrate = gatherLegacySettings();

  // 3. If there's nothing to migrate, mark as complete and exit.
  if (Object.keys(settingsToMigrate).length === 0) {
    console.log('No legacy settings found to migrate.');
    try {
      localStorage.setItem(MIGRATION_KEY, 'true');
    } catch (error) {
      console.error('Failed to set migration completion flag even with no data.', error);
    }
    return;
  }

  console.log('Found legacy settings to migrate:', settingsToMigrate);

  try {
    // 4. Save the gathered settings to the database.
    await saveSettingsToDb(settingsToMigrate);
    console.log('Successfully migrated settings to the database.');

    // 5. Mark the migration as complete in localStorage.
    localStorage.setItem(MIGRATION_KEY, 'true');

    // 6. (Optional) Clean up old keys. It's safer to leave them for a while,
    // but for a clean slate, we can remove them.
    // Object.values(LEGACY_CREDENTIAL_KEYS).forEach(key => {
    //   try {
    //     localStorage.removeItem(key);
    //   } catch (e) {
    //     console.error(`Failed to remove legacy key ${key}:`, e);
    //   }
    // });
    // console.log('Cleaned up legacy localStorage keys.');

  } catch (error) {
    console.error('A critical error occurred during settings migration:', error);
    // Do not set the migration flag if it fails, so it can be retried.
  }
};
