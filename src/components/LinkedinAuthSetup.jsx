import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Grid,
  CircularProgress,
} from '@mui/material';
import { InfoOutlined, Close } from '@mui/icons-material';
import {
  saveLinkedinConfig,
  getLinkedinConfig,
  removeLinkedinConfig,
} from '../utils/linkedinCredentials';
import GoogleDriveFolderPicker from './GoogleDriveFolderPicker';
import googleDriveAPI from '../utils/googleDriveAPI';

const LinkedinAuthSetup = ({ open, onClose, onBeforeRedirect }) => {
  const [config, setConfig] = useState({
    clientId: '',
    folderId: '',
  });
  const [currentConfig, setCurrentConfig] = useState(null);
  const [message, setMessage] = useState('');
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [connectedUser, setConnectedUser] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async (accessToken) => {
      try {
        const response = await fetch('/api/linkedin-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getProfile', accessToken }),
        });
        if (!response.ok) throw new Error('Falha ao buscar detalhes do usuário.');
        const data = await response.json();
        setConnectedUser(data);
      } catch (error) {
        console.error("Erro ao buscar detalhes do usuário do LinkedIn:", error);
        setConnectedUser({ localizedFirstName: 'Usuário', localizedLastName: 'Desconhecido' });
      }
    };

    if (open) {
      const storedConfig = getLinkedinConfig();
      setConfig({
        clientId: storedConfig.clientId || '',
        folderId: storedConfig.folderId || '',
      });

      if (storedConfig.accessToken) {
        setCurrentConfig(storedConfig);
        fetchUserDetails(storedConfig.accessToken);
      } else {
        setCurrentConfig(null);
        setConnectedUser(null);
      }
      setMessage('');
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({
      ...prevConfig,
      [name]: value,
    }));
    if (message) setMessage('');
  };

  const handleSelectFolder = (folder) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      folderId: folder.id,
    }));
    setPickerOpen(false);
  };

  const handleBrowseDrive = async () => {
    setMessage('');
    setIsDriveLoading(true);

    const apiKey = localStorage.getItem("google_drive_api_key");
    const clientId = localStorage.getItem("google_drive_client_id");

    if (!apiKey || !clientId) {
      setMessage('❌ Por favor, configure a integração com o Google na página principal primeiro.');
      setIsDriveLoading(false);
      return;
    }

    try {
      if (!googleDriveAPI.isInitialized) {
        await googleDriveAPI.initialize(apiKey, clientId);
      }

      if (!googleDriveAPI.isUserSignedIn()) {
        setMessage('Aguardando login com o Google...');
        await googleDriveAPI.signIn();
        setMessage('');
      }

      setPickerOpen(true);
    } catch (error) {
      console.error('Erro ao preparar o seletor de pastas do Google Drive:', error);
      setMessage(`❌ Erro no Google Drive: ${error.message}`);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleConnect = async () => {
    if (config.clientId.trim()) {
      if (onBeforeRedirect) {
        await onBeforeRedirect();
      }
      saveLinkedinConfig(config);
      const redirectUri = window.location.origin;
      const scope = 'r_liteprofile%20w_member_social';
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
      window.location.href = authUrl;
    } else {
      setMessage('Por favor, preencha o Client ID.');
    }
  };

  const handleTestConnection = async () => {
    const { accessToken } = getLinkedinConfig();
    if (!accessToken) {
      setMessage('❌ Não há uma conexão ativa para testar.');
      return;
    }
    setMessage('Testando conexão...');
    try {
      const response = await fetch('/api/linkedin-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testConnection', accessToken }),
      });
      if (response.ok) {
        setMessage(`✅ Conexão bem-sucedida.`);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Não foi possível ler a resposta de erro.' }));
        setMessage(`❌ Erro no teste: ${errorData.message || 'Ocorreu um erro desconhecido.'}`);
        if (response.status === 401) {
          removeLinkedinConfig();
          setCurrentConfig(null);
        }
      }
    } catch (error) {
      console.error('Erro no teste de conexão com LinkedIn:', error);
      setMessage('❌ Erro de rede ao testar a conexão.');
    }
  };

  const handleRemove = () => {
    removeLinkedinConfig();
    setCurrentConfig(null);
    setConnectedUser(null); // Limpar usuário ao desconectar
    setConfig({ clientId: '', folderId: '' });
    setMessage('Configuração do LinkedIn removida.');
  };

  const handleSave = () => {
    saveLinkedinConfig(config);
    setMessage('✅ Configuração salva com sucesso!');
  };

  const aplicationInfoTooltip = (
    <span>
      Como obter o Client ID do LinkedIn:
      <ol>
        <li>Acesse: <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer">LinkedIn Developer Portal</a></li>
        <li>Crie um novo aplicativo ou selecione um existente.</li>
        <li>Na aba "Auth", copie o Client ID.</li>
        <li>Adicione o seguinte URI à sua lista de "Authorized redirect URIs": {window.location.origin}</li>
      </ol>
    </span>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Configurar Integração com LinkedIn
          <IconButton aria-label="close" onClick={onClose}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {currentConfig && currentConfig.accessToken ? (
            <Box>
              <Typography variant="h6" color="green" sx={{ mb: 2 }}>
                {connectedUser
                  ? `✅ Conectado como ${connectedUser.localizedFirstName} ${connectedUser.localizedLastName}`
                                    : '✅ Conectado. Verificando usuário...'}
              </Typography>
              <Grid container spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
                <Grid item xs>
                  <TextField
                    name="folderId"
                    label="ID da Pasta no Google Drive (Opcional)"
                    value={config.folderId}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    placeholder="ID da pasta para a fila de publicação"
                  />
                </Grid>
                <Grid item>
                  <Tooltip title="Essa pasta será monitorada para novas postagens. O conteúdo e as imagens para posts agendados devem ser colocados aqui.">
                    <IconButton>
                      <InfoOutlined />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
              <Button
                variant="outlined"
                onClick={handleBrowseDrive}
                disabled={isDriveLoading}
                startIcon={isDriveLoading ? <CircularProgress size={16} /> : null}
              >
                {isDriveLoading ? 'Aguarde...' : 'Procurar no Google Drive...'}
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Insira seu Client ID para conectar sua conta do LinkedIn.
                </Typography>
              </Grid>
              <Grid item xs={11}>
                <TextField
                  name="clientId"
                  label="Client ID"
                  value={config.clientId}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                  placeholder="Seu Client ID do LinkedIn"
                />
              </Grid>
              <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title={aplicationInfoTooltip}>
                  <IconButton>
                    <InfoOutlined />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          )}

          {message && (
            <Typography color={message.includes('sucesso') || message.includes('Conectado') ? 'green' : 'error'} variant="body2" sx={{ mt: 2 }}>
              {message}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
          <Box>
            {currentConfig && currentConfig.accessToken ? (
              <>
                <Button onClick={handleSave} variant="contained">Salvar</Button>
                <Button onClick={handleTestConnection} sx={{ ml: 1 }}>Testar Conexão</Button>
                <Button onClick={handleRemove} color="error" sx={{ ml: 1 }}>
                  Desconectar
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} variant="contained">
                Conectar com o LinkedIn
              </Button>
            )}
          </Box>
          <Box>
            <Button onClick={onClose}>Fechar</Button>
          </Box>
        </DialogActions>
      </Dialog>
      <GoogleDriveFolderPicker
        open={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectFolder={handleSelectFolder}
      />
    </>
  );
};

export default LinkedinAuthSetup;
