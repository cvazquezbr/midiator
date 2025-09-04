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
  ArrowDownward,
  AspectRatio,
  Tune,
  CheckBoxOutlineBlank,
  FormatLineSpacing
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

import { BrandingWatermark, Edit } from '@mui/icons-material';
import BrandElementManager from './BrandElementManager';

const FormattingPanel = ({
  selectedField,
  fieldStyles,
  initialFieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders,
  brandElements,
  setBrandElements,
  backgroundElement,
  setBackgroundElement,
  onZIndexChange,
  onDeselectField,
  onOpenHtmlEditor,
  standardsColors,
  templateFieldStyles,
  activeStep,
  isCropping,
  setIsCropping,
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
    console.log(`[FormattingPanel] updating style for ${field}: ${property} = ${value}`);
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
    let styleToApply = null;

    // Se estamos em um passo posterior à formatação (step 3), usamos o template salvo.
    if (activeStep > 3 && templateFieldStyles && Object.keys(templateFieldStyles).length > 0) {
      styleToApply = templateFieldStyles[field];
      if (!styleToApply) {
        console.warn(`[FormattingPanel] Estilo de template para o campo "${field}" não encontrado. Usando fallback para estilo inicial.`);
      }
    }

    // Se não aplicamos o estilo do template (ou se falhou), usamos o estilo inicial.
    // Isso cobre o caso de estarmos no passo 3, ou o fallback do passo > 3.
    if (!styleToApply) {
      styleToApply = initialFieldStyles?.[field];
    }

    if (styleToApply) {
      setFieldStyles(prev => ({ ...prev, [field]: styleToApply }));
    } else {
      // Se nenhum estilo foi encontrado, loga um erro.
      console.error(`[FormattingPanel] Nenhum estilo (inicial ou de template) encontrado para o campo "${field}". O reset não pode ser executado.`);
    }
  };

  const updateBrandElementFilter = (elementId, filterProperty, value) => {
    if (elementId === '__background__') {
      setBackgroundElement(prev => ({
        ...prev,
        filters: { ...prev.filters, [filterProperty]: value },
      }));
    } else {
      setBrandElements(prev =>
        prev.map(el =>
          el.id === elementId
            ? { ...el, filters: { ...el.filters, [filterProperty]: value } }
            : el
        )
      );
    }
  };

  const updateBackgroundElement = (property, value) => {
    setBackgroundElement(prev => ({ ...prev, [property]: value }));
  };

  const updateBackgroundFilter = (filter, value) => {
    setBackgroundElement(prev => ({
      ...prev,
      filters: { ...prev.filters, [filter]: value },
    }));
  };

  const [isTextField, setIsTextField] = React.useState(false);
  const [currentElement, setCurrentElement] = React.useState(null);
  const [expandedPanel, setExpandedPanel] = React.useState(false);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  React.useEffect(() => {
    // Handles selection of any element, including the background
    if (selectedField) {
      if (selectedField === '__background__') {
        setCurrentElement(backgroundElement);
        setIsTextField(false);
      } else {
        const brandEl = brandElements?.find(el => el.id === selectedField);
        if (brandEl) {
          // Defensively add filters if they are missing
          const elementWithFilters = {
            ...brandEl,
            filters: brandEl.filters || {
              brightness: 100,
              contrast: 100,
              saturate: 100,
              blur: 0,
              opacity: 100,
            },
          };
          setCurrentElement(elementWithFilters);
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
      }
    } else {
      setCurrentElement(null);
    }
  }, [selectedField, fieldPositions, fieldStyles, brandElements, backgroundElement]);

  const handlePositionPropertyChange = (property, value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    if (selectedField === '__background__') {
      setBackgroundElement(prev => ({ ...prev, [property]: numericValue }));
    } else if (isTextField) {
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

            {isTextField ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => onOpenHtmlEditor(selectedField)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Editar Conteúdo
                </Button>

                {/* Fonte e Estilo */}
                <Accordion expanded={expandedPanel === 'fontStyle'} onChange={handleAccordionChange('fontStyle')}>
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
                      {standardsColors && standardsColors.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="caption">Cores da Campanha</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            {standardsColors.map((color, index) => (
                              <Tooltip title={color} key={index}>
                                <Box
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    backgroundColor: color,
                                    cursor: 'pointer',
                                    border: '1px solid #ccc',
                                  }}
                                  onClick={() => updateFieldStyle(selectedField, 'color', color)}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </Grid>
                      )}
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
                        <ToggleButtonGroup
                          value={currentElement.style.lineHeightMultiplier}
                          exclusive
                          onChange={(e, value) => {
                            if (value !== null) {
                              updateFieldStyle(selectedField, 'lineHeightMultiplier', value);
                            }
                          }}
                          aria-label="line spacing presets"
                          size="small"
                          fullWidth
                          sx={{ mt: 1 }}
                        >
                          <ToggleButton value={1.0} aria-label="single spacing">
                            <Tooltip title="Simples">
                              <FormatLineSpacing />
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value={1.5} aria-label="1.5 spacing">
                            <Tooltip title="Médio">
                              <FormatLineSpacing sx={{ transform: 'scaleY(1.2)' }}/>
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value={2.0} aria-label="double spacing">
                            <Tooltip title="Duplo">
                              <FormatLineSpacing sx={{ transform: 'scaleY(1.4)' }}/>
                            </Tooltip>
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                {/* Efeitos */}
                <Accordion expanded={expandedPanel === 'effects'} onChange={handleAccordionChange('effects')}>
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

                {/* Caixa de Texto */}
                <Accordion expanded={expandedPanel === 'boxStyle'} onChange={handleAccordionChange('boxStyle')}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckBoxOutlineBlank sx={{ mr: 1 }} /> Caixa de Texto
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {/* Cor de Fundo e Opacidade */}
                      <Grid item xs={6}>
                        <TextField
                          label="Cor de Fundo"
                          type="color"
                          value={currentElement.style.backgroundColor || '#000000'}
                          onChange={(e) => updateFieldStyle(selectedField, 'backgroundColor', e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography gutterBottom>Opacidade: {Math.round((currentElement.style.backgroundOpacity || 1) * 100)}%</Typography>
                        <Slider
                          value={currentElement.style.backgroundOpacity || 1}
                          onChange={(e, value) => updateFieldStyle(selectedField, 'backgroundOpacity', value)}
                          min={0}
                          max={1}
                          step={0.01}
                          size="small"
                        />
                      </Grid>

                      {/* Cor da Borda e Espessura */}
                      <Grid item xs={6}>
                        <TextField
                          label="Cor da Borda"
                          type="color"
                          value={currentElement.style.borderColor || '#000000'}
                          onChange={(e) => updateFieldStyle(selectedField, 'borderColor', e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography gutterBottom>Espessura: {currentElement.style.borderWidth || 0}px</Typography>
                        <Slider
                          value={currentElement.style.borderWidth || 0}
                          onChange={(e, value) => updateFieldStyle(selectedField, 'borderWidth', value)}
                          min={0}
                          max={20}
                          size="small"
                        />
                      </Grid>

                      {/* Curva e Padding */}
                      <Grid item xs={6}>
                        <Typography gutterBottom>Curva: {currentElement.style.borderRadius || 0}px</Typography>
                        <Slider
                          value={currentElement.style.borderRadius || 0}
                          onChange={(e, value) => updateFieldStyle(selectedField, 'borderRadius', value)}
                          min={0}
                          max={50}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography gutterBottom>Padding: {currentElement.style.padding || 0}px</Typography>
                        <Slider
                          value={currentElement.style.padding || 0}
                          onChange={(e, value) => updateFieldStyle(selectedField, 'padding', value)}
                          min={0}
                          max={50}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}><Button variant="outlined" size="small" onClick={() => resetFieldStyle(selectedField)} color="secondary" fullWidth>Resetar Estilo</Button></Grid>
                </Grid>
              </>
            ) : (
              <Box>
                {/* Brand Element specific controls will go here, if any, in the future */}
                {selectedField !== '__background__' && (
                  <Button variant="outlined" color="error" size="small" onClick={() => handleDeleteBrandElement(selectedField)} sx={{ mt: 2 }} fullWidth>
                    Excluir Elemento
                  </Button>
                )}
              </Box>
            )}

            {/* Background Specific Controls */}
            {selectedField === '__background__' && currentElement && (
              <>
                {/* Filtros do Fundo */}
                <Accordion expanded={expandedPanel === 'backgroundFilters'} onChange={handleAccordionChange('backgroundFilters')}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">🖼️ Filtros</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography gutterBottom>Brilho: {currentElement.filters.brightness}%</Typography>
                    <Slider value={currentElement.filters.brightness} onChange={(e, v) => updateBackgroundFilter('brightness', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Contraste: {currentElement.filters.contrast}%</Typography>
                    <Slider value={currentElement.filters.contrast} onChange={(e, v) => updateBackgroundFilter('contrast', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Saturação: {currentElement.filters.saturate}%</Typography>
                    <Slider value={currentElement.filters.saturate} onChange={(e, v) => updateBackgroundFilter('saturate', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Desfoque: {currentElement.filters.blur}px</Typography>
                    <Slider value={currentElement.filters.blur} onChange={(e, v) => updateBackgroundFilter('blur', v)} min={0} max={20} step={1} />
                    <Typography gutterBottom>Opacidade: {currentElement.filters.opacity}%</Typography>
                    <Slider value={currentElement.filters.opacity} onChange={(e, v) => updateBackgroundFilter('opacity', v)} min={0} max={100} step={1} />
                  </AccordionDetails>
                </Accordion>

                {/* Sombra do Fundo */}
                <Accordion expanded={expandedPanel === 'backgroundShadow'} onChange={handleAccordionChange('backgroundShadow')}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">🎨 Sombra</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormControlLabel
                      control={<Switch checked={currentElement.shadow || false} onChange={(e) => updateBackgroundElement('shadow', e.target.checked)} size="small" />}
                      label="Sombra"
                    />
                    {currentElement.shadow && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}><TextField label="Cor" type="color" value={currentElement.shadowColor || '#000000'} onChange={(e) => updateBackgroundElement('shadowColor', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Desfoque: {currentElement.shadowBlur || 4}px</Typography><Slider value={currentElement.shadowBlur || 4} onChange={(e, v) => updateBackgroundElement('shadowBlur', v)} min={0} max={50} size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Offset X: {currentElement.shadowOffsetX || 2}px</Typography><Slider value={currentElement.shadowOffsetX || 2} onChange={(e, v) => updateBackgroundElement('shadowOffsetX', v)} min={-50} max={50} size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Offset Y: {currentElement.shadowOffsetY || 2}px</Typography><Slider value={currentElement.shadowOffsetY || 2} onChange={(e, v) => updateBackgroundElement('shadowOffsetY', v)} min={-50} max={50} size="small" /></Grid>
                      </Grid>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* Cortar Imagem */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant={isCropping ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => setIsCropping(!isCropping)}
                    fullWidth
                  >
                    {isCropping ? 'Salvar Corte' : 'Cortar Imagem'}
                  </Button>
                </Box>
              </>
            )}

            {/* Common Controls for all elements */}
            <Accordion expanded={expandedPanel === 'positionSize'} onChange={handleAccordionChange('positionSize')}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                  <AspectRatio sx={{ mr: 1 }} /> Posição e Tamanho
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
                      inputProps={{
                        min: isTextField ? 0 : -100,
                        max: 100,
                        step: 0.1
                      }}
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
                      inputProps={{
                        min: isTextField ? 0 : -100,
                        max: 100,
                        step: 0.1
                      }}
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
                      inputProps={{
                        min: 5,
                        max: isTextField ? 100 : 200,
                        step: 0.1
                      }}
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
                      inputProps={{
                        min: 3,
                        max: isTextField ? 100 : 200,
                        step: 0.1
                      }}
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
                  {selectedField !== '__background__' && (
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
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </>
        ) : (
          <Typography variant="h6" color="textSecondary" align="center" gutterBottom sx={{ mt: 4 }}>
            Selecione um elemento para editar suas propriedades
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Brand Elements */}
        <Accordion expanded={expandedPanel === 'brandElements'} onChange={handleAccordionChange('brandElements')}>
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
