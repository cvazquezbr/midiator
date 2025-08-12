import { getCampaignPrompt } from './campaignPrompt.js';
import { callGeminiApi, generateImage } from './geminiAPI.js';
import { getGeminiApiKey } from './geminiCredentials.js';
import { stripHtml } from '../lib/utils.js';

/**
 * Generates the main campaign content using an AI API.
 */
export const generateCampaignContent = async ({ problema, solucao }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini não configurada.');
  }

  const { persona, autor, instrucoes, formato } = getCampaignPrompt();

  const promptCompleto = `
    Persona: ${stripHtml(persona)}
    Autor: ${stripHtml(autor)}
    Formato: ${stripHtml(formato)}
    Problema: ${stripHtml(problema)}
    Solução: ${stripHtml(solucao)}
    ${stripHtml(instrucoes)}
  `;

  const finalPrompt = `${promptCompleto}\n\nGere uma resposta JSON com os seguintes campos: "titulo" (string), "conteudo" (string), "cta" (string), e "hashtags" (string, separadas por vírgula). A resposta deve ser apenas o JSON.`;

  console.log("Gerando conteúdo da campanha com prompt:", finalPrompt);
  const response = await callGeminiApi(finalPrompt, apiKey);
  console.log("Resposta da IA (Campanha):", response);

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
  const colorPalettePrompt = colors && colors.length > 0
    ? `A imagem deve usar predominantemente a seguinte paleta de cores: ${colors.join(', ')}.`
    : '';

  const imagePrompt = `
    Persona: ${stripHtml(persona)}
    Autor: ${stripHtml(autor)}
    Resumo do Conteúdo: ${stripHtml(content.titulo)}. ${stripHtml(content.conteudo)}
    Razão de Aspecto: ${aspectRatio}
    ${colorPalettePrompt}
    ATENÇÃO: A imagem gerada não deve conter, sob NENHUMA CIRCUNSTÂNCIA, qualquer tipo de texto, escrita, letras, números ou palavras. A imagem deve ser puramente visual.
  `;

  const base64Image = await generateImage(imagePrompt, apiKey);
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

  const rawContent = await callGeminiApi(prompt, apiKey);
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
  const prompt = 
  `Você é um especialista em marketing de conteúdo e copywriting.
Sua tarefa é criar ${followupPostsQuantity} posts sequenciais seguindo o modelo AIDA (Atenção → Interesse → Desejo → Ação), usando o conteúdo principal como base.

CONTEÚDO PRINCIPAL:
O tema abordado é: [${stripHtml(content.titulo)} - ${stripHtml(content.conteudo)}]

PERSONAS-ALVO:

${stripHtml(persona)}

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
Cada post deve ter entre 150–250 caracteres.
Tom profissional, porém conversacional.
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

  const response = await callGeminiApi(prompt, apiKey);
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

  console.log("Gerando conteúdo de IA com prompt:", finalPrompt);
  const iaResponseText = await callGeminiApi(finalPrompt, apiKey);
  console.log("Resposta da IA (Conteúdo):", iaResponseText);
  return iaResponseText;
};
