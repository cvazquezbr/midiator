import React from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Slider,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { Add, Delete, Gradient } from '@mui/icons-material';
import ColorSwatches from './common/ColorSwatches';


const BackgroundColorEditor = ({ pageTemplate, onUpdate, colorPalette, imagePalette }) => {
  if (!pageTemplate) return null;

  const initialMode = pageTemplate?.gradient ? 'gradient' : 'solid';
  const [colorMode, setColorMode] = React.useState(initialMode);
  const [selectedGradientColorIndex, setSelectedGradientColorIndex] = React.useState(0);

  const handleUpdate = (property, value) => {
    onUpdate({ ...pageTemplate, [property]: value });
  };

  const handleGradientUpdate = (property, value) => {
    const currentGradient = pageTemplate?.gradient || { type: 'linear', angle: 90, colors: ['#ffffff', '#000000'] };
    onUpdate({
      ...pageTemplate,
      gradient: { ...currentGradient, [property]: value },
    });
  };

  const handleColorUpdate = (index, newColor) => {
    const newColors = [...(pageTemplate.gradient?.colors || [])];
    newColors[index] = newColor;
    handleGradientUpdate('colors', newColors);
  };

  const addColor = () => {
    const newColors = [...(pageTemplate.gradient?.colors || []), '#ffffff'];
    handleGradientUpdate('colors', newColors);
  };

  const removeColor = (index) => {
    const newColors = (pageTemplate.gradient?.colors || []).filter((_, i) => i !== index);
    if (selectedGradientColorIndex >= newColors.length) {
      setSelectedGradientColorIndex(newColors.length - 1);
    }
    handleGradientUpdate('colors', newColors);
  };

  const handleSolidColorSelect = (color) => {
    handleUpdate('backgroundColor', color);
  };

  const handleGradientColorSelect = (color) => {
    handleColorUpdate(selectedGradientColorIndex, color);
  };

  return (
    <Box>
      <ToggleButtonGroup
        value={colorMode}
        exclusive
        fullWidth
        size="small"
        onChange={(e, newMode) => {
          if (newMode) {
            setColorMode(newMode);
            const newPageTemplate = { ...pageTemplate };
            if (newMode === 'solid') {
              newPageTemplate.gradient = null;
              if (!newPageTemplate.backgroundColor) newPageTemplate.backgroundColor = '#FFFFFF';
            } else {
              newPageTemplate.backgroundColor = null;
              if (!newPageTemplate.gradient) newPageTemplate.gradient = { type: 'linear', angle: 90, colors: ['#ffffff', '#000000'] };
            }
            onUpdate(newPageTemplate);
          }
        }}
        aria-label="color mode"
      >
        <ToggleButton value="solid" aria-label="solid color">Cor Sólida</ToggleButton>
        <ToggleButton value="gradient" aria-label="gradient">Gradiente</ToggleButton>
      </ToggleButtonGroup>

      {colorMode === 'solid' && (
        <Box sx={{ mt: 2 }}>
          <TextField type="color" value={pageTemplate?.backgroundColor || '#ffffff'} onChange={(e) => handleUpdate('backgroundColor', e.target.value)} fullWidth />
          <ColorSwatches title="Paleta da Campanha" palette={colorPalette} onColorSelect={handleSolidColorSelect} />
          <ColorSwatches title="Paleta da Imagem" palette={imagePalette} onColorSelect={handleSolidColorSelect} />
        </Box>
      )}

      {colorMode === 'gradient' && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <ToggleButtonGroup value={pageTemplate.gradient?.type || 'linear'} exclusive fullWidth size="small" onChange={(e, v) => v && handleGradientUpdate('type', v)}>
                <Tooltip title="Gradiente Linear"><ToggleButton value="linear"><Gradient /></ToggleButton></Tooltip>
                <Tooltip title="Gradiente Radial"><ToggleButton value="radial"><Gradient /></ToggleButton></Tooltip>
              </ToggleButtonGroup>
            </Grid>

            {pageTemplate.gradient?.type === 'linear' && (
              <Grid item xs={12}>
                <Typography gutterBottom>Ângulo: {pageTemplate.gradient?.angle || 0}°</Typography>
                <Slider value={pageTemplate.gradient?.angle || 0} onChange={(e, v) => handleGradientUpdate('angle', v)} min={0} max={360} />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography gutterBottom>Cores do Gradiente</Typography>
              {(pageTemplate.gradient?.colors || []).map((color, index) => (
                <Grid container spacing={1} key={index} alignItems="center" sx={{ mb: 1, p: 0.5, borderRadius: 1, border: selectedGradientColorIndex === index ? '2px solid #90caf9' : '2px solid transparent' }}>
                  <Grid item xs={4}><TextField type="color" value={color} onChange={(e) => handleColorUpdate(index, e.target.value)} onFocus={() => setSelectedGradientColorIndex(index)} fullWidth size="small" /></Grid>
                  <Grid item xs={6}><Typography noWrap>{color}</Typography></Grid>
                  <Grid item xs={2}><IconButton onClick={() => removeColor(index)} size="small" disabled={(pageTemplate.gradient?.colors?.length || 0) <= 2}><Delete /></IconButton></Grid>
                </Grid>
              ))}
              <Button startIcon={<Add />} onClick={addColor} size="small" variant="outlined" fullWidth>Adicionar Cor</Button>
            </Grid>
            <Grid item xs={12}>
              <ColorSwatches title="Paleta da Campanha" palette={colorPalette} onColorSelect={handleGradientColorSelect} />
              <ColorSwatches title="Paleta da Imagem" palette={imagePalette} onColorSelect={handleGradientColorSelect} />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default BackgroundColorEditor;
