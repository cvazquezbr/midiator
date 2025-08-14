import { getCampaignPrompt } from './campaignPrompt.js';
import { callGeminiApi, generateImage } from './geminiAPI.js';
import { getGeminiApiKey } from './geminiCredentials.js';
import { stripHtml } from '../lib/utils.js';

const formatObjectForPrompt = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj)
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

  const { persona, autor, instrucoes, formato } = getCampaignPrompt();

  const personaString = formatObjectForPrompt(persona);
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

  const response = await callGeminiApi(finalPrompt, apiKey, 'Geração de Conteúdo de Campanha');

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

  let hashtags = [];
  if (Array.isArray(parsedContent.hashtags)) {
    hashtags = parsedContent.hashtags;
  } else if (typeof parsedContent.hashtags === 'string') {
    hashtags = parsedContent.hashtags.split(',').map(h => h.trim().replace(/^#/, ''));
  }

  return {
    titulo: parsedContent.titulo || parsedContent.title || '',
    conteudo: parsedContent.conteudo || parsedContent.body || '',
    cta: parsedContent.cta || '',
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

  const { persona, autor, colors } = getCampaignPrompt();
  const personaString = formatObjectForPrompt(persona);
  const autorString = formatObjectForPrompt(autor);

  const colorPalettePrompt = colors && colors.length > 0
    ? `A imagem deve usar predominantemente a seguinte paleta de cores: ${colors.join(', ')}.`
    : '';

  const imagePrompt = `
    Gere uma imagem de fundo para um post. A imagem deve ser visualmente atraente e complementar o conteúdo, mas sem distrair o leitor.
    Persona: ${personaString}
    Autor: ${autorString}
    Resumo do Conteúdo: ${stripHtml(content.titulo)}. ${stripHtml(content.conteudo)}
    Razão de Aspecto: ${aspectRatio}
    ${colorPalettePrompt}
    ATENÇÃO: A IMAGEM DEVE SERVIR COMO IMAGEM DE FUNDO. NÃO DEVE CONTER, SOB NENHUMA CIRCUNSTÂNCIA, QUALQUER TIPO DE TEXTO, ESCRITA, LETRAS, NÚMEROS OU PALAVRAS. A imagem deve ser puramente visual e abstrata ou conceitual, sem nenhum elemento textual.
  `;

  const base64Image = await generateImage(imagePrompt, apiKey, 'Geração de Imagem de Campanha');
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

  const rawContent = await callGeminiApi(prompt, apiKey, 'Formatação de Conteúdo para HTML');
  const match = rawContent.match(/^`{3}(?:html)?\s*([\s\S]+?)\s*`{3}$/);
  return match && match[1] ? match[1].trim() : rawContent.trim();
};


/**
 * Generates follow-up posts for the campaign.
 */
export const generateFollowupPosts = async ({ content, followupPostsQuantity }) => {
  if (!content?.conteudo) {
    throw new Error("Conteúdo principal deve ser gerado primeiro.");
  }
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }

  const { persona } = getCampaignPrompt();
  const personaString = formatObjectForPrompt(persona);

  const prompt = 
  `Você é um especialista em marketing de conteúdo e copywriting.
Sua tarefa é criar ${followupPostsQuantity} posts sequenciais seguindo o modelo AIDA (Atenção → Interesse → Desejo → Ação), usando o conteúdo principal como base.

CONTEÚDO PRINCIPAL:
O tema abordado é: [${stripHtml(content.titulo)} - ${stripHtml(content.conteudo)}]

PERSONAS-ALVO:

${personaString}

ESTRUTURA DA SEQUÊNCIA (AIDA + formatos variados):
Post 1 — Atenção (Gancho Impactante)

Objetivo: quebrar o padrão e despertar curiosidade.
Formato: dado estatístico ou insight contraintuitivo.
Gatilhos: curiosidade, surpresa, urgência leve.

Post 2 — Interesse (Problema/Oportunidade)

Objetivo: mostrar relevância e conexão com a dor ou desejo da persona.
Formato: situação real ou pergunta reflexiva.
Gatilhos: dor/problema, urgência, identificação.

Post 3 — Desejo (Transformação/Benefício)

Objetivo: criar desejo pela solução ou mudança.
Formato: caso real ou prova social (autoridade, sucesso de clientes).
Gatilhos: prova social, autoridade, ganho futuro.

Post 4 — Ação (Call-to-Action Direto)

Objetivo: levar a persona a interagir com o conteúdo completo.
Formato: frase de impacto + CTA.
Gatilhos: urgência, exclusividade, clareza na próxima etapa.

REGRAS GERAIS PARA TODOS OS POSTS:
O campo "conteudo" NÃO DEVE incluir hashtags. As hashtags devem ser listadas apenas no campo "hashtags_sugeridas".
Cada post deve ter entre 400–600 caracteres.
Tom profissional, porém conversacional, refletindo depoimento ou experiência.
Inclua até 2 emojis estratégicos por post.
Cada post deve funcionar de forma independente, mas também fazer sentido como parte de uma sequência lógica.
CTAs variados, como: “Leia mais”, “Descubra como”, “Saiba o que fazer”, “Baixe agora”.

      FORMATO DE RESPOSTA:
      Retorne um array JSON com a seguinte estrutura:

      \`\`\`json
      [
        {
          "post_numero": 1,
          "tipo_gancho": "dor/problema",
          "conteudo": "Texto do post aqui...",
          "cta": "Call-to-action específico",
          "hashtags_sugeridas": ["#liderancatecnica", "#gestaoequipes"]
        }
      ]
      \`\`\`

      OBJETIVO:
      Cada post deve despertar curiosidade e criar um gap de informação que só será preenchido ao ler o conteúdo principal completo.
    `;

  const response = await callGeminiApi(prompt, apiKey, 'Geração de Posts de Acompanhamento');
  const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    return JSON.parse(jsonMatch[1]);
  }
  // Attempt to parse directly if no markdown block is found
  try {
    return JSON.parse(response);
  } catch (e) {
    console.error("Failed to parse follow-up posts response as JSON:", response);
    throw new Error("A resposta da IA para os posts de follow-up não estava em um formato JSON válido.");
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
- A primeira linha DEVE SER o cabeçalho: Titulo;Texto Principal;Ponte para o Próximo
- As linhas subsequentes DEVERÃO ser os dados de cada elemento, com os campos separados por PONTO E VÍRGULA (;).
- NÃO inclua números de elemento ou qualquer outra coluna além de "Titulo", "Texto Principal", e "Ponte para o Próximo".
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
Titulo;Texto Principal;Ponte para o Próximo
✨ Grande Novidade;Descubra algo incrível que vai mudar seu dia! Você está pronto para a surpresa?;➡️ Veja o próximo!
🎉 Outra Dica;Continuando nossa jornada com mais um segredo. Já se perguntou como isso é possível?;CTA Final Aqui!
\`\`\`
Lembre-se: Sua resposta final deve conter APENAS o bloco \`\`\`csv ... \`\`\` com os dados.`;

  const iaResponseText = await callGeminiApi(finalPrompt, apiKey, 'Geração de Conteúdo CSV com IA');
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
    const response = await callGeminiApi(prompt, apiKey, 'Geração de Paleta de Cores');
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
