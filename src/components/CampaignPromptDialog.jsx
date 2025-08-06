import React, { useState, useEffect } from 'react';
import { getCampaignPrompt, saveCampaignPrompt, removeCampaignPrompt } from '../utils/campaignPrompt';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box } from '@mui/material';

const CampaignPromptDialog = ({ open, onClose }) => {
  const [promptText, setPromptText] = useState('');
  const [message, setMessage] = useState('');
  const [hasStoredPrompt, setHasStoredPrompt] = useState(false);

  useEffect(() => {
    if (open) {
      const storedPrompt = getCampaignPrompt();
      if (storedPrompt) {
        setPromptText(storedPrompt);
        setHasStoredPrompt(true);
      } else {
        setPromptText('');
        setHasStoredPrompt(false);
      }
      setMessage('');
    }
  }, [open]);

  const handleSave = () => {
    saveCampaignPrompt(promptText);
    setHasStoredPrompt(true);
    setMessage('Prompt de campanha salvo com sucesso!');
  };

  const handleRemove = () => {
    removeCampaignPrompt();
    setPromptText('');
    setHasStoredPrompt(false);
    setMessage('Prompt de campanha removido.');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Definir Texto de Prompt de Campanha</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          Insira ou edite o texto base que será usado como prompt para gerar conteúdo de campanha com IA.
        </Typography>

        <Box sx={{ mt: 2, mb: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            id="campaign-prompt-text"
            label="Texto do Prompt de Campanha"
            type="text"
            fullWidth
            multiline
            rows={10}
            variant="outlined"
            value={promptText}
            onChange={(e) => {
              setPromptText(e.target.value);
              if (message) setMessage('');
            }}
            placeholder="Ex: Um carrossel sobre os benefícios da meditação para reduzir o estresse..."
          />
        </Box>

        {message && (
          <Typography color={message.includes('sucesso') ? 'green' : (message.includes('removido') ? 'textPrimary' : 'error')} variant="body2">
            {message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
        <Box>
          {hasStoredPrompt && (
            <Button onClick={handleRemove} color="error">
              Remover Prompt
            </Button>
          )}
        </Box>
        <Box>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
            Salvar Prompt
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignPromptDialog;
