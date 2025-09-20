import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, DialogActions,
} from '@mui/material';
import PaletteEditor from './PaletteEditor';

const PaletteEditModal = ({ open, onClose, onSave, paletteData }) => {
  const [editedPalette, setEditedPalette] = useState(paletteData);

  useEffect(() => {
    // When the modal is opened with new data, update the local state.
    if (open) {
      setEditedPalette(paletteData);
    }
  }, [paletteData, open]);

  const handleSave = () => {
    onSave(editedPalette);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Editar Paleta</DialogTitle>
      <DialogContent>
        <PaletteEditor
          paletteData={editedPalette}
          onPaletteDataChange={setEditedPalette}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={!editedPalette?.name?.trim() || editedPalette?.colors?.length === 0}>
          Salvar Alterações
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaletteEditModal;
