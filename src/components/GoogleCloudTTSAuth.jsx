import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import googleCloudTTSAPI from '../utils/googleCloudTTSAPI';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box, IconButton, Alert } from '@mui/material';
import { InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import GoogleCloudTTSInfobox from './GoogleCloudTTSInfobox';

const GoogleCloudTTSAuth = () => {
  const { settings, updateSetting } = useSettings();
  const [error, setError] = useState('');
  const [showInfobox, setShowInfobox] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const credentials = settings.googleCloudTTSCredentials || '';

  const handleChange = (e) => {
    updateSetting('googleCloudTTSCredentials', e.target.value);
    if (error) setError('');
  };

  const handleRemove = () => {
    updateSetting('googleCloudTTSCredentials', '');
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
      // Initialize the API with the provided credentials for the test
      googleCloudTTSAPI.initialize(parsedCredentials);
      // Perform a test call
      await googleCloudTTSAPI.synthesize('teste');
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
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Google Cloud TTS</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
          Cole o conteúdo do seu arquivo JSON de credenciais de conta de serviço do Google Cloud.
        </Typography>

        {credentials && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Credenciais configuradas.
          </Typography>
        )}

        <Box sx={{ mt: credentials ? 1 : 2, mb: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            id="google-cloud-tts-credentials"
            label="JSON de Credenciais"
            type="text"
            fullWidth
            multiline
            rows={5}
            variant="outlined"
            value={credentials}
            onChange={handleChange}
            placeholder="Cole o JSON de credenciais aqui..."
          />
        </Box>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}
        <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={handleTestConnection} disabled={isTesting} variant="outlined">
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Box>
            {credentials && (
              <Button onClick={handleRemove} color="error">
                Remover
              </Button>
            )}
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
