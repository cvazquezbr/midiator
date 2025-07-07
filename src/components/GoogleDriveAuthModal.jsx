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
  Alert
} from '@mui/material';
import { Google, CloudQueue, OpenInNew, VpnKey, PersonPin } from '@mui/icons-material'; // Adicionado PersonPin para Client ID

// Importar funções utilitárias do googleDriveAPI (assumindo que elas existem e lidam com localStorage)
// import { setGoogleDriveCredentials, getGoogleDriveCredentials, clearGoogleDriveCredentials } from '../utils/googleDriveCredentials';
// Por enquanto, vamos simular o localStorage diretamente, mas o ideal seria uma abstração em utils.

const GoogleDriveAuthModal = ({ open, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (open) {
      const storedApiKey = localStorage.getItem('google_drive_api_key');
      const storedClientId = localStorage.getItem('google_drive_client_id');
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
      if (storedClientId) {
        setClientId(storedClientId);
      }
      setError('');
      setSuccessMessage('');
    }
  }, [open]);

  const handleSave = () => {
    if (!apiKey.trim() || !clientId.trim()) {
      setError('API Key e Client ID são obrigatórios.');
      setSuccessMessage('');
      return;
    }
    localStorage.setItem('google_drive_api_key', apiKey.trim());
    localStorage.setItem('google_drive_client_id', clientId.trim());
    // Aqui você poderia chamar uma função para (re)inicializar a API do Google Drive se necessário
    // Ex: googleDriveAPI.initialize(apiKey, clientId);
    setError('');
    setSuccessMessage('Credenciais do Google Drive salvas com sucesso!');
    // Não fechar imediatamente para o usuário ver a mensagem de sucesso, ou fechar após um delay.
    // onClose(); // Fechar modal após salvar
  };

  const handleClear = () => {
    localStorage.removeItem('google_drive_api_key');
    localStorage.removeItem('google_drive_client_id');
    setApiKey('');
    setClientId('');
    setError('');
    setSuccessMessage('Credenciais do Google Drive removidas.');
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CloudQueue sx={{ mr: 1, color: 'primary.main' }} />
          Configurar API do Google Drive
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Para integrar com o Google Drive, você precisará de uma API Key e um Client ID
          do seu projeto no Google Cloud Console.
          <Link
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center', mt: 1 }}
          >
            Abrir Google Cloud Console <OpenInNew sx={{ ml: 0.5, fontSize: 'inherit' }} />
          </Link>
        </DialogContentText>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

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
              setSuccessMessage('');
            }}
            placeholder="Cole sua API Key aqui"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonPin sx={{ color: 'action.active', mr: 1, my: 0.5 }} /> {/* Ícone para Client ID */}
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
              setSuccessMessage('');
            }}
            placeholder="Cole seu Client ID aqui"
          />
        </Box>
        <Typography variant="caption" display="block" gutterBottom sx={{mt: -1, ml: '40px'}}>
          Suas credenciais são salvas localmente no seu navegador.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={handleClear} color="error">
          Limpar Salvas
        </Button>
        <Box sx={{ flex: '1 0 0' }} /> {/* Espaçador */}
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Salvar Credenciais
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDriveAuthModal;
