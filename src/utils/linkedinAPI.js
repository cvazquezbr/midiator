import { getLinkedinConfig } from './linkedinCredentials';

// Helper to convert Blob to Base64
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    // The result includes the data URL prefix (e.g., "data:image/png;base64,"), which we will handle before sending.
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});


/**
 * Converts Markdown to plain text for LinkedIn.
 * @param {string} markdown - The Markdown string.
 * @returns {string} Plain text.
 */
const markdownToLinkedinText = (markdown) => {
  if (!markdown) return '';

  let text = markdown;

  // Basic HTML tag stripping first
  text = text.replace(/<[^>]*>/g, '');
  // Remove bold and italics
  text = text.replace(/\*\*(.*?)\*\*|\*(.*?)\*/g, '$1$2');
  // Remove headers
  text = text.replace(/^#+\s/gm, '');
  // Remove blockquotes
  text = text.replace(/^>\s/gm, '');
  // Replace links with "text (link)"
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
  // Replace list items
  text = text.replace(/^\s*[\-\*]\s/gm, '');
  // Trim and clean up newlines
  text = text.trim().replace(/\n{3,}/g, '\n\n');

  return text;
};

/**
 * Fetches the URN of the authenticated user via the proxy.
 * @param {string} accessToken - The LinkedIn access token.
 * @returns {Promise<string>} The user's URN (e.g., "urn:li:person:xxxx").
 */
const _getProfileUrn = async (accessToken) => {
    const response = await fetch('/api/linkedin-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getProfile', accessToken }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Resposta não-JSON do proxy.' }));
        throw new Error(`Falha ao buscar perfil do LinkedIn via proxy: ${errorData.message}`);
    }

    const profileData = await response.json();
    return `urn:li:person:${profileData.id}`;
};


/**
 * Registers an image upload with LinkedIn via the proxy.
 * @param {string} accessToken - The LinkedIn access token.
 * @param {string} authorUrn - The URN of the author (person or organization).
 * @returns {Promise<{uploadUrl: string, assetUrn: string}>} The upload URL and the asset URN.
 */
const _registerImageUpload = async (accessToken, authorUrn) => {
  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'registerUpload',
      accessToken,
      payload: {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Resposta não-JSON do proxy.' }));
    throw new Error(`Falha ao registrar o upload da imagem via proxy: ${errorData.message}`);
  }

  const data = await response.json();
  // The proxy will return the relevant part of the response
  return {
    uploadUrl: data.uploadUrl,
    assetUrn: data.assetUrn,
  };
};

/**
 * Uploads the image binary to the provided URL via the proxy.
 * @param {string} accessToken - The LinkedIn access token.
 * @param {string} uploadUrl - The URL to upload the image to.
 * @param {Blob} imageBlob - The blob of the image to upload.
 */
const _uploadImage = async (accessToken, uploadUrl, imageBlob) => {
  const base64StringWithPrefix = await blobToBase64(imageBlob);
  // Remove the data URL prefix (e.g., "data:image/png;base64,")
  const imageBase64 = base64StringWithPrefix.substring(base64StringWithPrefix.indexOf(',') + 1);

  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'uploadImage',
      accessToken,
      uploadUrl,
      imageBase64,
      imageType: imageBlob.type,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Proxy Image Upload Error Body:", errorText);
    throw new Error(`Falha no upload da imagem para o LinkedIn via proxy. Status: ${response.status}`);
  }
   // A successful PUT to the upload URL returns a 201 Created with no body.
   // So we just check for the ok status.
};

/**
 * Creates the post on LinkedIn via the proxy.
 * @param {string} accessToken - The LinkedIn access token.
 * @param {string} authorUrn - The URN of the author.
 * @param {object} campaignContent - The campaign content.
 * @param {string} assetUrn - The URN of the uploaded image.
 * @returns {Promise<object>} The created post object from the API.
 */
