import { getLinkedinConfig } from './linkedinCredentials';

const API_BASE_URL = 'https://api.linkedin.com/v2';

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
 * Fetches the URN of the authenticated user.
 * @param {string} accessToken - The LinkedIn access token.
 * @returns {Promise<string>} The user's URN (e.g., "urn:li:person:xxxx").
 */
const _getProfileUrn = async (accessToken) => {
    const url = `${API_BASE_URL}/me`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Falha ao buscar perfil do LinkedIn: ${errorData.message}`);
    }

    const profileData = await response.json();
    return `urn:li:person:${profileData.id}`;
};


/**
 * Registers an image upload with LinkedIn to get an upload URL.
 * @param {string} accessToken - The LinkedIn access token.
 * @param {string} authorUrn - The URN of the author (person or organization).
 * @returns {Promise<{uploadUrl: string, assetUrn: string}>} The upload URL and the asset URN.
 */
const _registerImageUpload = async (accessToken, authorUrn) => {
  const url = `${API_BASE_URL}/assets?action=registerUpload`;
  const body = {
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
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Falha ao registrar o upload da imagem: ${errorData.message}`);
  }

  const data = await response.json();
  return {
    uploadUrl: data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
    assetUrn: data.value.asset,
  };
};

/**
 * Uploads the image binary to the provided URL.
 * @param {string} accessToken - The LinkedIn access token.
 * @param {string} uploadUrl - The URL to upload the image to.
 * @param {Blob} imageBlob - The blob of the image to upload.
 */
const _uploadImage = async (accessToken, uploadUrl, imageBlob) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': imageBlob.type,
    },
    body: imageBlob,
  });

  if (!response.ok) {
    // LinkedIn upload endpoint returns XML error, so we try to parse it or just get text
    const errorText = await response.text();
    console.error("LinkedIn Image Upload Error Body:", errorText);
    throw new Error(`Falha no upload da imagem para o LinkedIn. Status: ${response.status}`);
  }
};

/**
 * Creates the post on LinkedIn.
 * @param {string} accessToken - The LinkedIn access token.
 * @param {string} authorUrn - The URN of the author.
 * @param {object} campaignContent - The campaign content.
 * @param {string} assetUrn - The URN of the uploaded image.
 * @returns {Promise<object>} The created post object from the API.
 */
const _createPost = async (accessToken, authorUrn, campaignContent, assetUrn) => {
  const url = `${API_BASE_URL}/ugcPosts`;
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

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: postText,
        },
        shareMediaCategory: 'IMAGE',
        media: [
          {
            status: 'READY',
            description: {
              text: campaignContent.titulo,
            },
            media: assetUrn,
            title: {
              text: campaignContent.titulo,
            },
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0', // Required for UGC Posts API
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Falha ao criar o post no LinkedIn: ${errorData.message}`);
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
export const publishToLinkedIn = async (campaignData) => {
  const { campaignContent, imageBlob } = campaignData;

  const config = getLinkedinConfig();
  if (!config || !config.accessToken) {
    throw new Error('Configuração do LinkedIn ou Access Token não encontrados. Por favor, conecte-se primeiro.');
  }
  const { accessToken } = config;

  // As per the n8n config, we post as a specific organization.
  // In a real-world scenario, this might be fetched or configured dynamically.
  const authorUrn = 'urn:li:organization:669250';
  // Alternatively, to post as the user:
  // const authorUrn = await _getProfileUrn(accessToken);


  // 1. Register Image Upload
  console.log('Publicando no LinkedIn: Registrando imagem...');
  const { uploadUrl, assetUrn } = await _registerImageUpload(accessToken, authorUrn);
  console.log('Publicando no LinkedIn: Imagem registrada. Asset URN:', assetUrn);

  // 2. Upload Image
  console.log('Publicando no LinkedIn: Fazendo upload da imagem...');
  await _uploadImage(accessToken, uploadUrl, imageBlob);
  console.log('Publicando no LinkedIn: Imagem enviada com sucesso.');

  // 3. Create Post
  console.log('Publicando no LinkedIn: Criando o post...');
  const postResult = await _createPost(accessToken, authorUrn, campaignContent, assetUrn);
  console.log('Publicando no LinkedIn: Post criado com sucesso!', postResult);

  // The post ID is in the format "urn:li:share:xxxxx"
  const postId = postResult.id;
  return {
    id: postId,
    // Construct the link to the post
    link: `https://www.linkedin.com/feed/update/${postId}/`,
  };
};
