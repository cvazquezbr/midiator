/**
 * Normaliza uma string de tag removendo o '#' e acentos.
 * @param {string} tag - A tag a ser normalizada.
 * @returns {string} A tag normalizada.
 */
const normalizeTag = (tag) => {
  return tag
    .replace(/^#/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Retorna os cabeçalhos de autenticação para as requisições.
 * @param {object} config - O objeto de configuração do WordPress.
 * @returns {Headers} Um objeto Headers com a autorização.
 */
const _getAuthHeaders = (config) => {
  const headers = new Headers();
  const credentials = btoa(`${config.username}:${config.password}`);
  headers.append('Authorization', `Basic ${credentials}`);
  headers.append('Content-Type', 'application/json');
  return headers;
};

/**
 * Publica o conteúdo de uma campanha no WordPress.
 * @param {object} campaignData - Objeto contendo os dados da campanha.
 *   @param {object} campaignData.campaignContent - Título, conteúdo, CTA, hashtags.
 *   @param {Blob} campaignData.imageBlob - O blob da imagem a ser enviada.
 *   @param {string} campaignData.conteudoFormatado - O conteúdo principal em HTML.
 * @returns {Promise<object>} Uma promessa que resolve para o objeto do post criado.
 * @throws {Error} Se a configuração do WordPress não for encontrada ou se ocorrer um erro na API.
 */
export const publishToWordPress = async (campaignData, wordpressConfig) => {
  const { campaignContent, imageBlob } = campaignData;
  const { conteudoFormatado } = campaignContent;

  const config = wordpressConfig;
  if (!config) {
    throw new Error('Configuração do WordPress não encontrada. Por favor, configure-a primeiro.');
  }

  const headers = _getAuthHeaders(config);

  const _processHashtags = async (hashtags) => {
    const tagIds = [];
    const wordpressUrl = config.wordpressUrl.replace(/\/$/, '');
    const tagsUrl = `${wordpressUrl}${config.tagsUrl}`;

    for (const tag of hashtags) {
      if (!tag.trim()) continue;

      const normalizedTag = normalizeTag(tag);
      const searchUrl = `${tagsUrl}?search=${encodeURIComponent(normalizedTag)}`;

      try {
        // 1. Procurar pela tag
        const searchResponse = await fetch(searchUrl, { headers });
        if (!searchResponse.ok) {
          console.warn(`Falha ao buscar a tag #${normalizedTag}. Status: ${searchResponse.status}`);
          continue;
        }
        const existingTags = await searchResponse.json();

        // 2. Se a tag existir, usar o ID dela
        if (existingTags.length > 0 && existingTags[0].name.toLowerCase() === normalizedTag.toLowerCase()) {
          tagIds.push(existingTags[0].id);
        } else {
          // 3. Se não existir, criar a tag
          const createResponse = await fetch(tagsUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: normalizedTag }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.warn(`Falha ao criar a tag #${normalizedTag}. Status: ${createResponse.status}`, errorData);
            continue;
          }
          const newTag = await createResponse.json();
          tagIds.push(newTag.id);
        }
      } catch (error) {
        console.error(`Erro ao processar a tag #${normalizedTag}:`, error);
      }
    }
    return tagIds;
  };

  const _uploadImage = async (imageBlob, campaignContent) => {
    const wordpressUrl = config.wordpressUrl.replace(/\/$/, '');
    const mediaUrl = `${wordpressUrl}${config.mediaUrl}`;

    // Criar um nome de arquivo a partir do título
    const filename = `${campaignContent.titulo.replace(/\s+/g, '-').toLowerCase()}.png`;

    // O cabeçalho para upload de mídia é diferente
    const mediaHeaders = new Headers();
    const credentials = btoa(`${config.username}:${config.password}`);
    mediaHeaders.append('Authorization', `Basic ${credentials}`);
    mediaHeaders.append('Content-Disposition', `attachment; filename="${filename}"`);
    mediaHeaders.append('Content-Type', imageBlob.type); // 'image/png'

    const response = await fetch(mediaUrl, {
      method: 'POST',
      headers: mediaHeaders,
      body: imageBlob,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Falha no upload da imagem: ${errorData.message}`);
    }

    const mediaData = await response.json();

    // Atualizar metadados da imagem (título, alt text, descrição)
    const updateMediaUrl = `${mediaUrl}/${mediaData.id}`;
    const metadataUpdateResponse = await fetch(updateMediaUrl, {
        method: 'POST',
        headers: headers, // Reutiliza os headers JSON aqui
        body: JSON.stringify({
            title: campaignContent.titulo,
            alt_text: campaignContent.titulo,
            description: campaignContent.cta,
        }),
    });

    if (!metadataUpdateResponse.ok) {
        console.warn('Não foi possível atualizar os metadados da imagem, mas a imagem foi enviada.');
    }

    return await metadataUpdateResponse.json();
  };

  const _createPost = async (campaignContent, conteudoFormatado, tagIds, mediaId, mediaUrl) => {
    const wordpressUrl = config.wordpressUrl.replace(/\/$/, '');
    const postsUrl = `${wordpressUrl}${config.postsUrl}`;

    const postBody = {
      title: campaignContent.titulo,
      content: conteudoFormatado,
      status: 'draft',
      excerpt: campaignContent.cta,
      featured_media: mediaId,
      categories: [11], // Categoria fixa
      tags: tagIds,
      template: 'single-leftsidebar-template',
      meta: {
        cover_image_url: mediaUrl,
      },
    };

    const response = await fetch(postsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Falha ao criar o post: ${errorData.message}`);
    }

    return await response.json();
  };

  // 1. Processar Hashtags
  console.log('Publicando no WordPress: Processando hashtags...');
  const tagIds = await _processHashtags(campaignContent.hashtags);
  console.log('Publicando no WordPress: Hashtags processadas. IDs:', tagIds);

  // 2. Fazer Upload da Imagem
  console.log('Publicando no WordPress: Fazendo upload da imagem...');
  const mediaObject = await _uploadImage(imageBlob, campaignContent);
  const mediaId = mediaObject.id;
  const mediaUrl = mediaObject.guid.rendered;
  console.log('Publicando no WordPress: Imagem enviada. ID:', mediaId);

  // 3. Criar o Post
  console.log('Publicando no WordPress: Criando o post...');
  const postObject = await _createPost(campaignContent, conteudoFormatado, tagIds, mediaId, mediaUrl);
  console.log('Publicando no WordPress: Post criado com sucesso!', postObject);

  return postObject;
};
