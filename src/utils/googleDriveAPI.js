/**
 * Utilitário para integração com Google Drive API
 * Usa a nova Google Identity Services (GIS) em vez da biblioteca gapi.auth2
 */

class GoogleDriveAPI {
  constructor() {
    this.tokenClient = null;
    this.gapiClient = null;
    this.isInitialized = false;
    this.isSignedIn = false;
    this.accessToken = null;
    this.initPromise = null;
  }

  /**
   * Inicializa a API Google
   */
  async initialize(apiKey, clientId) {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.isInitialized) {
      return Promise.resolve(true);
    }

    this.initPromise = this._performInitialization(apiKey, clientId);

    try {
      const result = await this.initPromise;
      this.initPromise = null;
      return result;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  async _performInitialization(apiKey, clientId) {
    return new Promise((resolve, reject) => {
      // 1. Carrega a biblioteca GIS se necessário
      if (!window.google || !window.google.accounts) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => this._initializeGIS(clientId, apiKey, resolve, reject);
        script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
        document.head.appendChild(script);
      } else {
        this._initializeGIS(clientId, apiKey, resolve, reject);
      }
    });
  }

  async _initializeGIS(clientId, apiKey, resolve, reject) {
    try {
      // 2. Configura o Token Client para autenticação
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
        callback: (response) => {
          if (response.error) {
            reject(new Error(`Erro de autenticação: ${response.error}`));
            return;
          }
          this.accessToken = response.access_token;
          this.isSignedIn = true;
          resolve(true);
        },
        error_callback: (error) => {
          reject(new Error(`Erro no cliente de token: ${error}`));
        }
      });

      // 3. Carrega o cliente gapi para chamadas à API
      await this._loadGapiClient(apiKey);
      this.isInitialized = true;
      resolve(true);
    } catch (error) {
      reject(error);
    }
  }

  async _loadGapiClient(apiKey) {
    return new Promise((resolve, reject) => {
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          gapi.load('client', {
            callback: () => {
              gapi.client.init({
                apiKey: apiKey,
                discoveryDocs: [
                  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
                  'https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest'
                ]
              }).then(resolve, reject);
            },
            onerror: () => reject(new Error('Falha ao carregar gapi.client'))
          });
        };
        script.onerror = () => reject(new Error('Falha ao carregar Google API'));
        document.head.appendChild(script);
      } else {
        gapi.load('client', {
          callback: () => {
            gapi.client.init({
              apiKey: apiKey,
              discoveryDocs: [
                'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
                'https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest'
              ]
            }).then(resolve, reject);
          },
          onerror: () => reject(new Error('Falha ao carregar gapi.client'))
        });
      }
    });
  }

  /**
   * Faz login do usuário
   */
  async signIn() {
    if (!this.tokenClient) {
      throw new Error('API não inicializada. Chame initialize() primeiro.');
    }
    this.tokenClient.requestAccessToken();
  }

  /**
   * Faz logout do usuário
   */
  async signOut() {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken);
    }
    this.accessToken = null;
    this.isSignedIn = false;
  }

  /**
   * Verifica se o usuário está logado
   */
  isUserSignedIn() {
    return this.isSignedIn;
  }

  /**
   * Cria uma pasta no Google Drive
   */
  async createFolder(name, parentId = null) {
    if (!this.isInitialized || !this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    try {
      const metadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentId) {
        metadata.parents = [parentId];
      }

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao criar pasta: ${error.message || error}`);
    }
  }

  /**
   * Faz upload de um arquivo para o Google Drive
   */
  async uploadFile(file, fileName, folderId = null) {
    if (!this.isInitialized || !this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    try {
      const metadata = {
        name: fileName
      };

      if (folderId) {
        metadata.parents = [folderId];
      }

      const base64Data = await this._fileToBase64(file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
        },
        body: this._createMultipartBody(metadata, base64Data, file.type)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro no upload: ${error.message || error}`);
    }
  }

  /**
   * Converte arquivo para base64
   */
  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Cria o corpo multipart para upload
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
  /**
   * Cria uma nova planilha Google Sheets com os dados fornecidos
   */
  async createSpreadsheet(title, data, folderId = null) {
    if (!this.isInitialized || !this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    try {
      // 1. Cria a planilha vazia
      const metadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet'
      };

      if (folderId) {
        metadata.parents = [folderId];
      }

      // 2. Insere os dados na planilha
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: title
          },
          sheets: [{
            data: [{
              rowData: data.map((row, rowIndex) => ({
                values: row.map((cell, colIndex) => ({
                  userEnteredValue: {
                    stringValue: String(cell)
                  },
                  userEnteredFormat: {
                    textFormat: {
                      bold: rowIndex === 0 // Cabeçalho em negrito
                    }
                  }
                }))
              }))
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao criar planilha: ${error.message || error}`);
    }
  }
  /**
   * Lista arquivos em uma pasta
   */
  async listFiles(folderId = null, pageSize = 10) {
    if (!this.isInitialized || !this.isSignedIn) {
      throw new Error('Usuário não está logado');
    }

    try {
      let query = "trashed=false";
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao listar arquivos: ${error.message || error}`);
    }
  }
}

// Exporta uma instância única (singleton)
const googleDriveAPI = new GoogleDriveAPI();
export default googleDriveAPI;