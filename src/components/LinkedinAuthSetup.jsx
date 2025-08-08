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
  saveLinkedinConfig,
  getLinkedinConfig,
  removeLinkedinConfig,
} from '../utils/linkedinCredentials';

const LinkedinAuthSetup = ({ open, onClose, onBeforeRedirect }) => {
  const [config, setConfig] = useState({
    clientId: '',
  });
  const [currentConfig, setCurrentConfig] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      const storedConfig = getLinkedinConfig() || {};

      setConfig({
        clientId: storedConfig.clientId || '',
      });

      if (storedConfig.accessToken) {
        setCurrentConfig(storedConfig);
      } else {
        setCurrentConfig(null);
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

  const handleConnect = async () => {
    if (config.clientId.trim()) {
      if (onBeforeRedirect) {
        await onBeforeRedirect();
      }

      // Save only the clientId. The secret is handled by the backend.
      saveLinkedinConfig({ clientId: config.clientId });

      const redirectUri = window.location.origin;
      const scope = 'r_basicprofile%20w_member_social%20r_1st_connections_size';
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

      window.location.href = authUrl;
    } else {
      setMessage('Por favor, preencha o Client ID.');
    }
  };

  const handleTestConnection = async () => {
    const { accessToken } = getLinkedinConfig() || {};

    if (!accessToken) {
      setMessage('❌ Não há uma conexão ativa para testar.');
      return;
    }

    setMessage('Testando conexão...');
    try {
      const response = await fetch('/api/linkedin-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'testConnection',
          accessToken: accessToken,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ Conexão bem-sucedida. Você tem ${data.paging.total} conexões de 1º grau.`);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Não foi possível ler a resposta de erro.' }));
        setMessage(`❌ Erro no teste: ${errorData.message || 'Ocorreu um erro desconhecido.'}`);
        if (response.status === 401) {
          // Token pode ter expirado
          removeLinkedinConfig();
          setCurrentConfig(null);
        }
      }
    } catch (error) {
      console.error('Erro no teste de conexão com LinkedIn:', error);
      setMessage('❌ Erro de rede ao testar a conexão.');
    }
  };

  const handleRemove = () => {
    removeLinkedinConfig();
    setCurrentConfig(null);
    setConfig({
      clientId: '',
      clientSecret: '',
    });
    setMessage('Configuração do LinkedIn removida.');
  };

  const aplicationInfoTooltip = (
    <span>
      Como obter o Client ID e Secret do LinkedIn:
      <ol>
        <li>Acesse: <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer">LinkedIn Developer Portal</a></li>
        <li>Crie um novo aplicativo ou selecione um existente.</li>
        <li>Copie o Client ID e o Client Secret.</li>
        <li>Configure o Redirect URI para: {window.location.origin}</li>
        <li>Cole essas informações aqui.</li>
      </ol>
      ⚠️ O Client Secret não será armazenado de forma permanente no navegador.
    </span>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configurar Integração com LinkedIn</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          Insira seu Client ID e Client Secret para conectar sua conta do LinkedIn.
        </Typography>

        {currentConfig && currentConfig.accessToken ? (
          <Typography variant="h6" color="green" sx={{ mt: 2 }}>
            ✅ Conectado ao LinkedIn.
          </Typography>
        ) : (
          <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6}>
                  <TextField
                      name="clientId"
                      label="Client ID"
                      value={config.clientId}
                      onChange={handleChange}
                      fullWidth
                      required
                      variant="outlined"
                      placeholder="Seu Client ID do LinkedIn"
                      disabled={currentConfig && currentConfig.accessToken}
                  />
              </Grid>
              <Grid item xs={12} sm={6}>
                  <Tooltip title={aplicationInfoTooltip}>
                      <IconButton>
                          <InfoOutlined />
                      </IconButton>
                  </Tooltip>
              </Grid>
          </Grid>
        )}

        {message && (
          <Typography color={message.includes('sucesso') || message.includes('Conectado') ? 'green' : 'error'} variant="body2" sx={{ mt: 2 }}>
            {message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
        <Box>
            {currentConfig && currentConfig.accessToken ? (
                <>
                    <Button onClick={handleTestConnection}>Testar Conexão</Button>
                    <Button onClick={handleRemove} color="error" sx={{ ml: 1 }}>
                        Desconectar
                    </Button>
                </>
            ) : (
                <Button onClick={handleConnect} variant="contained">
                  Conectar com o LinkedIn
                </Button>
            )}
        </Box>
        <Box>
          <Button onClick={onClose}>Fechar</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default LinkedinAuthSetup;
