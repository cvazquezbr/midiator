import { toast } from 'sonner';

// --- Token Management ---
let currentAccessToken = null;
let tokenSetter = null;

export const setGoogleApiToken = (token) => {
  console.log('[googleApi] Setting new access token.');
  currentAccessToken = token;
};

export const setGoogleApiTokenSetter = (setter) => {
  console.log('[googleApi] Token setter has been configured.');
  tokenSetter = setter;
};
// --- End of Token Management ---

const fetchWithRefresh = async (url, options) => {
    console.log(`[googleApi] Making API call to: ${url.substring(0, 100)}...`);
    if (!currentAccessToken) {
        console.error('[googleApi] Error: No access token provided. Call setGoogleApiToken first.');
        throw new Error('Sessão com o Google não iniciada.');
    }

    let response = await fetch(url, {
        ...options,
        headers: { ...options.headers, 'Authorization': `Bearer ${currentAccessToken}` },
    });

    if (response.status === 401) {
        console.log('[googleApi] Access token expired, attempting to refresh...');
        try {
            const refreshResponse = await fetch('/api/auth/refresh-google-token', { method: 'POST' });
            if (!refreshResponse.ok) {
                const errorBody = await refreshResponse.json();
                throw new Error(errorBody.error || 'Failed to refresh token from API');
            }
            const { googleAccessToken: newAccessToken } = await refreshResponse.json();
            console.log('[googleApi] Successfully received new access token.');

            setGoogleApiToken(newAccessToken);
            if (tokenSetter) {
                console.log('[googleApi] Updating token in React context via tokenSetter.');
                tokenSetter(newAccessToken);
            }

            console.log('[googleApi] Retrying original request with new token...');
            const newOptions = { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${newAccessToken}` } };
            response = await fetch(url, newOptions);
        } catch (error) {
            console.error('[googleApi] Token refresh failed:', error);
            toast.error('Sua sessão com o Google expirou. Por favor, faça login novamente.');
            throw new Error(`Sua sessão com o Google expirou. Detalhes: ${error.message}`);
        }
    }
    return response;
};

export const findFolderByName = async (name, parentId = null) => {
  console.log(`[googleApi] Finding folder by name: '${name}'`);
  try {
    if (!currentAccessToken) {
      toast.error('Conexão com o Google Drive não estabelecida.');
      return null;
    }
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
    if (parentId) query += ` and '${parentId}' in parents`;
    else query += ` and 'root' in parents`;

    const response = await fetchWithRefresh(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&orderBy=createdTime desc`, {});
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`[googleApi] Failed to find folder '${name}':`, errorBody.error?.message || response.statusText);
      return null;
    }
    const result = await response.json();
    if (result.files && result.files.length > 0) {
        console.log(`[googleApi] Found folder '${name}' with ID: ${result.files[0].id}`);
        return result.files[0];
    }
    console.log(`[googleApi] Folder '${name}' not found.`);
    return null;
  } catch (error) {
    console.error(`[googleApi] Error in findFolderByName for '${name}':`, error);
    toast.error(error.message || 'Falha na comunicação com o Google Drive.');
    return null;
  }
};

export const listFiles = async (folderId, pageSize = 100) => {
  console.log(`[googleApi] Listing files in folder: ${folderId}`);
  try {
    if (!currentAccessToken) {
      toast.error('Conexão com o Google Drive não estabelecida.');
      return { files: [] };
    }
    const query = `'${folderId}' in parents and trashed=false`;
    const response = await fetchWithRefresh(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,thumbnailLink)`, {});
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`[googleApi] Failed to list files in folder '${folderId}':`, errorBody.error?.message || response.statusText);
      return { files: [] };
    }
    const result = await response.json();
    console.log(`[googleApi] Found ${result.files?.length || 0} files in folder ${folderId}.`);
    return result;
  } catch (error) {
    console.error(`[googleApi] Error in listFiles for folder '${folderId}':`, error);
    toast.error('Falha ao listar arquivos do Google Drive.');
    return { files: [] };
  }
};

export const getFileAsBlob = async (fileId) => {
  console.log(`[googleApi] Getting file as blob: ${fileId}`);
  try {
    if (!currentAccessToken) throw new Error('Access token não fornecido.');
    const response = await fetchWithRefresh(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {});
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erro ao baixar arquivo: ${errorBody}`);
    }
    console.log(`[googleApi] Successfully fetched blob for file: ${fileId}`);
    return response.blob();
  } catch (error) {
    console.error(`[googleApi] Error in getFileAsBlob for file '${fileId}':`, error);
    toast.error('Falha ao baixar arquivo do Google Drive.');
    return null;
  }
};

