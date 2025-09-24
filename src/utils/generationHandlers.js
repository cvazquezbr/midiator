import geminiAPI from './geminiAPI.js';
import { getGeminiApiKey } from './geminiCredentials.js';
import { stripHtml } from '../lib/utils.js';
import fetchWithAuth from './fetchWithAuth.js';

// --- Prompt Fetching and Caching ---
const promptCache = new Map();

async function getPrompt(name) {
  if (promptCache.has(name)) {
    return promptCache.get(name);
  }
  try {
    const response = await fetchWithAuth(`/api/prompts?name=${name}`);
    const responseText = await response.text();

    if (!response.ok) {
      let errorJson = {};
      try {
        errorJson = JSON.parse(responseText);
      } catch (e) {
        // The error response wasn't valid JSON. Use the text as the error message.
        // Limit the length to prevent massive error messages.
        const errorSnippet = responseText.substring(0, 200);
        throw new Error(`Server returned an error (status ${response.status}): ${errorSnippet}`);
      }
      throw new Error(errorJson.error || `Failed to fetch prompt '${name}'. Status: ${response.status}`);
    }

    let promptData = {};
    try {
      promptData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse successful prompt response as JSON:", responseText);
      throw new Error(`Received an invalid response from the server for prompt '${name}'.`);
    }

    if (!promptData || !promptData.prompt_text) {
      throw new Error(`Prompt "${name}" found but its text is empty.`);
    }
    promptCache.set(name, promptData.prompt_text);
    return promptData.prompt_text;
  } catch (error) {
    console.error(`Failed to fetch and process prompt: ${name}`, error);
    throw error;
  }
}

function fillPrompt(template, data) {
    let filledTemplate = template;
    for (const key in data) {
        // Using a global regex to replace all occurrences of the placeholder
        const regex = new RegExp(`{${key}}`, 'g');
        filledTemplate = filledTemplate.replace(regex, data[key]);
    }
    return filledTemplate;
}
// ------------------------------------

const formatObjectForPrompt = (obj, excludeKeys = [], indentation = '') => {
    if (!obj || typeof obj !== 'object') return '';

    return Object.entries(obj)
        .filter(([key]) => !excludeKeys.includes(key))
        .map(([key, value]) => {
            if (value === null || value === undefined || value === '') return null;

            // Clean up the key for display
            const formattedKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
            const fullKey = `${indentation}${formattedKey}`;

            // If the value is a nested object, recurse
            if (typeof value === 'object' && !Array.isArray(value)) {
                const nestedString = formatObjectForPrompt(value, excludeKeys, indentation + '  ');
                // Don't print the key if the nested object is empty
                if (!nestedString) return null;
                return `${fullKey}:\n${nestedString}`;
            }

            // Otherwise, it's a primitive value or an array
            const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
            if (formattedValue === '') return null;

            return `${fullKey}: ${stripHtml(formattedValue)}`;
        })
        .filter(Boolean) // Filter out any null or empty entries
        .join('\n');
};


/**
 * Generates the main campaign content using an AI API.
 */
