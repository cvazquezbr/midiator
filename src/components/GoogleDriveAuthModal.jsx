import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
} from '@mui/material';
import { VpnKey, PersonPin, InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GoogleDriveInfobox from './GoogleDriveInfobox';
import googleDriveAPI from '../utils/googleDriveAPI';

const GoogleDriveAuthModal = () => {
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('google_drive_api_key');
    const storedClientId = localStorage.getItem('google_drive_client_id');
    if (storedApiKey) setApiKey(storedApiKey);
    if (storedClientId) setClientId(storedClientId);
    setError('');
  }, []);

  const handleSave = () => {
    if (!apiKey.trim() || !clientId.trim()) {
      setError('API Key e Client ID são obrigatórios.');
      return;
    }
    localStorage.setItem('google_drive_api_key', apiKey.trim());
    localStorage.setItem('google_drive_client_id', clientId.trim());
    setError('');
    toast.success('Credenciais do Google Drive salvas com sucesso!');
  };

  const handleClear = () => {
    localStorage.removeItem('google_drive_api_key');
    localStorage.removeItem('google_drive_client_id');
    setApiKey('');
    setClientId('');
    setError('');
    toast.info('Credenciais do Google Drive removidas.');
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !clientId.trim()) {
      setError('Por favor, preencha a API Key e o Client ID para testar.');
      return;
    }

    setIsTesting(true);
    setError('');

    try {
      if (!googleDriveAPI.isInitialized) {
        toast.info('Inicializando API do Google...');
        await googleDriveAPI.initialize(apiKey, clientId);
      }

      if (!googleDriveAPI.isUserSignedIn()) {
        toast.info('Aguardando login com o Google...');
        await googleDriveAPI.signIn();
      }

      toast.info('Buscando pastas no Google Drive...');
      await googleDriveAPI.listFolders(1); // Apenas busca 1 para testar

      toast.success('Conexão com Google Drive bem-sucedida!');

    } catch (err) {
      console.error("Erro no teste de conexão com Google Drive:", err);
      toast.error(`Falha na conexão: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">API do Google Drive</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ mb: 2, mt: 2 }}>
          Para integrar com o Google Drive, você precisará de uma API Key e um Client ID
          do seu projeto no Google Cloud Console.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <VpnKey sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
          <TextField
            autoFocus
            margin="dense"
            id="google-drive-api-key"
            label="API Key do Google Drive"
            type="text"
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError('');
            }}
            placeholder="Cole sua API Key aqui"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonPin sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
          <TextField
            margin="dense"
            id="google-drive-client-id"
            label="Client ID do Google Drive"
            type="text"
            fullWidth
            variant="outlined"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setError('');
            }}
            placeholder="Cole seu Client ID aqui"
          />
        </Box>
        <Typography variant="caption" display="block" gutterBottom sx={{ mt: -1, ml: '40px' }}>
          Suas credenciais são salvas localmente no seu navegador.
        </Typography>

        <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={handleClear} color="error">
            Limpar Salvas
          </Button>
          <Box>
            <Button onClick={handleTestConnection} disabled={isTesting}>
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
              Salvar
            </Button>
          </Box>
        </Box>
      </Box>

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
          <GoogleDriveInfobox />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfobox(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GoogleDriveAuthModal;
