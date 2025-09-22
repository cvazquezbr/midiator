import React from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  FormatSize,
  CheckBoxOutlineBlank,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  VerticalAlignTop,
  VerticalAlignCenter,
  VerticalAlignBottom,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  Edit,
  BlurOn,
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup, Switch, FormControlLabel } from '@mui/material';

const rgbStringToHex = (colorString) => {
  if (!colorString || !colorString.startsWith('rgb')) return colorString;
  const rgb = colorString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!rgb) return colorString;
  const r = parseInt(rgb[1], 10);
  const g = parseInt(rgb[2], 10);
  const b = parseInt(rgb[3], 10);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

const fonts = [
    'Arial', 'Helvetica', 'Verdana', 'Inter', 'Lato', 'Montserrat', 'Noto Sans',
    'Open Sans', 'Poppins', 'Raleway', 'Roboto', 'Source Sans Pro',
    'Georgia', 'Times New Roman', 'Lora', 'Merriweather', 'Playfair Display', 'Roboto Slab',
    'Anton', 'Bebas Neue', 'Oswald', 'Impact', 'Caveat', 'Courgette', 'Dancing Script',
    'Courier New',
];

const TextFormatting = ({
  colorPalette,
  imagePalette,
  currentElement,
  updateFieldStyle,
  resetFieldStyle,
  onOpenHtmlEditor,
  expandedPanel,
  handleAccordionChange,
  selectedField,
}) => {
  if (!currentElement) return null;

  return (
    <>
      <Button variant="contained" startIcon={<Edit />} onClick={() => onOpenHtmlEditor(selectedField)} fullWidth sx={{ mb: 2 }}>Editar Conteúdo</Button>
      <Accordion expanded={expandedPanel === 'fontStyle'} onChange={handleAccordionChange('fontStyle')}>
        <AccordionSummary expandIcon={<ExpandMore />}><Typography><FormatSize sx={{ mr: 1, verticalAlign: 'middle' }} />Fonte e Estilo</Typography></AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={8}><FormControl fullWidth size="small"><InputLabel>Fonte</InputLabel><Select value={currentElement.style.fontFamily || 'Arial'} label="Fonte" onChange={(e) => updateFieldStyle('fontFamily', e.target.value)} MenuProps={{ sx: { zIndex: 1500 } }}>{fonts.map(font => (<MenuItem key={font} value={font} style={{ fontFamily: font }}>{font}</MenuItem>))}</Select></FormControl></Grid>
            <Grid item xs={4}><TextField label="Cor" type="color" value={rgbStringToHex(currentElement.style.color || '#000000')} onChange={(e) => updateFieldStyle('color', e.target.value)} fullWidth size="small" /></Grid>

            {colorPalette && colorPalette.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="caption">Paleta da Campanha</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 1 }}>
                  {colorPalette.map((color, index) => (
                    <Tooltip title={color.name || color.hex} key={index}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: color.hex,
                          border: '1px solid #ddd',
                          cursor: 'pointer',
                        }}
                        onClick={() => updateFieldStyle('color', color.hex)}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Grid>
            )}

            {imagePalette && imagePalette.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="caption">Cores da Imagem</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 1 }}>
                  {imagePalette.map((color, index) => {
                    // Safeguard against non-string values in the palette
                    if (typeof color !== 'string') {
                      return null;
                    }
                    return (
                      <Tooltip title={color} key={index}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: '1px solid #ddd',
                            cursor: 'pointer',
                          }}
                          onClick={() => updateFieldStyle('color', color)}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Grid>
            )}

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
        <AccordionDetails><Grid container spacing={2}><Grid item xs={6}><TextField label="Cor Fundo" type="color" value={rgbStringToHex(currentElement.style.backgroundColor || '#000000')} onChange={(e) => updateFieldStyle('backgroundColor', e.target.value)} fullWidth size="small" /></Grid><Grid item xs={6}><Typography gutterBottom>Opacidade Fundo: {Math.round((currentElement.style.backgroundOpacity ?? 1) * 100)}%</Typography><Slider value={currentElement.style.backgroundOpacity ?? 1} onChange={(e, v) => updateFieldStyle('backgroundOpacity', v)} min={0} max={1} step={0.01} /></Grid><Grid item xs={6}><TextField label="Cor Borda" type="color" value={rgbStringToHex(currentElement.style.borderColor || '#000000')} onChange={(e) => updateFieldStyle('borderColor', e.target.value)} fullWidth size="small" /></Grid><Grid item xs={6}><Typography gutterBottom>Largura Borda: {currentElement.style.borderWidth || 0}px</Typography><Slider value={currentElement.style.borderWidth || 0} onChange={(e, v) => updateFieldStyle('borderWidth', v)} min={0} max={20} /></Grid><Grid item xs={6}><Typography gutterBottom>Curva: {currentElement.style.borderRadius || 0}px</Typography><Slider value={currentElement.style.borderRadius || 0} onChange={(e, v) => updateFieldStyle('borderRadius', v)} min={0} max={50} /></Grid><Grid item xs={6}><Typography gutterBottom>Padding: {currentElement.style.padding || 0}px</Typography><Slider value={currentElement.style.padding || 0} onChange={(e, v) => updateFieldStyle('padding', v)} min={0} max={50} /></Grid></Grid></AccordionDetails>
      </Accordion>
      <Accordion expanded={expandedPanel === 'effects'} onChange={handleAccordionChange('effects')}>
        <AccordionSummary expandIcon={<ExpandMore />}><Typography><BlurOn sx={{ mr: 1, verticalAlign: 'middle' }} />Efeitos</Typography></AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={currentElement.style.textShadow || false} onChange={(e) => updateFieldStyle('textShadow', e.target.checked)} />} label="Sombra de Texto" />
            </Grid>
            {currentElement.style.textShadow && (
              <>
                <Grid item xs={6}><TextField label="Cor" type="color" value={rgbStringToHex(currentElement.style.shadowColor || '#000000')} onChange={(e) => updateFieldStyle('shadowColor', e.target.value)} fullWidth size="small" /></Grid>
                <Grid item xs={6}><Typography gutterBottom>Blur: {currentElement.style.shadowBlur || 4}px</Typography><Slider value={currentElement.style.shadowBlur || 4} onChange={(e, v) => updateFieldStyle('shadowBlur', v)} min={0} max={50} /></Grid>
                <Grid item xs={6}><Typography gutterBottom>Offset X: {currentElement.style.shadowOffsetX || 2}px</Typography><Slider value={currentElement.style.shadowOffsetX || 2} onChange={(e, v) => updateFieldStyle('shadowOffsetX', v)} min={-50} max={50} /></Grid>
                <Grid item xs={6}><Typography gutterBottom>Offset Y: {currentElement.style.shadowOffsetY || 2}px</Typography><Slider value={currentElement.style.shadowOffsetY || 2} onChange={(e, v) => updateFieldStyle('shadowOffsetY', v)} min={-50} max={50} /></Grid>
              </>
            )}
            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={currentElement.style.textStroke || false} onChange={(e) => updateFieldStyle('textStroke', e.target.checked)} />} label="Contorno de Texto" />
            </Grid>
            {currentElement.style.textStroke && (
                <>
                    <Grid item xs={6}><TextField label="Cor Contorno" type="color" value={rgbStringToHex(currentElement.style.strokeColor || '#ffffff')} onChange={(e) => updateFieldStyle('strokeColor', e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6}><Typography gutterBottom>Largura: {currentElement.style.strokeWidth || 2}px</Typography><Slider value={currentElement.style.strokeWidth || 2} onChange={(e, v) => updateFieldStyle('strokeWidth', v)} min={0} max={20} /></Grid>
                </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Divider sx={{ my: 2 }} /><Button variant="outlined" size="small" onClick={resetFieldStyle} color="secondary" fullWidth>Resetar Estilo</Button>
    </>
  );
};

export default TextFormatting;
