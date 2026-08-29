import { v4 as uuidv4 } from 'uuid';

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
 * Imports a PageSet into a new campaign structure by deep-copying data
 * and re-hydrating assets.
 * @param {object} pageSet - The PageSet object to import.
 * @returns {Promise<{campaign_data: object, pendingAssets: object}>}
 */
export async function importPageSetToCampaign(pageSet) {
  if (!pageSet || !pageSet.page_set_data) {
    throw new Error('Invalid PageSet provided for import.');
  }

  // Deep clone the data to avoid mutations
  const campaign_data = JSON.parse(JSON.stringify(pageSet.page_set_data));
  const pendingAssets = {};

  // Find all permanent Vercel Blob URLs in the cloned data
  const assetUrls = extractAssetUrls(campaign_data);

  // Create a map to track the mapping from old permanent URL to new temporary blob: URL
  const permanentToTempUrlMap = new Map();

  // Download all assets and create new local blobs for them
  await Promise.all(assetUrls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download asset: ${response.statusText}`);
      const blob = await response.blob();
      const tempUrl = URL.createObjectURL(blob);
      pendingAssets[tempUrl] = blob;
      permanentToTempUrlMap.set(url, tempUrl);
    } catch (error) {
      console.error(`Failed to re-hydrate asset from ${url}:`, error);
      // If an asset fails, we can either throw or just skip it.
      // Skipping might be better to allow partial imports.
    }
  }));

  // A second traversal to replace the old permanent URLs with the new temporary blob URLs
  // This is necessary to ensure the campaign is independent of the PageSet's assets.
  const visited = new WeakSet();
  function replaceUrls(current) {
    if (typeof current !== 'object' || current === null || visited.has(current)) {
      return;
    }
    visited.add(current);

    Object.keys(current).forEach(key => {
      const value = current[key];
      if (typeof value === 'string' && permanentToTempUrlMap.has(value)) {
        current[key] = permanentToTempUrlMap.get(value);
      } else if (typeof value === 'object') {
        replaceUrls(value);
      }
    });
  }

  replaceUrls(campaign_data);

  return { campaign_data, pendingAssets };
}

/**
 * Checks if a campaign has problem and solution defined.
 * @param {object} campaignState - The campaign state.
 * @returns {boolean}
 */
export function hasProblemaSolucao(campaignState) {
  return Boolean(campaignState?.problema?.trim() && campaignState?.solucao?.trim());
}

/**
 * Extracts all available posts (main post + follow-up posts) from campaignState.
 * @param {object} campaignState - The campaign state.
 * @returns {Array<{tipo: string, titulo: string, conteudo: string, cta: string}>}
 */
export function getAvailableCampaignPosts(campaignState) {
  const posts = [];
  const mainContent = campaignState?.campaignContent;
  if (mainContent && (mainContent.titulo?.trim() || mainContent.conteudo?.trim())) {
    posts.push({
      tipo: 'Post Principal',
      titulo: mainContent.titulo || '',
      conteudo: mainContent.conteudo || '',
      cta: mainContent.cta || '',
    });
  }
  const followups = campaignState?.followupPosts || [];
  followups.forEach((post, idx) => {
    if (post && (post.titulo?.trim() || post.conteudo?.trim())) {
      posts.push({
        tipo: `Post Follow-up ${idx + 1}`,
        titulo: post.titulo || '',
        conteudo: post.conteudo || '',
        cta: post.cta || '',
      });
    }
  });
  return posts;
}

/**
 * Returns promptText containing only Main Post Content + CTA.
 * @param {object} campaignState
 * @returns {string}
 */
export function getMainPostPromptText(campaignState) {
  const content = campaignState?.campaignContent;
  if (!content) return '';
  const parts = [];
  if (content.conteudo?.trim()) parts.push(content.conteudo.trim());
  if (content.cta?.trim()) parts.push(content.cta.trim());
  return parts.join('\n\n');
}

/**
 * Converts available campaign posts (Main Post + Follow-up Posts) directly into short post records for csvData.
 * @param {object} campaignState
 * @returns {{data: Array<object>, headers: Array<string>}}
 */
export function convertPostsToCsvData(campaignState) {
  const posts = getAvailableCampaignPosts(campaignState);
  if (posts.length === 0) return { data: [], headers: [] };

  const headers = ["Título", "Texto Principal", "Ponte para o Próximo", "prompt_imagem_carrossel"];
  const data = posts.map((post, index) => ({
    id: uuidv4(),
    "Título": post.titulo || `Página ${index + 1}`,
    "Texto Principal": post.conteudo || '',
    "Ponte para o Próximo": post.cta || '',
    "prompt_imagem_carrossel": '',
  }));

  return { data, headers };
}

/**
 * Builds structured prompt text from available campaign posts.
 * @param {Array<{tipo: string, titulo: string, conteudo: string, cta: string}>} posts - The list of available posts.
 * @returns {string}
 */
export function buildPromptTextFromPosts(posts) {
  if (!posts || posts.length === 0) return '';
  return posts.map((post, idx) => {
    const parts = [`--- ${post.tipo.toUpperCase()} (${idx + 1}/${posts.length}) ---`];
    if (post.titulo) parts.push(`Título: ${post.titulo}`);
    if (post.conteudo) parts.push(`Conteúdo: ${post.conteudo}`);
    if (post.cta) parts.push(`CTA: ${post.cta}`);
    return parts.join('\n');
  }).join('\n\n');
}
