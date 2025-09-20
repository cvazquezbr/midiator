import React from 'react';
import {
  Box, TextField, Typography, IconButton, Button,
} from '@mui/material';
import { Add, DeleteForever as DeleteForeverIcon } from '@mui/icons-material';

const PaletteEditor = ({ paletteData, onPaletteDataChange }) => {
  const { name = '', colors = [] } = paletteData || {};

  const handleNameChange = (event) => {
    onPaletteDataChange({ ...paletteData, name: event.target.value });
  };

  const handleColorChange = (index, newColor) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    onPaletteDataChange({ ...paletteData, colors: newColors });
  };

  const handleAddColor = () => {
    if (colors.length < 5) {
      const newColors = [...colors, '#000000'];
      onPaletteDataChange({ ...paletteData, colors: newColors });
    }
  };

  const handleRemoveColor = (index) => {
    const newColors = colors.filter((_, i) => i !== index);
    onPaletteDataChange({ ...paletteData, colors: newColors });
  };

  return (
    <Box>
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
    </Box>
  );
};

export default PaletteEditor;
