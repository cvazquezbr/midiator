import { getGeminiModel, getGeminiImageModel } from './geminiCredentials';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    this.isInitialized = false;
  }

  /**
   * Initializes the API with the user's API key.
   * @param {string} apiKey - The Gemini API key.
   */
  initialize(apiKey) {
    if (!apiKey) {
      console.error("GeminiAPI: A chave da API não foi fornecida para inicialização.");
      this.isInitialized = false;
      return;
    }
    this.apiKey = apiKey;
    this.isInitialized = true;
  }

  /**
   * Calls the Gemini API to generate text content.
   * @param {string} promptString - The complete prompt to be sent to the API.
   * @param {string} purpose - A descriptive purpose for logging.
   * @returns {Promise<string>} The response text from the AI.
   */
  async generateContent(promptString, purpose = 'Chamada Genérica') {
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    const model = getGeminiModel() || 'gemini-1.5-pro';
    console.log(`[${purpose}] Iniciando chamada à API Gemini com o modelo ${model}.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    const apiUrl = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptString
            }]
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData.error?.message || `Erro ${response.status}`;
        console.error('Erro da API Gemini:', errorData);
        throw new Error(`Erro da API Gemini: ${errorMessage}`);
      }

      const responseData = await response.json();
      console.log(`[${purpose}] Resposta da API Gemini (bruta):`, responseData);

      if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = responseData.candidates[0].content.parts[0].text.trim();
        console.log(`[${purpose}] Resposta extraída:`, resultText);
        return resultText;
      } else {
        console.error('Formato de resposta inesperado da API Gemini:', responseData);
        throw new Error('Formato de resposta inesperado da API Gemini.');
      }
    } catch (error) {
      console.error('Erro ao chamar a API Gemini:', error);
      if (error instanceof Error && error.message.startsWith('Erro da API Gemini:')) {
          throw error;
      }
      throw new Error(`Falha na comunicação com a API Gemini: ${error.message}`);
    }
  }

  /**
   * Calls the Gemini API to generate an image.
   * @param {string} promptString - The prompt for image generation.
   * @param {string} purpose - A descriptive purpose for logging.
   * @returns {Promise<string>} The base64 encoded image data.
   */
  async generateImage(promptString, purpose = 'Geração de Imagem') {
    if (!this.isInitialized) {
      throw new Error('GeminiAPI não foi inicializada. Chame initialize() primeiro.');
    }
    if (!promptString) {
      throw new Error('O prompt não pode ser vazio.');
    }

    const model = getGeminiImageModel() || 'gemini-2.0-flash-preview-image-generation';
    console.log(`[${purpose}] Iniciando chamada à API de Imagem Gemini com o modelo ${model}.`);
    console.log(`[${purpose}] Prompt:`, promptString);

    const apiUrl = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptString
            }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData.error?.message || `Erro ${response.status}`;
        console.error('Erro da API Gemini (Imagem):', errorData);
        throw new Error(`Erro da API Gemini (Imagem): ${errorMessage}`);
      }

      const responseData = await response.json();
      console.log(`[${purpose}] Resposta da API de Imagem Gemini (bruta):`, responseData);

      // Check for prompt feedback which indicates a safety block
      if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
        const blockReason = responseData.promptFeedback.blockReason;
        const safetyRatings = responseData.promptFeedback.safetyRatings;
        console.error(`[${purpose}] A solicitação foi bloqueada pela API Gemini. Razão: ${blockReason}`);
        console.error(`[${purpose}] Detalhes de Segurança:`, safetyRatings);
        throw new Error(`A geração de imagem foi bloqueada por questões de segurança: ${blockReason}. Verifique o conteúdo do seu prompt.`);
      }

      const imagePart = responseData.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart) {
        console.log(`[${purpose}] Imagem Base64 recebida (tamanho: ${imagePart.inlineData.data.length} bytes).`);
        return imagePart.inlineData.data;
      } else {
        // This case handles when there are no candidates, but it wasn't explicitly blocked.
        console.error('Formato de resposta inesperado da API Gemini (Imagem). Nenhum candidato ou parte de imagem encontrada:', responseData);
        throw new Error('Nenhuma imagem foi retornada pela API. A resposta não continha dados de imagem.');
      }
    } catch (error) {
      console.error('Erro ao chamar a API de imagem Gemini:', error);
      if (error instanceof Error && error.message.startsWith('Erro da API Gemini')) {
        throw error;
      }
      throw new Error(`Falha na comunicação com a API de imagem Gemini: ${error.message}`);
    }
  }

  /**
   * Sends the base briefing and a reference model to the Gemini API for revision.
   * @param {string} baseText - The HTML content of the user's base briefing.
   * @param {string} referenceText - The plain text content of the reference model.
   * @returns {Promise<object>} An object containing the revisedText and revisionNotes.
   */
  async reviseBriefing(baseText, referenceText) {
    const purpose = 'Revisão de Briefing';
    console.log(`[${purpose}] Iniciando revisão de briefing.`);

    const prompt = `
     Aja como um especialista em comunicação e marketing. 
      Sua tarefa é revisar um "TEXTO BASE" de briefing usando um "MODELO DE REFERÊNCIA" e um conjunto de regras.

      **CONTEXTO:**
      1.  **TEXTO BASE (Fornecido pelo usuário, em HTML):**
          \`\`\`html
          ${baseText}
          \`\`\`

      2.  **MODELO DE REFERÊNCIA (Define a estrutura e os blocos obrigatórios):**

        Os blocos obrigatórios são:
        - TÍTULO DA MISSÃO
        - SAUDAÇÃO
        - ENTREGAS
        - MENSAGEM PRINCIPAL
        - CTA
        - INSPIRAÇÕES
        - PRÓXIMOS PASSOS
        - DOs
        - DON'Ts
        - HASHTAGS

        O modelo de exemplo é:
          \`\`\`text
          ${referenceText}
          \`\`\`

      **REGRAS DE REVISÃO:**

      1.  **Estrutura Rígida:** 

          O "BRIEFING REVISADO" deve conter APENAS os blocos de títulos (ex: "# Título") presentes no "MODELO DE REFERÊNCIA". 
          Qualquer bloco do "TEXTO BASE" que não exista no modelo, deve ter o seu conteúdo único avaliado quanto a melhor localização no "BRIEFING REVISADO".  

      2.  **Requisitos (DOs):** 
      
          Encontre no "TEXTO BASE" qualquer frase que seja um requisito, uma ordem, ou uma sugestão imperativa (exceto as que estiverem no bloco "Próximos Passos"). 
          Mova essas frases para o bloco "DOs" do "BRIEFING REVISADO", formatando-as como itens de lista (usando '-').
          Os DOs do "MODELO DE REFERÊNCIA" devem ser mantidos e precedido de '-';
          Os DOs adicionais devem ser precedidos de '•'.

      3.  **Restrições (DON'Ts):** 
      
          Encontre no "TEXTO BASE" qualquer frase que indique uma restrição ou algo a ser evitado (exceto as que estiverem no bloco "Próximos Passos"). 
          Mova essas frases para o bloco "DON'Ts" do "BRIEFING REVISADO", formatando-as como itens de lista (usando '-').
          Os DON'Ts do "MODELO DE REFERÊNCIA" devem ser mantidos e precedido de '-';
          Os DON'Ts adicionais devem ser precedidos de '•'.

      4.  **Mensagem Principal:** 

          O limite de caracteres é de 250 posições. 
          Este bloco deve ser um "Guia de Mensagens Chave", não um script.
          - Use no máximo 3 tópicos (formato de lista com '-').
          - O conteúdo deve ser único e não repetir informações que pertencem aos blocos DOs, DON'Ts ou CTA.
          - Se o "TEXTO BASE" já atender a essas regras, deve-se priorizar mantê-lo inalterado.

      5.  **Conteúdo Original:** 
      
          Mantenha o conteúdo dos outros blocos do "TEXTO BASE" que correspondem ao "MODELO DE REFERÊNCIA", mas adapte-os para se encaixar na nova estrutura.

      6.  **Hashtags** 

        Os hashtags devem ser precedidos de '#' e separados por vírgula.

      **SAÍDA ESPERADA:**
      Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto, markdown ou qualquer formatação adicional. Use EXATAMENTE a seguinte estrutura:
      {
        "revisedText": "O conteúdo completo do briefing revisado em formato Markdown. Use '##' para os títulos de cada seção.",
        "revisionNotes": ["Uma nota de revisão aqui.", "Outra nota de revisão aqui.", "E uma terceira nota aqui."]
      }
    `;

    const responseText = await this.generateContent(prompt, purpose);

    // More robust JSON extraction to handle potential markdown code blocks
    const match = responseText.match(/```json\n([\s\S]*?)\n```|```([\s\S]*?)```/);
    let jsonString = responseText;
    if (match) {
        jsonString = match[1] || match[2];
    } else {
       // Fallback for plain JSON object
       const plainJsonMatch = responseText.match(/\{[\s\S]*\}/);
       if (plainJsonMatch) {
           jsonString = plainJsonMatch[0];
       }
    }

    try {
      const parsed = JSON.parse(jsonString);
      console.log(`[${purpose}] JSON extraído e parseado com sucesso.`);
      return parsed;
    } catch (e) {
      console.error(`[${purpose}] Falha ao parsear JSON da resposta da IA:`, e);
      console.error(`[${purpose}] String JSON que falhou:`, jsonString);
      throw new Error("A resposta da IA não continha um JSON válido.");
    }
  }

  async generateBlockSuggestion(title, context) {
    const purpose = `Sugestão para Bloco: ${title}`;
    console.log(`[${purpose}] Iniciando geração de sugestão.`);

    const prompt = `
      Aja como um especialista em comunicação e marketing. Sua tarefa é gerar o conteúdo para uma seção específica de um briefing de campanha.

      **SEÇÃO A SER GERADA:**
      ## ${title}

      **CONTEXTO DO BRIEFING (Use como base para a sua sugestão):**
      - **Sobre a campanha:** ${context.campaignInfo || 'Não informado.'}
      - **Mensagem Principal:** ${context.mainMessage || 'Não informado.'}
      - **O que FAZER (DOs):** ${context.dos || 'Não informado.'}
      - **O que NÃO FAZER (DON'Ts):** ${context.donts || 'Não informado.'}

      **REQUISITOS:**
      - Gere um texto conciso e objetivo para a seção "${title}".
      - O texto deve ser criativo e alinhado com o contexto fornecido.
      - A resposta deve ser APENAS o texto sugerido para o bloco, em formato Markdown, sem qualquer outra explicação, título ou formatação.
    `;

    const responseText = await this.generateContent(prompt, purpose);
    // The response is expected to be plain text/markdown, not JSON.
    return responseText.trim();
  }
}

// Export a single instance (singleton)
const geminiAPI = new GeminiAPI();
export default geminiAPI;
