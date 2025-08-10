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
  text = text.replace(/^\s*[-*]\s/gm, '');
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
const _registerVideoUpload = async (accessToken, authorUrn) => {
  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'registerVideoUpload',
      accessToken,
      payload: {
        registerUploadRequest: {
          owner: authorUrn,
          recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }]
        },
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Proxy response was not valid JSON.' }));
    throw new Error(`Failed to register video upload via proxy: ${errorData.message}`);
  }

  const data = await response.json();
  return {
    uploadUrl: data.uploadUrl,
    assetUrn: data.assetUrn,
  };
};

const _uploadVideo = async (accessToken, uploadUrl, videoBlob) => {
  // This will be a simple pass-through to the proxy, which handles the streaming.
  const response = await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'uploadVideo',
      accessToken,
      uploadUrl,
      videoContentType: videoBlob.type,
      // We send the blob to the proxy as a base64 string
      videoBase64: await blobToBase64(videoBlob),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload video via proxy. Status: ${response.status}`);
  }
};

const _finalizeVideoUpload = async (accessToken, assetUrn) => {
  await fetch('/api/linkedin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'finalizeVideoUpload',
      accessToken,
      assetUrn,
    }),
  });
};

const _pollVideoStatus = async (accessToken, assetUrn) => {
  const MAX_POLLS = 10;
  const DELAY_MS = 5000; // 5 seconds

  for (let i = 0; i < MAX_POLLS; i++) {
    const response = await fetch('/api/linkedin-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkVideoStatus', accessToken, assetUrn }),
    });

    if (!response.ok) {
      throw new Error('Failed to poll video status.');
    }

    const data = await response.json();
    if (data.status === 'AVAILABLE') {
      console.log('Video is processed and available.');
      return;
    }
    console.log(`Polling video status (${i + 1}/${MAX_POLLS}): ${data.status}`);
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  throw new Error('Video processing timed out.');
};

const _createPost = async (accessToken, authorUrn, campaignContent, assetUrns = [], videoAssetUrn = null) => {
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

  const shareContent = {
    shareCommentary: {
      text: postText,
    },
  };

  if (videoAssetUrn) {
    shareContent.shareMediaCategory = 'VIDEO';
    shareContent.media = [{
      status: 'READY',
      description: { text: campaignContent.titulo },
      media: videoAssetUrn,
      title: { text: campaignContent.titulo },
    }];
  } else if (assetUrns && assetUrns.length > 0) {
    shareContent.shareMediaCategory = 'IMAGE';
    shareContent.media = assetUrns.map(assetUrn => ({
      status: 'READY',
      description: {
        text: campaignContent.titulo,
      },
      media: assetUrn,
      title: {
        text: campaignContent.titulo,
      },
    }));
  }

  const payload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent,
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

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
    throw new Error(`Falha ao criar o post no LinkedIn via proxy: ${errorData.message}`);
  }

  return await response.json();
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
  const { campaignContent, imageBlobs = [], videoBlob, authorUrn: providedAuthorUrn } = campaignData;

  const config = getLinkedinConfig();
  if (!config || !config.accessToken) {
    throw new Error('Configuração do LinkedIn ou Access Token não encontrados. Por favor, conecte-se primeiro.');
  }
  const { accessToken } = config;

  // Use the provided author URN, or fetch the user's personal URN as a fallback.
  const authorUrn = providedAuthorUrn || await _getProfileUrn(accessToken);

  let postResult;

  if (videoBlob) {
    console.log('Publicando no LinkedIn: Iniciando processo de upload de vídeo...');
    // 1. Register Video Upload
    const { uploadUrl, assetUrn: videoAssetUrn } = await _registerVideoUpload(accessToken, authorUrn, videoBlob.size);
    // 2. Upload Video
    await _uploadVideo(accessToken, uploadUrl, videoBlob);
    // 3. Finalize Upload
    await _finalizeVideoUpload(accessToken, videoAssetUrn);
    // 4. Poll for status
    await _pollVideoStatus(accessToken, videoAssetUrn);
    console.log(`Vídeo com asset URN: ${videoAssetUrn} enviado e processado com sucesso.`);
    // 5. Create Post
    postResult = await _createPost(accessToken, authorUrn, campaignContent, [], videoAssetUrn);

  } else if (imageBlobs && imageBlobs.length > 0) {
    console.log(`Publicando no LinkedIn: Registrando e enviando ${imageBlobs.length} imagem(ns)...`);
    const assetUrns = [];
    const uploadPromises = imageBlobs.map(async (imageBlob) => {
      const { uploadUrl, assetUrn } = await _registerImageUpload(accessToken, authorUrn);
      await _uploadImage(accessToken, uploadUrl, imageBlob);
      console.log(`Imagem com asset URN: ${assetUrn} enviada com sucesso.`);
      return assetUrn;
    });
    const results = await Promise.all(uploadPromises);
    assetUrns.push(...results);
    console.log('Todas as imagens foram enviadas.');
    postResult = await _createPost(accessToken, authorUrn, campaignContent, assetUrns);

  } else {
    console.log('Publicando no LinkedIn: Nenhum anexo para enviar, criando um post de texto.');
    postResult = await _createPost(accessToken, authorUrn, campaignContent);
  }

  console.log('Publicando no LinkedIn: Post criado com sucesso!', postResult);

  // The post ID is in the format "urn:li:share:xxxxx"
  const postId = postResult.id;
  return {
    id: postId,
    // Construct the link to the post
    link: `https://www.linkedin.com/feed/update/${postId}/`,
  };
};
