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
    // Palettes are capped at 5 colors for now.
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
        label="Nome da Paleta"
        type="text"
        fullWidth
        variant="outlined"
        value={name}
        onChange={handleNameChange}
        required
      />
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Cores</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {colors.map((color, index) => (
          <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              style={{ width: '50px', height: '50px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
              title="Clique para escolher uma cor"
            />
            <Typography variant="caption" sx={{ mt: 0.5 }}>{color}</Typography>
            <IconButton onClick={() => handleRemoveColor(index)} size="small" title="Remover Cor">
              <DeleteForeverIcon />
            </IconButton>
          </Box>
        ))}
        {colors.length < 5 && (
          <Button variant="outlined" onClick={handleAddColor} startIcon={<Add />}>
            Adicionar Cor
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PaletteEditor;
