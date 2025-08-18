import Papa from 'papaparse';

/**
 * Parses a CSV file using PapaParse and returns a Promise.
 * @param {File} file - The CSV file to parse.
 * @returns {Promise<{data: Array<Object>, headers: Array<string>}>} A promise that resolves with the parsed data and headers.
 */
export const parseCsv = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("Nenhum arquivo fornecido para o parser."));
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0] || {});
          resolve({ data: results.data, headers });
        } else {
          // Resolve with empty arrays if the file is valid but has no data
          resolve({ data: [], headers: [] });
        }
      },
      error: (error) => {
        console.error('Erro ao ler CSV:', error);
        reject(new Error('Erro ao ler o arquivo CSV. Verifique se o formato está correto.'));
      }
    });
  });
};
