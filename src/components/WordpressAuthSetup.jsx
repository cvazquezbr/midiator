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
import {
  saveWordpressConfig,
  getWordpressConfig,
  removeWordpressConfig,
} from '../utils/wordpressCredentials';
import WordpressInfobox from './WordpressInfobox';

const WordpressAuthSetup = () => {
  const [config, setConfig] = useState({
    username: '',
    password: '',
    wordpressUrl: '',
    tagsUrl: '/wp-json/wp/v2/tags',
    mediaUrl: '/wp-json/wp/v2/media',
    postsUrl: '/wp-json/wp/v2/posts',
  });
  const [currentConfig, setCurrentConfig] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showInfobox, setShowInfobox] = useState(false);

  useEffect(() => {
    const storedConfig = getWordpressConfig();
    const initialConfig = {
      username: '',
      password: '',
      wordpressUrl: '',
      tagsUrl: '/wp-json/wp/v2/tags',
      mediaUrl: '/wp-json/wp/v2/media',
      postsUrl: '/wp-json/wp/v2/posts',
    };

    if (storedConfig) {
      setCurrentConfig(storedConfig);
      setConfig({ ...initialConfig, ...storedConfig });
    } else {
      setCurrentConfig(null);
      setConfig(initialConfig);
    }
    setError('');
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({
      ...prevConfig,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSave = () => {
    if (config.username.trim() && config.password.trim() && config.wordpressUrl.trim()) {
      saveWordpressConfig(config);
      setCurrentConfig(config);
      toast.success('Configuração do WordPress salva com sucesso!');
    } else {
      setError('Por favor, preencha a URL, o nome de usuário e a senha de aplicação.');
    }
  };

  const handleRemove = () => {
    removeWordpressConfig();
    setCurrentConfig(null);
    setConfig({
      username: '',
      password: '',
      wordpressUrl: '',
      tagsUrl: '/wp-json/wp/v2/tags',
      mediaUrl: '/wp-json/wp/v2/media',
      postsUrl: '/wp-json/wp/v2/posts',
    });
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
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">WordPress</Typography>
          <IconButton onClick={() => setShowInfobox(true)}>
            <InfoIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
          Insira suas credenciais e URLs de endpoints do WordPress. A senha de aplicação será armazenada localmente no seu navegador.
        </Typography>

        {currentConfig && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Configuração atual salva para o site: {currentConfig.wordpressUrl}
          </Typography>
        )}

        <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="wordpressUrl"
                    label="URL do WordPress"
                    value={config.wordpressUrl}
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
                    value={config.username}
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
                        value={config.password}
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
                    value={config.tagsUrl}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="mediaUrl"
                    label="URL para subir mídia"
                    value={config.mediaUrl}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    name="postsUrl"
                    label="URL para enviar post"
                    value={config.postsUrl}
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
          <Box>
              <Button onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? 'Testando...' : 'Testar Conexão'}
              </Button>
              {currentConfig && (
                  <Button onClick={handleRemove} color="error" sx={{ ml: 1 }}>
                      Remover
                  </Button>
              )}
          </Box>
          <Button onClick={handleSave} variant="contained">
            Salvar
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
