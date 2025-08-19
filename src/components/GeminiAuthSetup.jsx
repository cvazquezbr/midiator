import React, { useState } from 'react';
import geminiAPI from '../utils/geminiAPI';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Alert } from '@mui/material';
import { Visibility, VisibilityOff, InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GeminiInfobox from './GeminiInfobox';

const GeminiAuthSetup = ({ apiKey, onApiKeyChange }) => {
  const [showKey, setShowKey] = useState(false);
  const [showInfobox, setShowInfobox] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      toast.error('Por favor, insira uma chave de API para testar.');
      return;
    }
    setIsTesting(true);
    try {
      // Pass the key from the input field directly to the API method for the test
      // Note: This test now relies on the proxy endpoint, which uses the *saved* key.
      // To test an unsaved key, we would need a different mechanism.
      // For simplicity, we now test the currently saved and configured key.
      // The prompt will be sent to the proxy which will use the key from the DB.
      await geminiAPI.generateContent('Diga "Olá, mundo!" em português.', 'Connection Test');
      toast.success('Conexão com a API Gemini bem-sucedida!');
    } catch (err) {
      console.error('Erro no teste de conexão com Gemini:', err);
      toast.error(`Falha na conexão: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getMaskedKey = (key) => {
    if (!key || key.length < 8) return '';
    return `...${key.substring(key.length - 6)}`;
  };

  return (
    <>
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">API Gemini</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
          Insira sua chave da API Gemini (Google AI Studio). A chave será salva de forma segura em sua conta.
        </Typography>

        {apiKey && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Chave configurada: {getMaskedKey(apiKey)}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mt: apiKey ? 1 : 2, mb: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            id="gemini-api-key"
            label="Chave da API Gemini"
            type={showKey ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Sua chave da API Gemini..."
          />
          <IconButton onClick={() => setShowKey(!showKey)} edge="end" sx={{ ml: 1 }}>
            {showKey ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </Box>

        <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <Button onClick={handleTestConnection} disabled={isTesting} variant="outlined">
            {isTesting ? 'Testando...' : 'Testar Conexão Salva'}
          </Button>
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
