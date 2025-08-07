import React, { useState, useEffect } from 'react';
import { getCampaignPrompt, saveCampaignPrompt, removeCampaignPrompt } from '../utils/campaignPrompt';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import TextEditorDialog from './TextEditorDialog';

const CampaignPromptDialog = ({ open, onClose }) => {
  const [message, setMessage] = useState('');
  const [hasStoredPrompt, setHasStoredPrompt] = useState(false);
  const [persona, setPersona] = useState('');
  const [autor, setAutor] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [formato, setFormato] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    if (open) {
      const { persona, autor, instrucoes, formato, aspectRatio } = getCampaignPrompt();
      setPersona(persona);
      setAutor(autor);
      setInstrucoes(instrucoes);
      setFormato(formato);
      setAspectRatio(aspectRatio || '1:1');
      setHasStoredPrompt(!!(persona || autor || instrucoes || formato || aspectRatio));
      setMessage('');
    }
  }, [open]);

  const handleSave = () => {
    saveCampaignPrompt({ persona, autor, instrucoes, formato, aspectRatio });
    setHasStoredPrompt(true);
    setMessage('Prompt de campanha salvo com sucesso!');
  };

  const handleRemove = () => {
    removeCampaignPrompt();
    setPersona('');
    setAutor('');
    setInstrucoes('');
    setFormato('');
    setAspectRatio('1:1');
    setHasStoredPrompt(false);
    setMessage('Prompt de campanha removido.');
  };

  const handleOpenEditor = (field) => {
    setEditingField(field);
  };

  const handleCloseEditor = () => {
    setEditingField(null);
  };

  const handleSaveEditor = (newContent) => {
    if (editingField === 'persona') {
      setPersona(newContent);
    } else if (editingField === 'autor') {
      setAutor(newContent);
    } else if (editingField === 'instrucoes') {
      setInstrucoes(newContent);
    } else if (editingField === 'formato') {
      setFormato(newContent);
    }
    setEditingField(null);
  };

  const getCurrentContent = () => {
    if (editingField === 'persona') return persona;
    if (editingField === 'autor') return autor;
    if (editingField === 'instrucoes') return instrucoes;
    if (editingField === 'formato') return formato;
    return '';
  };

  const getEditorTitle = () => {
      if (editingField === 'persona') return 'Editar Persona';
      if (editingField === 'autor') return 'Editar Autor';
      if (editingField === 'instrucoes') return 'Editar Instruções';
      if (editingField === 'formato') return 'Editar Formato';
      return 'Editar';
  };

  const handleExportHtml = () => {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prompt de Campanha</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
          h1, h2 { color: #8b5cf6; }
          .container { border: 1px solid #ddd; border-radius: 8px; padding: 2rem; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          pre { background-color: #f5f3ff; padding: 1rem; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Prompt de Campanha</h1>
          <h2>Persona</h2>
          <pre>${persona}</pre>
          <h2>Autor</h2>
          <pre>${autor}</pre>
          <h2>Formato</h2>
          <pre>${formato}</pre>
          <h2>Instruções</h2>
          <pre>${instrucoes}</pre>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prompt-campanha.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Definir Texto de Prompt de Campanha</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 3, gap: 2 }}>
          <Typography variant="body2" gutterBottom>
            Insira ou edite os textos que serão usados como base para gerar o conteúdo da campanha.
          </Typography>

          <Box>
            <Typography variant="subtitle1" gutterBottom>Persona</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={persona}
              onClick={() => handleOpenEditor('persona')}
              readOnly
              placeholder="Clique para editar a persona..."
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>Autor</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={autor}
              onClick={() => handleOpenEditor('autor')}
              readOnly
              placeholder="Clique para editar o autor..."
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>Formato</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={formato}
              onClick={() => handleOpenEditor('formato')}
              readOnly
              placeholder="Clique para editar o formato..."
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel id="aspect-ratio-label">Razão de Aspecto</InputLabel>
            <Select
              labelId="aspect-ratio-label"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              label="Razão de Aspecto"
            >
              <MenuItem value="1:1">Quadrado (1:1)</MenuItem>
              <MenuItem value="4:5">Retrato (4:5)</MenuItem>
              <MenuItem value="16:9">Paisagem (16:9)</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography variant="subtitle1" gutterBottom>Instruções</Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={instrucoes}
              onClick={() => handleOpenEditor('instrucoes')}
              readOnly
              placeholder="Clique para editar as instruções..."
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          {message && (
            <Typography color={message.includes('sucesso') ? 'green' : (message.includes('removido') ? 'textPrimary' : 'error')} variant="body2" sx={{ mt: 2 }}>
              {message}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
          <Box>
            {hasStoredPrompt && (
              <>
                <Button onClick={handleRemove} color="error">
                  Remover Prompt
                </Button>
                <Button onClick={handleExportHtml} color="secondary">
                  Exportar como HTML
                </Button>
              </>
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

      <TextEditorDialog
        open={editingField !== null}
        title={getEditorTitle()}
        content={getCurrentContent()}
        onSave={handleSaveEditor}
        onClose={handleCloseEditor}
      />
    </>
  );
};

export default CampaignPromptDialog;
