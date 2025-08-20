/**
 * Utilitário para interagir com as APIs do Google (Drive, Sheets, etc.)
 * usando um token de acesso fornecido.
 */

const fetchWithRefresh = async (url, options, accessToken, setAccessToken) => {
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (response.status === 401) {
        console.log('Access token expired, attempting to refresh...');
        try {
            const refreshResponse = await fetch('/api/auth/refresh-google-token', { method: 'POST' });
            if (!refreshResponse.ok) {
                const errorBody = await refreshResponse.json();
                throw new Error(errorBody.error || 'Failed to refresh token');
            }
            const { googleAccessToken: newAccessToken } = await refreshResponse.json();

            // Here you should update the token in your auth context
            // This is a simplified example; you'll need to pass a setter function or use a state management library
            if (setAccessToken) {
                setAccessToken(newAccessToken);
            }

            // Retry the original request with the new token
            const newOptions = { ...options };
            newOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;

            console.log('Retrying request with new token...');
            response = await fetch(url, newOptions);
        } catch (error) {
            console.error('Token refresh failed:', error);
            // Optionally, force the user to log out or re-authenticate
            window.location.href = '/login'; // Or show a modal
            throw error;
        }
    }

    return response;
};

/**
 * Procura por uma pasta com um nome específico dentro de uma pasta pai (opcional).
 * Retorna a primeira pasta encontrada ou null.
 */
export const findFolderByName = async (name, parentId, accessToken, setAccessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido.');

  let query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const response = await fetchWithRefresh(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&orderBy=createdTime desc`,
    {},
    accessToken,
    setAccessToken
  );

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
export const listFiles = async (folderId, accessToken, setAccessToken, pageSize = 100) => {
  if (!accessToken) throw new Error('Access token não fornecido.');

  const query = `'${folderId}' in parents and trashed=false`;
  const response = await fetchWithRefresh(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,thumbnailLink)`,
    {},
    accessToken,
    setAccessToken
  );

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Erro ao listar arquivos: ${errorBody.error.message}`);
  }

  return await response.json();
};

/**
 * Obtém o conteúdo de um arquivo como um Blob.
 */
export const getFileAsBlob = async (fileId, accessToken, setAccessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido.');

  const response = await fetchWithRefresh(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {},
    accessToken,
    setAccessToken
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao baixar arquivo: ${errorBody}`);
  }

  return response.blob();
};

/**
 * Cria uma nova planilha Google Sheets com os dados fornecidos
 */
export const createSpreadsheet = async (title, data, accessToken, setAccessToken, folderId = null) => {
  if (!accessToken) throw new Error('Access token não fornecido.');

  const sheetsData = [
    {
      properties: { title: 'Dados CSV' },
      data: [{
        rowData: data.map((row, rowIndex) => ({
          values: row.map((cell) => ({
            userEnteredValue: { stringValue: String(cell) },
            userEnteredFormat: { textFormat: { bold: rowIndex === 0 } }
          }))
        }))
      }]
    },
    {
      properties: { title: 'Controle' },
      data: [{
        rowData: [
          {
            values: [
              { userEnteredValue: { stringValue: "campo" } },
              { userEnteredValue: { stringValue: "valor" } }
            ]
          },
          {
            values: [
              { userEnteredValue: { stringValue: "controle" } },
              { userEnteredValue: { numberValue: 0 } }
            ]
          }
        ]
      }]
    }
  ];

  const spreadsheetRequestBody = {
    properties: { title },
    sheets: sheetsData
  };

  const response = await fetchWithRefresh(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spreadsheetRequestBody)
    },
    accessToken,
    setAccessToken
  );

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Erro ao criar planilha: ${errorBody.error.message}`);
  }

  const createdSpreadsheet = await response.json();
  const spreadsheetId = createdSpreadsheet.spreadsheetId;

  if (folderId && spreadsheetId) {
    await moveFileToFolder(spreadsheetId, folderId, accessToken);
  }

  return createdSpreadsheet;
};

/**
 * Move um arquivo para uma pasta específica no Google Drive.
 */
export const moveFileToFolder = async (fileId, folderId, accessToken, setAccessToken) => {
    if (!accessToken) throw new Error('Access token não fornecido.');

    const fileResponse = await fetchWithRefresh(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
        {},
        accessToken,
        setAccessToken
    );
    const file = await fileResponse.json();


    const previousParents = file.parents ? file.parents.join(',') : '';

    await fetchWithRefresh(
        `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`,
        { method: 'PATCH' },
        accessToken,
        setAccessToken
    );
};

/**
 * Cria uma pasta no Google Drive. Verifica se já existe antes de criar.
 */
export const createFolder = async (name, parentId, accessToken, setAccessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido para criar pasta.');

  // Primeiro, verifica se a pasta já existe para evitar duplicatas.
  const existingFolder = await findFolderByName(name, parentId, accessToken, setAccessToken);
  if (existingFolder) {
    console.warn(`Pasta '${name}' já existe com ID: ${existingFolder.id}. Usando a existente.`);
    return existingFolder;
  }

  const metadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetchWithRefresh(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    },
    accessToken,
    setAccessToken
  );

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Erro ao criar pasta: ${errorBody.error.message}`);
  }

  return await response.json();
};

/**
 * Faz upload de um arquivo (Blob) para o Google Drive.
 * Esta versão usa 'uploadType=resumable' que é mais robusto e preferível para blobs.
 */
export const uploadFile = async (fileBlob, fileName, folderId, accessToken, setAccessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido para upload.');

  const metadata = {
    name: fileName,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  // 1. Iniciar uma sessão de upload resumível
  const initResponse = await fetchWithRefresh(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(metadata),
    },
    accessToken,
    setAccessToken
  );

  if (!initResponse.ok) {
    const errorBody = await initResponse.json();
    throw new Error(`Erro ao iniciar upload: ${errorBody.error.message}`);
  }

  const location = initResponse.headers.get('Location');
  if (!location) {
    throw new Error('Não foi possível obter o URL de upload resumível.');
  }

  // 2. Fazer o upload do conteúdo do arquivo
  const uploadResponse = await fetch(location, {
    method: 'PUT',
    headers: {
      'Content-Type': fileBlob.type,
    },
    body: fileBlob,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.json();
    throw new Error(`Erro durante o upload do arquivo: ${errorBody.error.message}`);
  }

  return await uploadResponse.json();
};

/**
 * Lista as pastas do Google Drive do usuário.
 */
export const listFolders = async (accessToken, setAccessToken, pageSize = 100) => {
  if (!accessToken) throw new Error('Access token não fornecido para listar pastas.');

  const query = "mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false";

  const response = await fetchWithRefresh(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name)&orderBy=name`,
    {},
    accessToken,
    setAccessToken
  );

  if (!response.ok) {
    const errorBody = await response.json();
    const errorMessage = errorBody.error?.message || response.statusText;
    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }

  const result = await response.json();
  return result.files || [];
};
