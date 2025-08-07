import React, { useState, useEffect } from 'react';
import { getCampaignPrompt, saveCampaignPrompt, removeCampaignPrompt } from '../utils/campaignPrompt';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, TextField, IconButton } from '@mui/material';
import { Edit } from '@mui/icons-material';
import TextEditorDialog from './TextEditorDialog';

const CampaignPromptDialog = ({ open, onClose }) => {
  const [message, setMessage] = useState('');
  const [hasStoredPrompt, setHasStoredPrompt] = useState(false);
  const [persona, setPersona] = useState('');
  const [autor, setAutor] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    if (open) {
      const { persona, autor, instrucoes } = getCampaignPrompt();
      setPersona(persona);
      setAutor(autor);
      setInstrucoes(instrucoes);
      setHasStoredPrompt(!!(persona || autor || instrucoes));
      setMessage('');
    }
  }, [open]);

  const handleSave = () => {
    saveCampaignPrompt({ persona, autor, instrucoes });
    setHasStoredPrompt(true);
    setMessage('Prompt de campanha salvo com sucesso!');
  };

  const handleRemove = () => {
    removeCampaignPrompt();
    setPersona('');
    setAutor('');
    setInstrucoes('');
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
    }
    setEditingField(null);
  };

  const getCurrentContent = () => {
    if (editingField === 'persona') return persona;
    if (editingField === 'autor') return autor;
    if (editingField === 'instrucoes') return instrucoes;
    return '';
  };

  const getEditorTitle = () => {
      if (editingField === 'persona') return 'Editar Persona';
      if (editingField === 'autor') return 'Editar Autor';
      if (editingField === 'instrucoes') return 'Editar Instruções';
      return 'Editar';
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
