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
import { VpnKey, PersonPin, InfoOutlined as InfoIcon, Close as CloseIcon, Link, LinkOff } from '@mui/icons-material';
import { toast } from 'sonner';
import GoogleDriveInfobox from './GoogleDriveInfobox';
import { useAuth } from '../context/AuthContext';

const GoogleDriveAuthModal = () => {
  const { isGoogleDriveConnected, connectGoogleDrive, disconnectGoogleDrive, checkGoogleDriveConnection } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('google_drive_api_key');
    const storedClientId = localStorage.getItem('google_drive_client_id');
    if (storedApiKey) setApiKey(storedApiKey);
    if (storedClientId) setClientId(storedClientId);
    setError('');
    // No-op to avoid empty block
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
    // Verifica a conexão novamente caso as credenciais tenham sido atualizadas
    checkGoogleDriveConnection();
  };

  const handleClear = () => {
    localStorage.removeItem('google_drive_api_key');
    localStorage.removeItem('google_drive_client_id');
    setApiKey('');
    setClientId('');
    setError('');
    toast.info('Credenciais do Google Drive removidas.');
    // Força a desconexão se as credenciais forem removidas
    if (isGoogleDriveConnected) {
      disconnectGoogleDrive();
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim() || !clientId.trim()) {
      setError('Por favor, salve a API Key e o Client ID para conectar.');
      return;
    }
    setIsLoading(true);
    await connectGoogleDrive();
    setIsLoading(false);
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    await disconnectGoogleDrive();
    setIsLoading(false);
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
          {isGoogleDriveConnected ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<LinkOff />}
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              {isLoading ? 'Desconectando...' : 'Desconectar'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Link />}
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? 'Conectando...' : 'Conectar'}
            </Button>
          )}
          <Box>
            <Button onClick={handleClear} color="secondary">
              Remover
            </Button>
            <Button onClick={handleSave} variant="outlined" sx={{ ml: 1 }}>
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
