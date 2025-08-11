import React, { useState, useEffect } from 'react';
import { getGoogleCloudTTSCredentials, saveGoogleCloudTTSCredentials, removeGoogleCloudTTSCredentials } from '../utils/googleCloudTTSCredentials';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Alert } from '@mui/material';
import { InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GoogleCloudTTSInfobox from './GoogleCloudTTSInfobox';

const GoogleCloudTTSAuth = ({ open, onClose }) => {
  const [credentials, setCredentials] = useState('');
  const [currentStoredCredentials, setCurrentStoredCredentials] = useState(null);
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);

  useEffect(() => {
    if (open) {
      const storedCredentials = getGoogleCloudTTSCredentials();
      setCurrentStoredCredentials(storedCredentials);
      setCredentials(storedCredentials ? JSON.stringify(storedCredentials, null, 2) : '');
      setError('');
    }
  }, [open]);

  const handleSave = () => {
    try {
      const parsedCredentials = JSON.parse(credentials);
      saveGoogleCloudTTSCredentials(parsedCredentials);
      toast.success('Credenciais do Google Cloud TTS salvas com sucesso!');
      onClose();
    } catch (err) {
      setError('JSON de credenciais inválido. Por favor, verifique o formato e cole o conteúdo completo do arquivo.');
    }
  };

  const handleRemove = () => {
    removeGoogleCloudTTSCredentials();
    setCurrentStoredCredentials(null);
    setCredentials('');
    toast.info('Credenciais do Google Cloud TTS removidas.');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Configurar Credenciais do Google Cloud TTS
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
          <Typography variant="body2" gutterBottom>
            Cole o conteúdo do seu arquivo JSON de credenciais de conta de serviço do Google Cloud.
          </Typography>

          {currentStoredCredentials && (
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
                if (error) setError('');
              }}
              placeholder="Cole o JSON de credenciais aqui..."
            />
          </Box>

          {error && (
            <Alert severity="error">{error}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
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
          <GoogleCloudTTSInfobox />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfobox(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GoogleCloudTTSAuth;
