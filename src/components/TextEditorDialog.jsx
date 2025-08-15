import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
      style: {
        height: '80vh',
      }
    }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
        <TextField
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          multiline
          fullWidth
          sx={{ flexGrow: 1, '& .MuiInputBase-root': { height: '100%' } }}
          InputProps={{
            style: {
              height: '100%',
              alignItems: 'flex-start',
            }
          }}
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
