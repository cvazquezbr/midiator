/**
 * Utilitário para interagir com as APIs do Google (Drive, Sheets, etc.)
 * usando um token de acesso fornecido.
 */

/**
 * Procura por uma pasta com um nome específico dentro de uma pasta pai (opcional).
 * Retorna a primeira pasta encontrada ou null.
 */
export const findFolderByName = async (name, parentId, accessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido.');

  let query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&orderBy=createdTime desc`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Erro ao buscar pasta: ${errorBody.error.message}`);
  }

  const result = await response.json();
  return result.files && result.files.length > 0 ? result.files[0] : null;
};

/**
 * Lista arquivos em uma pasta específica.
 */
export const listFiles = async (folderId, accessToken, pageSize = 100) => {
  if (!accessToken) throw new Error('Access token não fornecido.');

  const query = `'${folderId}' in parents and trashed=false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,thumbnailLink)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Erro ao listar arquivos: ${errorBody.error.message}`);
  }

  return await response.json();
};

/**
 * Obtém o conteúdo de um arquivo como um Blob.
 */
export const getFileAsBlob = async (fileId, accessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao baixar arquivo: ${errorBody}`);
  }

  return response.blob();
};
