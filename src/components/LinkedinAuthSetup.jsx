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
import { InfoOutlined } from '@mui/icons-material';
import {
  saveLinkedinConfig,
  getLinkedinConfig,
  removeLinkedinConfig,
} from '../utils/linkedinCredentials';
import GoogleDriveFolderPicker from './GoogleDriveFolderPicker';

const LinkedinAuthSetup = ({ open, onClose, onBeforeRedirect }) => {
  const [config, setConfig] = useState({
    clientId: '',
    folderId: '',
  });
  const [currentConfig, setCurrentConfig] = useState(null);
  const [message, setMessage] = useState('');
  const [isPickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const storedConfig = getLinkedinConfig();
      setConfig({
        clientId: storedConfig.clientId || '',
        folderId: storedConfig.folderId || '',
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

  const handleSelectFolder = (folder) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      folderId: folder.id,
    }));
    setPickerOpen(false);
  };

  const handleConnect = async () => {
    if (config.clientId.trim()) {
      if (onBeforeRedirect) {
        await onBeforeRedirect();
      }
      saveLinkedinConfig(config);
      const redirectUri = window.location.origin;
      const scope = 'r_basicprofile%20w_member_social%20r_1st_connections_size';
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
      window.location.href = authUrl;
    } else {
      setMessage('Por favor, preencha o Client ID.');
    }
  };

  const handleTestConnection = async () => {
    const { accessToken } = getLinkedinConfig();
    if (!accessToken) {
      setMessage('❌ Não há uma conexão ativa para testar.');
      return;
    }
    setMessage('Testando conexão...');
    try {
      const response = await fetch('/api/linkedin-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testConnection', accessToken }),
      });
      if (response.ok) {
        setMessage(`✅ Conexão bem-sucedida.`);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Não foi possível ler a resposta de erro.' }));
        setMessage(`❌ Erro no teste: ${errorData.message || 'Ocorreu um erro desconhecido.'}`);
        if (response.status === 401) {
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
    setConfig({ clientId: '', folderId: '' });
    setMessage('Configuração do LinkedIn removida.');
  };

  const handleSave = () => {
    saveLinkedinConfig(config);
    setMessage('✅ Configuração salva com sucesso!');
  };

  const aplicationInfoTooltip = (
    <span>
      Como obter o Client ID do LinkedIn:
      <ol>
        <li>Acesse: <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer">LinkedIn Developer Portal</a></li>
        <li>Crie um novo aplicativo ou selecione um existente.</li>
        <li>Na aba "Auth", copie o Client ID.</li>
        <li>Adicione o seguinte URI à sua lista de "Authorized redirect URIs": {window.location.origin}</li>
      </ol>
    </span>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Configurar Integração com LinkedIn</DialogTitle>
        <DialogContent>
          {currentConfig && currentConfig.accessToken ? (
            <Box>
              <Typography variant="h6" color="green" sx={{ mb: 2 }}>
                ✅ Conectado ao LinkedIn.
              </Typography>
              <TextField
                name="folderId"
                label="ID da Pasta no Google Drive (Opcional)"
                value={config.folderId}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                placeholder="ID da pasta para a fila de publicação"
                helperText="Este ID de pasta será usado para monitorar novos conteúdos."
                sx={{ mb: 2 }}
              />
              <Button variant="outlined" onClick={() => setPickerOpen(true)}>
                Procurar Pasta no Google Drive...
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Insira seu Client ID para conectar sua conta do LinkedIn.
                </Typography>
              </Grid>
              <Grid item xs={11}>
                <TextField
                  name="clientId"
                  label="Client ID"
                  value={config.clientId}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                  placeholder="Seu Client ID do LinkedIn"
                />
              </Grid>
              <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center' }}>
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
                <Button onClick={handleSave} variant="contained">Salvar</Button>
                <Button onClick={handleTestConnection} sx={{ ml: 1 }}>Testar Conexão</Button>
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
      <GoogleDriveFolderPicker
        open={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectFolder={handleSelectFolder}
      />
    </>
  );
};

export default LinkedinAuthSetup;
