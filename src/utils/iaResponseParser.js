import Papa from 'papaparse';

/**
 * Parses the raw text response from an AI model into a structured CSV format.
 * @param {string} responseText - The raw text response from the AI.
 * @returns {{data: Array<Object>, headers: Array<string>}} - The parsed data and headers.
 */
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