const _createPost = async (accessToken, authorUrn, campaignContent, assetUrns = []) => {
  const postText = [
    campaignContent.titulo.toUpperCase(),
    '',
    markdownToLinkedinText(campaignContent.conteudo),
    '',
    '----',
    campaignContent.cta,
    '----',
    campaignContent.hashtags.join(' '),
  ].join('\n');

  const payload = {
    author: authorUrn,
    commentary: postText,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (assetUrns && assetUrns.length > 0) {
    if (assetUrns.length === 1) {
      // Single image post
      payload.content = {
        media: {
          title: campaignContent.titulo,
          id: assetUrns[0],
        },
      };
    } else {
      // Multi-image post
      payload.content = {
        multiImage: {
          images: assetUrns.map(assetUrn => ({
            id: assetUrn,
            altText: campaignContent.titulo, // Use title as alt text
          })),
        },
      };
    }
  }

  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'createPost',
      accessToken,
      payload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Resposta não-JSON do proxy.' }));
    throw new Error(`Falha ao criar o post no LinkedIn via proxy: ${errorData.message || 'Erro desconhecido.'}`);
  }

  // The new Posts API returns the post ID in the headers, not the body.
  // The proxy should be updated to return this, but for now, we'll assume the proxy returns what's needed.
  // The response from a successful POST is 201 Created with headers.
  const postId = response.headers.get('x-restli-id');
  if (!postId) {
      // Fallback if the header isn't returned by the proxy, maybe the proxy returns the body.
      const body = await response.json().catch(() => null);
      if (body && body.id) {
          return body;
      }
      console.warn("Não foi possível encontrar o ID do post no header 'x-restli-id'. A resposta do proxy pode precisar de ajuste.");
      // Return a mock object so the UI doesn't break
      return { id: 'urn:li:share:DESCONHECIDO' };
  }

  return { id: postId };
};


/**
 * Publica o conteúdo de uma campanha no LinkedIn.
 * @param {object} campaignData - Objeto contendo os dados da campanha.
 *   @param {object} campaignData.campaignContent - Título, conteúdo, CTA, hashtags.
 *   @param {Blob} campaignData.imageBlob - O blob da imagem a ser enviada.
 * @returns {Promise<object>} Uma promessa que resolve para um objeto com o ID e o link do post.
 * @throws {Error} Se a configuração do LinkedIn não for encontrada ou se ocorrer um erro na API.
 */
/**
 * Fetches the available LinkedIn profiles (personal and organizational) for the authenticated user.
 * @returns {Promise<Array<{urn: string, name: string}>>} A list of profiles.
 */
export const getLinkedInProfiles = async () => {
  const config = getLinkedinConfig();
  if (!config || !config.accessToken) {
    throw new Error('Configuração do LinkedIn ou Access Token não encontrados. Por favor, conecte-se primeiro.');
  }
  const { accessToken } = config;

  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getOrganizations', accessToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Resposta não-JSON do proxy.' }));
    throw new Error(`Falha ao buscar perfis do LinkedIn via proxy: ${errorData.message}`);
  }

  return await response.json();
};

export const publishToLinkedIn = async (campaignData) => {
  const { campaignContent, imageBlobs = [], authorUrn: providedAuthorUrn } = campaignData;

  const config = getLinkedinConfig();
  if (!config || !config.accessToken) {
    throw new Error('Configuração do LinkedIn ou Access Token não encontrados. Por favor, conecte-se primeiro.');
  }
  const { accessToken } = config;

  // Use the provided author URN, or fetch the user's personal URN as a fallback.
  const authorUrn = providedAuthorUrn || await _getProfileUrn(accessToken);

  const assetUrns = [];

  if (imageBlobs && imageBlobs.length > 0) {
    console.log(`Publicando no LinkedIn: Registrando e enviando ${imageBlobs.length} imagem(ns)...`);
    // Process all image uploads in parallel for efficiency
    const uploadPromises = imageBlobs.map(async (imageBlob) => {
      // 1. Register Image Upload
      const { uploadUrl, assetUrn } = await _registerImageUpload(accessToken, authorUrn);
      // 2. Upload Image
      await _uploadImage(accessToken, uploadUrl, imageBlob);
      console.log(`Imagem com asset URN: ${assetUrn} enviada com sucesso.`);
      return assetUrn;
    });

    const results = await Promise.all(uploadPromises);
    assetUrns.push(...results);
    console.log('Todas as imagens foram enviadas.');
  } else {
    console.log('Publicando no LinkedIn: Nenhum imagem para enviar, criando um post de texto.');
  }


  // 3. Create Post (with multiple or no images)
  console.log('Publicando no LinkedIn: Criando o post via proxy...');
  const postResult = await _createPost(accessToken, authorUrn, campaignContent, assetUrns);
  console.log('Publicando no LinkedIn: Post criado com sucesso!', postResult);

  // The post ID is in the format "urn:li:share:xxxxx"
  const postId = postResult.id;
  return {
    id: postId,
    // Construct the link to the post
    link: `https://www.linkedin.com/feed/update/${postId}/`,
  };
};
