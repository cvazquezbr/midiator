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
  const initialMode = pageTemplate?.gradient ? 'gradient' : 'solid';
  const [colorMode, setColorMode] = React.useState(initialMode);

  React.useEffect(() => {
    setColorMode(pageTemplate?.gradient ? 'gradient' : 'solid');
  }, [pageTemplate?.gradient]);

  if (!pageTemplate) return null;

  const handleGradientUpdate = (property, value) => {
    const currentGradient = pageTemplate.gradient || {};
    onUpdate({
      ...pageTemplate,
      gradient: { ...currentGradient, [property]: value },
    });
  };

  const handleStopUpdate = (index, property, value) => {
    const newStops = [...(pageTemplate.gradient?.stops || [])];
    newStops[index] = { ...newStops[index], [property]: value };
    handleGradientUpdate('stops', newStops);
  };

  const addStop = () => {
    const newStops = [
      ...(pageTemplate.gradient?.stops || []),
      { color: '#ffffff', position: 100 },
    ];
    handleGradientUpdate('stops', newStops);
  };

  const removeStop = (index) => {
    const newStops = (pageTemplate.gradient?.stops || []).filter((_, i) => i !== index);
    handleGradientUpdate('stops', newStops);
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
            if (newMode === 'solid') {
                onUpdate({ ...pageTemplate, gradient: null });
            } else {
                onUpdate({
                    ...pageTemplate,
                    gradient: pageTemplate.gradient || {
                        type: 'linear',
                        angle: 90,
                        stops: [
                            { color: '#ffffff', position: 0 },
                            { color: '#000000', position: 100 },
                        ]
                    }
                });
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
          <Typography gutterBottom>Cor</Typography>
          <TextField
            type="color"
            value={pageTemplate.backgroundColor || '#ffffff'}
            onChange={(e) => onUpdate({ ...pageTemplate, backgroundColor: e.target.value })}
            fullWidth
          />
        </Box>
      )}

      {colorMode === 'gradient' && pageTemplate.gradient && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
                <ToggleButtonGroup
                    value={pageTemplate.gradient.type || 'linear'}
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

            {pageTemplate.gradient.type === 'linear' && (
              <Grid item xs={12}>
                <Typography gutterBottom>Ângulo do Gradiente</Typography>
                <Slider
                  value={pageTemplate.gradient.angle || 0}
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
              {pageTemplate.gradient.stops?.map((stop, index) => (
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
                    <IconButton onClick={() => removeStop(index)} size="small" disabled={(pageTemplate.gradient.stops?.length || 0) <= 2}>
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
