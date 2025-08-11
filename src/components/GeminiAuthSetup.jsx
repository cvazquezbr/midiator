import React, { useState, useEffect } from 'react';
import { getGeminiApiKey, saveGeminiApiKey, removeGeminiApiKey } from '../utils/geminiCredentials';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Alert } from '@mui/material';
import { Visibility, VisibilityOff, InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GeminiInfobox from './GeminiInfobox';

const GeminiAuthSetup = () => {
  const [apiKey, setApiKey] = useState('');
  const [currentStoredKey, setCurrentStoredKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);

  useEffect(() => {
    const storedKey = getGeminiApiKey();
    setCurrentStoredKey(storedKey);
    setApiKey(storedKey || '');
    setError('');
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveGeminiApiKey(apiKey.trim());
      setCurrentStoredKey(apiKey.trim());
      toast.success('Chave da API Gemini salva com sucesso!');
    } else {
      setError('Por favor, insira uma chave da API Gemini válida.');
    }
  };

  const handleRemove = () => {
    removeGeminiApiKey();
    setCurrentStoredKey(null);
    setApiKey('');
    toast.info('Chave da API Gemini removida.');
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
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">API Gemini</Typography>
            <IconButton onClick={() => setShowInfobox(true)}>
                <InfoIcon />
            </IconButton>
        </Box>
        <Typography variant="body2" gutterBottom sx={{mt: 2}}>
          Insira sua chave da API Gemini (Google AI Studio). Esta chave será armazenada localmente no seu navegador.
        </Typography>

        {currentStoredKey && (
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
              if (error) setError('');
            }}
            placeholder="Sua chave da API Gemini..."
          />
          <IconButton onClick={toggleShowKey} edge="end" sx={{ ml: 1 }}>
            {showKey ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            {currentStoredKey && (
              <Button onClick={handleRemove} color="error">
                Remover Chave
              </Button>
            )}
          </Box>
          <Box>
            <Button onClick={handleSave} variant="contained">
              Salvar Chave
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
          <GeminiInfobox />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfobox(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GeminiAuthSetup;