export const generateCampaignContent = async ({ problema, solucao, objetivo, tomDeVoz, persona = null, autor = null }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const personaString = typeof persona === 'string' ? persona : (persona ? formatObjectForPrompt(persona, ['description']) : 'indisponível');

  let autorString;
  if (typeof autor === 'string') {
    autorString = autor;
  } else {
    autorString = autor ? formatObjectForPrompt(autor) : 'indisponível';
  }

  const personaPromptSection = personaString && personaString !== 'indisponível'
    ? `Destinatário (Persona): ${personaString}`
    : 'O destinatário é um público geral interessado no problema e solução apresentados.';

  const promptTemplate = await getPrompt('generateCampaignContent');
  const finalPrompt = fillPrompt(promptTemplate, {
    personaPromptSection: personaPromptSection,
    autorString: autorString,
    formato: '', // Formato was removed
    problema: stripHtml(problema),
    solucao: stripHtml(solucao),
    objetivo: stripHtml(objetivo),
    tomDeVoz: stripHtml(tomDeVoz)
  });

  const response = await geminiAPI.generateContent(finalPrompt, 'Geração de Conteúdo de Campanha');

  const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
  let parsedContent;

  if (jsonMatch && jsonMatch[1]) {
    parsedContent = JSON.parse(jsonMatch[1]);
  } else {
    // Attempt to parse directly if no markdown block is found
    try {
      parsedContent = JSON.parse(response);
    } catch (e) {
      console.error("Failed to parse campaign content response as JSON:", response);
      throw new Error("A resposta da IA para o conteúdo da campanha não estava em um formato JSON válido.");
    }
  }

  const { titulo, title, conteudo, body, cta, "Texto Principal": textoPrincipal } = parsedContent;

  if (!titulo && !title) {
    console.error("Content generation response missing title:", parsedContent);
    throw new Error("A resposta da IA para o conteúdo da campanha não continha um campo 'titulo' ou 'title'.");
  }

  let hashtags = [];
  if (Array.isArray(parsedContent.hashtags)) {
    hashtags = parsedContent.hashtags.map(h => h.trim().replace(/^#/, ''));
  } else if (typeof parsedContent.hashtags === 'string') {
    hashtags = parsedContent.hashtags
      .split(/[\s,]+/)
      .filter(h => h && h.length > 0)
      .map(h => h.trim().replace(/^#/, ''));
  }

  return {
    titulo: titulo || title,
    conteudo: conteudo || body || textoPrincipal || '',
    cta: cta || '',
    hashtags: hashtags,
  };
};

/**
 * Generates a prompt for the campaign image using an AI API.
 */
export const generateCampaignImagePrompt = async ({ content, aspectRatio, autor = null, palette = null }) => {
    if (!content) {
        throw new Error("O conteúdo da campanha deve ser gerado primeiro.");
    }
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error('Chave de API Gemini não configurada.');
    }
    geminiAPI.initialize(apiKey);

    const autorString = formatObjectForPrompt(autor);

    const colors = palette?.colors || [];
    const justification = palette?.harmony_justification || 'N/A';

    const colorPalettePrompt = colors && colors.length > 0
        ? `A imagem deve usar predominantemente a seguinte paleta de cores: ${colors.map(c => `${c.name} (${c.hex})`).join(', ')}. Justificativa da paleta: ${justification}`
        : 'A paleta de cores é livre e deve ser escolhida pelo artista para melhor se adequar ao tema.';

    const promptTemplate = await getPrompt('generateCampaignImagePrompt');
    const prompt = fillPrompt(promptTemplate, {
      titulo: stripHtml(content.titulo),
      conteudo: stripHtml(content.conteudo),
      autorString: autorString,
      aspectRatio: aspectRatio,
      colorPalettePrompt: colorPalettePrompt,
    });

    const imagePrompt = await geminiAPI.generateContent(prompt, 'Geração de Prompt de Imagem de Campanha');
    return imagePrompt.trim();
};

/**
 * Generates an image for the campaign using an AI API.
 */
export const generateCampaignImage = async ({ prompt, aspectRatio, colors = [] }) => {
  if (!prompt) {
    throw new Error("O prompt da imagem deve ser gerado primeiro.");
  }
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const colorPalettePrompt = colors && colors.length > 0
    ? `The image should predominantly use the following color palette: ${colors.map(c => c.hex).join(', ')}.`
    : '';

  const promptTemplate = await getPrompt('generateCampaignImage');
  let finalImagePrompt = fillPrompt(promptTemplate, {
      prompt: prompt,
      colorPalettePrompt: colorPalettePrompt,
      aspectRatio: aspectRatio,
  });

  // Ensure aspect ratio is in the prompt, even if the template is missing it.
  if (!finalImagePrompt.includes('--ar')) {
    finalImagePrompt = `${finalImagePrompt.trim()} --ar ${aspectRatio}`;
  }

  const base64Image = await geminiAPI.generateImage(finalImagePrompt, 'Geração de Imagem de Campanha');
  return `data:image/png;base64,${base64Image}`;
};


/**
 * Generates formatted HTML content for the campaign post.
 */
export const generateFormattedContent = async ({ content }) => {
  if (!content?.conteudo) {
    throw new Error("Conteúdo principal deve ser gerado primeiro.");
  }
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const promptTemplate = await getPrompt('generateFormattedContent');
  const prompt = fillPrompt(promptTemplate, {
      titulo: stripHtml(content.titulo),
      conteudo: stripHtml(content.conteudo),
      cta: stripHtml(content.cta),
  });

  const rawContent = await geminiAPI.generateContent(prompt, 'Formatação de Conteúdo para HTML');
  const match = rawContent.match(/^`{3}(?:html)?\s*([\s\S]+?)\s*`{3}$/);
  return match && match[1] ? match[1].trim() : rawContent.trim();
};


/**
 * Generates a plan for follow-up posts for the campaign.
 */
export const generateFollowupPlan = async ({ content, neededQuantity, existingPosts = [], persona = null, autor = null }) => {
  if (!content?.conteudo) {
    throw new Error("Conteúdo principal deve ser gerado primeiro.");
  }
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const personaString = typeof persona === 'string' ? persona : (persona ? formatObjectForPrompt(persona, ['description']) : 'indisponível');

  let autorString;
  if (typeof autor === 'string') {
    autorString = autor;
  } else {
    autorString = autor ? formatObjectForPrompt(autor) : 'indisponível';
  }

  const existingPostsString = existingPosts.length > 0
    ? `
POSTS JÁ EXISTENTES (NÃO REPITA ESTES TEMAS OU ETAPAS):
${existingPosts.map(p => `- Título: "${p.titulo}", Etapa AIDA: ${p.etapa_aida}`).join('\n')}
`
    : '';

  const promptTemplate = await getPrompt('generateFollowupPlan');
  const prompt = fillPrompt(promptTemplate, {
    neededQuantity: neededQuantity,
    titulo: stripHtml(content.titulo),
    conteudo: stripHtml(content.conteudo),
    personaString: personaString,
    autorString: autorString,
    existingPostsString: existingPostsString,
  });

  const response = await geminiAPI.generateContent(prompt, 'Geração de Plano de Follow-up');
  const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("Falha ao analisar o plano de follow-up:", jsonMatch[1], e);
      throw new Error("A resposta da IA para o plano de follow-up não era um JSON válido.");
    }
  }
  try {
    return JSON.parse(response);
  } catch (e) {
    console.error("Falha ao analisar o plano de follow-up (resposta direta):", response, e);
    throw new Error("A resposta da IA para o plano de follow-up não era um JSON válido.");
  }
};


/**
 * Generates follow-up posts for the campaign based on a plan.
 */
export const generateFollowupPosts = async ({ content, plan, persona = null, autor = null }) => {
  if (!content?.conteudo) {
    throw new Error("Conteúdo principal deve ser gerado primeiro.");
  }
  if (!plan || plan.length === 0) {
    throw new Error("O plano de follow-up deve ser gerado primeiro.");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const personaString = typeof persona === 'string' ? persona : (persona ? formatObjectForPrompt(persona, ['description']) : 'indisponível');

  let autorString;
  if (typeof autor === 'string') {
    autorString = autor;
  } else {
    autorString = autor ? formatObjectForPrompt(autor) : 'indisponível';
  }

  const generatedPosts = [];
  const MAX_RETRIES = 3;
  const MIN_CONTENT_LENGTH = 600;

  const promptTemplate = await getPrompt('generateFollowupPosts');

  for (const postPlan of plan) {
    const prompt = fillPrompt(promptTemplate, {
      personaString: personaString,
      autorString: autorString,
      titulo: stripHtml(content.titulo),
      titulo_sugerido: postPlan.titulo_sugerido,
      coracao_prompt: postPlan.coracao_prompt,
      MIN_CONTENT_LENGTH: MIN_CONTENT_LENGTH,
    });

    let postGenerated = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Gerando post de follow-up #${postPlan.post_numero}, tentativa ${attempt}...`);
        const response = await geminiAPI.generateContent(prompt, `Geração Post Follow-up #${postPlan.post_numero} (Tentativa ${attempt})`);

        const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
        let parsedResponse;

        if (jsonMatch && jsonMatch[1]) {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } else {
          parsedResponse = JSON.parse(response);
        }

        const { titulo_post, conteudo_post } = parsedResponse;

        if (!titulo_post || !conteudo_post) {
          throw new Error("Resposta da IA está incompleta. Faltando 'titulo_post' ou 'conteudo_post'.");
        }

        if (conteudo_post.length < MIN_CONTENT_LENGTH) {
          throw new Error(`O conteúdo gerado tem ${conteudo_post.length} caracteres, mas o mínimo é ${MIN_CONTENT_LENGTH}.`);
        }

        const campaignHashtags = (content.hashtags || []).map(h => h.trim().replace(/#/g, ''));
        const suggestedHashtags = (postPlan.hashtags_sugeridas || []).map(h => h.trim().replace(/#/g, ''));
        const combinedHashtags = [...new Set([...campaignHashtags, ...suggestedHashtags])];

        generatedPosts.push({
          post_numero: postPlan.post_numero,
          tipo_gancho: postPlan.tipo_gancho,
          etapa_aida: postPlan.etapa_aida,
          titulo: titulo_post,
          conteudo: conteudo_post,
          cta: postPlan.cta_sugerido,
          hashtags_sugeridas: combinedHashtags,
        });

        console.log(`Post de follow-up #${postPlan.post_numero} gerado com sucesso na tentativa ${attempt}.`);
        postGenerated = true;
        break; // Sai do loop de tentativas se o post foi gerado com sucesso

      } catch (error) {
        console.error(`Erro na tentativa ${attempt} para o post #${postPlan.post_numero}:`, error.message);
        if (attempt === MAX_RETRIES) {
          console.error(`Falha ao gerar o post #${postPlan.post_numero} após ${MAX_RETRIES} tentativas.`);
          // Opcional: Adicionar um post de "falha" à lista para indicar o problema na UI
          // generatedPosts.push({ post_numero: postPlan.post_numero, error: true, ... });
        }
      }
    }
  }

  return generatedPosts;
};

/**
 * Generates a list of common solutions for a given problem and persona.
 */
export const generateCommonSolutions = async ({ problema, persona, autor }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  if (!problema || problema.trim() === '') {
    throw new Error('Problema não definido. Por favor, descreva o problema primeiro.');
  }

  const personaString = typeof persona === 'string' ? persona : (persona ? formatObjectForPrompt(persona, ['description']) : 'indisponível');

  let autorString;
  if (typeof autor === 'string') {
    autorString = autor;
  } else {
    autorString = autor ? formatObjectForPrompt(autor) : 'indisponível';
  }

  const promptTemplate = await getPrompt('generateCommonSolutions');
  const prompt = fillPrompt(promptTemplate, {
    personaString: personaString,
    autorString: autorString,
    problema: problema,
  });

  const response = await geminiAPI.generateContent(prompt, 'Geração de Soluções Comuns');
  const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("Falha ao analisar a resposta JSON das soluções comuns:", jsonMatch[1], e);
      throw new Error("A resposta da IA para as soluções comuns não estava em um formato JSON válido.");
    }
  }

  try {
    return JSON.parse(response);
  } catch (e) {
    console.error("Falha ao analisar a resposta JSON direta das soluções comuns:", response, e);
    throw new Error("A resposta da IA para as soluções comuns não estava em um formato JSON válido.");
  }
};

/**
 * Generates a list of common problems for a given persona.
 */
export const generateCommonProblems = async ({ persona, autor }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  if (!persona) {
    throw new Error('Persona não definida. Por favor, configure a persona primeiro.');
  }

  const personaString = typeof persona === 'string' ? persona : (persona ? formatObjectForPrompt(persona, ['description']) : 'indisponível');

  let autorString;
  if (typeof autor === 'string') {
    autorString = autor;
  } else {
    autorString = autor ? formatObjectForPrompt(autor) : 'indisponível';
  }

  const promptTemplate = await getPrompt('generateCommonProblems');
  const prompt = fillPrompt(promptTemplate, {
      personaString: personaString,
      autorString: autorString,
  });

  const response = await geminiAPI.generateContent(prompt, 'Geração de Problemas Comuns da Persona');
  const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("Falha ao analisar a resposta JSON dos problemas comuns:", jsonMatch[1], e);
      throw new Error("A resposta da IA para os problemas comuns não estava em um formato JSON válido.");
    }
  }

  try {
    return JSON.parse(response);
  } catch (e) {
    console.error("Falha ao analisar a resposta JSON direta dos problemas comuns:", response, e);
    throw new Error("A resposta da IA para os problemas comuns não estava em um formato JSON válido.");
  }
};

