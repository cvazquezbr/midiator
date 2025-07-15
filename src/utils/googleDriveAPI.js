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
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
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
          window.gapi.load('client', {
            callback: () => {
              window.gapi.client.init({
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
        window.gapi.load('client', {
          callback: () => {
            window.gapi.client.init({
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
      window.google.accounts.oauth2.revoke(this.accessToken);
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
      throw new Error('Usuário não está logado para criar pasta.');
    }

    // Verificar se a pasta já existe com este nome e pai (se fornecido)
    // console.log(`Buscando por pasta existente: Nome='${name}', ParentID='${parentId || 'raiz'}'`);
    const existingFolder = await this.findFolderByName(name, parentId);
    if (existingFolder) {
      console.warn(`Pasta '${name}' ${parentId ? `dentro de '${parentId}'` : 'na raiz'} já existe com ID: ${existingFolder.id}. Usando a existente.`);
      return existingFolder; // Retorna a pasta existente
    }
    // console.log(`Pasta '${name}' não encontrada. Criando uma nova.`);

    // Se não existir, cria uma nova
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
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Detalhes: ${errorBody} ao criar pasta.`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao criar nova pasta '${name}': ${error.message || error}`);
    }
  }


  /**
   * Procura por uma pasta com um nome específico dentro de uma pasta pai (opcional).
   * Retorna a primeira pasta encontrada ou null.
   */
  async findFolderByName(name, parentId = null) {
    if (!this.isInitialized || !this.isSignedIn) {
      // Não lançar erro aqui, pois pode ser chamado antes de um login completo em alguns fluxos,
      // ou o chamador (createFolder) já faz essa verificação.
      // Retornar null ou uma promessa rejeitada se for crítico. Para este uso,
      // createFolder já verifica o login.
      console.warn("findFolderByName chamado sem usuário logado ou API não inicializada.");
      return null;
    }

    let query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    } else {
      // Se parentId não for fornecido, assume-se que a busca é na raiz do Drive do usuário.
      // Para pastas de projeto, isso é um comportamento comum.
      // A API do Drive considera arquivos sem 'parents' explícitos como estando na raiz.
      // No entanto, para ser mais explícito na busca pela raiz:
      query += ` and 'root' in parents`;
    }
    // console.log("Query para findFolderByName:", query);

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&orderBy=createdTime desc`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        // Não tratar como erro fatal aqui, apenas logar e retornar null.
        // A falha na busca não deve impedir a tentativa de criação, a menos que a API esteja totalmente indisponível.
        console.error(`HTTP ${response.status}: ${response.statusText} ao buscar pasta '${name}'. A criação prosseguirá.`);
        return null;
      }
      const result = await response.json();
      if (result.files && result.files.length > 0) {
        // console.log(`Pasta(s) '${name}' encontrada(s):`, result.files);
        return result.files[0]; // Retorna a mais recente se houver múltiplas com mesmo nome/pai.
      }
      // console.log(`Nenhuma pasta '${name}' encontrada com os critérios.`);
      return null;
    } catch (error) {
      console.error(`Erro na API ao buscar pasta '${name}': ${error.message}. A criação prosseguirá se possível.`);
      return null; // Retorna null para permitir que a criação prossiga
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

      const uploadedFile = await response.json();

      // Define as permissões do arquivo para "qualquer pessoa com o link pode visualizar"
      if (uploadedFile && uploadedFile.id) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone'
            })
          });
        } catch (permissionError) {
          // Logar o erro de permissão, mas não falhar o upload principal
          console.warn(`Arquivo ${uploadedFile.id} enviado, mas falha ao definir permissões: ${permissionError.message}`);
        }
      }

      return uploadedFile;
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
      // 1. Define os dados para as abas
      const sheetsData = [
        { // Primeira aba (dados do CSV)
          properties: { title: 'Dados CSV' }, // Nome opcional para a primeira aba
          data: [{
            rowData: data.map((row, rowIndex) => ({
              values: row.map((cell) => ({
                userEnteredValue: { stringValue: String(cell) },
                userEnteredFormat: { textFormat: { bold: rowIndex === 0 } }
              }))
            }))
          }]
        },
        { // Segunda aba (controle)
          properties: { title: 'Controle' }, // Nome para a segunda aba
          data: [{
            rowData: [
              { // Primeira linha da segunda aba
                values: [
                  { userEnteredValue: { stringValue: "campo" } },
                  { userEnteredValue: { stringValue: "valor" } }
                ]
              },
              { // Segunda linha da segunda aba
                values: [
                  { userEnteredValue: { stringValue: "controle" } },
                  { userEnteredValue: { numberValue: 0 } } // Usando numberValue para o 0
                ]
              }
            ]
          }]
        }
      ];

      // 2. Cria a planilha com as duas abas
      const spreadsheetRequestBody = {
        properties: { title: title },
        sheets: sheetsData
      };

      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(spreadsheetRequestBody)
      });

      if (!response.ok) {
        const errorBody = await response.json();
        const errorMessageDetail = errorBody.error && errorBody.error.message ? errorBody.error.message : response.statusText;
        throw new Error(`HTTP ${response.status}: ${errorMessageDetail}`);
      }

      const createdSpreadsheet = await response.json();
      const spreadsheetId = createdSpreadsheet.spreadsheetId;

      // 3. Define as permissões do arquivo para "qualquer pessoa com o link pode visualizar"
      if (spreadsheetId) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        });
      }

      // 4. Mover a planilha para o folderId, se folderId for fornecido.
      if (folderId && spreadsheetId) {
        try {
          await this.moveFileToFolder(spreadsheetId, folderId);
        } catch (moveError) {
          console.warn(`Planilha criada com ID ${spreadsheetId} mas falhou ao mover para a pasta ${folderId}: ${moveError.message}`);
        }
      }

      return createdSpreadsheet;

    } catch (error) {
      const errorMessage = error.message || (error.result && error.result.error && error.result.error.message) || JSON.stringify(error);
      throw new Error(`Erro ao criar planilha: ${errorMessage}`);
    }
  }

  /**
   * Move um arquivo para uma pasta específica no Google Drive.
   * Remove o arquivo de outras pastas, incluindo a raiz, para garantir que ele esteja apenas no destino.
   */
  async moveFileToFolder(fileId, folderId) {
    if (!this.isInitialized || !this.isSignedIn) {
      throw new Error('Usuário não está logado para mover arquivo.');
    }
    if (!window.gapi || !window.gapi.client || !window.gapi.client.drive) {
        throw new Error('Cliente GAPI Drive não está pronto para mover arquivo.');
    }

    try {
      // Obter os pais atuais do arquivo para removê-lo da raiz ou de outras pastas.
      const file = await window.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'parents'
      });

      const previousParents = file.result.parents ? file.result.parents.join(',') : '';

      const response = await window.gapi.client.drive.files.update({
        fileId: fileId,
        addParents: folderId,
        removeParents: previousParents, // Garante que o arquivo seja movido e não copiado.
        fields: 'id, parents' // Campos a serem retornados na resposta.
      });

      return response.result;
    } catch (error) {
      const errorMessage = error.message || (error.result && error.result.error && error.result.error.message) || JSON.stringify(error);
      // Lançar o erro para que o chamador possa decidir como lidar com falhas na movimentação.
      throw new Error(`Erro ao mover arquivo ${fileId} para pasta ${folderId}: ${errorMessage}`);
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