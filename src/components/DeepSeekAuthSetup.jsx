import React, { useState, useEffect } from 'react';
import { getDeepSeekApiKey, saveDeepSeekApiKey, removeDeepSeekApiKey } from '../utils/deepSeekCredentials';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const DeepSeekAuthSetup = ({ open, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [currentStoredKey, setCurrentStoredKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      const storedKey = getDeepSeekApiKey();
      setCurrentStoredKey(storedKey);
      setApiKey(storedKey || ''); // Preenche o campo se já houver uma chave
      setMessage(''); // Limpa mensagens anteriores ao abrir
    }
  }, [open]);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveDeepSeekApiKey(apiKey.trim());
      setCurrentStoredKey(apiKey.trim());
      setMessage('Chave da API DeepSeek salva com sucesso!');
      // Opcional: fechar o modal após salvar, ou deixar o usuário fechar manualmente
      // onClose();
    } else {
      setMessage('Por favor, insira uma chave da API válida.');
    }
  };

  const handleRemove = () => {
    removeDeepSeekApiKey();
    setCurrentStoredKey(null);
    setApiKey('');
    setMessage('Chave da API DeepSeek removida.');
  };

  const toggleShowKey = () => {
    setShowKey(!showKey);
  };

  const getMaskedKey = (key) => {
    if (!key || key.length < 8) return 'Chave muito curta para mascarar';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configurar Chave da API DeepSeek</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          Insira sua chave da API DeepSeek. Esta chave será armazenada localmente no seu navegador.
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
            id="deepseek-api-key"
            label="Chave da API DeepSeek"
            type={showKey ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (message) setMessage(''); // Limpa a mensagem ao começar a digitar
            }}
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <IconButton onClick={toggleShowKey} edge="end" sx={{ml: 1}}>
            {showKey ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </Box>

        {message && (
          <Typography color={message.includes('sucesso') ? 'green' : 'error'} variant="body2">
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
  );
};

export default DeepSeekAuthSetup;