/**
 * Generates CSV data content from a text prompt using an AI API.
 */
export const generateIAContent = async ({ promptText, promptNumRecords }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);
  if (!promptText.trim()) {
    throw new Error('Por favor, forneça um texto descritivo para o prompt.');
  }
  if (promptNumRecords <= 0) {
    throw new Error('A quantidade de registros a gerar deve ser maior que zero.');
  }

  const promptTemplate = await getPrompt('generateIAContent');
  const finalPrompt = fillPrompt(promptTemplate, {
    promptNumRecords: promptNumRecords,
    promptText: stripHtml(promptText),
  });

  const iaResponseText = await geminiAPI.generateContent(finalPrompt, 'Geração de Conteúdo CSV com IA');
  return iaResponseText;
};

/**
 * Generates a color palette from a briefing using an AI API.
 * @param {string} briefing - The user's briefing for the color palette.
 * @returns {Promise<Object>} A promise that resolves to the generated palette object.
 */
export const generateColorPalette = async (briefing) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Por favor, configure sua chave de API Gemini primeiro.');
  }
  geminiAPI.initialize(apiKey);

  const promptTemplate = await getPrompt('generateColorPalette');
  const prompt = fillPrompt(promptTemplate, { briefing: briefing });

  try {
    const response = await geminiAPI.generateContent(prompt, 'Geração de Paleta de Cores');

    // More robust JSON parsing
    const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
    let parsedResponse;

    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Falha ao analisar o JSON do bloco de markdown:", jsonMatch[1], e);
        throw new Error("A resposta da IA continha um bloco JSON, mas não era válido.");
      }
    } else {
      // Fallback: try to parse the entire response string
      try {
        // Attempt to find a JSON object within the string if it's not perfectly clean
        const cleanerMatch = response.match(/\{[\s\S]*\}/);
        if (cleanerMatch && cleanerMatch[0]) {
          parsedResponse = JSON.parse(cleanerMatch[0]);
        } else {
          // If no object is found, try to parse the whole thing
          parsedResponse = JSON.parse(response);
        }
      } catch (e) {
        console.error("Falha ao analisar a resposta da IA como JSON diretamente:", response, e);
        throw new Error("A resposta da IA não estava em um formato JSON válido.");
      }
    }

    if (typeof parsedResponse !== 'object' || parsedResponse === null) {
        throw new Error("A resposta JSON analisada não é um objeto válido.");
    }

    return parsedResponse;

  } catch (error) {
    console.error("Erro ao gerar paleta de cores com IA:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
};
