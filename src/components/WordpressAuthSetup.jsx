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
  Tooltip,
  Grid,
} from '@mui/material';
import { Visibility, VisibilityOff, InfoOutlined } from '@mui/icons-material';
import {
  saveWordpressConfig,
  getWordpressConfig,
  removeWordpressConfig,
} from '../utils/wordpressCredentials';

const WordpressAuthSetup = ({ open, onClose }) => {
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
  const [message, setMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (open) {
      const storedConfig = getWordpressConfig();
      if (storedConfig) {
        setCurrentConfig(storedConfig);
        setConfig({
            ...{
                username: '',
                password: '',
                wordpressUrl: '',
                tagsUrl: '/wp-json/wp/v2/tags',
                mediaUrl: '/wp-json/wp/v2/media',
                postsUrl: '/wp-json/wp/v2/posts',
            },
            ...storedConfig,
        });
      } else {
        setCurrentConfig(null);
        setConfig({
            username: '',
            password: '',
            wordpressUrl: '',
            tagsUrl: '/wp-json/wp/v2/tags',
            mediaUrl: '/wp-json/wp/v2/media',
            postsUrl: '/wp-json/wp/v2/posts',
        });
      }
      setMessage('');
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({
      ...prevConfig,
      [name]: value,
    }));
    if (message) setMessage('');
  };

  const handleSave = () => {
    if (config.username.trim() && config.password.trim() && config.wordpressUrl.trim()) {
      saveWordpressConfig(config);
      setCurrentConfig(config);
      setMessage('Configuração do WordPress salva com sucesso!');
    } else {
      setMessage('Por favor, preencha todos os campos obrigatórios.');
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
    setMessage('Configuração do WordPress removida.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setMessage('');

    const { username, password, wordpressUrl } = config;

    if (!username.trim() || !password.trim() || !wordpressUrl.trim()) {
      setMessage('❌ Por favor, preencha os campos de URL, usuário e senha para testar.');
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
        setMessage(`✅ Conexão bem-sucedida. Conectado como ${data.name}.`);
      } else if (response.status === 401) {
        setMessage('❌ Credenciais inválidas ou URL incorreta.');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Não foi possível ler a resposta de erro.' }));
        setMessage(`❌ Erro ${response.status}: ${errorData.message || 'Ocorreu um erro desconhecido.'}`);
      }
    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      setMessage('❌ Erro de rede. Verifique a URL e sua conexão com a internet.');
    } finally {
      setIsTesting(false);
    }
  };

  const passwordInfoTooltip = (
    <span>
      Como obter a senha de aplicação no WordPress:
      <ol>
        <li>Acesse o painel do WordPress.</li>
        <li>Vá até Usuários {'>'} Perfil.</li>
        <li>Encontre a seção “Senhas de Aplicação”.</li>
        <li>Crie uma nova senha e copie o valor gerado.</li>
        <li>Cole no campo “password” da integração.</li>
      </ol>
      ⚠️ Use apenas em conexões seguras (HTTPS). A senha não será exibida novamente.
    </span>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configurar Integração com WordPress</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
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
                    <Tooltip title={passwordInfoTooltip}>
                        <IconButton>
                            <InfoOutlined />
                        </IconButton>
                    </Tooltip>
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

        {message && (
          <Typography color={message.includes('sucesso') ? 'green' : (message.includes('removida') ? 'textPrimary' : 'error')} variant="body2" sx={{ mt: 2 }}>
            {message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
        <Box>
            <Button onClick={handleTestConnection} disabled={isTesting}>
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>
            {currentConfig && (
                <Button onClick={handleRemove} color="error">
                    Remover
                </Button>
            )}
        </Box>
        <Box>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
            Salvar
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default WordpressAuthSetup;
