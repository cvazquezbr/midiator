import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import RichTextEditor from './RichTextEditor'; // Import the RichTextEditor

const TextEditorDialog = ({ open, title, content, onSave, onClose }) => {
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
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
        <RichTextEditor
          value={editedContent}
          onChange={setEditedContent}
          maxHeight="100%" // Allow editor to fill the space
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
