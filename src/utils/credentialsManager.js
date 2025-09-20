// This file acts as a centralized manager for API-based settings operations.
// It is responsible for fetching settings from and saving settings to the database.
// The logic for managing settings in the application's state is handled by SettingsContext.

/**
 * Saves the provided settings object to the database via the API.
 * @param {object} settings - The settings object to be saved.
 * @returns {Promise<object>} The response from the API.
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
 * Loads settings from the database.
 * This function does not apply settings anywhere; it simply retrieves them.
 * The calling context (e.g., SettingsContext) is responsible for managing the retrieved state.
 * @returns {Promise<object>} The settings object from the database.
 */
export const loadSettingsFromDb = async () => {
  const res = await fetch('/api/settings');

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Failed to load settings and could not parse error response.' }));
    throw new Error(errData.error || 'Failed to load settings.');
  }

  const settings = await res.json();
  if (settings && Object.keys(settings).length > 0) {
    console.log('Settings successfully loaded from database.');
  } else {
    console.log('No settings found in the database for this user.');
  }

  return settings;
};
