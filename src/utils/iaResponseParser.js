import Papa from 'papaparse';

/**
 * Parses the raw text response from an AI model into a structured CSV format.
 * @param {string} responseText - The raw text response from the AI.
 * @returns {{data: Array<Object>, headers: Array<string>}} - The parsed data and headers.
 */
export const parseIaResponseToCsvData = (responseText) => {
  // Definição dos cabeçalhos esperados pelo GerenciadorRegistros
  const finalHeaders = ["Título", "Texto Principal", "Ponte para o Próximo", "prompt_imagem_carrossel"];
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
        // We trim and lowercase for matching, but use the original header as the key
        const iaHeaderTrimmedAndLower = (iaHeader || '').trim().toLowerCase();
        if (iaHeaderTrimmedAndLower.includes('titulo') || iaHeaderTrimmedAndLower.includes('título')) headerMap[iaHeader] = "Título";
        else if (iaHeaderTrimmedAndLower.includes('texto_principal') || iaHeaderTrimmedAndLower.includes('texto principal')) headerMap[iaHeader] = "Texto Principal";
        else if (iaHeaderTrimmedAndLower.includes('ponte_proximo') || iaHeaderTrimmedAndLower.includes('ponte para o próximo')) headerMap[iaHeader] = "Ponte para o Próximo";
        else if (iaHeaderTrimmedAndLower.includes('prompt_imagem_carrossel')) headerMap[iaHeader] = "prompt_imagem_carrossel";
        else if (iaHeaderTrimmedAndLower.includes('id_elemento') || iaHeaderTrimmedAndLower.includes('id') || iaHeaderTrimmedAndLower.includes('num_slide') || iaHeaderTrimmedAndLower.includes('elemento')) headerMap[iaHeader] = "id";
      });
      console.log("[parseIaResponseToCsvData] Mapa de Cabeçalhos construído:", headerMap);

      parseResult.data.forEach(rawRecord => {
        const record = {};
        let hasTitle = false;
        for (const iaHeaderMapped in headerMap) {
          const targetAppHeader = headerMap[iaHeaderMapped];
          if (Object.prototype.hasOwnProperty.call(rawRecord, iaHeaderMapped)) {
            let value = rawRecord[iaHeaderMapped];
            let processedValue = value !== null && value !== undefined ? String(value).trim() : "";
            // Remove quotes from start and end, which can be added by the AI or parsing
            if (processedValue.startsWith('"') && processedValue.endsWith('"')) {
              processedValue = processedValue.substring(1, processedValue.length - 1).trim();
            }
            record[targetAppHeader] = processedValue;

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
  console.log("[parseIaResponseToCsvData] Tentando parser de fallback (formato Chave: Valor).");
  const fallbackLines = responseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let currentRecord = {};
  const fallbackData = [];

  for (const line of fallbackLines) {
    if (line.toLowerCase().startsWith("título:") || line.toLowerCase().startsWith("titulo:")) {
      // Quando encontramos um novo título, salvamos o registro anterior (se ele tiver um título)
      if (currentRecord["Título"]) {
        fallbackData.push(currentRecord);
      }
      currentRecord = { "Título": line.substring(line.indexOf(':') + 1).trim() };
    } else if (line.toLowerCase().startsWith("texto principal:")) {
      currentRecord["Texto Principal"] = line.substring(line.indexOf(':') + 1).trim();
    } else if (line.toLowerCase().startsWith("ponte para o próximo:") || line.toLowerCase().startsWith("ponte:")) {
      currentRecord["Ponte para o Próximo"] = line.substring(line.indexOf(':') + 1).trim();
    } else if (line.toLowerCase().startsWith("prompt_imagem_carrossel:")) {
      currentRecord["prompt_imagem_carrossel"] = line.substring(line.indexOf(':') + 1).trim();
    }
  }
  // Adiciona o último registro que estava sendo processado
  if (currentRecord["Título"]) {
    fallbackData.push(currentRecord);
  }

  if (fallbackData.length > 0) {
    console.log("[parseIaResponseToCsvData] Parseado com sucesso via fallback:", JSON.parse(JSON.stringify(fallbackData)));
    // Garante que todos os registros tenham todas as colunas esperadas
    const processedData = fallbackData.map(record => ({
      "Título": record["Título"] || "",
      "Texto Principal": record["Texto Principal"] || "",
      "Ponte para o Próximo": record["Ponte para o Próximo"] || "",
      "prompt_imagem_carrossel": record["prompt_imagem_carrossel"] || "",
    }));
    return { data: processedData, headers: finalHeaders };
  } else {
    console.error("[parseIaResponseToCsvData] Fallback também não encontrou dados estruturados.");
    return { data: [], headers: finalHeaders }; // Retorna data vazia se tudo falhar
  }
};
