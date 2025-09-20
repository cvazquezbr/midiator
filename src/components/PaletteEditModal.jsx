import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, DialogActions,
} from '@mui/material';
import PaletteEditor from './PaletteEditor';

const PaletteEditModal = ({ open, onClose, onSave, paletteData, onPaletteDataChange }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{paletteData?.id ? 'Edit Palette' : 'New Palette'}</DialogTitle>
      <DialogContent>
        <PaletteEditor
          paletteData={paletteData}
          onPaletteDataChange={onPaletteDataChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaletteEditModal;
