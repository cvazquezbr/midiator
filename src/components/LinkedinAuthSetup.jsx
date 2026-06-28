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
import { saveSettingsToDb, loadSettingsFromDb } from '../utils/credentialsManager';

const LinkedinAuthSetup = ({ onBeforeRedirect }) => {
  const { settings, updateSetting, isLoading: isLoadingSettings, loadSettings } = useSettings();
  const { googleAccessToken, setGoogleAccessToken } = useUserAuth();

  const [connectedUser, setConnectedUser] = useState(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [showInfobox, setShowInfobox] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');
  const [isLoadingClientId, setIsLoadingClientId] = useState(true);

  const linkedinConfig = settings.linkedin || {};

  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const response = await fetch('/api/linkedin-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getClientId' }),
        });
        if (!response.ok) throw new Error('Falha ao buscar o Client ID do LinkedIn.');
        const data = await response.json();
        if (data && data.clientId) {
          setClientId(data.clientId);
        } else {
          throw new Error('A resposta do servidor não continha um Client ID.');
        }
      } catch (err) {
        console.error("Erro ao buscar o Client ID do LinkedIn:", err);
        setError(err.message || 'Não foi possível obter a configuração para a conexão com o LinkedIn.');
      } finally {
        setIsLoadingClientId(false);
      }
    };
    fetchClientId();
  }, []);

  useEffect(() => {
    const exchangeCodeForToken = async (code) => {
        try {
            const redirectUri = window.location.origin;
            const response = await fetch('/api/linkedin-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'tokenExchange', code, redirectUri }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Falha ao trocar o código de autorização.');
            }

            const data = await response.json();
            const { access_token, expires_in } = data;

            if (access_token) {
                const expiry = Date.now() + expires_in * 1000;
                const updatedLinkedinConfig = { ...linkedinConfig, accessToken: access_token, expiry };

                // 1. Update in-memory state
                updateSetting('linkedin', updatedLinkedinConfig);

                // 2. Persist to DB immediately to avoid loss on reload
                try {
                  // Re-fetch latest settings from DB to ensure no data loss during merge
                  const latestDbSettings = await loadSettingsFromDb();
                  await saveSettingsToDb({ ...latestDbSettings, linkedin: updatedLinkedinConfig });

                  // 3. Re-sync the context
                  await loadSettings();

                  console.log('LinkedIn token automatically persisted and context synchronized.');
                } catch (saveErr) {
                  console.error('Failed to auto-persist LinkedIn token:', saveErr);
                  // Non-blocking error, memory state is still updated
                }

                toast.success('Conexão com o LinkedIn estabelecida com sucesso!');
            } else {
                throw new Error('Token de acesso não encontrado na resposta.');
            }
        } catch (err) {
            console.error("Erro ao trocar código por token:", err);
            setError(`Ocorreu um erro: ${err.message}`);
            toast.error('Não foi possível conectar com o LinkedIn.');
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // Only proceed with exchange if we have a code AND settings have finished their initial load.
    // This prevents wiping out other settings if exchangeCodeForToken saves before DB settings are loaded.
    if (code && !isLoadingSettings) {
        exchangeCodeForToken(code);
    }
  }, [updateSetting, isLoadingSettings]);

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

        const getLocalized = (obj) => {
            if (!obj) return '';
            if (typeof obj === 'string') return obj;
            if (obj.localized) {
                const locale = Object.keys(obj.localized)[0];
                return obj.localized[locale] || '';
            }
            return '';
        };

        // Map field names with fallbacks for different LinkedIn API versions/schemas
        const firstName = getLocalized(data.givenName || data.firstName || data.localizedFirstName);
        const lastName = getLocalized(data.familyName || data.lastName || data.localizedLastName);

        setConnectedUser({ localizedFirstName: firstName, localizedLastName: lastName });
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

  const handleFolderIdChange = (e) => {
    const { value } = e.target;
    const newLinkedinConfig = { ...linkedinConfig, folderId: value };
    updateSetting('linkedin', newLinkedinConfig);
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
    setIsDriveLoading(true);
    setPickerOpen(true);
  };

  const handleConnect = async () => {
    if (clientId) {
      const canProceed = onBeforeRedirect ? await onBeforeRedirect() : true;
      if (!canProceed) {
        return;
      }

      sessionStorage.setItem('linkedin_oauth_inprogress', 'true');
      const redirectUri = window.location.origin;
      const scope = encodeURIComponent('r_basicprofile w_member_social r_organization_social w_organization_social rw_organization_admin r_member_postAnalytics');
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&prompt=select_account`;
      window.location.href = authUrl;
    } else {
      setError('O Client ID do LinkedIn não está configurado no servidor.');
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
    const { folderId } = settings.linkedin || {};
    updateSetting('linkedin', { accessToken: null, expiry: null, folderId: folderId || '' });
    sessionStorage.removeItem('linkedin_profiles_cache_v2');
    setConnectedUser(null);
    toast.info('Conexão com o LinkedIn removida.');
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
              onChange={handleFolderIdChange}
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
                Clique no botão "Conectar" para autorizar a aplicação a postar em seu nome.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Para conectar com uma conta diferente, primeiro saia do LinkedIn no seu navegador.
              </Typography>
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
              <Button
                onClick={handleConnect}
                variant="contained"
                disabled={isLoadingClientId}
              >
                {isLoadingClientId ? 'Carregando...' : 'Conectar'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <GoogleDriveFolderPicker
        open={isPickerOpen}
        onClose={() => {
          setIsDriveLoading(false);
          setPickerOpen(false);
        }}
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
