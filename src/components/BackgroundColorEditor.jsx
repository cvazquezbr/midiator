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

const BackgroundColorEditor = ({ pageTemplate, onUpdate }) => {
  if (!pageTemplate) return null;

  // Determine the initial mode. If the pageTemplate has a gradient, default to gradient mode.
  const initialMode = pageTemplate.gradient ? 'gradient' : 'solid';
  const [colorMode, setColorMode] = React.useState(initialMode);

  const handleUpdate = (property, value) => {
    onUpdate({ ...pageTemplate, [property]: value });
  };

  const handleGradientUpdate = (property, value) => {
    const currentGradient = pageTemplate.gradient || { type: 'linear', angle: 90, colors: ['#ffffff', '#000000'] };
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
    const newColors = [
      ...(pageTemplate.gradient?.colors || []),
      '#ffffff',
    ];
    handleGradientUpdate('colors', newColors);
  };

  const removeColor = (index) => {
    const newColors = (pageTemplate.gradient?.colors || []).filter((_, i) => i !== index);
    handleGradientUpdate('colors', newColors);
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
            // When switching modes, nullify the other to avoid conflicts
            if (newMode === 'solid') {
              handleUpdate('gradient', null);
            } else {
              handleUpdate('backgroundColor', null);
              // Ensure a default gradient exists if switching to it
              if (!pageTemplate.gradient) {
                handleGradientUpdate('type', 'linear');
              }
            }
          }
        }}
        aria-label="color mode"
      >
        <ToggleButton value="solid" aria-label="solid color background">
          Cor Sólida
        </ToggleButton>
        <ToggleButton value="gradient" aria-label="gradient background">
          Gradiente
        </ToggleButton>
      </ToggleButtonGroup>

      {colorMode === 'solid' && (
        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>Cor de Fundo</Typography>
          <TextField
            type="color"
            value={pageTemplate.backgroundColor || '#ffffff'}
            onChange={(e) => handleUpdate('backgroundColor', e.target.value)}
            fullWidth
          />
        </Box>
      )}

      {colorMode === 'gradient' && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
                <ToggleButtonGroup
                    value={pageTemplate.gradient?.type || 'linear'}
                    exclusive
                    fullWidth
                    size="small"
                    onChange={(e, newType) => {
                        if (newType) handleGradientUpdate('type', newType);
                    }}
                >
                    <Tooltip title="Gradiente Linear">
                        <ToggleButton value="linear"><Gradient /></ToggleButton>
                    </Tooltip>
                    <Tooltip title="Gradiente Radial">
                        <ToggleButton value="radial"><Gradient /></ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
            </Grid>

            {pageTemplate.gradient?.type === 'linear' && (
              <Grid item xs={12}>
                <Typography gutterBottom>Ângulo do Gradiente: {pageTemplate.gradient?.angle || 0}°</Typography>
                <Slider
                  value={pageTemplate.gradient?.angle || 0}
                  onChange={(e, value) => handleGradientUpdate('angle', value)}
                  min={0}
                  max={360}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography gutterBottom>Cores do Gradiente</Typography>
              {(pageTemplate.gradient?.colors || []).map((color, index) => (
                <Grid container spacing={1} key={index} alignItems="center" sx={{ mb: 1 }}>
                  <Grid item xs={4}>
                    <TextField
                      type="color"
                      value={color}
                      onChange={(e) => handleColorUpdate(index, e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                   <Grid item xs={6}>
                     <Typography noWrap>{color}</Typography>
                   </Grid>
                  <Grid item xs={2}>
                    <IconButton onClick={() => removeColor(index)} size="small" disabled={(pageTemplate.gradient?.colors?.length || 0) <= 2}>
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button startIcon={<Add />} onClick={addColor} size="small" variant="outlined" fullWidth>
                Adicionar Cor
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default BackgroundColorEditor;
