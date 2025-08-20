import React, { useState, useEffect } from 'react';
import { getGeminiApiKey, saveGeminiApiKey, removeGeminiApiKey, getGeminiModel, saveGeminiModel } from '../utils/geminiCredentials';
import geminiAPI from '../utils/geminiAPI';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Visibility, VisibilityOff, InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GeminiInfobox from './GeminiInfobox';

const GeminiAuthSetup = () => {
  const [apiKey, setApiKey] = useState('');
  const [currentStoredKey, setCurrentStoredKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const storedKey = getGeminiApiKey();
    const storedModel = getGeminiModel();
    setCurrentStoredKey(storedKey);
    setApiKey(storedKey || '');
    if (storedModel) {
      setSelectedModel(storedModel);
    }
    setError('');
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveGeminiApiKey(apiKey.trim());
      saveGeminiModel(selectedModel);
      setCurrentStoredKey(apiKey.trim());
      toast.success('Configurações da API Gemini salvas com sucesso!');
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

  const handleTestConnection = async () => {
    const trimmedApiKey = apiKey.trim();
    setTestResult(null);
    if (!trimmedApiKey) {
        setTestResult({ severity: 'error', message: 'Por favor, insira uma chave de API para testar.' });
        return;
    }
    setIsTesting(true);
    try {
      geminiAPI.initialize(trimmedApiKey);
      await geminiAPI.generateContent('Diga "Olá, mundo!" em português.');
      setTestResult({ severity: 'success', message: 'Conexão com a API Gemini bem-sucedida!' });
    } catch (err) {
      console.error('Erro no teste de conexão com Gemini:', err);
      setTestResult({ severity: 'error', message: `Falha na conexão: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
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

        <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="gemini-model-select-label">Modelo Gemini</InputLabel>
            <Select
                labelId="gemini-model-select-label"
                id="gemini-model-select"
                value={selectedModel}
                label="Modelo Gemini"
                onChange={(e) => setSelectedModel(e.target.value)}
            >
                <MenuItem value="gemini-1.5-pro-latest">Gemini 1.5 Pro (latest)</MenuItem>
                <MenuItem value="gemini-1.5-flash-latest">Gemini 1.5 Flash (latest)</MenuItem>
                <MenuItem value="gemini-1.0-pro">Gemini 1.0 Pro</MenuItem>
            </Select>
        </FormControl>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={handleTestConnection} disabled={isTesting} variant="outlined">
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Box>
            {currentStoredKey && (
              <Button onClick={handleRemove} color="error">
                Remover
              </Button>
            )}
            <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
              Salvar
            </Button>
          </Box>
        </Box>

        {testResult && (
            <Alert severity={testResult.severity} sx={{ mt: 2 }}>
                {testResult.message}
            </Alert>
        )}
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
