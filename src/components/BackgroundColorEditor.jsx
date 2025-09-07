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

const BackgroundColorEditor = ({ backgroundElement, onUpdate, pageState, onPageStateUpdate }) => {
  // Determine the initial mode. If the backgroundElement has a gradient, default to gradient mode.
  const initialMode = backgroundElement?.gradient ? 'gradient' : 'solid';
  const [colorMode, setColorMode] = React.useState(initialMode);

  // When the component opens, if the mode is gradient, clear the solid page color to avoid confusion.
  React.useEffect(() => {
    if (initialMode === 'gradient' && pageState?.backgroundColor) {
       // onPageStateUpdate({ ...pageState, backgroundColor: 'rgba(0,0,0,0)' });
    }
  }, [initialMode]);


  if (!backgroundElement) return null;

  const handlePageStateUpdate = (property, value) => {
    onPageStateUpdate({ ...pageState, [property]: value });
  };

  const handleGradientUpdate = (property, value) => {
    const currentGradient = backgroundElement.gradient || {};
    onUpdate({
      ...backgroundElement,
      gradient: { ...currentGradient, [property]: value },
    });
  };

  const handleStopUpdate = (index, property, value) => {
    const newStops = [...(backgroundElement.gradient?.stops || [])];
    newStops[index] = { ...newStops[index], [property]: value };
    handleGradientUpdate('stops', newStops);
  };

  const addStop = () => {
    const newStops = [
      ...(backgroundElement.gradient?.stops || []),
      { color: '#ffffff', position: 100 },
    ];
    handleGradientUpdate('stops', newStops);
  };

  const removeStop = (index) => {
    const newStops = (backgroundElement.gradient?.stops || []).filter((_, i) => i !== index);
    handleGradientUpdate('stops', newStops);
  };

  return (
    <Box>
      <Typography variant="caption" display="block" gutterBottom>
        Cor de Fundo
      </Typography>
      <ToggleButtonGroup
        value={colorMode}
        exclusive
        fullWidth
        size="small"
        onChange={(e, newMode) => {
          if (newMode) setColorMode(newMode);
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
          <Typography gutterBottom>Cor</Typography>
          <TextField
            type="color"
            value={pageState?.backgroundColor || '#ffffff'}
            onChange={(e) => handlePageStateUpdate('backgroundColor', e.target.value)}
            fullWidth
          />
        </Box>
      )}

      {colorMode === 'gradient' && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
                <ToggleButtonGroup
                    value={backgroundElement.gradient?.type || 'linear'}
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

            {backgroundElement.gradient?.type === 'linear' && (
              <Grid item xs={12}>
                <Typography gutterBottom>Ângulo do Gradiente</Typography>
                <Slider
                  value={backgroundElement.gradient?.angle || 0}
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
              {backgroundElement.gradient?.stops?.map((stop, index) => (
                <Grid container spacing={1} key={index} alignItems="center" sx={{ mb: 1 }}>
                  <Grid item xs={3}>
                    <TextField
                      type="color"
                      value={stop.color}
                      onChange={(e) => handleStopUpdate(index, 'color', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={7}>
                    <Slider
                      value={stop.position}
                      onChange={(e, value) => handleStopUpdate(index, 'position', value)}
                      min={0}
                      max={100}
                      step={1}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton onClick={() => removeStop(index)} size="small" disabled={(backgroundElement.gradient?.stops?.length || 0) <= 2}>
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button startIcon={<Add />} onClick={addStop} size="small" variant="outlined" fullWidth>
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
