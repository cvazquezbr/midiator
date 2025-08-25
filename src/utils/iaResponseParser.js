import Papa from 'papaparse';

/**
 * Parses the raw text response from an AI model into a structured CSV format.
 * @param {string} responseText - The raw text response from the AI.
 * @returns {{data: Array<Object>, headers: Array<string>}} - The parsed data and headers.
 */
export const parseIaResponseToCsvData = (responseText) => {
  const finalHeaders = ["Título", "Texto Principal", "Ponte para o Próximo", "prompt_imagem_carrossel"];

  if (!responseText || typeof responseText !== 'string') {
    console.error("[parseIaResponseToCsvData] Invalid or empty AI response.");
    return { data: [], headers: finalHeaders };
  }

  console.log("[parseIaResponseToCsvData] Raw response received for parsing:", responseText);

  const csvBlockRegex = /```csv\s*([\s\S]+?)\s*```/;
  const csvMatch = responseText.match(csvBlockRegex);

  if (csvMatch && csvMatch[1] && csvMatch[1].trim() !== "") {
    console.log("[parseIaResponseToCsvData] CSV block found. Proceeding with PapaParse.");
    const csvContent = csvMatch[1].trim();
    const data = [];

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.error("[parseIaResponseToCsvData] Errors during PapaParse:", parseResult.errors.map(err => ({ ...err, input: undefined })));
    }

    if (parseResult.data && parseResult.data.length > 0) {
      const actualHeadersFromIA = parseResult.meta.fields || [];
      const headerMap = {};

      actualHeadersFromIA.forEach(iaHeader => {
        const iaHeaderTrimmed = iaHeader.trim();
        const iaHeaderLower = iaHeaderTrimmed.toLowerCase();
        if (iaHeaderLower.includes('titulo') || iaHeaderLower.includes('título')) headerMap[iaHeaderTrimmed] = "Título";
        else if (iaHeaderLower.includes('texto_principal') || iaHeaderLower.includes('texto principal')) headerMap[iaHeaderTrimmed] = "Texto Principal";
        else if (iaHeaderLower.includes('ponte_proximo') || iaHeaderLower.includes('ponte para o próximo')) headerMap[iaHeaderTrimmed] = "Ponte para o Próximo";
        else if (iaHeaderLower.includes('prompt_imagem_carrossel')) headerMap[iaHeaderTrimmed] = "prompt_imagem_carrossel";
        else if (iaHeaderLower.includes('id_elemento') || iaHeaderLower.includes('id') || iaHeaderLower.includes('num_slide') || iaHeaderLower.includes('elemento')) headerMap[iaHeaderTrimmed] = "id";
      });

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
        }
      });

      if (data.length > 0) {
        console.log(`[parseIaResponseToCsvData] Successfully parsed ${data.length} records via PapaParse.`);
        return { data, headers: finalHeaders };
      } else {
        console.warn("[parseIaResponseToCsvData] PapaParse ran but resulted in 0 valid records after filtering.");
      }
    } else {
      console.warn("[parseIaResponseToCsvData] PapaParse did not return any data from the CSV block.");
    }
    // If CSV block is found but parsing fails or results in empty data, we stop and do not proceed to fallback.
    // This prevents accidental duplication of content.
    return { data: [], headers: finalHeaders };
  }

  // Fallback: Only runs if NO ```csv block was found.
  console.log("[parseIaResponseToCsvData] No CSV block found. Attempting fallback 'Key: Value' parsing.");
  const fallbackLines = responseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let currentRecord = {};
  const fallbackData = [];

  for (const line of fallbackLines) {
    if (line.toLowerCase().startsWith("título:") || line.toLowerCase().startsWith("titulo:")) {
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

  if (currentRecord["Título"]) {
    fallbackData.push(currentRecord);
  }

  if (fallbackData.length > 0) {
    console.log(`[parseIaResponseToCsvData] Successfully parsed ${fallbackData.length} records via fallback.`);
    const processedData = fallbackData.map(record => ({
      "Título": record["Título"] || "",
      "Texto Principal": record["Texto Principal"] || "",
      "Ponte para o Próximo": record["Ponte para o Próximo"] || "",
      "prompt_imagem_carrossel": record["prompt_imagem_carrossel"] || "",
    }));
    return { data: processedData, headers: finalHeaders };
  }

  console.error("[parseIaResponseToCsvData] Fallback parser also failed to find structured data.");
  return { data: [], headers: finalHeaders };
};
