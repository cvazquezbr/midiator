import { getGeminiModel, getGeminiImageModel } from './geminiCredentials';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    this.isInitialized = false;
  }

  initialize(apiKey) {
    if (!apiKey) {
      console.error("GeminiAPI: A chave da API não foi fornecida para inicialização.");
      this.isInitialized = false;
      return;
    }
    this.apiKey = apiKey;
    this.isInitialized = true;
  }

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

  async generateImage(promptString, purpose = 'Geração de Imagem') {
    // Implementation omitted for brevity
  }

  async reviseBriefing(baseText, referenceText) {
    const purpose = 'Revisão de Briefing';
    console.log(`[${purpose}] Iniciando revisão de briefing com modelo.`);

    const prompt = `
      Aja como um Diretor de Criação especialista. Sua tarefa é analisar um "TEXTO BASE" de um briefing e reestruturá-lo completamente com base em um "MODELO DE REFERÊNCIA".

      **1. MODELO DE REFERÊNCIA (Define a estrutura e os blocos obrigatórios):**
      O conteúdo deste modelo define as seções que você DEVE criar. Use os títulos das seções (linhas que começam com '##') como as chaves para o objeto "sections" no seu JSON de saída.
      \`\`\`markdown
      ${referenceText}
      \`\`\`

      **2. TEXTO BASE (Fornecido pelo usuário, pode estar em HTML ou texto simples):**
      Este é o conteúdo que você precisa analisar e reorganizar.
      \`\`\`html
      ${baseText}
      \`\`\`

      **SUA TAREFA:**
      1.  **Leia o TEXTO BASE** e entenda o conteúdo de cada parte.
      2.  **Use os TÍTULOS do MODELO DE REFERÊNCIA** como as chaves para o objeto "sections" na sua resposta JSON.
      3.  **Preencha cada seção** no JSON com o conteúdo correspondente do TEXTO BASE. Se uma seção do modelo não tiver conteúdo correspondente no texto base, deixe o valor como uma string vazia ("").
      4.  **Consolide o conteúdo:** Mova todo o conteúdo relevante do TEXTO BASE para as seções apropriadas definidas pelo MODELO. Não deixe conteúdo para trás. O conteúdo deve ser em HTML simples.
      5.  **Regra Especial para DOs e DON'Ts:**
          - Identifique os itens de lista nas seções "DOs" e "DON'Ts" do **MODELO DE REFERÊNCIA**. Estes são os itens padrão.
          - Identifique quaisquer diretrizes, regras ou sugestões no **TEXTO BASE** que funcionem como um "DO" ou "DON'T". Estes são os itens específicos do briefing.
          - Na sua resposta JSON, para as seções "DOs" e "DON'Ts", você deve combinar ambos.
          - Para os itens que vieram do **MODELO**, use um marcador de lista padrão (ex: '<li>Item do Modelo</li>').
          - Para os itens que você extraiu do **TEXTO BASE**, use um emoji para diferenciação: '<li>✅ Item específico do Briefing</li>' para DOs, e '<li>❌ Item específico do Briefing</li>' para DON'Ts.
          - O resultado final para "DOs" e "DON'Ts" deve ser uma única string HTML contendo uma lista '<ul>'.
      6.  **Crie Notas de Revisão:** Com base na sua análise, crie uma lista de 3 a 5 notas (em um array de strings) sobre o que foi alterado, o que pode ser melhorado ou o que estava faltando no briefing original.

      **REQUISITOS DE SAÍDA:**
      - Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto ou formatação adicional fora dele.
      - A estrutura do JSON deve ser EXATAMENTE a seguinte:
      {
        "sections": {
          "TÍTULO DA MISSÃO": "<p>Conteúdo extraído e adaptado do texto base para esta seção.</p>",
          "SAUDAÇÃO": "<p>Conteúdo da saudação...</p>",
          "ENTREGAS": "<p>Conteúdo das entregas...</p>",
          "MENSAGEM PRINCIPAL": "<p>Conteúdo da mensagem principal...</p>",
          "CTA": "<p>Conteúdo do CTA...</p>",
          "INSPIRAÇÕES": "<p>Conteúdo das inspirações...</p>",
          "PRÓXIMOS PASSOS": "<p>Conteúdo dos próximos passos...</p>",
          "DOs": "<ul><li>Item do Modelo 1</li><li>✅ Item específico do Briefing 1</li></ul>",
          "DON'Ts": "<ul><li>Item do Modelo 1</li><li>❌ Item específico do Briefing 1</li></ul>",
          "HASHTAGS": "<p>#hashtag1, #hashtag2</p>"
        },
        "revisionNotes": ["Nota de revisão 1.", "Nota de revisão 2.", "Nota de revisão 3."]
      }
    `;

    const responseText = await this.generateContent(prompt, purpose);

    const match = responseText.match(/```json\n([\s\S]*?)\n```|```([\s\S]*?)```/);
    let jsonString = responseText;
    if (match) {
        jsonString = match[1] || match[2];
    } else {
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
    // Implementation omitted for brevity
  }
}

const geminiAPI = new GeminiAPI();
export default geminiAPI;