export const createFolder = async (name, parentId = null) => {
  console.log(`[googleApi] Creating folder: '${name}'`);
  try {
    if (!currentAccessToken) {
      toast.error('Conexão com o Google Drive não estabelecida.');
      return null;
    }
    const existingFolder = await findFolderByName(name, parentId);
    if (existingFolder) {
      console.warn(`[googleApi] Folder '${name}' already exists with ID: ${existingFolder.id}. Using existing.`);
      return existingFolder;
    }
    console.log(`[googleApi] Folder '${name}' does not exist. Creating anew.`);
    const metadata = { name, mimeType: 'application/vnd.google-apps.folder' };
    if (parentId) metadata.parents = [parentId];
    const response = await fetchWithRefresh('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Erro ao criar pasta: ${errorBody.error.message}`);
    }
    const newFolder = await response.json();
    console.log(`[googleApi] Successfully created folder '${name}' with ID: ${newFolder.id}`);
    return newFolder;
  } catch (error) {
    console.error(`[googleApi] Error in createFolder for '${name}':`, error);
    toast.error(error.message || `Falha ao criar a pasta '${name}' no Google Drive.`);
    return null;
  }
};

export const uploadFile = async (fileBlob, fileName, folderId) => {
  console.log(`[googleApi] Uploading file: '${fileName}' to folder: ${folderId}`);
  try {
    if (!currentAccessToken) {
      toast.error('Conexão com o Google Drive não estabelecida.');
      return null;
    }
    const metadata = { name: fileName };
    if (folderId) metadata.parents = [folderId];
    console.log(`[googleApi] Initializing resumable upload for '${fileName}'`);
    const initResponse = await fetchWithRefresh('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(metadata),
    });
    if (!initResponse.ok) {
      const errorBody = await initResponse.json();
      throw new Error(`Erro ao iniciar upload: ${errorBody.error.message}`);
    }
    const location = initResponse.headers.get('Location');
    if (!location) throw new Error('Não foi possível obter o URL de upload resumível.');
    console.log(`[googleApi] Resumable URL obtained for '${fileName}'`);
    console.log(`[googleApi] Sending file content for '${fileName}'`);
    const uploadResponse = await fetch(location, {
      method: 'PUT',
      headers: { 'Content-Type': fileBlob.type },
      body: fileBlob,
    });
    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.json();
      throw new Error(`Erro durante o upload do arquivo: ${errorBody.error.message}`);
    }
    const uploadedFile = await uploadResponse.json();
    console.log(`[googleApi] Successfully uploaded file '${fileName}' with ID: ${uploadedFile.id}`);
    return uploadedFile;
  } catch (error) {
    console.error(`[googleApi] Error in uploadFile for '${fileName}':`, error);
    toast.error(error.message || `Falha ao fazer upload do arquivo '${fileName}'.`);
    return null;
  }
};

export const listFolders = async (pageSize = 100) => {
  console.log('[googleApi] Listing all user folders.');
  try {
    if (!currentAccessToken) throw new Error('Access token não fornecido para listar pastas.');
    const query = "mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false";
    const response = await fetchWithRefresh(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name)&orderBy=name`, {});
    if (!response.ok) {
      const errorBody = await response.json();
      const errorMessage = errorBody.error?.message || response.statusText;
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
    }
    const result = await response.json();
    console.log(`[googleApi] Found ${result.files?.length || 0} total folders.`);
    return result.files || [];
  } catch (error) {
    console.error(`[googleApi] Error listing folders:`, error);
    toast.error('Não foi possível carregar suas pastas do Google Drive.');
    return [];
  }
};

export const moveFileToFolder = async (fileId, folderId) => {
    console.log(`[googleApi] Moving file ${fileId} to folder ${folderId}`);
    if (!currentAccessToken) throw new Error('Access token não fornecido.');
    const fileResponse = await fetchWithRefresh(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {});
    const file = await fileResponse.json();
    const previousParents = file.parents ? file.parents.join(',') : '';
    await fetchWithRefresh(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`, { method: 'PATCH' });
};

export const createSpreadsheet = async (title, data, folderId = null) => {
  console.log(`[googleApi] Creating spreadsheet '${title}'`);
  if (!currentAccessToken) throw new Error('Access token não fornecido.');
  const sheetsData = [
    { properties: { title: 'Dados CSV' }, data: [{ rowData: data.map((row, rowIndex) => ({ values: row.map((cell) => ({ userEnteredValue: { stringValue: String(cell) }, userEnteredFormat: { textFormat: { bold: rowIndex === 0 } } })) })) }] },
    { properties: { title: 'Controle' }, data: [{ rowData: [ { values: [ { userEnteredValue: { stringValue: "campo" } }, { userEnteredValue: { stringValue: "valor" } } ] }, { values: [ { userEnteredValue: { stringValue: "controle" } }, { userEnteredValue: { numberValue: 0 } } ] } ] }] }
  ];
  const spreadsheetRequestBody = { properties: { title }, sheets: sheetsData };
  const response = await fetchWithRefresh('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spreadsheetRequestBody)
  });
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Erro ao criar planilha: ${errorBody.error.message}`);
  }
  const createdSpreadsheet = await response.json();
  const spreadsheetId = createdSpreadsheet.spreadsheetId;
  if (folderId && spreadsheetId) {
    console.log(`[googleApi] Moving spreadsheet ${spreadsheetId} to folder ${folderId}`);
    await moveFileToFolder(spreadsheetId, folderId);
  }
  console.log(`[googleApi] Successfully created spreadsheet '${title}' with ID: ${spreadsheetId}`);
  return createdSpreadsheet;
};
