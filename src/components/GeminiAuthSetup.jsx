import React, { useState, useEffect } from 'react';
import { getGeminiApiKey, saveGeminiApiKey, removeGeminiApiKey } from '../utils/geminiCredentials';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import VpnKeyIcon from '@mui/icons-material/VpnKey'; // Ícone para Gemini (pode ser diferente se desejar)

const GeminiAuthSetup = ({ open, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [currentStoredKey, setCurrentStoredKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      const storedKey = getGeminiApiKey();
      setCurrentStoredKey(storedKey);
      setApiKey(storedKey || ''); // Preenche o campo se já houver uma chave
      setMessage(''); // Limpa mensagens anteriores ao abrir
    }
  }, [open]);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveGeminiApiKey(apiKey.trim());
      setCurrentStoredKey(apiKey.trim());
      setMessage('Chave da API Gemini salva com sucesso!');
    } else {
      setMessage('Por favor, insira uma chave da API Gemini válida.');
    }
  };

  const handleRemove = () => {
    removeGeminiApiKey();
    setCurrentStoredKey(null);
    setApiKey('');
    setMessage('Chave da API Gemini removida.');
  };

  const toggleShowKey = () => {
    setShowKey(!showKey);
  };

  const getMaskedKey = (key) => {
    if (!key || key.length < 8) return 'Chave muito curta para mascarar';
    // As chaves do Gemini podem não ter prefixo "sk-", então a máscara é mais genérica.
    return `...${key.substring(key.length - 6)}`;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configurar Chave da API Gemini</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          Insira sua chave da API Gemini (Google AI Studio). Esta chave será armazenada localmente no seu navegador.
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
            id="gemini-api-key"
            label="Chave da API Gemini"
            type={showKey ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (message) setMessage('');
            }}
            placeholder="Sua chave da API Gemini..."
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
  );
};

export default GeminiAuthSetup;
