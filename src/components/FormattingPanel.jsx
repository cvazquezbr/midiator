import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  ExpandMore,
  FormatSize,
  Palette,
  Style,
  ContentCopy,
  Visibility,
  VisibilityOff,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  VerticalAlignTop,
  VerticalAlignCenter,
  VerticalAlignBottom
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

const FormattingPanel = ({
  selectedField,
  fieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders
}) => {
  const fonts = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Courier New',
    'Impact',
    'Comic Sans MS',
    'Roboto',
    'Open Sans',
    'Montserrat',
    'Lato',
    'Poppins',
    'Inter',
    'Source Sans Pro',
    'Anton',
    'Bebas Neue',
    'Caveat',
    'Courgette',
    'Dancing Script',
    'Lora',
    'Merriweather',
    'Playfair Display',
    'Raleway'
  ];


  const updateFieldStyle = (field, property, value) => {
    setFieldStyles(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [property]: value
      }
    }));
  };

  const updateFieldPosition = (field, property, value) => {
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [property]: value
      }
    }));
  };

  const copyStyleToAll = (sourceField) => {
    const sourceStyle = fieldStyles[sourceField];
    if (!sourceStyle) return;

    const newStyles = {};
    csvHeaders.forEach(header => {
      if (header !== sourceField) {
        newStyles[header] = { ...sourceStyle };
      }
    });

    setFieldStyles(prev => ({
      ...prev,
      ...newStyles
    }));
  };

  const toggleFieldVisibility = (field) => {
    updateFieldPosition(field, 'visible', !fieldPositions[field]?.visible);
  };

  const resetFieldStyle = (field) => {
    const defaultStyle = {
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      textStroke: false,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      textShadow: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2
    };

    setFieldStyles(prev => ({
      ...prev,
      [field]: defaultStyle
    }));
  };

  if (!selectedField) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="textSecondary" align="center">
            Selecione um campo de texto para editar suas propriedades
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const style = fieldStyles[selectedField] || {};
  const position = fieldPositions[selectedField] || {};

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Chip
            label={selectedField}
            color="primary"
            sx={{ mr: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={position.visible !== false}
                onChange={() => toggleFieldVisibility(selectedField)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {position.visible !== false ? <Visibility /> : <VisibilityOff />}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {position.visible !== false ? 'Visível' : 'Oculto'}
                </Typography>
              </Box>
            }
          />
        </Box>

        {/* Posicionamento e Tamanho */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">
              📐 Posição e Tamanho
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="X (%)"
                  type="number"
                  size="small"
                  value={position.x?.toFixed(1) || '0.0'}
                  onChange={(e) => updateFieldPosition(selectedField, 'x', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Y (%)"
                  type="number"
                  size="small"
                  value={position.y?.toFixed(1) || '0.0'}
                  onChange={(e) => updateFieldPosition(selectedField, 'y', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Largura (%)"
                  type="number"
                  size="small"
                  value={position.width?.toFixed(1) || '20.0'}
                  onChange={(e) => updateFieldPosition(selectedField, 'width', parseFloat(e.target.value) || 20)}
                  inputProps={{ min: 5, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Altura (%)"
                  type="number"
                  size="small"
                  value={position.height?.toFixed(1) || '10.0'}
                  onChange={(e) => updateFieldPosition(selectedField, 'height', parseFloat(e.target.value) || 10)}
                  inputProps={{ min: 3, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  Alinhamento do Texto na Caixa
                </Typography>
                <ToggleButtonGroup
                  value={style.textAlign || 'left'}
                  exclusive
                  onChange={(e, newAlignment) => {
                    if (newAlignment) updateFieldStyle(selectedField, 'textAlign', newAlignment);
                  }}
                  aria-label="text alignment"
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="left" aria-label="left aligned">
                    <FormatAlignLeft />
                  </ToggleButton>
                  <ToggleButton value="center" aria-label="centered">
                    <FormatAlignCenter />
                  </ToggleButton>
                  <ToggleButton value="right" aria-label="right aligned">
                    <FormatAlignRight />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12} sx={{ mt: 1 }}>
                 <ToggleButtonGroup
                    value={style.verticalAlign || 'top'}
                    exclusive
                    onChange={(e, newAlignment) => {
                      if (newAlignment) updateFieldStyle(selectedField, 'verticalAlign', newAlignment);
                    }}
                    aria-label="vertical alignment"
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="top" aria-label="top aligned">
                      <VerticalAlignTop />
                    </ToggleButton>
                    <ToggleButton value="middle" aria-label="middle aligned">
                      <VerticalAlignCenter />
                    </ToggleButton>
                    <ToggleButton value="bottom" aria-label="bottom aligned">
                      <VerticalAlignBottom />
                    </ToggleButton>
                  </ToggleButtonGroup>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Fonte */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">
              <FormatSize sx={{ mr: 1, verticalAlign: 'middle' }} />
              Fonte
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Família da Fonte</InputLabel>
                  <Select
                    value={style.fontFamily || 'Arial'}
                    label="Família da Fonte"
                    onChange={(e) => updateFieldStyle(selectedField, 'fontFamily', e.target.value)}
                  >
                    {fonts.map(font => (
                      <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  Tamanho: {style.fontSize || 24}px
                </Typography>
                <Slider
                  value={style.fontSize || 24}
                  onChange={(e, value) => updateFieldStyle(selectedField, 'fontSize', value)}
                  min={8}
                  max={120}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 12, label: '12' },
                    { value: 24, label: '24' },
                    { value: 48, label: '48' },
                    { value: 72, label: '72' }
                  ]}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Estilo */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">
              <Style sx={{ mr: 1, verticalAlign: 'middle' }} />
              Estilo
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Peso</InputLabel>
                  <Select
                    value={style.fontWeight || 'normal'}
                    label="Peso"
                    onChange={(e) => updateFieldStyle(selectedField, 'fontWeight', e.target.value)}
                  >
                    <MenuItem value="100">Thin (100)</MenuItem>
                    <MenuItem value="200">Extra Light (200)</MenuItem>
                    <MenuItem value="300">Light (300)</MenuItem>
                    <MenuItem value="normal">Normal (400)</MenuItem>
                    <MenuItem value="500">Medium (500)</MenuItem>
                    <MenuItem value="600">Semi Bold (600)</MenuItem>
                    <MenuItem value="bold">Bold (700)</MenuItem>
                    <MenuItem value="800">Extra Bold (800)</MenuItem>
                    <MenuItem value="900">Black (900)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estilo</InputLabel>
                  <Select
                    value={style.fontStyle || 'normal'}
                    label="Estilo"
                    onChange={(e) => updateFieldStyle(selectedField, 'fontStyle', e.target.value)}
                  >
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="italic">Itálico</MenuItem>
                    <MenuItem value="oblique">Oblíquo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Decoração</InputLabel>
                  <Select
                    value={style.textDecoration || 'none'}
                    label="Decoração"
                    onChange={(e) => updateFieldStyle(selectedField, 'textDecoration', e.target.value)}
                  >
                    <MenuItem value="none">Nenhuma</MenuItem>
                    <MenuItem value="underline">Sublinhado</MenuItem>
                    <MenuItem value="overline">Sobrelinha</MenuItem>
                    <MenuItem value="line-through">Riscado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Cor"
                  type="color"
                  value={style.color || '#000000'}
                  onChange={(e) => updateFieldStyle(selectedField, 'color', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Efeitos */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">
              <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
              Efeitos
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {/* Contorno */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={style.textStroke || false}
                      onChange={(e) => updateFieldStyle(selectedField, 'textStroke', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Contorno"
                />

                {style.textStroke && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="Cor do Contorno"
                        type="color"
                        value={style.strokeColor || '#ffffff'}
                        onChange={(e) => updateFieldStyle(selectedField, 'strokeColor', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Espessura: {style.strokeWidth || 2}px</Typography>
                      <Slider
                        value={style.strokeWidth || 2}
                        onChange={(e, value) => updateFieldStyle(selectedField, 'strokeWidth', value)}
                        min={1}
                        max={10}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                )}
              </Grid>

              {/* Sombra */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={style.textShadow || false}
                      onChange={(e) => updateFieldStyle(selectedField, 'textShadow', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Sombra"
                />

                {style.textShadow && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="Cor da Sombra"
                        type="color"
                        value={style.shadowColor || '#000000'}
                        onChange={(e) => updateFieldStyle(selectedField, 'shadowColor', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Desfoque: {style.shadowBlur || 4}px</Typography>
                      <Slider
                        value={style.shadowBlur || 4}
                        onChange={(e, value) => updateFieldStyle(selectedField, 'shadowBlur', value)}
                        min={0}
                        max={20}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Offset X: {style.shadowOffsetX || 2}px</Typography>
                      <Slider
                        value={style.shadowOffsetX || 2}
                        onChange={(e, value) => updateFieldStyle(selectedField, 'shadowOffsetX', value)}
                        min={-20}
                        max={20}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Offset Y: {style.shadowOffsetY || 2}px</Typography>
                      <Slider
                        value={style.shadowOffsetY || 2}
                        onChange={(e, value) => updateFieldStyle(selectedField, 'shadowOffsetY', value)}
                        min={-20}
                        max={20}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 2 }} />

        {/* Ações */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => copyStyleToAll(selectedField)}
              startIcon={<ContentCopy />}
              fullWidth
            >
              Aplicar a Todos
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => resetFieldStyle(selectedField)}
              color="secondary"
              fullWidth
            >
              Resetar Estilo
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default FormattingPanel;

