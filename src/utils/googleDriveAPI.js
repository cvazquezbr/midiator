/**
 * Utilitário para integração com Google Drive e Google Sheets API.
 * A autenticação é gerenciada centralmente; este utilitário apenas consome o token de acesso
 * fornecido por um endpoint seguro no backend.
 */
class GoogleDriveAPI {
  constructor() {
    // Nenhuma inicialização de cliente é necessária aqui.
  }

  /**
   * Busca um token de acesso válido do nosso backend.
   * O backend é responsável por gerenciar o refresh token.
   * @returns {Promise<string>} O token de acesso.
   * @private
   */
  async _getAccessToken() {
    try {
      const response = await fetch('/api/google/credentials');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Google access token');
      }
      const { accessToken } = await response.json();
      if (!accessToken) {
        throw new Error('Access token not found in server response.');
      }
      return accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      // Propaga o erro para que a operação que o chamou possa falhar graciosamente.
      throw new Error(`Could not authorize with Google: ${error.message}`);
    }
  }

  /**
   * Obtém o conteúdo de um arquivo como um Blob.
   */
  async getFileAsBlob(fileId) {
    const accessToken = await this._getAccessToken();
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorBody}`);
      }

      return await response.blob();
    } catch (error) {
      throw new Error(`Error downloading file ${fileId}: ${error.message || error}`);
    }
  }

  /**
   * Cria uma pasta no Google Drive. Se a pasta já existir, retorna a existente.
   */
  async createFolder(name, parentId = null) {
    const accessToken = await this._getAccessToken();

    const existingFolder = await this.findFolderByName(name, parentId);
    if (existingFolder) {
      console.warn(`Folder '${name}' already exists with ID: ${existingFolder.id}. Using existing.`);
      return existingFolder;
    }

    try {
      const metadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] }),
      };

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorBody}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Error creating new folder '${name}': ${error.message || error}`);
    }
  }

  /**
   * Procura por uma pasta com um nome específico.
   */
  async findFolderByName(name, parentId = null) {
    const accessToken = await this._getAccessToken();
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
    query += parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&orderBy=createdTime desc`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        console.error(`HTTP ${response.status} while searching for folder '${name}'.`);
        return null;
      }
      const result = await response.json();
      return result.files && result.files.length > 0 ? result.files[0] : null;
    } catch (error) {
      console.error(`API error searching for folder '${name}': ${error.message}.`);
      return null;
    }
  }

  /**
   * Faz upload de um arquivo para o Google Drive.
   */
  async uploadFile(file, fileName, folderId = null) {
    const accessToken = await this._getAccessToken();

    try {
      const metadata = {
        name: fileName,
        ...(folderId && { parents: [folderId] }),
      };

      const base64Data = await this._fileToBase64(file);
      const multipartBody = this._createMultipartBody(metadata, base64Data, file.type);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
        },
        body: multipartBody
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const uploadedFile = await response.json();

      if (uploadedFile && uploadedFile.id) {
        await this.shareFilePublicly(uploadedFile.id, accessToken);
      }

      return uploadedFile;
    } catch (error) {
      throw new Error(`Upload error: ${error.message || error}`);
    }
  }

  /**
   * Cria uma nova planilha Google Sheets com os dados fornecidos.
   */
  async createSpreadsheet(title, data, folderId = null) {
    const accessToken = await this._getAccessToken();
    try {
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
              { values: [{ userEnteredValue: { stringValue: "campo" } }, { userEnteredValue: { stringValue: "valor" } }] },
              { values: [{ userEnteredValue: { stringValue: "controle" } }, { userEnteredValue: { numberValue: 0 } }] }
            ]
          }]
        }
      ];

      const spreadsheetRequestBody = { properties: { title }, sheets: sheetsData };
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
        throw new Error(`HTTP ${response.status}: ${errorBody.error?.message || response.statusText}`);
      }

      const createdSpreadsheet = await response.json();
      const spreadsheetId = createdSpreadsheet.spreadsheetId;

      if (spreadsheetId) {
        await this.shareFilePublicly(spreadsheetId, accessToken);
        if (folderId) {
          await this.moveFileToFolder(spreadsheetId, folderId);
        }
      }

      return createdSpreadsheet;
    } catch (error) {
      throw new Error(`Error creating spreadsheet: ${error.message}`);
    }
  }

  /**
   * Torna um arquivo público (qualquer pessoa com o link pode visualizar).
   * @private
   */
  async shareFilePublicly(fileId, accessToken) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: 'reader', type: 'anyone' })
        });
      } catch (permissionError) {
        console.warn(`File ${fileId} created, but failed to set public permissions: ${permissionError.message}`);
      }
  }

  /**
   * Move um arquivo para uma pasta específica no Google Drive.
   */
  async moveFileToFolder(fileId, folderId) {
    const accessToken = await this._getAccessToken();
    try {
      const file = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(res => res.json());

      const previousParents = file.parents ? file.parents.join(',') : '';

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}&fields=id,parents`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorBody.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Error moving file ${fileId} to folder ${folderId}: ${error.message}`);
    }
  }

  /**
   * Lista as pastas do Google Drive do usuário.
   */
  async listFolders(pageSize = 100) {
    const accessToken = await this._getAccessToken();
    try {
      const query = "mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false";
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name)&orderBy=name`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorBody.error?.message || response.statusText}`);
      }

      return (await response.json()).files || [];
    } catch (error) {
      throw new Error(`Error listing folders: ${error.message || error}`);
    }
  }

  /**
   * Lista arquivos em uma pasta.
   */
  async listFiles(folderId = null, pageSize = 10) {
      const accessToken = await this._getAccessToken();
      try {
          let query = "trashed=false";
          if (folderId) {
              query += ` and '${folderId}' in parents`;
          }

          const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,thumbnailLink)`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return await response.json();
      } catch (error) {
          throw new Error(`Error listing files: ${error.message || error}`);
      }
  }

  /**
   * @private
   */
  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * @private
   */
  _createMultipartBody(metadata, data, mimeType) {
    const delimiter = 'foo_bar_baz';
    const close_delim = `\r\n--${delimiter}--`;
    let body = `--${delimiter}\r\n`;
    body += 'Content-Type: application/json\r\n\r\n';
    body += JSON.stringify(metadata) + '\r\n';
    body += `--${delimiter}\r\n`;
    body += `Content-Type: ${mimeType}\r\n`;
    body += 'Content-Transfer-Encoding: base64\r\n\r\n';
    body += data;
    body += close_delim;
    return body;
  }
}

// Exporta uma instância única (singleton)
const googleDriveAPI = new GoogleDriveAPI();
export default googleDriveAPI;