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
  Image as ImageIcon,
  Gradient,
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

import { BrandingWatermark, Edit } from '@mui/icons-material';
import BrandElementManager from './BrandElementManager';
import BackgroundColorEditor from './BackgroundColorEditor';
import ImageManager from './ImageManager';

const rgbStringToHex = (colorString) => {
  if (!colorString || !colorString.startsWith('rgb')) return colorString;
  const rgb = colorString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!rgb) return colorString;
  const r = parseInt(rgb[1], 10);
  const g = parseInt(rgb[2], 10);
  const b = parseInt(rgb[3], 10);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
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
    'Anton', 'Bebas Neue', 'Oswald', 'Impact', 'Caveat', 'Courgette', 'Dancing Script',
    'Courier New',
  ];

  const [isTextField, setIsTextField] = React.useState(false);
  const [isPageImage, setIsPageImage] = React.useState(false);
  const [isBrandElement, setIsBrandElement] = React.useState(false);
  const [isPageBackground, setIsPageBackground] = React.useState(false);
  const [currentElement, setCurrentElement] = React.useState(null);
  const [expandedPanel, setExpandedPanel] = React.useState(false);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  React.useEffect(() => {
    setIsTextField(false);
    setIsPageImage(false);
    setIsBrandElement(false);
    setIsPageBackground(false);
    setCurrentElement(null);

    if (selectedField) {
      if (selectedField === '__page_background__') {
        setIsPageBackground(true);
        setCurrentElement(pageTemplate);
      } else if (fieldPositions[selectedField]) {
        setIsTextField(true);
        setCurrentElement({
          ...fieldPositions[selectedField],
          style: fieldStyles[selectedField] || {},
        });
      } else {
        const pageImg = pageTemplate?.images?.find(img => img.id === selectedField);
        if (pageImg) {
          setIsPageImage(true);
          setCurrentElement(pageImg);
        } else {
          const brandEl = brandElements?.find(el => el.id === selectedField);
          if (brandEl) {
            setIsBrandElement(true);
            setCurrentElement(brandEl);
          }
        }
      }
    }
  }, [selectedField, fieldPositions, fieldStyles, brandElements, pageTemplate]);

  const updateFieldStyle = (property, value) => {
    if (!isTextField) return;
    setFieldStyles(prev => ({
      ...prev,
      [selectedField]: { ...(prev[selectedField] || {}), [property]: value }
    }));
  };

  const updateElementProperty = (property, value) => {
    if (isTextField) {
      setFieldPositions(prev => ({ ...prev, [selectedField]: { ...prev[selectedField], [property]: value } }));
    } else if (isPageImage) {
      setPageTemplate(prev => ({
        ...prev,
        images: prev.images.map(img => img.id === selectedField ? { ...img, [property]: value } : img)
      }));
    } else if (isBrandElement) {
      setBrandElements(prev => prev.map(el => el.id === selectedField ? { ...el, [property]: value } : el));
    }
  };

  const updateElementFilter = (filterProperty, value) => {
    if (isPageImage) {
      setPageTemplate(prev => ({
        ...prev,
        images: prev.images.map(img => img.id === selectedField ? { ...img, filters: { ...(img.filters || {}), [filterProperty]: value } } : img)
      }));
    } else if (isBrandElement) {
      setBrandElements(prev => prev.map(el => el.id === selectedField ? { ...el, filters: { ...(el.filters || {}), [filterProperty]: value } } : el));
    }
  };

  const handleDeleteElement = () => {
    if (isPageImage) {
      setPageTemplate(prev => ({ ...prev, images: prev.images.filter(img => img.id !== selectedField) }));
    } else if (isBrandElement) {
      setBrandElements(prev => prev.filter(el => el.id !== selectedField));
    }
    setSelectedField(null);
  };

  const resetFieldStyle = () => {
    if (!isTextField) return;
    let styleToApply = templateFieldStyles?.[selectedField] || initialFieldStyles?.[selectedField];
    if (styleToApply) {
      setFieldStyles(prev => ({ ...prev, [selectedField]: styleToApply }));
    }
  };

  const isImageElement = isPageImage || isBrandElement;

  return (
    <Card>
      <CardContent>
        {!currentElement ? (
          <Typography variant="h6" color="textSecondary" align="center" gutterBottom sx={{ mt: 4 }}>
            Selecione um elemento para editar
          </Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip label={selectedField} color="primary" sx={{ mr: 2 }} />
              {!isPageBackground && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentElement.visible !== false}
                      onChange={(e) => updateElementProperty('visible', e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {currentElement.visible !== false ? <Visibility /> : <VisibilityOff />}
                    </Box>
                  }
                />
              )}
            </Box>

            {isTextField && (
              <>
                <Button variant="contained" startIcon={<Edit />} onClick={() => onOpenHtmlEditor(selectedField)} fullWidth sx={{ mb: 2 }}>Editar Conteúdo</Button>
                <Accordion expanded={expandedPanel === 'fontStyle'} onChange={handleAccordionChange('fontStyle')}>
                  <AccordionSummary expandIcon={<ExpandMore />}><Typography><FormatSize sx={{ mr: 1, verticalAlign: 'middle' }} />Fonte e Estilo</Typography></AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={8}><FormControl fullWidth size="small"><InputLabel>Fonte</InputLabel><Select value={currentElement.style.fontFamily || 'Arial'} label="Fonte" onChange={(e) => updateFieldStyle('fontFamily', e.target.value)}>{fonts.map(font => (<MenuItem key={font} value={font} style={{ fontFamily: font }}>{font}</MenuItem>))}</Select></FormControl></Grid>
                      <Grid item xs={4}><TextField label="Cor" type="color" value={rgbStringToHex(currentElement.style.color || '#000000')} onChange={(e) => updateFieldStyle('color', e.target.value)} fullWidth size="small" /></Grid>
                      {standardsColors?.length > 0 && <Grid item xs={12}><Typography variant="caption">Cores da Campanha</Typography><Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>{standardsColors.map((c, i) => (<Tooltip title={c} key={i}><Box sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: '1px solid #ccc' }} onClick={() => updateFieldStyle('color', c)} /></Tooltip>))}</Box></Grid>}
                      <Grid item xs={12}><ToggleButtonGroup size="small" fullWidth><ToggleButton value="bold" selected={currentElement.style.fontWeight === 'bold'} onClick={() => updateFieldStyle('fontWeight', currentElement.style.fontWeight === 'bold' ? 'normal' : 'bold')}><FormatBold /></ToggleButton><ToggleButton value="italic" selected={currentElement.style.fontStyle === 'italic'} onClick={() => updateFieldStyle('fontStyle', currentElement.style.fontStyle === 'italic' ? 'normal' : 'italic')}><FormatItalic /></ToggleButton><ToggleButton value="underline" selected={currentElement.style.textDecoration === 'underline'} onClick={() => updateFieldStyle('textDecoration', currentElement.style.textDecoration === 'underline' ? 'none' : 'underline')}><FormatUnderlined /></ToggleButton></ToggleButtonGroup></Grid>
                      <Grid item xs={12}><Typography variant="caption" display="block" gutterBottom>Alinhamento</Typography><ToggleButtonGroup value={currentElement.style.textAlign || 'left'} exclusive onChange={(e, v) => v && updateFieldStyle('textAlign', v)} size="small" fullWidth><ToggleButton value="left"><FormatAlignLeft /></ToggleButton><ToggleButton value="center"><FormatAlignCenter /></ToggleButton><ToggleButton value="right"><FormatAlignRight /></ToggleButton></ToggleButtonGroup></Grid>
                      <Grid item xs={12}><ToggleButtonGroup value={currentElement.style.verticalAlign || 'top'} exclusive onChange={(e, v) => v && updateFieldStyle('verticalAlign', v)} size="small" fullWidth><ToggleButton value="top"><VerticalAlignTop /></ToggleButton><ToggleButton value="middle"><VerticalAlignCenter /></ToggleButton><ToggleButton value="bottom"><VerticalAlignBottom /></ToggleButton></ToggleButtonGroup></Grid>
                      <Grid item xs={12}><Typography gutterBottom>Tamanho: {currentElement.style.fontSize || 24}px</Typography><Slider value={currentElement.style.fontSize || 24} onChange={(e, v) => updateFieldStyle('fontSize', v)} min={8} max={120} /></Grid>
                      <Grid item xs={12}><Typography gutterBottom>Espaçamento Linhas: {currentElement.style.lineHeightMultiplier || 1.2}x</Typography><Slider value={currentElement.style.lineHeightMultiplier || 1.2} onChange={(e, v) => updateFieldStyle('lineHeightMultiplier', v)} min={0.8} max={3} step={0.1} /></Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
                <Accordion expanded={expandedPanel === 'boxStyle'} onChange={handleAccordionChange('boxStyle')}>
                  <AccordionSummary expandIcon={<ExpandMore />}><Typography><CheckBoxOutlineBlank sx={{ mr: 1, verticalAlign: 'middle' }} />Caixa de Texto</Typography></AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}><TextField label="Cor Fundo" type="color" value={rgbStringToHex(currentElement.style.backgroundColor || '#000000')} onChange={(e) => updateFieldStyle('backgroundColor', e.target.value)} fullWidth size="small" /></Grid>
                      <Grid item xs={6}><Typography gutterBottom>Opacidade Fundo: {Math.round((currentElement.style.backgroundOpacity ?? 1) * 100)}%</Typography><Slider value={currentElement.style.backgroundOpacity ?? 1} onChange={(e, v) => updateFieldStyle('backgroundOpacity', v)} min={0} max={1} step={0.01} /></Grid>
                      <Grid item xs={6}><TextField label="Cor Borda" type="color" value={rgbStringToHex(currentElement.style.borderColor || '#000000')} onChange={(e) => updateFieldStyle('borderColor', e.target.value)} fullWidth size="small" /></Grid>
                      <Grid item xs={6}><Typography gutterBottom>Largura Borda: {currentElement.style.borderWidth || 0}px</Typography><Slider value={currentElement.style.borderWidth || 0} onChange={(e, v) => updateFieldStyle('borderWidth', v)} min={0} max={20} /></Grid>
                      <Grid item xs={6}><Typography gutterBottom>Curva: {currentElement.style.borderRadius || 0}px</Typography><Slider value={currentElement.style.borderRadius || 0} onChange={(e, v) => updateFieldStyle('borderRadius', v)} min={0} max={50} /></Grid>
                      <Grid item xs={6}><Typography gutterBottom>Padding: {currentElement.style.padding || 0}px</Typography><Slider value={currentElement.style.padding || 0} onChange={(e, v) => updateFieldStyle('padding', v)} min={0} max={50} /></Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
                <Divider sx={{ my: 2 }} />
                <Button variant="outlined" size="small" onClick={resetFieldStyle} color="secondary" fullWidth>Resetar Estilo</Button>
              </>
            )}

            {isImageElement && (
              <>
                <Accordion expanded={expandedPanel === 'imageFilters'} onChange={handleAccordionChange('imageFilters')}>
                  <AccordionSummary expandIcon={<ExpandMore />}><Typography><Tune sx={{ mr: 1, verticalAlign: 'middle' }} />Filtros</Typography></AccordionSummary>
                  <AccordionDetails>
                    <Typography gutterBottom>Brilho: {currentElement.filters?.brightness || 100}%</Typography><Slider value={currentElement.filters?.brightness || 100} onChange={(e, v) => updateElementFilter('brightness', v)} min={0} max={200} />
                    <Typography gutterBottom>Contraste: {currentElement.filters?.contrast || 100}%</Typography><Slider value={currentElement.filters?.contrast || 100} onChange={(e, v) => updateElementFilter('contrast', v)} min={0} max={200} />
                    <Typography gutterBottom>Saturação: {currentElement.filters?.saturate || 100}%</Typography><Slider value={currentElement.filters?.saturate || 100} onChange={(e, v) => updateElementFilter('saturate', v)} min={0} max={200} />
                    <Typography gutterBottom>Desfoque: {currentElement.filters?.blur || 0}px</Typography><Slider value={currentElement.filters?.blur || 0} onChange={(e, v) => updateElementFilter('blur', v)} min={0} max={20} />
                    <Typography gutterBottom>Opacidade: {currentElement.filters?.opacity || 100}%</Typography><Slider value={currentElement.filters?.opacity || 100} onChange={(e, v) => updateElementFilter('opacity', v)} min={0} max={100} />
                  </AccordionDetails>
                </Accordion>
                <Box sx={{ mt: 2 }}><Button variant={isCropping ? "contained" : "outlined"} color="primary" onClick={() => setIsCropping(!isCropping)} fullWidth>{isCropping ? 'Salvar Corte' : 'Cortar Imagem'}</Button></Box>
                <Divider sx={{ my: 2 }} />
                <Button variant="outlined" color="error" size="small" onClick={handleDeleteElement} fullWidth>Excluir Elemento</Button>
              </>
            )}

            {isPageBackground && (
              <Accordion expanded={expandedPanel === 'backgroundColor'} onChange={handleAccordionChange('backgroundColor')}>
                <AccordionSummary expandIcon={<ExpandMore />}><Typography><Gradient sx={{ mr: 1, verticalAlign: 'middle' }} />Fundo da Página</Typography></AccordionSummary>
                <AccordionDetails>
                  <BackgroundColorEditor pageTemplate={pageTemplate} onUpdate={(val) => setPageTemplate(val)} />
                </AccordionDetails>
              </Accordion>
            )}

            {!isPageBackground && (
              <Accordion expanded={expandedPanel === 'positionSize'} onChange={handleAccordionChange('positionSize')}>
                <AccordionSummary expandIcon={<ExpandMore />}><Typography><AspectRatio sx={{ mr: 1, verticalAlign: 'middle' }} />Posição e Tamanho</Typography></AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}><TextField label="X (%)" type="number" size="small" value={currentElement.x?.toFixed(1) || '0.0'} onChange={(e) => updateElementProperty('x', parseFloat(e.target.value))} fullWidth /></Grid>
                    <Grid item xs={6}><TextField label="Y (%)" type="number" size="small" value={currentElement.y?.toFixed(1) || '0.0'} onChange={(e) => updateElementProperty('y', parseFloat(e.target.value))} fullWidth /></Grid>
                    <Grid item xs={6}><TextField label="Largura (%)" type="number" size="small" value={currentElement.width?.toFixed(1) || '20.0'} onChange={(e) => updateElementProperty('width', parseFloat(e.target.value))} fullWidth /></Grid>
                    <Grid item xs={6}><TextField label="Altura (%)" type="number" size="small" value={currentElement.height?.toFixed(1) || '10.0'} onChange={(e) => updateElementProperty('height', parseFloat(e.target.value))} fullWidth /></Grid>
                    <Grid item xs={12}><Typography gutterBottom>Rotação: {currentElement.rotation?.toFixed(0) || '0'}°</Typography><Slider value={currentElement.rotation || 0} onChange={(e, v) => updateElementProperty('rotation', v)} min={0} max={360} /></Grid>
                    <Grid item xs={12}><Typography variant="caption" display="block" gutterBottom>Ordem</Typography><ToggleButtonGroup size="small" fullWidth><Tooltip title="Enviar para Trás"><ToggleButton value="back" onClick={() => onZIndexChange(selectedField, 'back')}><FlipToBack /></ToggleButton></Tooltip><Tooltip title="Recuar"><ToggleButton value="backward" onClick={() => onZIndexChange(selectedField, 'backward')}><ArrowDownward /></ToggleButton></Tooltip><Tooltip title="Avançar"><ToggleButton value="forward" onClick={() => onZIndexChange(selectedField, 'forward')}><ArrowUpward /></ToggleButton></Tooltip><Tooltip title="Trazer para Frente"><ToggleButton value="front" onClick={() => onZIndexChange(selectedField, 'front')}><FlipToFront /></ToggleButton></Tooltip></ToggleButtonGroup></Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Accordion expanded={expandedPanel === 'pageImages'} onChange={handleAccordionChange('pageImages')}>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography><ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Imagens da Página</Typography></AccordionSummary>
          <AccordionDetails>
            <ImageManager pageTemplate={pageTemplate} setPageTemplate={setPageTemplate} setSelectedField={setSelectedField} selectedField={selectedField} />
            <Button sx={{mt: 2}} fullWidth variant="outlined" onClick={() => setSelectedField('__page_background__')}>Editar Fundo da Página</Button>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedPanel === 'brandElements'} onChange={handleAccordionChange('brandElements')}>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography><BrandingWatermark sx={{ mr: 1, verticalAlign: 'middle' }} />Elementos da Marca</Typography></AccordionSummary>
          <AccordionDetails>
            <BrandElementManager onElementSelect={(newElement) => setBrandElements(prev => [...prev, newElement])} />
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FormattingPanel;
