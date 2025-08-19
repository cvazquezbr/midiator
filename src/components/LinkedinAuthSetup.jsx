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
  saveLinkedinConfig as saveLocalConfig,
  getLinkedinConfig,
  removeLinkedinConfig,
} from '../utils/linkedinCredentials';
import GoogleDriveFolderPicker from './GoogleDriveFolderPicker';
import { useUserAuth } from '../context/UserAuthContext';
import LinkedinInfobox from './LinkedinInfobox';

const LinkedinAuthSetup = ({ onBeforeRedirect }) => {
  const { googleAccessToken } = useUserAuth();
  const [config, setConfig] = useState({ clientId: '', clientSecret: '', folderId: '' });
  const [currentConfig, setCurrentConfig] = useState(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [connectedUser, setConnectedUser] = useState(null);
  const [showInfobox, setShowInfobox] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.linkedin) {
          setConfig(prev => ({
            ...prev,
            clientId: data.linkedin.clientId || '',
            clientSecret: data.linkedin.clientSecret || '',
          }));
        }
      } else {
        toast.error('Falha ao carregar as configurações do LinkedIn.');
      }
    } catch (err) {
      toast.error('Erro de rede ao carregar as configurações.');
    } finally {
      setIsLoading(false);
    }
  };

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

    fetchSettings();
    const storedConfig = getLinkedinConfig();

    if (storedConfig.accessToken) {
      setCurrentConfig(storedConfig);
      fetchUserDetails(storedConfig.accessToken);
    } else {
      setCurrentConfig(null);
      setConnectedUser(null);
    }
    setError('');
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({ ...prevConfig, [name]: value }));
    if (error) setError('');
  };

  const handleSelectFolder = (folder) => {
    setConfig((prevConfig) => ({ ...prevConfig, folderId: folder.id }));
    setPickerOpen(false);
  };

  const handleBrowseDrive = () => {
    if (!googleAccessToken) {
      toast.error('Você precisa estar conectado com uma conta Google que tenha permissão para o Drive.');
      return;
    }
    setPickerOpen(true);
  };

  const handleConnect = async () => {
    if (config.clientId.trim()) {
      // Save the configuration before redirecting
      await handleSave(false); // silent save

      if (onBeforeRedirect) await onBeforeRedirect();

      // We only save the non-sensitive part to local storage for the redirect
      saveLocalConfig({ clientId: config.clientId });

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

  const handleRemove = async () => {
    // Also clear server-side credentials
    await handleSave(false, { clientId: '', clientSecret: '' });
    removeLinkedinConfig();
    sessionStorage.removeItem('linkedin_profiles_cache');
    setCurrentConfig(null);
    setConnectedUser(null);
    setConfig({ clientId: '', clientSecret: '', folderId: '' });
    toast.info('Configuração do LinkedIn e conexão removidas.');
  };

  const handleSave = async (showToast = true, newConfig) => {
    const settingsToSave = newConfig || config;
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedin: {
            clientId: settingsToSave.clientId,
            clientSecret: settingsToSave.clientSecret,
          }
        }),
      });
      if (response.ok) {
        if (showToast) toast.success('Configuração salva com sucesso!');
      } else {
        if (showToast) toast.error('Falha ao salvar a configuração.');
      }
    } catch (err) {
      if (showToast) toast.error('Erro de rede ao salvar a configuração.');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando configurações...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">LinkedIn</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>

        {currentConfig && currentConfig.accessToken && (
          <Typography variant="h6" color="green" sx={{ my: 2 }}>
            {connectedUser
              ? `✅ Conectado como ${connectedUser.localizedFirstName} ${connectedUser.localizedLastName}`
              : '✅ Conectado. Verificando usuário...'}
          </Typography>
        )}

        <Grid container spacing={1} alignItems="flex-start" sx={{ mb: 2, mt: 2 }}>
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
                Insira suas credenciais do LinkedIn para conectar sua conta.
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
            <Grid item xs={12}>
              <TextField
                name="clientSecret"
                label="Client Secret"
                type="password"
                value={config.clientSecret}
                onChange={handleChange}
                fullWidth
                required
                variant="outlined"
                placeholder="Seu Client Secret do LinkedIn"
              />
            </Grid>
          </Grid>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}

        <Box sx={{ pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {currentConfig && currentConfig.accessToken ? (
            <Button onClick={handleTestConnection}>Testar Conexão</Button>
          ) : (
            <Button onClick={() => handleSave()} variant="outlined">Salvar Credenciais</Button>
          )}
          <Box>
            {currentConfig && currentConfig.accessToken ? (
              <Button onClick={handleRemove} color="error">
                Desconectar
              </Button>
            ) : (
              <Button onClick={handleConnect} variant="contained">
                Salvar e Conectar
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <GoogleDriveFolderPicker
        open={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectFolder={handleSelectFolder}
        googleAccessToken={googleAccessToken}
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
