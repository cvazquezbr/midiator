import { getCampaignPrompt } from './campaignPrompt.js';
import geminiAPI from './geminiAPI.js';
import { getGeminiApiKey } from './geminiCredentials.js';
import { stripHtml } from '../lib/utils.js';

const formatObjectForPrompt = (obj, excludeKeys = []) => {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj)
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([key, value]) => {
      if (!value) return null;
      const formattedValue = Array.isArray(value) ? value.join(', ') : value;
      if (!formattedValue) return null;
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      return `${formattedKey}: ${stripHtml(formattedValue)}`;
    })
    .filter(Boolean)
    .join('\n');
};


/**
 * Generates the main campaign content using an AI API.
 */
export const generateCampaignContent = async ({ problema, solucao }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const { persona, autor, instrucoes, formato } = getCampaignPrompt();

  const personaString = formatObjectForPrompt(persona, ['description']);
  const autorString = formatObjectForPrompt(autor);

  const promptCompleto = `
  Você deve gerar conteúdo para posts no LinkeIn, considerando como destinatário a Persona a seguir qualificada e como emissor o Autor a seguir também qualificado.
    Persona: ${personaString}
    Autor: ${autorString}
    Formato: ${stripHtml(formato)}
    Problema: ${stripHtml(problema)}
    Solução: ${stripHtml(solucao)}
    ${stripHtml(instrucoes)}
  `;

  const finalPrompt = `${promptCompleto}\n\nGere uma resposta JSON com os seguintes campos: "titulo" (string), "conteudo" (string), "cta" (string), e "hashtags" (string, separadas por vírgula). A resposta deve ser apenas o JSON.`;

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

  const { titulo, title, conteudo, body, cta } = parsedContent;

  if (!titulo && !title) {
    console.error("Content generation response missing title:", parsedContent);
    throw new Error("A resposta da IA para o conteúdo da campanha não continha um campo 'titulo' ou 'title'.");
  }

  let hashtags = [];
  if (Array.isArray(parsedContent.hashtags)) {
    // If it's already an array, just trim and remove the '#' if present
    hashtags = parsedContent.hashtags.map(h => h.trim().replace(/^#/, ''));
  } else if (typeof parsedContent.hashtags === 'string') {
    // Split by space or comma, filter out empty strings, and remove '#'
    hashtags = parsedContent.hashtags
      .split(/[\s,]+/) // Split by one or more spaces or commas
      .filter(h => h && h.length > 0) // Remove empty strings that might result from multiple separators
      .map(h => h.trim().replace(/^#/, '')); // Trim and remove leading '#'
  }

  return {
    titulo: titulo || title,
    conteudo: conteudo || body || '',
    cta: cta || '',
    hashtags: hashtags,
  };
};

/**
 * Generates an image for the campaign using an AI API.
 */
export const generateCampaignImage = async ({ content, aspectRatio }) => {
  if (!content) {
    throw new Error("Conteúdo do texto deve ser gerado primeiro.");
  }
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const { autor, colors } = getCampaignPrompt();
  const autorString = formatObjectForPrompt(autor);

  const colorPalettePrompt = colors && colors.length > 0
    ? `A imagem deve usar predominantemente a seguinte paleta de cores: ${colors.map(c => c.hex).join(', ')}.`
    : '';

  // Simplified prompt to be more direct and less prone to errors.
  const imagePrompt = `
    Crie uma imagem de fundo para um post de rede social.
    O tema é: "${stripHtml(content.titulo)}".
    O estilo deve ser consistente com a marca: ${autorString}.
    ${colorPalettePrompt}
    A IMAGEM DEVE SER PURAMENTE VISUAL, CONCEITUAL OU ABSTRATA, E NÃO DEVE CONTER NENHUM TEXTO, LETRAS OU NÚMEROS.
    A razão de aspecto da imagem deve ser ${aspectRatio}.
  `;

  const base64Image = await geminiAPI.generateImage(imagePrompt, 'Geração de Imagem de Campanha');
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
  const prompt = `
      Com o objetivo de gerar um post de blog no WordPress corporativo, Formatar o texto a seguir observando o padrão com HTML.
      Considere que o conteúdo gerado já estará embutido em uma página no contexto de seu BODY.
      Elabore o HTML para melhor estruturar o texto, facilitar a leitura, hierarquizar a informação conforme a importância.
      O primeiro nível de Header que deve ser utilizado é o H3, já há H1 e H2 no contexto no qual o texto produzido se insere.
      Elabore um resumo com os três pontos chave no texto de entrada e apresente o resumo com caixas de destaque logo no início.
      ATENÇÃO aos campos que requeiram escape como aspas. Adicionalmente, o uso de &quot; é válido em HTML mas causa problemas em JSON. Atenção para evitar quebras de linha no conteúdo HTML e caracteres especiais não escapados.
      Segue o texto:

      Título: ${stripHtml(content.titulo)}
      Conteúdo: ${stripHtml(content.conteudo)}
      CTA: ${stripHtml(content.cta)}
    `;

  const rawContent = await geminiAPI.generateContent(prompt, 'Formatação de Conteúdo para HTML');
  const match = rawContent.match(/^`{3}(?:html)?\s*([\s\S]+?)\s*`{3}$/);
  return match && match[1] ? match[1].trim() : rawContent.trim();
};


/**
 * Generates a plan for follow-up posts for the campaign.
 */
export const generateFollowupPlan = async ({ content, neededQuantity, existingPosts = [] }) => {
  if (!content?.conteudo) {
    throw new Error("Conteúdo principal deve ser gerado primeiro.");
  }
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  const { persona } = getCampaignPrompt();
  const personaString = formatObjectForPrompt(persona, ['description']);

  const existingPostsString = existingPosts.length > 0
    ? `
POSTS JÁ EXISTENTES (NÃO REPITA ESTES TEMAS OU ETAPAS):
${existingPosts.map(p => `- Título: "${p.titulo}", Etapa AIDA: ${p.etapa_aida}`).join('\n')}
`
    : '';

  const prompt =
  `Você é um estrategista de marketing de conteúdo. Sua tarefa é criar um plano para ${neededQuantity} novos posts sequenciais no LinkedIn, baseados em um conteúdo principal e complementando os posts já existentes.

CONTEÚDO PRINCIPAL:
Tema: "${stripHtml(content.titulo)}"
Detalhes: "${stripHtml(content.conteudo)}"

PERSONA-ALVO:
${personaString}
${existingPostsString}
ESTRUTURA DA SEQUÊNCIA (AIDA):
1.  **Atenção:** Gancho impactante (dado, insight contraintuitivo).
2.  **Interesse:** Conexão com problema/oportunidade da persona.
3.  **Desejo:** Apresentação da transformação/benefício da solução.
4.  **Ação:** CTA direto para o conteúdo principal.

INSTRUÇÕES:
-   Crie um plano para exatamente ${neededQuantity} novos posts.
-   Para cada post, defina um título curto e chamativo.
-   Defina o "coração do prompt" que será usado para gerar o conteúdo completo em uma etapa posterior.
-   O "coração do prompt" deve ser uma instrução clara e concisa para um redator, incluindo o tipo de gancho, o ângulo e a emoção a ser evocada.
-   Varie os formatos e gatilhos para cada etapa do funil AIDA, evitando as etapas já cobertas nos posts existentes.

FORMATO DE RESPOSTA:
Retorne um array JSON com a seguinte estrutura. Não inclua markdown ou qualquer outro texto fora do JSON.

\`\`\`json
[
  {
    "post_numero": 1,
    "etapa_aida": "Atenção",
    "tipo_gancho": "Estatística Surpreendente",
    "titulo_sugerido": "O Erro Silencioso que Sabota 70% dos Projetos de TI",
    "coracao_prompt": "Comece com a estatística mais chocante que você encontrar sobre o fracasso de projetos de software devido à má gestão. Crie um senso de urgência e curiosidade.",
    "cta_sugerido": "Descubra a causa nº 1 de falhas em projetos.",
    "hashtags_sugeridas": ["#gestaodeprojetos", "#liderancatecnica"]
  }
]
\`\`\`
`;

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
export const generateFollowupPosts = async ({ content, plan }) => {
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

  const { persona, autor } = getCampaignPrompt();
  const personaString = formatObjectForPrompt(persona, ['description']);
  const autorString = formatObjectForPrompt(autor);

  const generatedPosts = [];
  const MAX_RETRIES = 3;
  const MIN_CONTENT_LENGTH = 600;

  for (const postPlan of plan) {
    const prompt = `
Você é um especialista em copywriting para o LinkedIn. Sua tarefa é escrever um post impactante e informativo.

PERSONA-ALVO:
${personaString}

AUTOR DO POST:
${autorString}

TEMA CENTRAL (do conteúdo principal):
"${stripHtml(content.titulo)}"

TÍTULO DO POST:
"${postPlan.titulo_sugerido}"

INSTRUÇÃO CRIATIVA (Coração do Prompt):
"${postPlan.coracao_prompt}"

REGRAS:
- Use o TÍTULO DO POST como o título do seu texto.
- O corpo do post deve ter **pelo menos ${MIN_CONTENT_LENGTH} caracteres**.
- O corpo do post deve ser estruturado em **até três parágrafos**.
- Separe os parágrafos com uma linha em branco.
- O tom deve ser profissional, mas conversacional.
- Use até 2 emojis relevantes.
- O texto final NÃO deve conter hashtags.
- O texto final NÃO deve conter um CTA, ele será adicionado depois.

FORMATO DE RESPOSTA:
Retorne um objeto JSON com as chaves "titulo_post" e "conteudo_post".

\`\`\`json
{
  "titulo_post": "O título do post gerado aqui...",
  "conteudo_post": "O conteúdo do post gerado aqui..."
}
\`\`\`
`;

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

        generatedPosts.push({
          post_numero: postPlan.post_numero,
          tipo_gancho: postPlan.tipo_gancho,
          etapa_aida: postPlan.etapa_aida,
          titulo: titulo_post,
          conteudo: conteudo_post,
          cta: postPlan.cta_sugerido,
          hashtags_sugeridas: postPlan.hashtags_sugeridas || [],
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
export const generateCommonSolutions = async ({ problema, persona }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  if (!problema || problema.trim() === '') {
    throw new Error('Problema não definido. Por favor, descreva o problema primeiro.');
  }

  const personaString = formatObjectForPrompt(persona, ['description']);

  const prompt = `
    Com base na seguinte descrição de Persona e no Problema apresentado, gere uma lista de 3 a 4 ideias de soluções ou propostas de campanha.

    PERSONA:
    ${personaString}

    PROBLEMA:
    "${problema}"

    REGRAS:
    1.  Cada item da lista deve ser uma string única contendo um texto completo sobre a solução.
    2.  Inicie cada string com um título curto em negrito (usando markdown **Título da Solução**).
    3.  Após o título, descreva a solução em um ou dois parágrafos concisos.
    4.  O texto deve ser prático e direto, focando em como a solução resolve o problema para a persona.
    5.  A resposta DEVE ser um array JSON de strings.

    FORMATO DE RESPOSTA (APENAS O JSON):
    \`\`\`json
    [
      "**Título da Solução 1**\\nDescrição detalhada da solução em um ou dois parágrafos...",
      "**Título da Solução 2**\\nDescrição detalhada da solução em um ou dois parágrafos..."
    ]
    \`\`\`
  `;

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
export const generateCommonProblems = async ({ persona }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }
  geminiAPI.initialize(apiKey);

  if (!persona || Object.keys(persona).length === 0) {
    throw new Error('Persona não definida. Por favor, configure a persona primeiro.');
  }

  const personaString = formatObjectForPrompt(persona, ['description']);

  const prompt = `
    Com base na seguinte descrição de Persona, gere uma lista de 3 a 4 problemas ou necessidades comuns que essa persona provavelmente enfrenta.

    PERSONA:
    ${personaString}

    REGRAS:
    1.  Cada item da lista deve ser uma string única contendo um texto completo sobre o problema.
    2.  Inicie cada string com um título curto em negrito (usando markdown **Título**).
    3.  Após o título, descreva o problema em um ou dois parágrafos concisos.
    4.  O texto deve ser prático e direto, focando na "dor" ou necessidade da persona.
    5.  A resposta DEVE ser um array JSON de strings.

    FORMATO DE RESPOSTA (APENAS O JSON):
    \`\`\`json
    [
      "**Título do Problema 1**\\nDescrição detalhada do problema em um ou dois parágrafos...",
      "**Título do Problema 2**\\nDescrição detalhada do problema em um ou dois parágrafos..."
    ]
    \`\`\`
  `;

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

  const finalPrompt = `A partir do TEXTO BASE fornecido abaixo, gere conteúdo para um carrossel de Instagram com ${promptNumRecords} elementos.

TEXTO BASE:
${stripHtml(promptText)}

INSTRUÇÕES DE FORMATAÇÃO DA SAÍDA (MUITO IMPORTANTE):
A SUA RESPOSTA DEVE CONTER *APENAS E SOMENTE* UM BLOCO DE TEXTO FORMATADO COMO CSV, SEM NENHUM TEXTO ADICIONAL ANTES OU DEPOIS DO BLOCO CSV.
O BLOCO CSV DEVE SER DELIMITADO EXATAMENTE POR TRÊS CRASE SEGUIDAS E A PALAVRA "csv" (\`\`\`csv) NO INÍCIO, E TRÊS CRASE SEGUIDAS (\`\`\`) NO FINAL.
DENTRO DO BLOCO CSV:
- A primeira linha DEVE SER o cabeçalho: Titulo;Texto Principal;Ponte para o Próximo;prompt_imagem_carrossel
- As linhas subsequentes DEVERÃO ser os dados de cada elemento, com os campos separados por PONTO E VÍRGULA (;).
- NÃO inclua números de elemento ou qualquer outra coluna além de "Titulo", "Texto Principal", "Ponte para o Próximo", e "prompt_imagem_carrossel".
- NÃO inclua explicações, introduções, ou qualquer texto fora do bloco \`\`\`csv ... \`\`\`.

REQUISITOS PARA O CONTEÚDO DE CADA ELEMENTO (LINHA DO CSV):
1. **Titulo** (Coluna 1):
   - Máximo de 4 palavras.
   - Precisa ser curto e impactante.
   - Exemplo: "Segredo Revelado"
2. **Texto Principal** (Coluna 2):
   - Entre 120 e 180 caracteres.
   - Adaptado do TEXTO BASE, com linguagem conversacional e direta.
   - Deve conter 1 pergunta retórica para engajamento.
   - Exemplo: "Sabia que 80% dos negócios falham nisso? Descubra como evitar esse erro..."
3. **Ponte para o Próximo** (Coluna 3):
   - Máximo de 40 caracteres.
   - Criar curiosidade para o próximo elemento.
   - Usar fórmula: Emoji + Chamada + Dica do próximo.
   - No último elemento, substitua por uma Chamada para Ação (CTA) final.
   - Exemplos:
     → "Próximo: O passo que muda tudo!"
     → "Siga para o segredo nº3 👇"
4. **prompt_imagem_carrossel** (Coluna 4):
   - Um prompt de texto detalhado para um modelo de geração de imagem (como DALL-E ou Midjourney).
   - O prompt deve descrever uma imagem de fundo visualmente atraente e conceitual para um post de carrossel, sobre a qual os campos de texto seriam sobrepostos.
   - A imagem descrita NÃO DEVE CONTER TEXTO.
   - O prompt deve ser em inglês, para compatibilidade com os modelos de imagem.
   - Exemplo: "A vibrant, abstract background with swirling gradients of blue and gold, representing the flow of data and innovation, with a soft, clean area for text overlay."

ESTRUTURA NARRATIVA SUGERIDA:
- Elemento 1: Dado impactante ou pergunta instigante extraída do início do TEXTO BASE.
- Elementos intermediários: Desenvolver os pontos principais do TEXTO BASE.
- Último Elemento: CTA claro ou resumo conclusivo.

TOM DE VOZ:
- Empático e motivacional (use "você" e "vamos").
- Urgência controlada ("Agora você pode...").
- Toque de storytelling.

Exemplo de como o BLOCO CSV deve se parecer na sua resposta (não inclua este exemplo na sua resposta final, apenas o bloco gerado):
\`\`\`csv
Titulo;Texto Principal;Ponte para o Próximo;prompt_imagem_carrossel
✨ Grande Novidade;Descubra algo incrível que vai mudar seu dia! Você está pronto para a surpresa?;➡️ Veja o próximo!;A vibrant, abstract background with swirling gradients of blue and gold.
🎉 Outra Dica;Continuando nossa jornada com mais um segredo. Já se perguntou como isso é possível?;CTA Final Aqui!;An image of a brain with glowing neural pathways, symbolizing new knowledge.
\`\`\`
Lembre-se: Sua resposta final deve conter APENAS o bloco \`\`\`csv ... \`\`\` com os dados.`;

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
    // The original function used toast, but in a util file, it's better to throw.
    // The calling component will be responsible for catching the error and showing a toast.
    throw new Error('Por favor, configure sua chave de API Gemini primeiro.');
  }
  geminiAPI.initialize(apiKey);

  const prompt = `Crie uma paleta harmoniosa de 5 cores baseada no briefing abaixo, aplicando princípios da psicologia das cores na cultura ocidental.

**Briefing do Cliente:**
${briefing}

**Diretrizes de Psicologia das Cores (Cultura Ocidental):**
- Considere estas associações-chave:
  * **Vermelho:** Energia, paixão, urgência (comida, liquidações), perigo.
  * **Azul:** Confiança, segurança, calma, profissionalismo (bancos, saúde, tech).
  * **Verde:** Natureza, crescimento, sustentabilidade, saúde, tranquilidade.
  * **Amarelo:** Otimismo, criatividade, atenção (uso moderado), cautela.
  * **Roxo:** Luxo, criatividade, espiritualidade, realeza (beleza, artes).
  * **Laranja:** Entusiasmo, jovialidade, acessibilidade (diversão, calls-to-action).
  * **Rosa:** Feminilidade, ternura, compaixão (beleza, infantil).
  * **Preto:** Sofisticação, poder, elegância (luxo, moda).
  * **Branco:** Pureza, simplicidade, limpeza (saúde, minimalismo).
  * **Cinza:** Neutralidade, equilíbrio, modernidade (tecnologia, corporativo).
  * **Marrom:** Solidez, confiabilidade, natureza (orgânico, artesanal).
- Tons **pastéis** transmitem suavidade; **vibrantes** geram impacto.
- Evite combinações culturalmente negativas (ex: vermelho+puro preto = agressão/extremismo).

**Formato de Saída OBRIGATÓRIO:**
A resposta DEVE ser um único objeto JSON, sem nenhum texto ou formatação markdown (como \`\`\`json) antes ou depois. O JSON deve ter a seguinte estrutura:
{
  "palette": [
    {
      "hex": "#RRGGBB",
      "rgb": "RGB(R, G, B)",
      "name": "Nome da Cor",
      "role": "Primária | Secundária | Acento | Neutro Claro | Neutro Escuro",
      "justification": "Explicação psicológica em uma frase."
    }
  ],
  "harmony": "Nome da Harmonia (Análoga, Complementar, Triádica, etc.)"
}
`;

  try {
    const response = await geminiAPI.generateContent(prompt, 'Geração de Paleta de Cores');
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Não foi possível extrair o JSON da resposta da IA.");
  } catch (error) {
    console.error("Erro ao gerar paleta de cores com IA:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
};
