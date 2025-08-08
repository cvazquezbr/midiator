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
  selectedField,
  fieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders,
  imageFilters,
  setImageFilters,
  showLogo,
  setShowLogo,
  showEmpresa,
  setShowEmpresa,
}) => {
  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Impact', 'Comic Sans MS',
    'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Inter', 'Source Sans Pro', 'Anton',
    'Bebas Neue', 'Caveat', 'Courgette', 'Dancing Script', 'Lora', 'Merriweather', 'Playfair Display', 'Raleway'
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

  const toggleFieldVisibility = (field) => {
    updateFieldPosition(field, 'visible', !fieldPositions[field]?.visible);
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

  const style = selectedField ? fieldStyles[selectedField] || {} : {};
  const position = selectedField ? fieldPositions[selectedField] || {} : {};

  return (
    <Card>
      <CardContent>
        {/* REQ 1.2: Filtros da Imagem de Fundo no topo */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">🎨 Filtros da Imagem de Fundo</Typography>
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

        {/* REQ 4.1: Novas Opções de Controle */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <FormControlLabel
                control={<Switch checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />}
                label="Incluir Logo"
            />
            <FormControlLabel
                control={<Switch checked={showEmpresa} onChange={(e) => setShowEmpresa(e.target.checked)} />}
                label="Incluir Empresa"
            />
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Controles do Campo de Texto (Visível apenas se um campo for selecionado) */}
        {selectedField ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
              <Chip label={selectedField} color="primary" />
              <FormControlLabel
                control={<Switch checked={position.visible !== false} onChange={() => toggleFieldVisibility(selectedField)} size="small" />}
                labelPlacement="start"
                label={
                  <Tooltip title={position.visible !== false ? 'Ocultar Campo' : 'Mostrar Campo'}>
                    {position.visible !== false ? <Visibility /> : <VisibilityOff />}
                  </Tooltip>
                }
              />
            </Box>

            {/* REQ 1.1.1: Fonte e Estilo */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="subtitle1"><Style sx={{ mr: 1, verticalAlign: 'middle' }} />Fonte e Estilo</Typography></AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* REQ 1.1.1.1 & 1.1.1.2: Alinhamento */}
                  <Grid item xs={12}>
                    <Typography variant="caption" display="block" gutterBottom>Alinhamento do Texto na Caixa</Typography>
                    <Grid container spacing={1}>
                       <Grid item xs={6}>
                          <ToggleButtonGroup value={style.textAlign || 'left'} exclusive onChange={(e, val) => val && updateFieldStyle(selectedField, 'textAlign', val)} aria-label="Alinhamento Horizontal" size="small" fullWidth>
                            <ToggleButton value="left" aria-label="left aligned"><FormatAlignLeft /></ToggleButton>
                            <ToggleButton value="center" aria-label="centered"><FormatAlignCenter /></ToggleButton>
                            <ToggleButton value="right" aria-label="right aligned"><FormatAlignRight /></ToggleButton>
                          </ToggleButtonGroup>
                       </Grid>
                       <Grid item xs={6}>
                          <ToggleButtonGroup value={style.verticalAlign || 'top'} exclusive onChange={(e, val) => val && updateFieldStyle(selectedField, 'verticalAlign', val)} aria-label="Alinhamento Vertical" size="small" fullWidth>
                            <ToggleButton value="top" aria-label="top aligned"><VerticalAlignTop /></ToggleButton>
                            <ToggleButton value="middle" aria-label="middle aligned"><VerticalAlignCenter /></ToggleButton>
                            <ToggleButton value="bottom" aria-label="bottom aligned"><VerticalAlignBottom /></ToggleButton>
                          </ToggleButtonGroup>
                       </Grid>
                    </Grid>
                  </Grid>

                  {/* REQ 1.1.1.3: Fonte */}
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Fonte</InputLabel>
                      <Select value={style.fontFamily || 'Arial'} label="Fonte" onChange={(e) => updateFieldStyle(selectedField, 'fontFamily', e.target.value)}>
                        {fonts.map(font => (<MenuItem key={font} value={font} style={{ fontFamily: font }}>{font}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* REQ 1.1.1.4, 1.1.1.5, 1.1.1.6: Estilos, Tamanho, Cor */}
                  <Grid item xs={12}>
                     <Grid container spacing={1} alignItems="center">
                        <Grid item xs={6}>
                           <ToggleButtonGroup value={[]} aria-label="text formatting" size="small" fullWidth>
                              <ToggleButton value="bold" aria-label="bold" selected={style.fontWeight === 'bold'} onClick={() => updateFieldStyle(selectedField, 'fontWeight', style.fontWeight === 'bold' ? 'normal' : 'bold')}><FormatBold /></ToggleButton>
                              <ToggleButton value="italic" aria-label="italic" selected={style.fontStyle === 'italic'} onClick={() => updateFieldStyle(selectedField, 'fontStyle', style.fontStyle === 'italic' ? 'normal' : 'italic')}><FormatItalic /></ToggleButton>
                              <ToggleButton value="underline" aria-label="underline" selected={style.textDecoration === 'underline'} onClick={() => updateFieldStyle(selectedField, 'textDecoration', style.textDecoration === 'underline' ? 'none' : 'underline')}><FormatUnderlined /></ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                        <Grid item xs={6}>
                           <TextField label="Cor" type="color" value={style.color || '#000000'} onChange={(e) => updateFieldStyle(selectedField, 'color', e.target.value)} fullWidth size="small" variant="outlined" InputLabelProps={{ shrink: true }}/>
                        </Grid>
                     </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography gutterBottom>Tamanho: {style.fontSize || 24}px</Typography>
                    <Slider value={style.fontSize || 24} onChange={(e, value) => updateFieldStyle(selectedField, 'fontSize', value)} min={8} max={120} valueLabelDisplay="auto" />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* REQ 1.1.2: Efeitos */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="subtitle1"><Palette sx={{ mr: 1, verticalAlign: 'middle' }} />Efeitos</Typography></AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* REQ 1.1.2.1: Contorno */}
                  <Grid item xs={12}>
                    <FormControlLabel control={<Switch checked={style.textStroke || false} onChange={(e) => updateFieldStyle(selectedField, 'textStroke', e.target.checked)} size="small" />} label="Contorno" />
                    {style.textStroke && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}><TextField label="Cor do Contorno" type="color" value={style.strokeColor || '#ffffff'} onChange={(e) => updateFieldStyle(selectedField, 'strokeColor', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Espessura: {style.strokeWidth || 2}px</Typography><Slider value={style.strokeWidth || 2} onChange={(e, value) => updateFieldStyle(selectedField, 'strokeWidth', value)} min={1} max={10} size="small" /></Grid>
                      </Grid>
                    )}
                  </Grid>
                  {/* REQ 1.1.2.2: Sombra */}
                  <Grid item xs={12}>
                    <FormControlLabel control={<Switch checked={style.textShadow || false} onChange={(e) => updateFieldStyle(selectedField, 'textShadow', e.target.checked)} size="small" />} label="Sombra" />
                    {style.textShadow && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}><TextField label="Cor da Sombra" type="color" value={style.shadowColor || '#000000'} onChange={(e) => updateFieldStyle(selectedField, 'shadowColor', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Desfoque: {style.shadowBlur || 4}px</Typography><Slider value={style.shadowBlur || 4} onChange={(e, value) => updateFieldStyle(selectedField, 'shadowBlur', value)} min={0} max={20} size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Offset X: {style.shadowOffsetX || 2}px</Typography><Slider value={style.shadowOffsetX || 2} onChange={(e, value) => updateFieldStyle(selectedField, 'shadowOffsetX', value)} min={-20} max={20} size="small" /></Grid>
                        <Grid item xs={6}><Typography gutterBottom>Offset Y: {style.shadowOffsetY || 2}px</Typography><Slider value={style.shadowOffsetY || 2} onChange={(e, value) => updateFieldStyle(selectedField, 'shadowOffsetY', value)} min={-20} max={20} size="small" /></Grid>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* REQ 1.1.3: Posição */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="subtitle1">📍 Posição</Typography></AccordionSummary>
              <AccordionDetails>
                 <Grid container spacing={2}>
                  <Grid item xs={6}><TextField label="X (%)" type="number" size="small" value={position.x?.toFixed(1) || '0.0'} onChange={(e) => updateFieldPosition(selectedField, 'x', parseFloat(e.target.value) || 0)} inputProps={{ min: 0, max: 100, step: 0.1 }} fullWidth /></Grid>
                  <Grid item xs={6}><TextField label="Y (%)" type="number" size="small" value={position.y?.toFixed(1) || '0.0'} onChange={(e) => updateFieldPosition(selectedField, 'y', parseFloat(e.target.value) || 0)} inputProps={{ min: 0, max: 100, step: 0.1 }} fullWidth /></Grid>
                  <Grid item xs={12}>
                    <Typography gutterBottom>Rotação: {position.rotation?.toFixed(0) || '0'}°</Typography>
                    <Slider value={position.rotation || 0} onChange={(e, value) => updateFieldPosition(selectedField, 'rotation', value)} min={0} max={360} step={1} valueLabelDisplay="auto" />
                  </Grid>
                 </Grid>
              </AccordionDetails>
            </Accordion>

            {/* REQ 1.1.4: Tamanho */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="subtitle1">📏 Tamanho</Typography></AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                    <Grid item xs={6}><TextField label="Largura (%)" type="number" size="small" value={position.width?.toFixed(1) || '20.0'} onChange={(e) => updateFieldPosition(selectedField, 'width', parseFloat(e.target.value) || 20)} inputProps={{ min: 5, max: 100, step: 0.1 }} fullWidth /></Grid>
                    <Grid item xs={6}><TextField label="Altura (%)" type="number" size="small" value={position.height?.toFixed(1) || '10.0'} onChange={(e) => updateFieldPosition(selectedField, 'height', parseFloat(e.target.value) || 10)} inputProps={{ min: 3, max: 100, step: 0.1 }} fullWidth /></Grid>
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
          <Typography variant="h6" color="textSecondary" align="center" gutterBottom sx={{mt: 4}}>
            Selecione um campo de texto para editar suas propriedades
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default FormattingPanel;
