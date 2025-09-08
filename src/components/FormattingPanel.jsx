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
  FormatLineSpacing,
  Delete
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

import { BrandingWatermark, Edit } from '@mui/icons-material';
import BrandElementManager from './BrandElementManager';
import BackgroundColorEditor from './BackgroundColorEditor';

const rgbStringToHex = (colorString) => {
  if (!colorString || !colorString.startsWith('rgb')) {
    return colorString;
  }
  const rgb = colorString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!rgb) return colorString;

  const r = parseInt(rgb[1], 10);
  const g = parseInt(rgb[2], 10);
  const b = parseInt(rgb[3], 10);

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};


const FormattingPanel = ({
  selectedField,
  setSelectedField,
  fieldStyles,
  initialFieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders,
  brandElements,
  setBrandElements,
  pageTemplate,
  setPageTemplate,
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
    'Arial', 'Helvetica', 'Verdana', 'Inter', 'Lato', 'Montserrat', 'Noto Sans',
    'Open Sans', 'Poppins', 'Raleway', 'Roboto', 'Source Sans Pro',
    'Georgia', 'Times New Roman', 'Lora', 'Merriweather', 'Playfair Display', 'Roboto Slab',
    'Anton', 'Bebas Neue', 'Oswald', 'Impact',
    'Caveat', 'Courgette', 'Dancing Script',
    'Courier New',
  ];

  const updateFieldStyle = (field, property, value) => {
    setFieldStyles(prev => ({
      ...prev,
      [field]: { ...(prev[field] || {}), [property]: value }
    }));
  };

  const updateFieldPosition = (field, property, value) => {
    setFieldPositions(prev => ({ ...prev, [field]: { ...prev[field], [property]: value } }));
  };

  const resetFieldStyle = (field) => {
    let styleToApply = null;
    if (activeStep > 3 && templateFieldStyles && Object.keys(templateFieldStyles).length > 0) {
      styleToApply = templateFieldStyles[field];
    }
    if (!styleToApply) {
      styleToApply = initialFieldStyles?.[field];
    }
    if (styleToApply) {
      setFieldStyles(prev => ({ ...prev, [field]: styleToApply }));
    }
  };

  const updateImageElement = (elementId, property, value) => {
    setPageTemplate(prev => {
      const newImages = prev.images.map(img => {
        if (img.id === elementId) {
          return { ...img, [property]: value };
        }
        return img;
      });
      return { ...prev, images: newImages };
    });
  };

  const updateImageElementFilter = (elementId, filterProperty, value) => {
    setPageTemplate(prev => {
      const newImages = prev.images.map(img => {
        if (img.id === elementId) {
          return { ...img, filters: { ...(img.filters || {}), [filterProperty]: value } };
        }
        return img;
      });
      return { ...prev, images: newImages };
    });
  };

  const [isTextField, setIsTextField] = React.useState(false);
  const [currentElement, setCurrentElement] = React.useState(null);
  const [expandedPanel, setExpandedPanel] = React.useState('pageSettings');

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  React.useEffect(() => {
    if (selectedField) {
      const imageEl = pageTemplate.images?.find(el => el.id === selectedField);
      const brandEl = brandElements?.find(el => el.id === selectedField);

      if (imageEl) {
        setCurrentElement(imageEl);
        setIsTextField(false);
      } else if (brandEl) {
        const elementWithFilters = {
          ...brandEl,
          filters: brandEl.filters || { brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 },
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
    } else {
      setCurrentElement(null);
    }
  }, [selectedField, fieldPositions, fieldStyles, brandElements, pageTemplate]);

  const handlePositionPropertyChange = (property, value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    if (isTextField) {
      updateFieldPosition(selectedField, property, numericValue);
    } else {
      const isBrandEl = brandElements.some(el => el.id === selectedField);
      if (isBrandEl) {
         setBrandElements(prev =>
          prev.map(el =>
            el.id === selectedField ? { ...el, [property]: numericValue } : el
          )
        );
      } else {
        updateImageElement(selectedField, property, numericValue);
      }
    }
  };

  const handleDeleteElement = (elementId) => {
    const isBrandEl = brandElements.some(el => el.id === elementId);
    if (isBrandEl) {
      setBrandElements(prev => prev.filter(el => el.id !== elementId));
    } else {
      setPageTemplate(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== elementId)
      }));
    }

    if (onDeselectField) {
      onDeselectField();
    }
  };

  return (
    <Card>
      <CardContent>
        <Accordion expanded={expandedPanel === 'pageSettings'} onChange={handleAccordionChange('pageSettings')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">🎨 Cor de Fundo</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <BackgroundColorEditor
              pageTemplate={pageTemplate}
              onUpdate={setPageTemplate}
            />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedPanel === 'images'} onChange={handleAccordionChange('images')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">🖼️ Imagens</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {(pageTemplate.images || []).map(image => (
              <Box key={image.id} onClick={() => setSelectedField(image.id)} sx={{ cursor: 'pointer', p: 1, mb: 1, border: selectedField === image.id ? '2px solid' : '1px solid', borderColor: selectedField === image.id ? 'primary.main' : 'divider', borderRadius: 1 }}>
                 <img src={image.src} width="100%" alt="template" />
                 <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteElement(image.id); }}>
                    <Delete />
                 </IconButton>
              </Box>
            ))}
            {(!pageTemplate.images || pageTemplate.images.length === 0) && (
                <Typography variant="body2" color="textSecondary">Nenhuma imagem adicionada.</Typography>
            )}
          </AccordionDetails>
        </Accordion>

        {currentElement ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                label={isTextField ? selectedField : 'Imagem Selecionada'}
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
                        updateImageElement(selectedField, 'visible', isVisible);
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
                          value={rgbStringToHex(currentElement.style.color || '#000000')}
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
                            <Grid item xs={6}><TextField label="Cor do Contorno" type="color" value={rgbStringToHex(currentElement.style.strokeColor || '#ffffff')} onChange={(e) => updateFieldStyle(selectedField, 'strokeColor', e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={6}><Typography gutterBottom>Espessura: {currentElement.style.strokeWidth || 2}px</Typography><Slider value={currentElement.style.strokeWidth || 2} onChange={(e, value) => updateFieldStyle(selectedField, 'strokeWidth', value)} min={1} max={10} size="small" /></Grid>
                          </Grid>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel control={<Switch checked={currentElement.style.textShadow || false} onChange={(e) => updateFieldStyle(selectedField, 'textShadow', e.target.checked)} size="small" />} label="Sombra" />
                        {currentElement.style.textShadow && (
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}><TextField label="Cor da Sombra" type="color" value={rgbStringToHex(currentElement.style.shadowColor || '#000000')} onChange={(e) => updateFieldStyle(selectedField, 'shadowColor', e.target.value)} fullWidth size="small" /></Grid>
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
                          value={rgbStringToHex(currentElement.style.backgroundColor || '#000000')}
                          onChange={(e) => updateFieldStyle(selectedField, 'backgroundColor', e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography gutterBottom>Opacidade: {Math.round((currentElement.style.backgroundOpacity ?? 1) * 100)}%</Typography>
                        <Slider
                          value={currentElement.style.backgroundOpacity ?? 1}
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
                          value={rgbStringToHex(currentElement.style.borderColor || '#000000')}
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
              <>
                <Accordion expanded={expandedPanel === 'imageFilters'} onChange={handleAccordionChange('imageFilters')}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">🖼️ Filtros</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography gutterBottom>Brilho: {currentElement.filters?.brightness ?? 100}%</Typography>
                    <Slider value={currentElement.filters?.brightness ?? 100} onChange={(e, v) => updateImageElementFilter(selectedField, 'brightness', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Contraste: {currentElement.filters?.contrast ?? 100}%</Typography>
                    <Slider value={currentElement.filters?.contrast ?? 100} onChange={(e, v) => updateImageElementFilter(selectedField, 'contrast', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Saturação: {currentElement.filters?.saturate ?? 100}%</Typography>
                    <Slider value={currentElement.filters?.saturate ?? 100} onChange={(e, v) => updateImageElementFilter(selectedField, 'saturate', v)} min={0} max={200} step={1} />
                    <Typography gutterBottom>Desfoque: {currentElement.filters?.blur ?? 0}px</Typography>
                    <Slider value={currentElement.filters?.blur ?? 0} onChange={(e, v) => updateImageElementFilter(selectedField, 'blur', v)} min={0} max={20} step={1} />
                    <Typography gutterBottom>Opacidade: {currentElement.filters?.opacity ?? 100}%</Typography>
                    <Slider value={currentElement.filters?.opacity ?? 100} onChange={(e, v) => updateImageElementFilter(selectedField, 'opacity', v)} min={0} max={100} step={1} />
                  </AccordionDetails>
                </Accordion>

                <Accordion expanded={expandedPanel === 'imageShadow'} onChange={handleAccordionChange('imageShadow')}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">🎨 Sombra</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormControlLabel
                      control={<Switch checked={currentElement.shadow || false} onChange={(e) => updateImageElement(selectedField, 'shadow', e.target.checked)} size="small" />}
                      label="Sombra na Imagem"
                    />
                    {currentElement.shadow && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}><TextField label="Cor" type="color" value={rgbStringToHex(currentElement.shadowColor || '#000000')} onChange={(e) => updateImageElement(selectedField, 'shadowColor', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Desfoque</Typography><Slider value={currentElement.shadowBlur || 4} onChange={(e, v) => updateImageElement(selectedField, 'shadowBlur', v)} min={0} max={50} size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Offset X</Typography><Slider value={currentElement.shadowOffsetX || 2} onChange={(e, v) => updateImageElement(selectedField, 'shadowOffsetX', v)} min={-50} max={50} size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Offset Y</Typography><Slider value={currentElement.shadowOffsetY || 2} onChange={(e, v) => updateImageElement(selectedField, 'shadowOffsetY', v)} min={-50} max={50} size="small" /></Grid>
                      </Grid>
                    )}
                  </AccordionDetails>
                </Accordion>

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
            Selecione uma imagem ou campo de texto para editar.
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Accordion expanded={expandedPanel === 'brandElements'} onChange={handleAccordionChange('brandElements')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">
              <BrandingWatermark sx={{ mr: 1 }} /> Elementos da Marca
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <BrandElementManager
              onElementSelect={(newElement) => {
                setBrandElements(prev => [...prev, newElement]);
              }}
            />
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FormattingPanel;
