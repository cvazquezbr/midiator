
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

  const serviceAccount = settings.gemini_service_account || '';
  const projectId = settings.gemini_project_id || '';
  const region = settings.gemini_region || '';
  const selectedModel = settings.gemini_model || '';
  const selectedImageModel = settings.gemini_image_model || '';

  const handleServiceAccountChange = (e) => {
    updateSetting('gemini_service_account', e.target.value);
    if (error) setError('');
  };

  const handleProjectIdChange = (e) => {
    updateSetting('gemini_project_id', e.target.value);
  };

  const handleRegionChange = (e) => {
    updateSetting('gemini_region', e.target.value);
  };

  const handleModelChange = (e) => {
    updateSetting('gemini_model', e.target.value);
  };

  const handleImageModelChange = (e) => {
    updateSetting('gemini_image_model', e.target.value);
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    if (!serviceAccount || !projectId) {
        setTestResult({ severity: 'error', message: 'Por favor, preencha a Conta de Serviço e o ID do Projeto para testar.' });
        return;
    }

    // Basic check for JSON format
    try {
        JSON.parse(serviceAccount);
    } catch (e) {
        setTestResult({ severity: 'error', message: 'O conteúdo da Conta de Serviço não parece ser um JSON válido.' });
        return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/google/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceAccount: serviceAccount,
          projectId: projectId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha na verificação.');
      }

      setTestResult({ severity: 'success', message: result.message });
    } catch (err) {
      console.error('Erro no teste de conexão da Conta de Serviço:', err);
      setTestResult({ severity: 'error', message: `Falha na conexão: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
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
        <Typography variant="body2" gutterBottom sx={{mt: 2}}>
          Cole o conteúdo do seu arquivo JSON de Chave de Conta de Serviço do Google Cloud. Esta credencial é necessária para autenticação segura na API Vertex AI.
          {' '}
          <a href="https://cloud.google.com/iam/docs/keys-create-delete#creating" target="_blank" rel="noopener noreferrer">
            Aprenda a criar uma chave aqui.
          </a>
        </Typography>

        <TextField
            autoFocus
            margin="dense"
            id="gemini-service-account"
            label="Chave da Conta de Serviço (JSON)"
            type="text"
            multiline
            rows={8}
            fullWidth
            variant="outlined"
            value={serviceAccount}
            onChange={handleServiceAccountChange}
            placeholder="Cole o conteúdo do seu arquivo JSON aqui..."
            sx={{ mt: 2, mb: 2, fontFamily: 'monospace' }}
        />

        <TextField
          margin="dense"
          id="gemini-project-id"
          label="Google Cloud Project ID"
          type="text"
          fullWidth
          variant="outlined"
          value={projectId}
          onChange={handleProjectIdChange}
          placeholder="Seu ID do projeto no Google Cloud..."
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          id="gemini-region"
          label="Região (ex: us-central1)"
          type="text"
          fullWidth
          variant="outlined"
          value={region}
          onChange={handleRegionChange}
          placeholder="us-central1"
          sx={{ mb: 2 }}
        />

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

        <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <Button onClick={handleTestConnection} disabled={isTesting} variant="outlined">
                {isTesting ? 'Testando...' : 'Testar Credenciais'}
            </Button>
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
