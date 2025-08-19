/**
 * Saves the provided settings object to the database via the API.
 * @param {object} settings - The settings object to save.
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
 * The front-end is responsible for applying these settings to its state.
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
    return settings;
  } else {
    console.log('No settings found in the database for this user.');
    return {}; // Return an empty object if no settings are found
  }
};
