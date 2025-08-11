import React, { useState, useEffect } from 'react';
import { getGoogleCloudTTSCredentials, saveGoogleCloudTTSCredentials, removeGoogleCloudTTSCredentials } from '../utils/googleCloudTTSCredentials';
import { callGoogleCloudTTSAPI } from '../utils/googleCloudTTSAPI';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Alert } from '@mui/material';
import { InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GoogleCloudTTSInfobox from './GoogleCloudTTSInfobox';

const GoogleCloudTTSAuth = () => {
  const [credentials, setCredentials] = useState('');
  const [currentStoredCredentials, setCurrentStoredCredentials] = useState(null);
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const storedCredentials = getGoogleCloudTTSCredentials();
    setCurrentStoredCredentials(storedCredentials);
    setCredentials(storedCredentials ? JSON.stringify(storedCredentials, null, 2) : '');
    setError('');
  }, []);

  const handleSave = () => {
    try {
      if (!credentials.trim()) {
        removeGoogleCloudTTSCredentials();
        setCurrentStoredCredentials(null);
        toast.info('Credenciais removidas pois o campo estava vazio.');
        return;
      }
      const parsedCredentials = JSON.parse(credentials);
      saveGoogleCloudTTSCredentials(parsedCredentials);
      setCurrentStoredCredentials(parsedCredentials);
      toast.success('Credenciais do Google Cloud TTS salvas com sucesso!');
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

  const handleTestConnection = async () => {
    if (!credentials.trim()) {
      toast.error('Por favor, insira as credenciais para testar.');
      return;
    }
    setIsTesting(true);
    try {
      const parsedCredentials = JSON.parse(credentials);
      await callGoogleCloudTTSAPI('teste', parsedCredentials);
      toast.success('Conexão com a API Google Cloud TTS bem-sucedida!');
    } catch (err) {
      console.error('Erro no teste de conexão com Google Cloud TTS:', err);
      toast.error(`Falha na conexão: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Google Cloud TTS</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
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
        <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Box>
            {currentStoredCredentials && (
              <Button onClick={handleRemove} color="error">
                Remover
              </Button>
            )}
            <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
              Salvar
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
