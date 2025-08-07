import React, { useState, useEffect, useRef } from 'react';
import { getCampaignPrompt, saveCampaignPrompt, removeCampaignPrompt } from '../utils/campaignPrompt';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Chip } from '@mui/material';

const CampaignPromptDialog = ({ open, onClose }) => {
  const [message, setMessage] = useState('');
  const [hasStoredPrompt, setHasStoredPrompt] = useState(false);
  const [usedProblema, setUsedProblema] = useState(false);
  const [usedSolucao, setUsedSolucao] = useState(false);
  const editorRef = useRef(null);

  const getHighlightedHtml = (text) => {
    return text
      .replace(/{{problema}}/g, '<span style="color: #ec4899; font-family: monospace;" contenteditable="false">{{problema}}</span>')
      .replace(/{{solucao}}/g, '<span style="color: #8b5cf6; font-family: monospace;" contenteditable="false">{{solucao}}</span>');
  };

  useEffect(() => {
    if (open && editorRef.current) {
      const storedPrompt = getCampaignPrompt() || '';
      editorRef.current.innerHTML = getHighlightedHtml(storedPrompt);
      setHasStoredPrompt(!!storedPrompt);
      setUsedProblema(storedPrompt.includes('{{problema}}'));
      setUsedSolucao(storedPrompt.includes('{{solucao}}'));
      setMessage('');
    }
  }, [open]);

  const handleSave = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerText;
      saveCampaignPrompt(newContent);
      setHasStoredPrompt(true);
      setMessage('Prompt de campanha salvo com sucesso!');
    }
  };

  const handleRemove = () => {
    removeCampaignPrompt();
    setHasStoredPrompt(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setUsedProblema(false);
    setUsedSolucao(false);
    setMessage('Prompt de campanha removido.');
  };

  const handleInsertPlaceholder = (placeholder) => {
    if (editorRef.current) {
      const placeholderText = `{{${placeholder}}}`;
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const span = document.createElement('span');
      span.style.color = placeholder === 'problema' ? '#ec4899' : '#8b5cf6';
      span.style.fontFamily = 'monospace';
      span.setAttribute('contenteditable', 'false');
      span.innerText = placeholderText;
      range.insertNode(span);

      // Move cursor after the inserted placeholder
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);

      handleInput(); // Update button states
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      setUsedProblema(text.includes('{{problema}}'));
      setUsedSolucao(text.includes('{{solucao}}'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Definir Texto de Prompt de Campanha</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 3 }}>
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
            border: '1px solid #ccc',
            borderRadius: '4px',
            p: 2,
            flex: 1,
            overflowY: 'auto',
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
  );
};

export default CampaignPromptDialog;
