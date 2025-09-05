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

    if (response.status === 401 || response.status === 403) {
        console.log(`[googleApi] API call resulted in ${response.status}. Attempting to handle.`);

        if (response.status === 403) {
             const errorBody = await response.json().catch(() => ({}));
             const reason = errorBody.error?.errors[0]?.reason;
             if (reason === 'insufficientPermissions') {
                console.error('[googleApi] Error: Insufficient permissions for Google Drive.');
                toast.error('Você não concedeu permissão para o app acessar o Google Drive. Por favor, faça login novamente e aceite a permissão.');
                throw new Error('Permissões insuficientes para o Google Drive. Tente fazer login novamente.');
             }
        }

        console.log('[googleApi] Access token expired or invalid, attempting to refresh...');
        try {
            const refreshResponse = await fetch('/api/auth/refresh-google-token', { method: 'POST' });
            if (!refreshResponse.ok) {
                const errorBody = await refreshResponse.json().catch(() => ({ error: 'Failed to parse refresh error' }));
                // Se o refresh falhar, é muito provável que o usuário precise logar novamente.
                toast.error('Sua sessão com o Google expirou. Por favor, faça login novamente para reconectar.');
                throw new Error(errorBody.error || 'Não foi possível renovar a sessão com o Google.');
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

            // After retrying, if it's still forbidden, the issue is likely permanent permission denial.
            if (response.status === 403) {
                 console.error('[googleApi] Error: Insufficient permissions even after token refresh.');
                 toast.error('O acesso ao Google Drive foi negado. Verifique as permissões da sua conta Google.');
                 throw new Error('Acesso ao Google Drive negado.');
            }

        } catch (error) {
            console.error('[googleApi] Token refresh or retry failed:', error);
            // Evita duplicação de toasts, a mensagem mais específica já foi dada.
            if (!error.message.includes('Sua sessão com o Google expirou')) {
              toast.error('Ocorreu uma falha na autenticação com o Google. Tente fazer o login novamente.');
            }
            throw error; // Re-throw the original error to be caught by the calling function
        }
    }
    return response;
};

