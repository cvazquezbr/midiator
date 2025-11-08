const IGNORE_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'user_id', 'paletteId', 'aspectRatio',
  'page_id', 'campaign_id', 'original_url', 'hex', 'rgb', 'prompt_imagem_carrossel',
  'fontScale', 'activeStep', 'inputMethod', 'paletteId', 'etapa_aida', 'post_numero', 'tipo_gancho'
]);

/**
 * A robust function to extract all translatable text fields from a campaign object.
 * It specifically targets known text fields within the complex, nested structure.
 *
 * @param {object} campaign - The original campaign object.
 * @returns {{fields: Array<{key: string, value: string, owner: object}>, processedCampaign: object}}
 */
export function getTranslatableFields(campaign) {
  const fields = [];
  const processedCampaign = JSON.parse(JSON.stringify(campaign));

  // Function to safely check and add a field
  const addField = (key, value, owner) => {
    if (typeof value === 'string' && value.trim() && !IGNORE_KEYS.has(key) && !value.startsWith('http')) {
      fields.push({ key, value, owner });
    }
  };

  // Start by processing top-level fields
  addField('name', processedCampaign.name, processedCampaign);

  // The main content is inside campaign_data, which might be a string
  let campaignData = processedCampaign.campaign_data;
  if (typeof campaignData === 'string') {
    try {
      campaignData = JSON.parse(campaignData);
      processedCampaign.campaign_data = campaignData; // Replace string with object
    } catch (e) {
      console.error("Failed to parse campaign_data:", e);
      return { fields, processedCampaign }; // Return early if parsing fails
    }
  }

  if (typeof campaignData !== 'object' || campaignData === null) {
    return { fields, processedCampaign };
  }

  // Explicitly traverse the known structure based on user's description
  addField('solucao', campaignData.solucao, campaignData);
  addField('objetivo', campaignData.objetivo, campaignData);
  addField('problema', campaignData.problema, campaignData);
  addField('tomDeVoz', campaignData.tomDeVoz, campaignData);
  addField('promptText', campaignData.promptText, campaignData);

  if (Array.isArray(campaignData.colors)) {
    campaignData.colors.forEach(color => {
      addField('name', color.name, color);
      addField('justification', color.justification, color);
    });
  }

  if (Array.isArray(campaignData.csvData)) {
    campaignData.csvData.forEach(row => {
      Object.keys(row).forEach(key => addField(key, row[key], row));
    });
  }

  if (campaignData.customPalette) {
      addField('harmony', campaignData.customPalette.harmony, campaignData.customPalette);
      addField('harmony_justification', campaignData.customPalette.harmony_justification, campaignData.customPalette);
  }

  if (Array.isArray(campaignData.followupPosts)) {
    campaignData.followupPosts.forEach(post => {
      addField('cta', post.cta, post);
      addField('titulo', post.titulo, post);
      addField('conteudo', post.conteudo, post);
      if (Array.isArray(post.hashtags_sugeridas) && post.hashtags_sugeridas.length > 0) {
        // Group hashtags and add as a single field
        fields.push({ key: 'hashtags_sugeridas', value: post.hashtags_sugeridas, owner: post });
      }
    });
  }

  // Extract from campaignContent object
  if (typeof campaignData.campaignContent === 'object' && campaignData.campaignContent !== null) {
    const content = campaignData.campaignContent;
    addField('cta', content.cta, content);
    addField('titulo', content.titulo, content);
    addField('conteudo', content.conteudo, content);
    addField('conteudoMedio', content.conteudoMedio, content);
    addField('conteudoPequeno', content.conteudoPequeno, content);
    if (Array.isArray(content.hashtags) && content.hashtags.length > 0) {
       // Group hashtags and add as a single field
       fields.push({ key: 'hashtags', value: content.hashtags, owner: content });
    }
  }

  return { fields, processedCampaign };
}


/**
 * Recursively extracts asset URLs from a campaign data object.
 * @param {any} data - The campaign data.
 * @returns {string[]} - A list of unique asset URLs.
 */
export function extractAssetUrls(data) {
  const urls = new Set();
  const visited = new WeakSet();

  function traverse(current) {
    if (typeof current !== 'object' || current === null || visited.has(current)) {
      return;
    }
    visited.add(current);

    Object.values(current).forEach(value => {
      if (typeof value === 'string' && (value.includes('.blob.vercel-storage.com') || value.startsWith('blob:'))) {
        urls.add(value);
      } else if (typeof value === 'object') {
        traverse(value);
      }
    });
  }

  traverse(data);
  return Array.from(urls);
}

/**
 * Imports a PageSet into a new campaign state.
 * It performs a deep copy of the page set data and re-downloads all assets,
 * preparing them as pending assets for the new campaign.
 * @param {object} pageSet - The full PageSet object to import.
 * @returns {Promise<{campaign_data: object, pendingAssets: object}>} - An object containing the new campaign data and the map of pending assets.
 */
export async function importPageSetToCampaign(pageSet) {
  if (!pageSet || !pageSet.page_set_data || !Array.isArray(pageSet.page_set_data.pages)) {
    throw new Error('Invalid PageSet provided for import.');
  }

  // Deep copy the entire page set data structure.
  const pageSetDataCopy = JSON.parse(JSON.stringify(pageSet.page_set_data));
  const pendingAssets = {};

  // Extract all unique asset URLs from the entire set of pages.
  const assetUrls = extractAssetUrls(pageSetDataCopy);

  // Download all assets in parallel.
  const downloadPromises = assetUrls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download asset: ${url}`);
      const blob = await response.blob();
      const filename = url.split('/').pop().split('?')[0] || `imported_asset_${Date.now()}`;
      const file = new File([blob], filename, { type: blob.type });
      const localBlobUrl = URL.createObjectURL(file);
      return { originalUrl: url, localBlobUrl, file };
    } catch (error) {
      console.error(error);
      // Silently fail for individual assets, but log it. The UI will show a broken image.
      return null;
    }
  });

  const downloadedAssets = (await Promise.all(downloadPromises)).filter(Boolean);

  // Create a map of old URLs to new local blob URLs.
  const urlMap = new Map();
  downloadedAssets.forEach(({ originalUrl, localBlobUrl, file }) => {
    pendingAssets[localBlobUrl] = file;
    urlMap.set(originalUrl, localBlobUrl);
  });

  // Traverse the copied data and replace all permanent URLs with the new local ones.
  traverseState(pageSetDataCopy, (key, value, owner) => {
    if (typeof value === 'string' && urlMap.has(value)) {
      owner[key] = urlMap.get(value);
    }
  });

  // Construct the new campaign_data.
  // The imported pages become the `generatedPagesData`.
  // We'll use the template from the *first* page as the campaign's base template.
  const campaign_data = {
    generatedPagesData: pageSetDataCopy.pages,
    pageTemplate: pageSetDataCopy.pages[0]?.customPageTemplate || {},
    fieldPositions: pageSetDataCopy.pages[0]?.customFieldPositions || {},
    fieldStyles: pageSetDataCopy.pages[0]?.customFieldStyles || {},
    brandElements: pageSetDataCopy.pages[0]?.customBrandElements || [],
    csvData: pageSetDataCopy.pages.map(p => p.record),
    csvHeaders: pageSetDataCopy.pages[0]?.record ? Object.keys(pageSetDataCopy.pages[0].record) : [],
    // Clear other campaign-specific fields
    campaignContent: null,
    followupPosts: [],
  };

  return { campaign_data, pendingAssets };
}
