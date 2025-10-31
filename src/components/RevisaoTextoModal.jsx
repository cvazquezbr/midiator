import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography
} from '@mui/material';

const RevisaoTextoModal = ({ open, onClose, originalText, translatedText, onSave }) => {
  const [editedText, setEditedText] = useState(translatedText);

  useEffect(() => {
    setEditedText(translatedText);
  }, [translatedText]);

  const handleSave = () => {
    onSave(editedText);
    onClose();
  };

  const isArray = Array.isArray(originalText);
  const displayOriginalText = isArray ? originalText.join(', ') : originalText;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Revisar Tradução</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Texto Original</Typography>
            <TextField
              fullWidth
              multiline
              variant="outlined"
              value={displayOriginalText}
              disabled
              rows={4}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Texto Traduzido</Typography>
            <TextField
              fullWidth
              multiline
              variant="outlined"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={6}
              autoFocus
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RevisaoTextoModal;