export const findFolderByName = async (name, parentId = null) => {
  console.log(`[googleApi] Finding folder by name: '${name}'`);
  try {
    if (!currentAccessToken) {
      toast.error('Conexão com o Google Drive não estabelecida.');
      throw new Error('Sessão com o Google não iniciada para buscar pasta.');
    }
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
    if (parentId) query += ` and '${parentId}' in parents`;
    else query += ` and 'root' in parents`;

    const response = await fetchWithRefresh(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&orderBy=createdTime desc`, {});
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.error?.message || response.statusText;
      console.error(`[googleApi] Failed to find folder '${name}':`, errorMessage);
      // O toast de erro já deve ter sido acionado pelo fetchWithRefresh
      throw new Error(`Não foi possível encontrar a pasta '${name}': ${errorMessage}`);
    }
    const result = await response.json();
    if (result.files && result.files.length > 0) {
        console.log(`[googleApi] Found folder '${name}' with ID: ${result.files[0].id}`);
        return result.files[0];
    }
    console.log(`[googleApi] Folder '${name}' not found.`);
    return null; // Retornar null é um resultado esperado, não um erro.
  } catch (error) {
    console.error(`[googleApi] Error in findFolderByName for '${name}':`, error);
    // O toast já foi dado no fetchWithRefresh, aqui apenas relançamos para a lógica de chamada saber que falhou.
    throw error;
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
      throw new Error('Sessão com o Google não iniciada para criar pasta.');
    }
    // findFolderByName will throw on API error, so we only need to handle the "found" case.
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
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.error?.message || response.statusText;
      console.error(`[googleApi] Failed to create folder '${name}':`, errorMessage);
      throw new Error(`Não foi possível criar a pasta '${name}': ${errorMessage}`);
    }

    const newFolder = await response.json();
    console.log(`[googleApi] Successfully created folder '${name}' with ID: ${newFolder.id}`);
    return newFolder;
  } catch (error) {
    console.error(`[googleApi] Error in createFolder for '${name}':`, error);
    // O toast já foi dado no fetchWithRefresh, aqui apenas relançamos.
    throw error;
  }
};

export const uploadFile = async (fileBlob, fileName, folderId) => {
  console.log(`[googleApi] Uploading file: '${fileName}' to folder: ${folderId}`);
  try {
    if (!currentAccessToken) {
      toast.error('Conexão com o Google Drive não estabelecida.');
      throw new Error('Sessão com o Google não iniciada para fazer upload.');
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
      const errorBody = await initResponse.json().catch(() => ({}));
      const errorMessage = errorBody.error?.message || initResponse.statusText;
      throw new Error(`Erro ao iniciar upload: ${errorMessage}`);
    }

    const location = initResponse.headers.get('Location');
    if (!location) {
      throw new Error('Não foi possível obter o URL de upload resumível.');
    }

    console.log(`[googleApi] Resumable URL obtained for '${fileName}'`);
    console.log(`[googleApi] Sending file content for '${fileName}'`);

    // The actual upload does not need the auth token in the header,
    // as the resumable URL is pre-authenticated. So we use a normal fetch.
    const uploadResponse = await fetch(location, {
      method: 'PUT',
      headers: { 'Content-Type': fileBlob.type },
      body: fileBlob,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.json().catch(() => ({}));
      const errorMessage = errorBody.error?.message || uploadResponse.statusText;
      throw new Error(`Erro durante o upload do arquivo: ${errorMessage}`);
    }

    const uploadedFile = await uploadResponse.json();
    console.log(`[googleApi] Successfully uploaded file '${fileName}' with ID: ${uploadedFile.id}`);
    return uploadedFile;
  } catch (error) {
    console.error(`[googleApi] Error in uploadFile for '${fileName}':`, error);
    // O toast já foi dado no fetchWithRefresh ou será o do erro específico de upload.
    // Se não for um dos erros já tratados, apresentamos um genérico.
    if (!error.message.includes('Google')) {
        toast.error(error.message || `Falha ao fazer upload do arquivo '${fileName}'.`);
    }
    throw error;
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

export const uploadImageToDrive = async (imageBlob, folderId) => {
    if (!imageBlob || !folderId) {
        throw new Error('Dados da imagem ou ID da pasta não fornecidos.');
    }

    // Função para converter Blob para Base64
    const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Remove o prefixo "data:image/png;base64,"
        reader.onerror = (error) => reject(error);
    });

    try {
        const imageBase64 = await toBase64(imageBlob);
        const fileName = `imagem_gerada_${new Date().toISOString()}.png`;

        // Usa fetchWithAuth para garantir que o token de autenticação da *nossa aplicação* seja enviado
        const response = await fetch('/api/google-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'uploadImageToFolder',
                payload: {
                    imageBase64,
                    fileName,
                    folderId,
                    imageType: imageBlob.type,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao salvar imagem.' }));
            throw new Error(errorData.message || 'Falha ao salvar imagem no Google Drive.');
        }

        const result = await response.json();
        toast.success(`Imagem "${result.name}" salva na coleção com sucesso!`);
        return result;

    } catch (error) {
        console.error('Erro ao fazer upload da imagem para o Drive via proxy:', error);
        toast.error(error.message);
        throw error;
    }
};

export const getOrCreateBackgroundsFolderId = async () => {
    console.log("[googleApi] Getting or creating the 'midiator/backgrounds' folder structure.");
    try {
        let midiatorFolder = await findFolderByName('midiator');
        if (!midiatorFolder) {
            console.log("[googleApi] 'midiator' folder not found, creating it.");
            midiatorFolder = await createFolder('midiator');
            if (!midiatorFolder) throw new Error("Falha ao criar a pasta 'midiator' no Drive.");
        }

        let backgroundsFolder = await findFolderByName('backgrounds', midiatorFolder.id);
        if (!backgroundsFolder) {
            console.log("[googleApi] 'backgrounds' folder not found, creating it.");
            backgroundsFolder = await createFolder('backgrounds', midiatorFolder.id);
            if (!backgroundsFolder) throw new Error("Falha ao criar a pasta 'backgrounds' no Drive.");
        }

        console.log(`[googleApi] 'backgrounds' folder ID is: ${backgroundsFolder.id}`);
        return backgroundsFolder.id;

    } catch (error) {
        console.error("[googleApi] Failed to get or create backgrounds folder:", error);
        toast.error(`Falha ao acessar a pasta de coleção: ${error.message}`);
        throw error;
    }
};
