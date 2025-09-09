import React from 'react';
import {
  Box,
  Grid,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Typography,
} from '@mui/material';
import {
  ExpandMore,
  Palette,
  Tune,
} from '@mui/icons-material';

const rgbStringToHex = (colorString) => {
  if (!colorString || !colorString.startsWith('rgb')) return colorString;
  const rgb = colorString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!rgb) return colorString;
  const r = parseInt(rgb[1], 10);
  const g = parseInt(rgb[2], 10);
  const b = parseInt(rgb[3], 10);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

const ImageFormatting = ({
  currentElement,
  updateElementProperty,
  updateElementFilter,
  handleDeleteElement,
  isCropping,
  setIsCropping,
  expandedPanel,
  handleAccordionChange,
}) => {
  if (!currentElement) return null;

  return (
    <>
      <Accordion expanded={expandedPanel === 'imageStyle'} onChange={handleAccordionChange('imageStyle')}>
        <AccordionSummary expandIcon={<ExpandMore />}><Typography><Palette sx={{ mr: 1, verticalAlign: 'middle' }} />Estilo da Imagem</Typography></AccordionSummary>
        <AccordionDetails><Grid container spacing={2}><Grid item xs={12}><FormControlLabel control={<Switch checked={currentElement.shadow || false} onChange={(e) => updateElementProperty('shadow', e.target.checked)} />} label="Sombra" />{currentElement.shadow && (<Grid container spacing={2} sx={{ mt: 1 }}><Grid item xs={6}><TextField label="Cor" type="color" value={rgbStringToHex(currentElement.shadowColor || '#000000')} onChange={(e) => updateElementProperty('shadowColor', e.target.value)} fullWidth size="small" /></Grid><Grid item xs={6}><Typography gutterBottom>Desfoque</Typography><Slider value={currentElement.shadowBlur || 10} onChange={(e, v) => updateElementProperty('shadowBlur', v)} min={0} max={50} /></Grid><Grid item xs={6}><Typography gutterBottom>Offset X</Typography><Slider value={currentElement.shadowOffsetX || 5} onChange={(e, v) => updateElementProperty('shadowOffsetX', v)} min={-50} max={50} /></Grid><Grid item xs={6}><Typography gutterBottom>Offset Y</Typography><Slider value={currentElement.shadowOffsetY || 5} onChange={(e, v) => updateElementProperty('shadowOffsetY', v)} min={-50} max={50} /></Grid></Grid>)}</Grid><Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid><Grid item xs={6}><TextField label="Cor da Borda" type="color" value={rgbStringToHex(currentElement.borderColor || '#000000')} onChange={(e) => updateElementProperty('borderColor', e.target.value)} fullWidth size="small" /></Grid><Grid item xs={6}><Typography gutterBottom>Largura da Borda (px)</Typography><Slider value={currentElement.borderWidth || 0} onChange={(e, v) => updateElementProperty('borderWidth', v)} min={0} max={50} /></Grid><Grid item xs={12}><Typography gutterBottom>Cantos Arredondados (px)</Typography><Slider value={currentElement.borderRadius || 0} onChange={(e, v) => updateElementProperty('borderRadius', v)} min={0} max={100} /></Grid></Grid></AccordionDetails>
      </Accordion>
      <Accordion expanded={expandedPanel === 'imageFilters'} onChange={handleAccordionChange('imageFilters')}>
        <AccordionSummary expandIcon={<ExpandMore />}><Typography><Tune sx={{ mr: 1, verticalAlign: 'middle' }} />Filtros</Typography></AccordionSummary>
        <AccordionDetails><Typography gutterBottom>Brilho: {currentElement.filters?.brightness || 100}%</Typography><Slider value={currentElement.filters?.brightness || 100} onChange={(e, v) => updateElementFilter('brightness', v)} min={0} max={200} /><Typography gutterBottom>Contraste: {currentElement.filters?.contrast || 100}%</Typography><Slider value={currentElement.filters?.contrast || 100} onChange={(e, v) => updateElementFilter('contrast', v)} min={0} max={200} /><Typography gutterBottom>Saturação: {currentElement.filters?.saturate || 100}%</Typography><Slider value={currentElement.filters?.saturate || 100} onChange={(e, v) => updateElementFilter('saturate', v)} min={0} max={200} /><Typography gutterBottom>Desfoque: {currentElement.filters?.blur || 0}px</Typography><Slider value={currentElement.filters?.blur || 0} onChange={(e, v) => updateElementFilter('blur', v)} min={0} max={20} /><Typography gutterBottom>Opacidade: {currentElement.filters?.opacity || 100}%</Typography><Slider value={currentElement.filters?.opacity || 100} onChange={(e, v) => updateElementFilter('opacity', v)} min={0} max={100} /></AccordionDetails>
      </Accordion>
      <Box sx={{ mt: 2 }}><Button variant={isCropping ? "contained" : "outlined"} color="primary" onClick={() => setIsCropping(!isCropping)} fullWidth>{isCropping ? 'Salvar Corte' : 'Cortar Imagem'}</Button></Box>
      <Divider sx={{ my: 2 }} /><Button variant="outlined" color="error" size="small" onClick={handleDeleteElement} fullWidth>Excluir Elemento</Button>
    </>
  );
};

export default ImageFormatting;
