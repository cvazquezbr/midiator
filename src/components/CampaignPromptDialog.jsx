import React, { useState, useEffect, useRef } from 'react';
import { getCampaignPrompt, saveCampaignPrompt, removeCampaignPrompt } from '../utils/campaignPrompt';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Chip } from '@mui/material';

const CampaignPromptDialog = ({ open, onClose }) => {
  const [message, setMessage] = useState('');
  const [hasStoredPrompt, setHasStoredPrompt] = useState(false);
  const [usedProblema, setUsedProblema] = useState(false);
  const [usedSolucao, setUsedSolucao] = useState(false);
  const editorRef = useRef(null);

  const updateEditorContent = (text) => {
    const html = text
      .replace(/{{problema}}/g, '<span style="color: #ec4899; font-family: monospace;">{{problema}}</span>')
      .replace(/{{solucao}}/g, '<span style="color: #8b5cf6; font-family: monospace;">{{solucao}}</span>');
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  };

  useEffect(() => {
    if (open) {
      const storedPrompt = getCampaignPrompt();
      if (storedPrompt) {
        setHasStoredPrompt(true);
        setUsedProblema(storedPrompt.includes('{{problema}}'));
        setUsedSolucao(storedPrompt.includes('{{solucao}}'));
        updateEditorContent(storedPrompt);
      } else {
        setHasStoredPrompt(false);
        setUsedProblema(false);
        setUsedSolucao(false);
        updateEditorContent('');
      }
      setMessage('');
    }
  }, [open]);

  const handleSave = () => {
    const text = editorRef.current.innerText;
    saveCampaignPrompt(text);
    setHasStoredPrompt(true);
    setMessage('Prompt de campanha salvo com sucesso!');
  };

  const handleRemove = () => {
    removeCampaignPrompt();
    setHasStoredPrompt(false);
    setUsedProblema(false);
    setUsedSolucao(false);
    updateEditorContent('');
    setMessage('Prompt de campanha removido.');
  };

  const handleInsertPlaceholder = (placeholder) => {
    const placeholderText = `{{${placeholder}}}`;
    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(placeholderText + ' ');
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      const newText = editorRef.current.innerText;
      if (placeholder === 'problema') setUsedProblema(true);
      if (placeholder === 'solucao') setUsedSolucao(true);
      updateEditorContent(newText);
    }
  };

  const handleInput = () => {
    const text = editorRef.current.innerText;
    if (!text.includes('{{problema}}')) setUsedProblema(false);
    if (!text.includes('{{solucao}}')) setUsedSolucao(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Definir Texto de Prompt de Campanha</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          Insira ou edite o texto base que será usado como prompt para gerar conteúdo de campanha com IA.
        </Typography>

        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Campos Disponíveis</Typography>
          <Chip
            label="Problema"
            onClick={() => handleInsertPlaceholder('problema')}
            disabled={usedProblema}
            sx={{ mr: 1, backgroundColor: '#fce7f3', color: '#be185d', '&:hover': {backgroundColor: '#f9a8d4'} }}
          />
          <Chip
            label="Solução"
            onClick={() => handleInsertPlaceholder('solucao')}
            disabled={usedSolucao}
            sx={{ backgroundColor: '#f5f3ff', color: '#6d28d9', '&:hover': {backgroundColor: '#c4b5fd'} }}
          />
        </Box>

        <Box
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          sx={{
            mt: 2,
            mb: 2,
            border: '1px solid #ccc',
            borderRadius: '4px',
            p: 2,
            minHeight: '200px',
            '&:focus': {
              outline: '2px solid #8b5cf6',
              borderColor: '#8b5cf6'
            },
            'span': {
              padding: '2px 4px',
              borderRadius: '4px'
            }
          }}
        />

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
