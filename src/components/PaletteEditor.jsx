import React from 'react';
import {
  Box, TextField, Typography, IconButton, Button, Paper, Grid,
} from '@mui/material';
import { Add, DeleteForever as DeleteForeverIcon } from '@mui/icons-material';

const PaletteEditor = ({ paletteData, onPaletteDataChange }) => {
  const { name = '', colors = [], harmony = '', harmony_justification = '' } = paletteData || {};

  const handleFieldChange = (field, value) => {
    onPaletteDataChange({ ...paletteData, [field]: value });
  };

  const handleColorFieldChange = (index, field, value) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], [field]: value };
    onPaletteDataChange({ ...paletteData, colors: newColors });
  };

  const handleAddColor = () => {
    // Limit the number of colors to avoid overly complex palettes.
    // The AI generates 5, so we can cap it at 6 or 7.
    if (colors.length < 7) {
      const newColor = {
        hex: '#000000',
        name: 'Nova Cor',
        role: 'Acento',
        justification: 'Adicionada manualmente pelo usuário.',
      };
      const newColors = [...colors, newColor];
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
        onChange={(e) => handleFieldChange('name', e.target.value)}
        required
        sx={{ mb: 2 }}
      />

      <TextField
        label="Justificativa da Harmonia"
        multiline
        rows={3}
        fullWidth
        variant="outlined"
        value={harmony_justification}
        onChange={(e) => handleFieldChange('harmony_justification', e.target.value)}
        sx={{ mb: 2 }}
        helperText={`Harmonia Aplicada: ${harmony || 'N/A'}`}
      />

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Cores e Descrições</Typography>
      <Grid container spacing={2}>
        {colors.map((color, index) => (
          <Grid item xs={12} key={index}>
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <input
                  type="color"
                  value={color.hex || '#000000'}
                  onChange={(e) => handleColorFieldChange(index, 'hex', e.target.value)}
                  style={{ width: '60px', height: '60px', border: '1px solid #ccc', cursor: 'pointer', backgroundColor: 'transparent' }}
                  title="Clique para escolher uma cor"
                />
                <Typography variant="caption" sx={{ mt: 0.5, fontFamily: 'monospace' }}>{color.hex}</Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nome da Cor"
                      value={color.name || ''}
                      onChange={(e) => handleColorFieldChange(index, 'name', e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Papel na Paleta"
                      value={color.role || ''}
                      onChange={(e) => handleColorFieldChange(index, 'role', e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Justificativa / Descrição da Cor"
                      value={color.justification || ''}
                      onChange={(e) => handleColorFieldChange(index, 'justification', e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      size="small"
                      variant="standard"
                    />
                  </Grid>
                </Grid>
              </Box>
              <IconButton onClick={() => handleRemoveColor(index)} size="small" title="Remover Cor" sx={{ alignSelf: 'center', flexShrink: 0 }}>
                <DeleteForeverIcon />
              </IconButton>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 2 }}>
        {colors.length < 7 && (
          <Button variant="outlined" onClick={handleAddColor} startIcon={<Add />}>
            Adicionar Cor
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PaletteEditor;
