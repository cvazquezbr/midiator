import React, { useState, useEffect } from 'react';
import { getGoogleCloudTTSCredentials, saveGoogleCloudTTSCredentials, removeGoogleCloudTTSCredentials } from '../utils/googleCloudTTSCredentials';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, Link } from '@mui/material';
import { Info } from '@mui/icons-material';

const GoogleCloudTTSAuth = ({ open, onClose }) => {
  const [credentials, setCredentials] = useState('');
  const [currentStoredCredentials, setCurrentStoredCredentials] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      const storedCredentials = getGoogleCloudTTSCredentials();
      setCurrentStoredCredentials(storedCredentials);
      setCredentials(storedCredentials ? JSON.stringify(storedCredentials, null, 2) : '');
      setMessage('');
    }
  }, [open]);

  const handleSave = () => {
    try {
      const parsedCredentials = JSON.parse(credentials);
      saveGoogleCloudTTSCredentials(parsedCredentials);
      setCurrentStoredCredentials(parsedCredentials);
      setMessage('Credenciais do Google Cloud TTS salvas com sucesso!');
    } catch (error) {
      setMessage('JSON de credenciais inválido. Por favor, verifique o formato.');
    }
  };

  const handleRemove = () => {
    removeGoogleCloudTTSCredentials();
    setCurrentStoredCredentials(null);
    setCredentials('');
    setMessage('Credenciais do Google Cloud TTS removidas.');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Configurar Credenciais do Google Cloud TTS</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Cole o conteúdo do seu arquivo JSON de credenciais de conta de serviço do Google Cloud.
          </Typography>

          {currentStoredCredentials && !message.includes('removida') && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Credenciais configuradas para: {currentStoredCredentials.client_email}
          </Typography>
        )}

        <Box sx={{ mt: currentStoredCredentials ? 1 : 2, mb: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            id="google-cloud-tts-credentials"
            label="JSON de Credenciais"
            type="text"
            fullWidth
            multiline
            rows={10}
            variant="outlined"
            value={credentials}
            onChange={(e) => {
              setCredentials(e.target.value);
              if (message) setMessage('');
            }}
            placeholder="Cole o JSON de credenciais aqui..."
          />
        </Box>

        {message && (
          <Typography color={message.includes('sucesso') ? 'green' : (message.includes('removida') ? 'textPrimary' : 'error')} variant="body2">
            {message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ pb: 2, px:3, justifyContent: 'space-between' }}>
        <Box>
          {currentStoredCredentials && (
            <Button onClick={handleRemove} color="error">
              Remover Credenciais
            </Button>
          )}
        </Box>
        <Box>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
            Salvar Credenciais
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default GoogleCloudTTSAuth;
