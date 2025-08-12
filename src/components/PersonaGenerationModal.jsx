import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Box,
} from '@mui/material';

const PersonaGenerationModal = ({
  open,
  onClose,
  onGenerate,
  description,
  setDescription,
  isLoading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Gerar Persona com IA</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="persona-description"
          label="Descreva sua persona"
          type="text"
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          placeholder="Ex: Um CTO em uma startup de tecnologia em crescimento, que se preocupa com escalabilidade e segurança de dados, mas tem um orçamento limitado."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={isLoading}>Cancelar</Button>
        <Button onClick={onGenerate} variant="contained" disabled={!description.trim() || isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Gerar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PersonaGenerationModal;
