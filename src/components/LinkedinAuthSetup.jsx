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

const LinkedinAuthSetup = ({ open, onClose }) => {
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
  });
  const [currentConfig, setCurrentConfig] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      const storedConfig = getLinkedinConfig();
      if (storedConfig && storedConfig.accessToken) {
        setCurrentConfig(storedConfig);
        setConfig({
            clientId: storedConfig.clientId,
            clientSecret: '', // Do not expose client secret
        });
      } else {
        setCurrentConfig(null);
        setConfig({
            clientId: '',
            clientSecret: '',
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

  const handleConnect = () => {
    if (config.clientId.trim()) {
      // Save the clientId for the callback handler
      saveLinkedinConfig({ clientId: config.clientId, clientSecret: config.clientSecret });

      const redirectUri = window.location.origin;
      const scope = 'r_liteprofile%20r_emailaddress%20w_member_social';
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

      window.location.href = authUrl;
    } else {
      setMessage('Por favor, preencha o Client ID.');
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
                   <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TextField
                          name="clientSecret"
                          label="Client Secret"
                          type={showSecret ? 'text' : 'password'}
                          value={config.clientSecret}
                          onChange={handleChange}
                          fullWidth
                          required
                          variant="outlined"
                          disabled={currentConfig && currentConfig.accessToken}
                      />
                      <IconButton onClick={() => setShowSecret(!showSecret)} edge="end">
                          {showSecret ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                      <Tooltip title={aplicationInfoTooltip}>
                          <IconButton>
                              <InfoOutlined />
                          </IconButton>
                      </Tooltip>
                  </Box>
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
                <Button onClick={handleRemove} color="error">
                    Desconectar
                </Button>
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
