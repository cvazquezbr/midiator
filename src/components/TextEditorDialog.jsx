import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import TextEditor from './TextEditor'; // Import the new TextEditor

const TextEditorDialog = ({ open, title, content, onSave, onClose, html = false, sidebarOpen = false }) => {
  const [editedContent, setEditedContent] = useState(content);

  useEffect(() => {
    if (open) {
      setEditedContent(content);
    }
  }, [content, open]);

  const handleSave = () => {
    onSave(editedContent);
    onClose();
  };

  // Adapta o estilo do diálogo com base no estado da barra lateral.
  const dialogStyle = {
    height: '90vh',
    transition: 'margin-left 0.2s ease-in-out',
    marginLeft: sidebarOpen ? '320px' : '0',
    width: sidebarOpen ? 'calc(100% - 320px)' : '100%',
  };

  // Garante que o diálogo apareça sobre a barra lateral.
  const dialogZIndex = 1301; // theme.zIndex.drawer é 1200, sidebar é 1300.

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ style: dialogStyle }}
      style={{ zIndex: dialogZIndex }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 2, height: '100%' }}>
        <TextEditor
          value={editedContent}
          onChange={setEditedContent}
          html={html}
          variant="full"
        />
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 3 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TextEditorDialog;
