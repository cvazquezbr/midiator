/**
 * Converts a Blob object to a Base64 Data URL.
 * @param {Blob} blob The blob to convert.
 * @returns {Promise<string>} A promise that resolves with the data URL.
 */
export const blobToDataURL = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Fetches the example CSV file from the public folder and triggers a download.
 */
export const downloadExampleCsv = async () => {
  try {
    const response = await fetch("/exemplo_posts.csv");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();

    // Adicionar BOM UTF-8 para compatibilidade com Excel
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
