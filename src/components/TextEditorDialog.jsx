import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import TextEditor from './TextEditor'; // Import the new TextEditor

const TextEditorDialog = ({ open, title, content, onSave, onClose, html = false }) => {
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{
      style: {
        height: '90vh', // Adjust height for better usability
      }
    }}>
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
