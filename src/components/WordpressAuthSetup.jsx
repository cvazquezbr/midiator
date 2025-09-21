import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Grid,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff, InfoOutlined as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { useSettings } from '../context/SettingsContext';
import WordpressInfobox from './WordpressInfobox';

const WordpressAuthSetup = () => {
  const { settings, updateSetting } = useSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showInfobox, setShowInfobox] = useState(false);

  const wordpressConfig = settings.wordpress || {};

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newWordpressConfig = { ...wordpressConfig, [name]: value };
    updateSetting('wordpress', newWordpressConfig);
    setTestResult(null);
  };

  const handleRemove = () => {
    updateSetting('wordpress', {});
    toast.info('Configuração do WordPress removida.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const { username, password, wordpressUrl, tagsUrl, mediaUrl, postsUrl } = wordpressConfig;

    if (!username?.trim() || !password?.trim() || !wordpressUrl?.trim() || !tagsUrl?.trim() || !mediaUrl?.trim() || !postsUrl?.trim()) {
      toast.error('Preencha todos os campos obrigatórios para testar.');
      setIsTesting(false);
      return;
    }

    try {
      const response = await fetch('/api/wordpress/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordpressUrl, username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({ type: 'success', message: data.message });
        toast.success(data.message);
      } else {
        setTestResult({ type: 'error', message: data.message || 'Ocorreu um erro desconhecido.' });
        toast.error(data.message || 'Ocorreu um erro desconhecido.');
      }
    } catch (err) {
      console.error('Erro no teste de conexão:', err);
      const errorMessage = 'Erro de rede. Verifique sua conexão ou a URL do servidor.';
      setTestResult({ type: 'error', message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">WordPress</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
          Insira suas credenciais e URLs de endpoints do WordPress. A senha de aplicação será armazenada localmente no seu navegador.
        </Typography>

        {wordpressConfig.wordpressUrl && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Configuração atual salva para o site: {wordpressConfig.wordpressUrl}
          </Typography>
        )}

        <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="wordpressUrl"
                    label="URL do WordPress"
                    value={wordpressConfig.wordpressUrl || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                    placeholder="https://seu-site.com"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="username"
                    label="Nome de usuário do WordPress"
                    value={wordpressConfig.username || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                        name="password"
                        label="Senha de Aplicação"
                        type={showPassword ? 'text' : 'password'}
                        value={wordpressConfig.password || ''}
                        onChange={handleChange}
                        fullWidth
                        required
                        variant="outlined"
                    />
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                </Box>
            </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          Endpoints da API
        </Typography>
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="tagsUrl"
                    label="URL para incluir tag"
                    value={wordpressConfig.tagsUrl || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="mediaUrl"
                    label="URL para subir mídia"
                    value={wordpressConfig.mediaUrl || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="postsUrl"
                    label="URL para enviar post"
                    value={wordpressConfig.postsUrl || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                />
            </Grid>
        </Grid>

        {testResult && (
            <Alert severity={testResult.type} sx={{ mt: 2 }}>
                {testResult.message}
            </Alert>
        )}
        <Box sx={{ pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={handleTestConnection} disabled={isTesting} variant="outlined">
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Box>
            {wordpressConfig.wordpressUrl && (
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
          <WordpressInfobox />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfobox(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WordpressAuthSetup;
