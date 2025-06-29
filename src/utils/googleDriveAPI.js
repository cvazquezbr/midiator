/**
 * Utilitário para integração com Google Drive API diretamente no frontend
 * Usa a Google API JavaScript Client Library (gapi)
 */

// Configurações da API
const API_KEY = 'YOUR_API_KEY'; // Será configurado pelo usuário
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Será configurado pelo usuário
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SHEETS_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';

class GoogleDriveAPI {
  constructor() {
    this.gapi = null;
    this.isInitialized = false;
    this.isSignedIn = false;
    this.accessToken = null;
  }

  /**
   * Inicializa a Google API
   */
  async initialize(apiKey, clientId) {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        resolve(true);
        return;
      }

      // Carregar a biblioteca gapi
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          this.loadGapi(apiKey, clientId, resolve, reject);
        };
        script.onerror = () => reject(new Error('Falha ao carregar Google API'));
        document.head.appendChild(script);
      } else {
        this.loadGapi(apiKey, clientId, resolve, reject);
      }
    });
  }

  async loadGapi(apiKey, clientId, resolve, reject) {
    try {
      await new Promise((res) => window.gapi.load('client:auth2', res));
      
      await window.gapi.client.init({
        apiKey: apiKey,
        clientId: clientId,
        discoveryDocs: [DISCOVERY_DOC, SHEETS_DISCOVERY_DOC],
        scope: SCOPES
      });

      this.gapi = window.gapi;
      this.isInitialized = true;
      this.isSignedIn = this.gapi.auth2.getAuthInstance().isSignedIn.get();
      
      if (this.isSignedIn) {
        this.accessToken = this.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
      }

      resolve(true);
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Faz login do usuário
   */
  async signIn() {
    if (!this.isInitialized) {
      throw new Error('API não inicializada');
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      this.isSignedIn = true;
      this.accessToken = user.getAuthResponse().access_token;
      return user;
    } catch (error) {
      throw new Error(`Erro no login: ${error.message}`);
    }
  }

  /**
   * Faz logout do usuário
   */
  async signOut() {
    if (!this.isInitialized) return;

    try {
      await this.gapi.auth2.getAuthInstance().signOut();
      this.isSignedIn = false;
      this.accessToken = null;
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  /**
   * Cria uma pasta no Google Drive
   */
  async createFolder(folderName, parentId = null) {
    if (!this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    try {
      const response = await this.gapi.client.drive.files.create({
        resource: metadata,
        fields: 'id'
      });

      return response.result.id;
    } catch (error) {
      throw new Error(`Erro ao criar pasta: ${error.message}`);
    }
  }

  /**
   * Faz upload de uma imagem para o Google Drive
   */
  async uploadImage(imageBlob, fileName, folderId) {
    if (!this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', imageBlob);

    try {
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: new Headers({
          'Authorization': `Bearer ${this.accessToken}`
        }),
        body: form
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }
  }

  /**
   * Torna um arquivo público e retorna o link
   */
  async makeFilePublic(fileId) {
    if (!this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    try {
      // Tornar o arquivo público
      await this.gapi.client.drive.permissions.create({
        fileId: fileId,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Retornar link de visualização
      return `https://drive.google.com/file/d/${fileId}/view`;
    } catch (error) {
      throw new Error(`Erro ao tornar arquivo público: ${error.message}`);
    }
  }

  /**
   * Cria uma planilha no Google Sheets
   */
  async createSpreadsheet(title, folderId = null) {
    if (!this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    try {
      const response = await this.gapi.client.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: title
          }
        }
      });

      const spreadsheetId = response.result.spreadsheetId;

      // Mover para pasta específica se fornecida
      if (folderId) {
        await this.gapi.client.drive.files.update({
          fileId: spreadsheetId,
          addParents: folderId,
          fields: 'id,parents'
        });
      }

      return spreadsheetId;
    } catch (error) {
      throw new Error(`Erro ao criar planilha: ${error.message}`);
    }
  }

  /**
   * Popula a planilha com dados
   */
  async populateSpreadsheet(spreadsheetId, csvData, imageLinks) {
    if (!this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    if (!csvData || csvData.length === 0) {
      throw new Error('Nenhum dado CSV fornecido');
    }

    try {
      // Preparar cabeçalhos
      const headers = ['Sequencial', 'Link_Imagem', ...Object.keys(csvData[0])];
      
      // Preparar dados
      const values = [headers];
      
      csvData.forEach((record, index) => {
        const imageLink = imageLinks[index] || '';
        const row = [index + 1, imageLink, ...Object.values(record)];
        values.push(row);
      });

      // Atualizar planilha
      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      // Formatar cabeçalhos (negrito)
      await this.formatHeaders(spreadsheetId, headers.length);

      return true;
    } catch (error) {
      throw new Error(`Erro ao popular planilha: ${error.message}`);
    }
  }

  /**
   * Formata os cabeçalhos da planilha
   */
  async formatHeaders(spreadsheetId, numColumns) {
    try {
      await this.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: numColumns
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat.textFormat.bold'
            }
          }]
        }
      });
    } catch (error) {
      console.error('Erro ao formatar cabeçalhos:', error);
    }
  }

  /**
   * Retorna a URL da planilha
   */
  getSpreadsheetUrl(spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  /**
   * Retorna a URL da pasta
   */
  getFolderUrl(folderId) {
    return `https://drive.google.com/drive/folders/${folderId}`;
  }

  /**
   * Processa todas as imagens e cria a estrutura no Google Drive
   */
  async processImages(projectName, csvData, imageBlobs) {
    if (!this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    try {
      // 1. Criar pasta
      const folderId = await this.createFolder(projectName);
      
      // 2. Upload das imagens
      const imageLinks = [];
      const uploadedFiles = [];

      for (let i = 0; i < imageBlobs.length; i++) {
        const fileName = `midiator_${String(i + 1).padStart(3, '0')}.png`;
        
        try {
          const fileId = await this.uploadImage(imageBlobs[i], fileName, folderId);
          const link = await this.makeFilePublic(fileId);
          
          imageLinks.push(link);
          uploadedFiles.push({
            fileName,
            fileId,
            link
          });
        } catch (error) {
          console.error(`Erro no upload da imagem ${fileName}:`, error);
          imageLinks.push('');
        }
      }

      // 3. Criar planilha
      const spreadsheetTitle = `${projectName}_Dados`;
      const spreadsheetId = await this.createSpreadsheet(spreadsheetTitle, folderId);

      // 4. Popular planilha
      await this.populateSpreadsheet(spreadsheetId, csvData, imageLinks);

      return {
        success: true,
        folderId,
        folderUrl: this.getFolderUrl(folderId),
        spreadsheetId,
        spreadsheetUrl: this.getSpreadsheetUrl(spreadsheetId),
        uploadedFiles,
        totalImages: uploadedFiles.length,
        totalRecords: csvData.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Instância singleton
const googleDriveAPI = new GoogleDriveAPI();

export default googleDriveAPI;

