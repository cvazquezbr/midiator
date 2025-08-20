import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showInfobox, setShowInfobox] = useState(false);

  const wordpressConfig = settings.wordpress || {};

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newWordpressConfig = { ...wordpressConfig, [name]: value };
    updateSetting('wordpress', newWordpressConfig);
    if (error) setError('');
  };

  const handleRemove = () => {
    updateSetting('wordpress', {});
    toast.info('Configuração do WordPress removida.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setError('');

    const { username, password, wordpressUrl } = config;

    if (!username.trim() || !password.trim() || !wordpressUrl.trim()) {
      toast.error('Preencha os campos de URL, usuário e senha para testar.');
      setIsTesting(false);
      return;
    }

    let fullUrl = wordpressUrl.startsWith('http') ? wordpressUrl : `https://${wordpressUrl}`;
    fullUrl = fullUrl.replace(/\/$/, '');

    const testUrl = `${fullUrl}/wp-json/wp/v2/users/me`;
    const credentials = btoa(`${username}:${password}`);

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Conexão bem-sucedida. Conectado como ${data.name}.`);
      } else if (response.status === 401) {
        toast.error('Credenciais inválidas ou URL incorreta.');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Não foi possível ler a resposta de erro.' }));
        toast.error(`Erro ${response.status}: ${errorData.message || 'Ocorreu um erro desconhecido.'}`);
      }
    } catch (err) {
      console.error('Erro no teste de conexão:', err);
      toast.error('Erro de rede. Verifique a URL e sua conexão com a internet.');
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
          Endpoints da API (Opcional)
        </Typography>
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="tagsUrl"
                    label="URL para incluir tag"
                    value={wordpressConfig.tagsUrl || '/wp-json/wp/v2/tags'}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="mediaUrl"
                    label="URL para subir mídia"
                    value={wordpressConfig.mediaUrl || '/wp-json/wp/v2/media'}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="postsUrl"
                    label="URL para enviar post"
                    value={wordpressConfig.postsUrl || '/wp-json/wp/v2/posts'}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                />
            </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
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
