import Papa from 'papaparse';

export const parseIaResponseToCsvData = (responseText) => {
    // Definição dos cabeçalhos esperados pelo GerenciadorRegistros
    const finalHeaders = ["Título", "Texto Principal", "Ponte para o Próximo"];
    const data = [];

    if (!responseText || typeof responseText !== 'string') {
      console.error("[parseIaResponseToCsvData] Resposta da IA inválida ou vazia.");
      return { data: [], headers: finalHeaders };
    }

    console.log("[parseIaResponseToCsvData] Resposta bruta recebida para parsing:", responseText);

    // 1. Extrair o bloco CSV
    const csvBlockRegex = /```csv\s*([\s\S]+?)\s*```/;
    const csvMatch = responseText.match(csvBlockRegex);
    console.log("[parseIaResponseToCsvData] Resultado do match da regex (csvMatch):", csvMatch);

    if (csvMatch && csvMatch[1] && csvMatch[1].trim() !== "") {
      const csvContent = csvMatch[1].trim();
      console.log("[parseIaResponseToCsvData] Conteúdo CSV bruto extraído (csvMatch[1]):", csvMatch[1]);
      console.log("[parseIaResponseToCsvData] Conteúdo CSV após trim (csvContent):", csvContent);

      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      console.log("[parseIaResponseToCsvData] Resultado do Papa.parse:", parseResult);

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.error("[parseIaResponseToCsvData] Erros durante o parsing com PapaParse:", parseResult.errors.map(err => ({ ...err, input: undefined })));
      }

      if (parseResult.data && parseResult.data.length > 0) {
        const actualHeadersFromIA = parseResult.meta.fields || [];
        console.log("[parseIaResponseToCsvData] Cabeçalhos reais detectados pela IA (via PapaParse):", actualHeadersFromIA);

        const headerMap = {};
        actualHeadersFromIA.forEach(iaHeader => {
          const iaHeaderTrimmed = iaHeader.trim();
          const iaHeaderLower = iaHeaderTrimmed.toLowerCase();
          if (iaHeaderLower.includes('titulo') || iaHeaderLower.includes('título')) headerMap[iaHeaderTrimmed] = "Título";
          else if (iaHeaderLower.includes('texto_principal') || iaHeaderLower.includes('texto principal')) headerMap[iaHeaderTrimmed] = "Texto Principal";
          else if (iaHeaderLower.includes('ponte_proximo') || iaHeaderLower.includes('ponte para o próximo')) headerMap[iaHeaderTrimmed] = "Ponte para o Próximo";
          else if (iaHeaderLower.includes('id_elemento') || iaHeaderLower.includes('id') || iaHeaderLower.includes('num_slide') || iaHeaderLower.includes('elemento')) headerMap[iaHeaderTrimmed] = "id";
        });
        console.log("[parseIaResponseToCsvData] Mapa de Cabeçalhos construído:", headerMap);

        parseResult.data.forEach(rawRecord => {
          const record = {};
          let hasTitle = false;
          for (const iaHeaderMapped in headerMap) {
            const targetAppHeader = headerMap[iaHeaderMapped];
            if (Object.prototype.hasOwnProperty.call(rawRecord, iaHeaderMapped)) {
              let value = rawRecord[iaHeaderMapped];
              record[targetAppHeader] = value !== null && value !== undefined ? String(value).trim() : "";
              if (targetAppHeader === "Título" && record[targetAppHeader]) {
                hasTitle = true;
              }
            }
          }
          if (hasTitle) {
            finalHeaders.forEach(appFinalHeader => {
              if (!record[appFinalHeader]) record[appFinalHeader] = "";
            });
            data.push(record);
          } else {
            console.warn("[parseIaResponseToCsvData] Registro ignorado por não ter um 'Título' mapeado:", rawRecord);
          }
        });
        console.log("[parseIaResponseToCsvData] Dados Parseados com Sucesso (Gemini CSV via PapaParse):", data);
        return { data, headers: finalHeaders };
      } else {
        console.error("[parseIaResponseToCsvData] PapaParse não retornou dados ou dados eram vazios, mesmo após encontrar bloco CSV.");
      }
    } else {
      console.error("[parseIaResponseToCsvData] Bloco CSV não encontrado ou vazio na resposta da IA. Detalhes do csvMatch:", csvMatch);
    }

    // Se chegou aqui, o parsing do bloco CSV falhou ou não havia bloco CSV. Tentar fallback.
    console.log("[parseIaResponseToCsvData] Tentando parser de fallback (formato DeepSeek).");
    const fallbackLines = responseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentRecord = {};
    const fallbackData = []; // Usar um novo array para o fallback

    for (const line of fallbackLines) {
      if (line.toLowerCase().startsWith("título:") || line.toLowerCase().startsWith("titulo:")) {
        if (Object.keys(currentRecord).length > 0 && currentRecord["Título"]) fallbackData.push(currentRecord);
        currentRecord = { "Título": line.substring(line.indexOf(':') + 1).trim() };
      } else if (line.toLowerCase().startsWith("texto principal:")) {
        currentRecord["Texto Principal"] = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().startsWith("ponte para o próximo:") || line.toLowerCase().startsWith("ponte:")) {
        currentRecord["Ponte para o Próximo"] = line.substring(line.indexOf(':') + 1).trim();
        if (currentRecord["Título"]) fallbackData.push(currentRecord);
        currentRecord = {};
      }
    }
    if (Object.keys(currentRecord).length > 0 && currentRecord["Título"]) fallbackData.push(currentRecord);

    if (fallbackData.length > 0) {
      console.log("[parseIaResponseToCsvData] Parseado como fallback (formato DeepSeek):", JSON.parse(JSON.stringify(fallbackData)));
      const processedData = fallbackData.map(record => ({
        "Título": record["Título"] || "",
        "Texto Principal": record["Texto Principal"] || "",
        "Ponte para o Próximo": record["Ponte para o Próximo"] || "",
      }));
      return { data: processedData, headers: finalHeaders };
    } else {
      console.error("[parseIaResponseToCsvData] Fallback também não encontrou dados estruturados.");
      return { data: [], headers: finalHeaders }; // Retorna data vazia se tudo falhar
    }
  };

  export const handleDownloadExampleCSV = async () => {
    try {
      const response = await fetch("/exemplo_posts.csv");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();

      // Adicionar BOM UTF-8
      const csvWithBOM = "\uFEFF" + csvText;

      const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "exemplo_posts.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar o CSV de exemplo:", error);
      alert("Não foi possível baixar o arquivo CSV de exemplo. Verifique o console para mais detalhes.");
    }
  };

  export const handleGenerateColorPalette = async (briefing, apiKey, callGeminiApi) => {
    if (!apiKey) {
      throw new Error('Missing API Key');
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
      const response = await callGeminiApi(prompt, apiKey);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Não foi possível extrair o JSON da resposta da IA.");
    } catch (error) {
      console.error("Erro ao gerar paleta de cores com IA:", error);
      throw error;
    }
  };

  export const exportCsv = (csvData, csvHeaders, fileName) => {
    if (!csvData || csvData.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const config = {
      quotes: true,
      delimiter: ";",
      header: true,
      fields: csvHeaders,
    };
    const csvString = Papa.unparse(csvData, config);

    const blob = new Blob([`\uFEFF${csvString}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  export const exportHtml = (campaignContent, backgroundImage, followupPosts, conteudoMedio, conteudoPequeno, conteudoFormatado) => {
    if (!campaignContent) return;

    const { titulo, conteudo, cta, hashtags } = campaignContent;
    const imageHtml = backgroundImage ? `
      <h2>Imagem de Fundo</h2>
      <img src="${backgroundImage}" alt="Imagem de Fundo da Campanha" style="max-width: 100%; border-radius: 8px; margin-bottom: 2rem;" />
    ` : '';

    const followupPostsHtml = followupPosts.length > 0 ? `
      <h2>Posts de Follow-up</h2>
      ${followupPosts.map(post => `
        <div style="border: 1px solid #eee; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
          <h3>Post ${post.post_numero}: ${post.tipo_gancho}</h3>
          <p>${post.conteudo}</p>
          <p><strong>CTA:</strong> ${post.cta}</p>
          <div>
            ${post.hashtags_sugeridas.map(tag => `<span style="background-color: #f5f3ff; color: #6d28d9; padding: 0.25rem 0.75rem; border-radius: 16px; font-size: 0.9rem; margin-right: 0.5rem;">${tag}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório da Campanha: ${titulo}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
          h1, h2 { color: #8b5cf6; }
          .container { border: 1px solid #ddd; border-radius: 8px; padding: 2rem; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          .hashtags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
          .hashtag { background-color: #f5f3ff; color: #6d28d9; padding: 0.25rem 0.75rem; border-radius: 16px; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${titulo}</h1>
          ${imageHtml}
          <h2>Conteúdo</h2>
          <p>${conteudo.replace(/\n/g, '<br>')}</p>
          <h2>Chamada para Ação (CTA)</h2>
          <p>${cta.replace(/\n/g, '<br>')}</p>
          <h2>Hashtags</h2>
          <div class="hashtags">
            ${hashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('')}
          </div>
          ${conteudoMedio ? `<h2>Conteúdo Médio</h2><p>${conteudoMedio.replace(/\n/g, '<br>')}</p>` : ''}
          ${conteudoPequeno ? `<h2>Conteúdo Pequeno</h2><p>${conteudoPequeno.replace(/\n/g, '<br>')}</p>` : ''}
          ${conteudoFormatado ? `<h2>Conteúdo Formatado</h2><div>${conteudoFormatado}</div>` : ''}
          ${followupPostsHtml}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campanha-${titulo.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
