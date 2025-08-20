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
import { useSettings } from '../context/SettingsContext';
import GoogleDriveFolderPicker from './GoogleDriveFolderPicker';
import { useUserAuth } from '../context/UserAuthContext';
import LinkedinInfobox from './LinkedinInfobox';

const LinkedinAuthSetup = ({ onBeforeRedirect }) => {
  const { settings, updateSetting } = useSettings();
  const { googleAccessToken, setGoogleAccessToken } = useUserAuth();

  const [connectedUser, setConnectedUser] = useState(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [showInfobox, setShowInfobox] = useState(false);
  const [error, setError] = useState('');

  const linkedinConfig = settings.linkedin || {};

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

    if (linkedinConfig.accessToken) {
      fetchUserDetails(linkedinConfig.accessToken);
    } else {
      setConnectedUser(null);
    }
  }, [linkedinConfig.accessToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newLinkedinConfig = { ...linkedinConfig, [name]: value };
    updateSetting('linkedin', newLinkedinConfig);
    if (error) setError('');
  };

  const handleSelectFolder = (folder) => {
    const newLinkedinConfig = { ...linkedinConfig, folderId: folder.id };
    updateSetting('linkedin', newLinkedinConfig);
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
    if (linkedinConfig.clientId?.trim()) {
      if (onBeforeRedirect) await onBeforeRedirect();

      const redirectUri = window.location.origin;
      const scope = encodeURIComponent('r_basicprofile w_member_social w_organization_social rw_organization_admin');
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinConfig.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
      window.location.href = authUrl;
    } else {
      setError('Por favor, preencha o Client ID.');
    }
  };

  const handleTestConnection = async () => {
    const { accessToken } = linkedinConfig;
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
          handleRemove();
        }
      }
    } catch (err) {
      console.error('Erro no teste de conexão com LinkedIn:', err);
      toast.dismiss();
      toast.error('Erro de rede ao testar a conexão.');
    }
  };

  const handleRemove = () => {
    updateSetting('linkedin', { clientId: '', clientSecret: '', accessToken: null, expiry: null, folderId: '' });
    sessionStorage.removeItem('linkedin_profiles_cache');
    setConnectedUser(null);
    toast.info('Configuração do LinkedIn e conexão removidas.');
  };

  return (
    <>
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">LinkedIn</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>

        {linkedinConfig.accessToken && (
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
              value={linkedinConfig.folderId || ''}
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

        {(!linkedinConfig.accessToken) && (
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
                value={linkedinConfig.clientId || ''}
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
                value={linkedinConfig.clientSecret || ''}
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
          {linkedinConfig.accessToken ? (
            <Button onClick={handleTestConnection}>Testar Conexão</Button>
          ) : (
            <Typography variant="caption" color="text.secondary">
                Salve as configurações no botão geral no final da página.
            </Typography>
          )}
          <Box>
            {linkedinConfig.accessToken ? (
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
        setGoogleAccessToken={setGoogleAccessToken}
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
