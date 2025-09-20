import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, Box, TextField, Typography, IconButton,
} from '@mui/material';
import { Add, DeleteForever as DeleteForeverIcon } from '@mui/icons-material';

const PaletteEditModal = ({ open, onClose, onSave, paletteData, onPaletteDataChange }) => {
  const [name, setName] = useState('');
  const [colors, setColors] = useState([]);

  useEffect(() => {
    if (paletteData) {
      setName(paletteData.name || '');
      setColors(paletteData.colors || []);
    }
  }, [paletteData]);

  const handleColorChange = (index, newColor) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    setColors(newColors);
    onPaletteDataChange({ ...paletteData, colors: newColors });
  };

  const handleAddColor = () => {
    if (colors.length < 5) {
      const newColors = [...colors, '#000000'];
      setColors(newColors);
      onPaletteDataChange({ ...paletteData, colors: newColors });
    }
  };

  const handleRemoveColor = (index) => {
    const newColors = colors.filter((_, i) => i !== index);
    setColors(newColors);
    onPaletteDataChange({ ...paletteData, colors: newColors });
  };

  const handleNameChange = (event) => {
    setName(event.target.value);
    onPaletteDataChange({ ...paletteData, name: event.target.value });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{paletteData?.id ? 'Edit Palette' : 'New Palette'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Palette Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={handleNameChange}
        />
        <Typography variant="h6" sx={{ mt: 2 }}>Colors</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
          {colors.map((color, index) => (
            <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(index, e.target.value)}
                style={{ width: '50px', height: '50px', border: 'none', cursor: 'pointer' }}
              />
              <Typography variant="caption">{color}</Typography>
              <IconButton onClick={() => handleRemoveColor(index)} size="small">
                <DeleteForeverIcon />
              </IconButton>
            </Box>
          ))}
          {colors.length < 5 && (
            <Button variant="outlined" onClick={handleAddColor} startIcon={<Add />}>
              Add Color
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaletteEditModal;
