
import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import geminiAPI from '../utils/geminiAPI';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Alert, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff, InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GeminiInfobox from './GeminiInfobox';

const GeminiAuthSetup = () => {
  const { settings, updateSetting, models, imageModels, loadingModels, errorModels } = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const apiKey = settings.gemini_api_key || '';
  const selectedModel = settings.gemini_model || '';
  const selectedImageModel = settings.gemini_image_model || '';

  const handleApiKeyChange = (e) => {
    updateSetting('gemini_api_key', e.target.value);
    if (error) setError('');
  };

  const handleModelChange = (e) => {
    updateSetting('gemini_model', e.target.value);
  };

  const handleImageModelChange = (e) => {
    updateSetting('gemini_image_model', e.target.value);
  };

  const handleRemove = () => {
    updateSetting('gemini_api_key', '');
    toast.info('Chave da API Gemini removida.');
  };

  const handleTestConnection = async () => {
    const trimmedApiKey = apiKey.trim();
    setTestResult(null);
    if (!trimmedApiKey) {
        setTestResult({ severity: 'error', message: 'Por favor, insira uma chave de API para testar.' });
        return;
    }
    if (!selectedModel) {
        setTestResult({ severity: 'error', message: 'Por favor, selecione um modelo para testar.' });
        return;
    }
    setIsTesting(true);
    try {
      // While the key is now used by the proxy, initialize is kept for compatibility.
      geminiAPI.initialize(trimmedApiKey);
      // Pass the selected model from the state to the API call
      await geminiAPI.generateContent('Diga "Olá, mundo!" em português.', selectedModel);
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

        {apiKey && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Chave atual configurada: {getMaskedKey(apiKey)}
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
            onChange={handleApiKeyChange}
            placeholder="Sua chave da API Gemini..."
          />
          <IconButton onClick={toggleShowKey} edge="end" sx={{ ml: 1 }}>
            {showKey ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </Box>
        {loadingModels && <CircularProgress size={20} />}
        {errorModels && <Alert severity="error">{errorModels}</Alert>}

        <FormControl fullWidth sx={{ mt: 2 }} disabled={loadingModels || errorModels}>
            <InputLabel id="gemini-model-select-label">Modelo Gemini</InputLabel>
            <Select
                labelId="gemini-model-select-label"
                id="gemini-model-select"
                value={selectedModel}
                label="Modelo Gemini"
                onChange={handleModelChange}
            >
              {models.map(model => (
                <MenuItem key={model.name} value={model.name}>{model.displayName}</MenuItem>
              ))}
            </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }} disabled={loadingModels || errorModels}>
            <InputLabel id="gemini-image-model-select-label">Modelo Gemini (imagem)</InputLabel>
            <Select
                labelId="gemini-image-model-select-label"
                id="gemini-image-model-select"
                value={selectedImageModel}
                label="Modelo Gemini (imagem)"
                onChange={handleImageModelChange}
            >
              {imageModels.map(model => (
                <MenuItem key={model.name} value={model.name}>{model.displayName}</MenuItem>
              ))}
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
            {apiKey && (
              <Button onClick={handleRemove} color="error">
                Remover
              </Button>
            )}
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
