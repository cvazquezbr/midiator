import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import RichTextEditor from './RichTextEditor'; // Import the RichTextEditor

const TextEditorDialog = ({ open, title, content, onSave, onClose, isHtml }) => {
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
        {isHtml ? (
          <RichTextEditor
            value={editedContent}
            onChange={setEditedContent}
            maxHeight="100%" // Allow editor to fill the space
          />
        ) : (
          <TextField
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            style={{ flex: 1 }}
          />
        )}
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
