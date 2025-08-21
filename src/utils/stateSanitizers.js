/**
 * This module contains functions to sanitize the application state before
 * saving it to the database, ensuring that only necessary and serializable
 * data is persisted.
 */

/**
 * Creates a minimal, clean state object suitable for saving to the database.
 * It strips out any data that is not essential for restoring a campaign,
 * such as UI state, large datasets (like csvData), etc.
 * @param {object} fullState - The complete state object from getAppState().
 * @returns {object} A sanitized state object containing only campaign-essential data.
 */
export const sanitizeStateForSave = (fullState) => {
  // Define the list of properties that are essential for a campaign.
  const campaignProperties = [
    'activeStep',
    'problema',
    'solucao',
    'campaignContent',
    'persona',
    'autor',
    'instrucoes',
    'formato',
    'aspectRatio',
    'followupPosts',
    'followupPostsQuantity',
    'fieldPositions',
    'fieldStyles',
    'imageFilters',
    'brandElements',
    'backgroundImage',
    'generatedImageUrl',
    'generatedImagesData',
    'generatedAudioData',
    'generatedVideosData',
    'standardsColors',
    // We explicitly exclude heavy or UI-related data like:
    // 'csvData', 'csvHeaders', 'colorPalette', 'sidebarOpen', etc.
  ];

  const sanitizedState = {};
  for (const prop of campaignProperties) {
    if (fullState[prop] !== undefined) {
      sanitizedState[prop] = fullState[prop];
    }
  }

  // Further clean the asset arrays within the sanitized state.
  // We want to remove the local blob data before saving, as the URLs are what matter.
  // The blob data will be handled by the upload process separately.
  if (sanitizedState.generatedImagesData) {
    sanitizedState.generatedImagesData = sanitizedState.generatedImagesData.map(d => ({ ...d, blob: null }));
  }
  if (sanitizedState.generatedAudioData) {
    sanitizedState.generatedAudioData = sanitizedState.generatedAudioData.map(d => ({ ...d, blob: null }));
  }
  if (sanitizedState.generatedVideosData) {
    sanitizedState.generatedVideosData = sanitizedState.generatedVideosData.map(d => ({ ...d, blob: null }));
  }

  return sanitizedState;
};
