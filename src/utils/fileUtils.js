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

/**
 * Finds a playable Blob for a given media asset.
 * It prioritizes a blob directly on the asset object, then checks the pendingAssets map.
 * @param {object} asset The asset object (e.g., an audio or video object).
 * @param {object} pendingAssets The map of pending assets (blobUrl -> Blob).
 * @returns {Blob|null} The found Blob object or null.
 */
export const getPlayableBlob = (asset, pendingAssets = {}) => {
  if (!asset) return null;
  // Priority 1: The blob property on the asset object itself (for newly generated assets)
  if (asset.blob instanceof Blob) {
    return asset.blob;
  }
  // Priority 2: Look in pendingAssets using the asset's URL (for loaded assets)
  if (asset.url && asset.url.startsWith('blob:') && pendingAssets[asset.url] instanceof Blob) {
    return pendingAssets[asset.url];
  }
  return null;
};

/**
 * Deletes a blob from Vercel Blob Storage.
 * @param {string} url The URL of the blob to delete.
 * @returns {Promise<void>}
 */
export const deleteBlob = async (url) => {
  if (!url || !url.includes('blob.vercel-storage.com')) {
    console.warn('Invalid or non-Vercel blob URL provided for deletion:', url);
    return;
  }

  try {
    const response = await fetch('/api/blob/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete blob');
    }
  } catch (error) {
    console.error('Error deleting blob:', error);
    throw error;
  }
};
