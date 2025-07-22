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
  VerticalAlignBottom,
  FormatBold,
  FormatItalic,
  FormatUnderlined
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

const FormattingPanel = ({
  selectedFields,
  fieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders
}) => {
  // Log received props
  console.log('[FormattingPanel] Received props: selectedFields =', selectedFields, 'fieldStyles =', fieldStyles);

  const getCommonValue = (property, subProperty) => {
    if (!selectedFields || selectedFields.length === 0) return '';

    const firstField = selectedFields[0];
    const sourceObject = subProperty ? (property === 'styles' ? fieldStyles[firstField] : fieldPositions[firstField]) : (property === 'styles' ? fieldStyles : fieldPositions);
    if (!sourceObject) return '';

    const firstValue = subProperty ? sourceObject[subProperty] : sourceObject[firstField];

    for (let i = 1; i < selectedFields.length; i++) {
      const field = selectedFields[i];
      const currentObject = subProperty ? (property === 'styles' ? fieldStyles[field] : fieldPositions[field]) : (property === 'styles' ? fieldStyles : fieldPositions);
      if (!currentObject) return '';
      const currentValue = subProperty ? currentObject[subProperty] : currentObject[field];
      if (currentValue !== firstValue) {
        return ''; // Retorna string vazia para indicar valores múltiplos
      }
    }
    return firstValue;
  };

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


  const updateFieldStyle = (property, value) => {
    const newStyles = {};
    selectedFields.forEach(field => {
      newStyles[field] = {
        ...(fieldStyles[field] || {}),
        [property]: value,
      };
    });
    setFieldStyles(prev => ({ ...prev, ...newStyles }));
  };

  const updateFieldPosition = (property, value) => {
    const newPositions = {};
    selectedFields.forEach(field => {
      newPositions[field] = {
        ...(fieldPositions[field] || {}),
        [property]: value,
      };
    });
    setFieldPositions(prev => ({ ...prev, ...newPositions }));
  };

  const copyStyleToAll = () => {
    if (!selectedFields || selectedFields.length === 0) return;
    const sourceField = selectedFields[0];
    const sourceStyle = fieldStyles[sourceField];
    if (!sourceStyle) return;

    const newStyles = {};
    csvHeaders.forEach(header => {
      // Aplica a todos, exceto ao campo de origem se essa for a lógica desejada
      // ou simplesmente aplica a todos os outros campos
      if (!selectedFields.includes(header)) {
         newStyles[header] = { ...sourceStyle };
      }
    });

    setFieldStyles(prev => ({
      ...prev,
      ...newStyles
    }));
  };

  const toggleFieldVisibility = () => {
    if (!selectedFields || selectedFields.length === 0) return;
    // A visibilidade é alternada para todos com base no estado do primeiro campo selecionado.
    const isVisible = fieldPositions[selectedFields[0]]?.visible !== false;
    selectedFields.forEach(field => {
      updateFieldPosition(field, 'visible', !isVisible);
    });
  };

  const resetFieldStyle = () => {
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

    const newStyles = {};
    selectedFields.forEach(field => {
      newStyles[field] = defaultStyle;
    });

    setFieldStyles(prev => ({
      ...prev,
      ...newStyles
    }));
  };

  if (!selectedFields || selectedFields.length === 0) {
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

  const style = fieldStyles[selectedFields[0]] || {};
  const position = fieldPositions[selectedFields[0]] || {};

  // Log the resolved style object for the selected field
  if (selectedFields.length > 0) {
    console.log('[FormattingPanel] Resolved style for selectedFields (' + selectedFields.join(', ') + '):', style);
  } else {
    console.log('[FormattingPanel] No selectedFields, style object is default:', style);
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Chip
            label={selectedFields.length > 1 ? `${selectedFields.length} campos selecionados` : selectedFields[0]}
            color="primary"
            sx={{ mr: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={position.visible !== false}
                onChange={toggleFieldVisibility}
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
                  value={getCommonValue('positions', 'x')?.toFixed(1) || ''}
                  onChange={(e) => updateFieldPosition('x', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Y (%)"
                  type="number"
                  size="small"
                  value={getCommonValue('positions', 'y')?.toFixed(1) || ''}
                  onChange={(e) => updateFieldPosition('y', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Largura (%)"
                  type="number"
                  size="small"
                  value={getCommonValue('positions', 'width')?.toFixed(1) || ''}
                  onChange={(e) => updateFieldPosition('width', parseFloat(e.target.value) || 20)}
                  inputProps={{ min: 5, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Altura (%)"
                  type="number"
                  size="small"
                  value={getCommonValue('positions', 'height')?.toFixed(1) || ''}
                  onChange={(e) => updateFieldPosition('height', parseFloat(e.target.value) || 10)}
                  inputProps={{ min: 3, max: 100, step: 0.1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Rotação: {getCommonValue('positions', 'rotation')?.toFixed(0) || 'Múltiplos'}°</Typography>
                <Slider
                  value={getCommonValue('positions', 'rotation') || 0}
                  onChange={(e, value) => updateFieldPosition('rotation', value)}
                  min={0}
                  max={360}
                  step={1}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 0, label: '0°' },
                    { value: 90, label: '90°' },
                    { value: 180, label: '180°' },
                    { value: 270, label: '270°' },
                    { value: 360, label: '360°' },
                  ]}
                />
              </Grid>
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  Alinhamento do Texto na Caixa
                </Typography>
                <ToggleButtonGroup
                  value={getCommonValue('styles', 'textAlign') || 'left'}
                  exclusive
                  onChange={(e, newAlignment) => {
                    if (newAlignment) updateFieldStyle('textAlign', newAlignment);
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
                    value={getCommonValue('styles', 'verticalAlign') || 'top'}
                    exclusive
                    onChange={(e, newAlignment) => {
                      if (newAlignment) updateFieldStyle('verticalAlign', newAlignment);
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

        {/* Fonte e Estilo Rápido */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">
              <FormatSize sx={{ mr: 1, verticalAlign: 'middle' }} />
              Fonte e Estilo
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Fonte</InputLabel>
                  <Select
                    value={getCommonValue('styles', 'fontFamily') || 'Arial'}
                    label="Fonte"
                    onChange={(e) => updateFieldStyle('fontFamily', e.target.value)}
                  >
                    {fonts.map(font => (
                      <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sx={{mt: 1}}>
                 <ToggleButtonGroup
                    value={[]} // Este value não é diretamente usado para controlar os botões, mas é necessário
                    aria-label="text formatting"
                    size="small"
                    fullWidth
                  >
                    <ToggleButton
                      value="bold"
                      aria-label="bold"
                      selected={getCommonValue('styles', 'fontWeight') === 'bold'}
                      onClick={() => updateFieldStyle('fontWeight', getCommonValue('styles', 'fontWeight') === 'bold' ? 'normal' : 'bold')}
                    >
                      <FormatBold />
                    </ToggleButton>
                    <ToggleButton
                      value="italic"
                      aria-label="italic"
                      selected={getCommonValue('styles', 'fontStyle') === 'italic'}
                      onClick={() => updateFieldStyle('fontStyle', getCommonValue('styles', 'fontStyle') === 'italic' ? 'normal' : 'italic')}
                    >
                      <FormatItalic />
                    </ToggleButton>
                    <ToggleButton
                      value="underline"
                      aria-label="underline"
                      selected={getCommonValue('styles', 'textDecoration') === 'underline'}
                      onClick={() => updateFieldStyle('textDecoration', getCommonValue('styles', 'textDecoration') === 'underline' ? 'none' : 'underline')}
                    >
                      <FormatUnderlined />
                    </ToggleButton>
                  </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom sx={{mt:1}}>
                  Tamanho: {getCommonValue('styles', 'fontSize') || 'Múltiplos'}px
                </Typography>
                <Slider
                  value={getCommonValue('styles', 'fontSize') || 24}
                  onChange={(e, value) => updateFieldStyle('fontSize', value)}
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

        {/* Detalhes de Estilo (Peso, Estilo, Decoração - Avançado) */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">
              <Style sx={{ mr: 1, verticalAlign: 'middle' }} />
              Ajustes Finos de Estilo
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Peso da Fonte</InputLabel>
                  <Select
                    value={getCommonValue('styles', 'fontWeight') || 'normal'}
                    label="Peso da Fonte"
                    onChange={(e) => updateFieldStyle('fontWeight', e.target.value)}
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
                  <InputLabel>Estilo da Fonte</InputLabel>
                  <Select
                    value={getCommonValue('styles', 'fontStyle') || 'normal'}
                    label="Estilo da Fonte"
                    onChange={(e) => updateFieldStyle('fontStyle', e.target.value)}
                  >
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="italic">Itálico</MenuItem>
                    <MenuItem value="oblique">Oblíquo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Decoração do Texto</InputLabel>
                  <Select
                    value={getCommonValue('styles', 'textDecoration') || 'none'}
                    label="Decoração do Texto"
                    onChange={(e) => updateFieldStyle('textDecoration', e.target.value)}
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
                  value={getCommonValue('styles', 'color') || '#000000'}
                  onChange={(e) => updateFieldStyle('color', e.target.value)}
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
                      checked={getCommonValue('styles', 'textStroke') || false}
                      onChange={(e) => updateFieldStyle('textStroke', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Contorno"
                />

                {getCommonValue('styles', 'textStroke') && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="Cor do Contorno"
                        type="color"
                        value={getCommonValue('styles', 'strokeColor') || '#ffffff'}
                        onChange={(e) => updateFieldStyle('strokeColor', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Espessura: {getCommonValue('styles', 'strokeWidth') || 2}px</Typography>
                      <Slider
                        value={getCommonValue('styles', 'strokeWidth') || 2}
                        onChange={(e, value) => updateFieldStyle('strokeWidth', value)}
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
                      checked={getCommonValue('styles', 'textShadow') || false}
                      onChange={(e) => updateFieldStyle('textShadow', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Sombra"
                />

                {getCommonValue('styles', 'textShadow') && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="Cor da Sombra"
                        type="color"
                        value={getCommonValue('styles', 'shadowColor') || '#000000'}
                        onChange={(e) => updateFieldStyle('shadowColor', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Desfoque: {getCommonValue('styles', 'shadowBlur') || 4}px</Typography>
                      <Slider
                        value={getCommonValue('styles', 'shadowBlur') || 4}
                        onChange={(e, value) => updateFieldStyle('shadowBlur', value)}
                        min={0}
                        max={20}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Offset X: {getCommonValue('styles', 'shadowOffsetX') || 2}px</Typography>
                      <Slider
                        value={getCommonValue('styles', 'shadowOffsetX') || 2}
                        onChange={(e, value) => updateFieldStyle('shadowOffsetX', value)}
                        min={-20}
                        max={20}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography gutterBottom>Offset Y: {getCommonValue('styles', 'shadowOffsetY') || 2}px</Typography>
                      <Slider
                        value={getCommonValue('styles', 'shadowOffsetY') || 2}
                        onChange={(e, value) => updateFieldStyle('shadowOffsetY', value)}
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
              onClick={copyStyleToAll}
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
              onClick={resetFieldStyle}
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

