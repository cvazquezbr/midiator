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
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore,
  FormatSize,
  Palette,
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
  FormatUnderlined,
  FlipToFront,
  FlipToBack,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

import { BrandingWatermark } from '@mui/icons-material';
import BrandElementManager from './BrandElementManager';

const FormattingPanel = ({
  selectedField,
  fieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders,
  imageFilters,
  setImageFilters,
  brandElements,
  setBrandElements,
  onZIndexChange,
  onDeselectField,
}) => {
  const fonts = [
    // Sans-serif
    'Arial', 'Helvetica', 'Verdana', 'Inter', 'Lato', 'Montserrat', 'Noto Sans',
    'Open Sans', 'Poppins', 'Raleway', 'Roboto', 'Source Sans Pro',
    // Serif
    'Georgia', 'Times New Roman', 'Lora', 'Merriweather', 'Playfair Display', 'Roboto Slab',
    // Display
    'Anton', 'Bebas Neue', 'Oswald', 'Impact',
    // Handwriting
    'Caveat', 'Courgette', 'Dancing Script',
    // Monospace
    'Courier New',
  ];

  const updateFieldStyle = (field, property, value) => {
    setFieldStyles(prev => ({ ...prev, [field]: { ...prev[field], [property]: value } }));
  };

  const updateFieldPosition = (field, property, value) => {
    setFieldPositions(prev => ({ ...prev, [field]: { ...prev[field], [property]: value } }));
  };

  const copyStyleToAll = (sourceField) => {
    const sourceStyle = fieldStyles[sourceField];
    if (!sourceStyle) return;
    const newStyles = {};
    csvHeaders.forEach(header => {
      if (header !== sourceField) { newStyles[header] = { ...sourceStyle }; }
    });
    setFieldStyles(prev => ({ ...prev, ...newStyles }));
  };

  const resetFieldStyle = (field) => {
    const defaultStyle = {
      fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none',
      color: '#000000', textStroke: false, strokeColor: '#ffffff', strokeWidth: 2, textShadow: false,
      shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
      textAlign: 'left', verticalAlign: 'top'
    };
    setFieldStyles(prev => ({ ...prev, [field]: defaultStyle }));
  };

  const updateBrandElementFilter = (elementId, filterProperty, value) => {
    setBrandElements(prev =>
      prev.map(el =>
        el.id === elementId
          ? { ...el, filters: { ...el.filters, [filterProperty]: value } }
          : el
      )
    );
  };

  const [isTextField, setIsTextField] = React.useState(false);
  const [currentElement, setCurrentElement] = React.useState(null);

  React.useEffect(() => {
    if (selectedField) {
      const brandEl = brandElements?.find(el => el.id === selectedField);
      if (brandEl) {
        setCurrentElement(brandEl);
        setIsTextField(false);
      } else if (fieldPositions[selectedField]) {
        setCurrentElement({
          ...fieldPositions[selectedField],
          style: fieldStyles[selectedField] || {},
        });
        setIsTextField(true);
      } else {
        setCurrentElement(null);
      }
    } else {
      setCurrentElement(null);
    }
  }, [selectedField, fieldPositions, fieldStyles, brandElements]);

  const handlePositionPropertyChange = (property, value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    if (isTextField) {
      updateFieldPosition(selectedField, property, numericValue);
    } else {
      setBrandElements(prev =>
        prev.map(el =>
          el.id === selectedField ? { ...el, [property]: numericValue } : el
        )
      );
    }
  };

  const handleDeleteBrandElement = (elementId) => {
    setBrandElements(prev => prev.filter(el => el.id !== elementId));
    // Also deselect the element
    setCurrentElement(null);
    if (onDeselectField) {
      onDeselectField();
    }
  };

  return (
    <Card>
      <CardContent>
        {currentElement ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                label={selectedField}
                color="primary"
                sx={{ mr: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={currentElement.visible !== false}
                    onChange={(e) => {
                      const isVisible = e.target.checked;
                      if (isTextField) {
                        updateFieldPosition(selectedField, 'visible', isVisible);
                      } else {
                        // For brand elements, hiding means deleting.
                        if (!isVisible) {
                          handleDeleteBrandElement(selectedField);
                        }
                      }
                    }}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {currentElement.visible !== false ? <Visibility /> : <VisibilityOff />}
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {currentElement.visible !== false ? 'Visível' : 'Oculto'}
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
                      value={currentElement.x?.toFixed(1) || '0.0'}
                      onChange={(e) => handlePositionPropertyChange('x', e.target.value)}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Y (%)"
                      type="number"
                      size="small"
                      value={currentElement.y?.toFixed(1) || '0.0'}
                      onChange={(e) => handlePositionPropertyChange('y', e.target.value)}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Largura (%)"
                      type="number"
                      size="small"
                      value={currentElement.width?.toFixed(1) || '20.0'}
                      onChange={(e) => handlePositionPropertyChange('width', e.target.value)}
                      inputProps={{ min: 5, max: 100, step: 0.1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Altura (%)"
                      type="number"
                      size="small"
                      value={currentElement.height?.toFixed(1) || '10.0'}
                      onChange={(e) => handlePositionPropertyChange('height', e.target.value)}
                      inputProps={{ min: 3, max: 100, step: 0.1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography gutterBottom>Rotação: {currentElement.rotation?.toFixed(0) || '0'}°</Typography>
                    <Slider
                      value={currentElement.rotation || 0}
                      onChange={(e, value) => handlePositionPropertyChange('rotation', value)}
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
                  <Grid item xs={12}>
                    <Typography variant="caption" display="block" gutterBottom>Ordem das Camadas</Typography>
                    <ToggleButtonGroup size="small" fullWidth aria-label="layer order controls">
                      <Tooltip title="Enviar para o Fundo">
                        <ToggleButton value="back" onClick={() => onZIndexChange(selectedField, 'back')}>
                          <FlipToBack />
                        </ToggleButton>
                      </Tooltip>
                      <Tooltip title="Recuar">
                        <ToggleButton value="backward" onClick={() => onZIndexChange(selectedField, 'backward')}>
                          <ArrowDownward />
                        </ToggleButton>
                      </Tooltip>
                      <Tooltip title="Avançar">
                        <ToggleButton value="forward" onClick={() => onZIndexChange(selectedField, 'forward')}>
                          <ArrowUpward />
                        </ToggleButton>
                      </Tooltip>
                      <Tooltip title="Trazer para Frente">
                        <ToggleButton value="front" onClick={() => onZIndexChange(selectedField, 'front')}>
                          <FlipToFront />
                        </ToggleButton>
                      </Tooltip>
                    </ToggleButtonGroup>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {isTextField ? (
              <>
                {/* Fonte e Estilo */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">
                      <FormatSize sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Fonte e Estilo
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={8}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Fonte</InputLabel>
                          <Select
                            value={currentElement.style.fontFamily || 'Arial'}
                            label="Fonte"
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
                      <Grid item xs={4}>
                        <TextField
                          label="Cor"
                          type="color"
                          value={currentElement.style.color || '#000000'}
                          onChange={(e) => updateFieldStyle(selectedField, 'color', e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <ToggleButtonGroup
                          value={[]}
                          aria-label="text formatting"
                          size="small"
                          fullWidth
                        >
                          <ToggleButton
                            value="bold"
                            aria-label="bold"
                            selected={currentElement.style.fontWeight === 'bold'}
                            onClick={() => updateFieldStyle(selectedField, 'fontWeight', currentElement.style.fontWeight === 'bold' ? 'normal' : 'bold')}
                          >
                            <FormatBold />
                          </ToggleButton>
                          <ToggleButton
                            value="italic"
                            aria-label="italic"
                            selected={currentElement.style.fontStyle === 'italic'}
                            onClick={() => updateFieldStyle(selectedField, 'fontStyle', currentElement.style.fontStyle === 'italic' ? 'normal' : 'italic')}
                          >
                            <FormatItalic />
                          </ToggleButton>
                          <ToggleButton
                            value="underline"
                            aria-label="underline"
                            selected={currentElement.style.textDecoration === 'underline'}
                            onClick={() => updateFieldStyle(selectedField, 'textDecoration', currentElement.style.textDecoration === 'underline' ? 'none' : 'underline')}
                          >
                            <FormatUnderlined />
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography gutterBottom sx={{ mt: 1 }}>
                          Tamanho: {currentElement.style.fontSize || 24}px
                        </Typography>
                        <Slider
                          value={currentElement.style.fontSize || 24}
                          onChange={(e, value) => updateFieldStyle(selectedField, 'fontSize', value)}
                          min={8}
                          max={120}
                          valueLabelDisplay="auto"
                          marks={[{ value: 12, label: '12' }, { value: 24, label: '24' }, { value: 48, label: '48' }, { value: 72, label: '72' }]}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography gutterBottom sx={{ mt: 1 }}>
                          Espaçamento entre Linhas: {currentElement.style.lineHeightMultiplier || 1.2}x
                        </Typography>
                        <Slider
                          value={currentElement.style.lineHeightMultiplier || 1.2}
                          onChange={(e, value) => updateFieldStyle(selectedField, 'lineHeightMultiplier', value)}
                          min={0.8}
                          max={3}
                          step={0.1}
                          valueLabelDisplay="auto"
                          marks={[{ value: 1, label: '1x' }, { value: 1.5, label: '1.5x' }, { value: 2, label: '2x' }]}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" display="block" gutterBottom>Alinhamento do Texto na Caixa</Typography>
                        <ToggleButtonGroup
                          value={currentElement.style.textAlign || 'left'}
                          exclusive
                          onChange={(e, newAlignment) => { if (newAlignment) updateFieldStyle(selectedField, 'textAlign', newAlignment); }}
                          aria-label="text alignment"
                          size="small"
                          fullWidth
                        >
                          <ToggleButton value="left" aria-label="left aligned"><FormatAlignLeft /></ToggleButton>
                          <ToggleButton value="center" aria-label="centered"><FormatAlignCenter /></ToggleButton>
                          <ToggleButton value="right" aria-label="right aligned"><FormatAlignRight /></ToggleButton>
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid item xs={12}>
                        <ToggleButtonGroup
                          value={currentElement.style.verticalAlign || 'top'}
                          exclusive
                          onChange={(e, newAlignment) => { if (newAlignment) updateFieldStyle(selectedField, 'verticalAlign', newAlignment); }}
                          aria-label="vertical alignment"
                          size="small"
                          fullWidth
                        >
                          <ToggleButton value="top" aria-label="top aligned"><VerticalAlignTop /></ToggleButton>
                          <ToggleButton value="middle" aria-label="middle aligned"><VerticalAlignCenter /></ToggleButton>
                          <ToggleButton value="bottom" aria-label="bottom aligned"><VerticalAlignBottom /></ToggleButton>
                        </ToggleButtonGroup>
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
                      <Grid item xs={12}>
                        <FormControlLabel control={<Switch checked={currentElement.style.textStroke || false} onChange={(e) => updateFieldStyle(selectedField, 'textStroke', e.target.checked)} size="small" />} label="Contorno" />
                        {currentElement.style.textStroke && (
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}><TextField label="Cor do Contorno" type="color" value={currentElement.style.strokeColor || '#ffffff'} onChange={(e) => updateFieldStyle(selectedField, 'strokeColor', e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={6}><Typography gutterBottom>Espessura: {currentElement.style.strokeWidth || 2}px</Typography><Slider value={currentElement.style.strokeWidth || 2} onChange={(e, value) => updateFieldStyle(selectedField, 'strokeWidth', value)} min={1} max={10} size="small" /></Grid>
                          </Grid>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel control={<Switch checked={currentElement.style.textShadow || false} onChange={(e) => updateFieldStyle(selectedField, 'textShadow', e.target.checked)} size="small" />} label="Sombra" />
                        {currentElement.style.textShadow && (
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}><TextField label="Cor da Sombra" type="color" value={currentElement.style.shadowColor || '#000000'} onChange={(e) => updateFieldStyle(selectedField, 'shadowColor', e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={6}><Typography gutterBottom>Desfoque: {currentElement.style.shadowBlur || 4}px</Typography><Slider value={currentElement.style.shadowBlur || 4} onChange={(e, value) => updateFieldStyle(selectedField, 'shadowBlur', value)} min={0} max={20} size="small" /></Grid>
                            <Grid item xs={6}><Typography gutterBottom>Offset X: {currentElement.style.shadowOffsetX || 2}px</Typography><Slider value={currentElement.style.shadowOffsetX || 2} onChange={(e, value) => updateFieldStyle(selectedField, 'shadowOffsetX', value)} min={-20} max={20} size="small" /></Grid>
                            <Grid item xs={6}><Typography gutterBottom>Offset Y: {currentElement.style.shadowOffsetY || 2}px</Typography><Slider value={currentElement.style.shadowOffsetY || 2} onChange={(e, value) => updateFieldStyle(selectedField, 'shadowOffsetY', value)} min={-20} max={20} size="small" /></Grid>
                          </Grid>
                        )}
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><Button variant="outlined" size="small" onClick={() => copyStyleToAll(selectedField)} startIcon={<ContentCopy />} fullWidth>Aplicar a Todos</Button></Grid>
                  <Grid item xs={12} sm={6}><Button variant="outlined" size="small" onClick={() => resetFieldStyle(selectedField)} color="secondary" fullWidth>Resetar Estilo</Button></Grid>
                </Grid>
              </>
            ) : (
              <Accordion sx={{ mt: 2 }} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1">🖼️ Filtros do Elemento</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ p: 1 }}>
                    <Typography gutterBottom>Brilho: {currentElement.filters.brightness}%</Typography>
                    <Slider value={currentElement.filters.brightness} onChange={(e, v) => updateBrandElementFilter(selectedField, 'brightness', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Contraste: {currentElement.filters.contrast}%</Typography>
                    <Slider value={currentElement.filters.contrast} onChange={(e, v) => updateBrandElementFilter(selectedField, 'contrast', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Saturação: {currentElement.filters.saturate}%</Typography>
                    <Slider value={currentElement.filters.saturate} onChange={(e, v) => updateBrandElementFilter(selectedField, 'saturate', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Desfoque: {currentElement.filters.blur}px</Typography>
                    <Slider value={currentElement.filters.blur} onChange={(e, v) => updateBrandElementFilter(selectedField, 'blur', v)} min={0} max={20} step={1} />
                    <Typography gutterBottom>Opacidade: {currentElement.filters.opacity}%</Typography>
                    <Slider value={currentElement.filters.opacity} onChange={(e, v) => updateBrandElementFilter(selectedField, 'opacity', v)} min={0} max={100} step={1} />
                  </Box>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleDeleteBrandElement(selectedField)}
                    sx={{ mt: 2 }}
                    fullWidth
                  >
                    Excluir Elemento
                  </Button>
                </AccordionDetails>
              </Accordion>
            )}
          </>
        ) : (
          <Typography variant="h6" color="textSecondary" align="center" gutterBottom sx={{ mt: 4 }}>
            Selecione um campo de texto para editar suas propriedades
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Filtros de Imagem de Fundo */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">🎨 Filtros de Imagem de Fundo</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ p: 1 }}>
              <Typography gutterBottom>Brilho: {imageFilters.brightness}%</Typography>
              <Slider value={imageFilters.brightness} onChange={(e, v) => setImageFilters(f => ({ ...f, brightness: v }))} min={0} max={200} step={1} />
              <Typography gutterBottom>Contraste: {imageFilters.contrast}%</Typography>
              <Slider value={imageFilters.contrast} onChange={(e, v) => setImageFilters(f => ({ ...f, contrast: v }))} min={0} max={200} step={1} />
              <Typography gutterBottom>Saturação: {imageFilters.saturate}%</Typography>
              <Slider value={imageFilters.saturate} onChange={(e, v) => setImageFilters(f => ({ ...f, saturate: v }))} min={0} max={200} step={1} />
              <Typography gutterBottom>Desfoque: {imageFilters.blur}px</Typography>
              <Slider value={imageFilters.blur} onChange={(e, v) => setImageFilters(f => ({ ...f, blur: v }))} min={0} max={20} step={1} />
              <Typography gutterBottom>Opacidade: {imageFilters.opacity}%</Typography>
              <Slider value={imageFilters.opacity} onChange={(e, v) => setImageFilters(f => ({ ...f, opacity: v }))} min={0} max={100} step={1} />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Brand Elements */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
              <BrandingWatermark sx={{ mr: 1 }} /> Elementos da Marca
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
              <BrandElementManager
                onElementSelect={(newElement) => {
                  setBrandElements(prev => [...prev, newElement]);
                }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FormattingPanel;
