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
  Alert,
} from '@mui/material';
import { InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  saveLinkedinConfig,
  getLinkedinConfig,
  removeLinkedinConfig,
} from '../utils/linkedinCredentials';
import GoogleDriveFolderPicker from './GoogleDriveFolderPicker';
import googleDriveAPI from '../utils/googleDriveAPI';
import LinkedinInfobox from './LinkedinInfobox';

const LinkedinAuthSetup = ({ open, onClose, onBeforeRedirect }) => {
  const [config, setConfig] = useState({ clientId: '', folderId: '' });
  const [currentConfig, setCurrentConfig] = useState(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [connectedUser, setConnectedUser] = useState(null);
  const [showInfobox, setShowInfobox] = useState(false);
  const [error, setError] = useState('');

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
      } catch (err) {
        console.error("Erro ao buscar detalhes do usuário do LinkedIn:", err);
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
      setError('');
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({ ...prevConfig, [name]: value }));
    if (error) setError('');
  };

  const handleSelectFolder = (folder) => {
    setConfig((prevConfig) => ({ ...prevConfig, folderId: folder.id }));
    setPickerOpen(false);
  };

  const handleBrowseDrive = async () => {
    setError('');
    setIsDriveLoading(true);

    const apiKey = localStorage.getItem("google_drive_api_key");
    const clientId = localStorage.getItem("google_drive_client_id");

    if (!apiKey || !clientId) {
      toast.error('Por favor, configure a integração com o Google Drive primeiro.');
      setIsDriveLoading(false);
      return;
    }

    try {
      if (!googleDriveAPI.isInitialized) {
        await googleDriveAPI.initialize(apiKey, clientId);
      }
      if (!googleDriveAPI.isUserSignedIn()) {
        toast.info('Aguardando login com o Google...');
        await googleDriveAPI.signIn();
      }
      setPickerOpen(true);
    } catch (err) {
      console.error('Erro ao preparar o seletor de pastas do Google Drive:', err);
      toast.error(`Erro no Google Drive: ${err.message}`);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleConnect = async () => {
    if (config.clientId.trim()) {
      if (onBeforeRedirect) await onBeforeRedirect();
      saveLinkedinConfig(config);
      const redirectUri = window.location.origin;
      const scope = encodeURIComponent('r_basicprofile w_member_social w_organization_social rw_organization_admin');
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
      window.location.href = authUrl;
    } else {
      setError('Por favor, preencha o Client ID.');
    }
  };

  const handleTestConnection = async () => {
    const { accessToken } = getLinkedinConfig();
    if (!accessToken) {
      toast.error('Não há uma conexão ativa para testar.');
      return;
    }
    toast.loading('Testando conexão...');
    try {
      const response = await fetch('/api/linkedin-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testConnection', accessToken }),
      });
      toast.dismiss();
      if (response.ok) {
        toast.success('Conexão bem-sucedida.');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Não foi possível ler a resposta de erro.' }));
        toast.error(`Erro no teste: ${errorData.message || 'Ocorreu um erro desconhecido.'}`);
        if (response.status === 401) {
          removeLinkedinConfig();
          setCurrentConfig(null);
        }
      }
    } catch (err) {
      console.error('Erro no teste de conexão com LinkedIn:', err);
      toast.dismiss();
      toast.error('Erro de rede ao testar a conexão.');
    }
  };

  const handleRemove = () => {
    removeLinkedinConfig();
    sessionStorage.removeItem('linkedin_profiles_cache');
    setCurrentConfig(null);
    setConnectedUser(null);
    setConfig({ clientId: '', folderId: '' });
    toast.info('Configuração do LinkedIn removida.');
  };

  const handleSave = () => {
    saveLinkedinConfig(config);
    toast.success('Configuração salva com sucesso!');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Configurar Integração com LinkedIn
            <Box>
              <IconButton onClick={() => setShowInfobox(true)}>
                <InfoIcon />
              </IconButton>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {currentConfig && currentConfig.accessToken && (
            <Typography variant="h6" color="green" sx={{ mb: 2 }}>
              {connectedUser
                ? `✅ Conectado como ${connectedUser.localizedFirstName} ${connectedUser.localizedLastName}`
                : '✅ Conectado. Verificando usuário...'}
            </Typography>
          )}

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
                  <InfoIcon />
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

          {(!currentConfig || !currentConfig.accessToken) && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Insira seu Client ID para conectar sua conta do LinkedIn.
                </Typography>
              </Grid>
              <Grid item xs={12}>
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
            </Grid>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
          <Box>
            <Button onClick={handleSave} variant="contained">Salvar</Button>
            {currentConfig && currentConfig.accessToken ? (
              <>
                <Button onClick={handleTestConnection} sx={{ ml: 1 }}>Testar Conexão</Button>
                <Button onClick={handleRemove} color="error" sx={{ ml: 1 }}>
                  Desconectar
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} variant="contained" sx={{ ml: 1 }}>
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

      <Dialog open={showInfobox} onClose={() => setShowInfobox(false)} fullWidth maxWidth="lg">
        <DialogTitle>
           <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Instruções de Configuração
            <IconButton onClick={() => setShowInfobox(false)}>
                <CloseIcon />
            </IconButton>
           </Box>
        </DialogTitle>
        <DialogContent>
          <LinkedinInfobox />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfobox(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LinkedinAuthSetup;
