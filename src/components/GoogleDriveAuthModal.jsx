import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Button,
  Box,
  Typography,
  Link,
  Alert,
  IconButton,
} from '@mui/material';
import { CloudQueue, OpenInNew, VpnKey, PersonPin, InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GoogleDriveInfobox from './GoogleDriveInfobox';

const GoogleDriveAuthModal = ({ open, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);

  useEffect(() => {
    if (open) {
      const storedApiKey = localStorage.getItem('google_drive_api_key');
      const storedClientId = localStorage.getItem('google_drive_client_id');
      if (storedApiKey) setApiKey(storedApiKey);
      if (storedClientId) setClientId(storedClientId);
      setError('');
    }
  }, [open]);

  const handleSave = () => {
    if (!apiKey.trim() || !clientId.trim()) {
      setError('API Key e Client ID são obrigatórios.');
      return;
    }
    localStorage.setItem('google_drive_api_key', apiKey.trim());
    localStorage.setItem('google_drive_client_id', clientId.trim());
    setError('');
    toast.success('Credenciais do Google Drive salvas com sucesso!');
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem('google_drive_api_key');
    localStorage.removeItem('google_drive_client_id');
    setApiKey('');
    setClientId('');
    setError('');
    toast.info('Credenciais do Google Drive removidas.');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CloudQueue sx={{ mr: 1, color: 'primary.main' }} />
              Configurar API do Google Drive
            </Box>
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
          <DialogContentText sx={{ mb: 2 }}>
            Para integrar com o Google Drive, você precisará de uma API Key e um Client ID
            do seu projeto no Google Cloud Console.
          </DialogContentText>

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
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={handleClear} color="error">
            Limpar Salvas
          </Button>
          <Box sx={{ flex: '1 0 0' }} />
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Salvar Credenciais
          </Button>
        </DialogActions>
      </Dialog>

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
