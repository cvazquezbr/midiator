import React, { useState, useEffect } from 'react';
import { getGoogleCloudTTSApiKey, saveGoogleCloudTTSApiKey, removeGoogleCloudTTSApiKey } from '../utils/googleCloudTTSCredentials';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Link } from '@mui/material';
import { Visibility, VisibilityOff, Info } from '@mui/icons-material';

const GoogleCloudTTSAuth = ({ open, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [currentStoredKey, setCurrentStoredKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      const storedKey = getGoogleCloudTTSApiKey();
      setCurrentStoredKey(storedKey);
      setApiKey(storedKey || ''); // Preenche o campo se já houver uma chave
      setMessage(''); // Limpa mensagens anteriores ao abrir
    }
  }, [open]);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveGoogleCloudTTSApiKey(apiKey.trim());
      setCurrentStoredKey(apiKey.trim());
      setMessage('Chave da API Google Cloud TTS salva com sucesso!');
    } else {
      setMessage('Por favor, insira uma chave da API Google Cloud TTS válida.');
    }
  };

  const handleRemove = () => {
    removeGoogleCloudTTSApiKey();
    setCurrentStoredKey(null);
    setApiKey('');
    setMessage('Chave da API Google Cloud TTS removida.');
  };

  const toggleShowKey = () => {
    setShowKey(!showKey);
  };

  const getMaskedKey = (key) => {
    if (!key || key.length < 8) return 'Chave muito curta para mascarar';
    return `...${key.substring(key.length - 6)}`;
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Configurar Chave da API Google Cloud TTS</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Insira sua chave da API Google Cloud Text-to-Speech. Esta chave será armazenada localmente no seu navegador.
          </Typography>

          {currentStoredKey && !message.includes('removida') && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Chave atual configurada: {getMaskedKey(currentStoredKey)}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mt: currentStoredKey ? 1 : 2, mb: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            id="google-cloud-tts-api-key"
            label="Chave da API Google Cloud TTS"
            type={showKey ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (message) setMessage('');
            }}
            placeholder="Sua chave da API Google Cloud TTS..."
          />
          <IconButton onClick={toggleShowKey} edge="end" sx={{ml: 1}}>
            {showKey ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </Box>

        {message && (
          <Typography color={message.includes('sucesso') ? 'green' : (message.includes('removida') ? 'textPrimary' : 'error')} variant="body2">
            {message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ pb: 2, px:3, justifyContent: 'space-between' }}>
        <Box>
          {currentStoredKey && (
            <Button onClick={handleRemove} color="error">
              Remover Chave
            </Button>
          )}
        </Box>
        <Box>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
            Salvar Chave
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default GoogleCloudTTSAuth;
