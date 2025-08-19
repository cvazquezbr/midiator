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

/**
 * Cria uma nova planilha Google Sheets com os dados fornecidos
 */
export const createSpreadsheet = async (title, data, accessToken, folderId = null) => {
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

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(spreadsheetRequestBody)
  });

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
export const moveFileToFolder = async (fileId, folderId, accessToken) => {
    if (!accessToken) throw new Error('Access token não fornecido.');

    const file = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(res => res.json());

    const previousParents = file.parents ? file.parents.join(',') : '';

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
};

/**
 * Cria uma pasta no Google Drive. Verifica se já existe antes de criar.
 */
export const createFolder = async (name, parentId, accessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido para criar pasta.');

  // Primeiro, verifica se a pasta já existe para evitar duplicatas.
  const existingFolder = await findFolderByName(name, parentId, accessToken);
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

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

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
export const uploadFile = async (fileBlob, fileName, folderId, accessToken) => {
  if (!accessToken) throw new Error('Access token não fornecido para upload.');

  const metadata = {
    name: fileName,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  // 1. Iniciar uma sessão de upload resumível
  const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(metadata),
  });

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
export const listFolders = async (accessToken, pageSize = 100) => {
  if (!accessToken) throw new Error('Access token não fornecido para listar pastas.');

  const query = "mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false";

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name)&orderBy=name`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    const errorMessage = errorBody.error?.message || response.statusText;
    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }

  const result = await response.json();
  return result.files || [];
};
