import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  TextField,
  Typography,
  Slider,
  ToggleButtonGroup,
  Tooltip,
  ToggleButton,
} from '@mui/material';
import {
  ExpandMore,
  AspectRatio,
  FlipToFront,
  FlipToBack,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

const PositionSizeFormatting = ({
  expandedPanel,
  handleAccordionChange,
  currentElement,
  updateElementProperty,
  handleZIndexChange,
  selectedField,
}) => {
  return (
    <Accordion expanded={expandedPanel === 'positionSize'} onChange={handleAccordionChange('positionSize')}>
      <AccordionSummary expandIcon={<ExpandMore />}><Typography><AspectRatio sx={{ mr: 1, verticalAlign: 'middle' }} />Posição e Tamanho</Typography></AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField label="X (%)" type="number" size="small" value={currentElement.x?.toFixed(1) || '0.0'} onChange={(e) => updateElementProperty('x', parseFloat(e.target.value))} fullWidth />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Y (%)" type="number" size="small" value={currentElement.y?.toFixed(1) || '0.0'} onChange={(e) => updateElementProperty('y', parseFloat(e.target.value))} fullWidth />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Largura (%)" type="number" size="small" value={currentElement.width?.toFixed(1) || '20.0'} onChange={(e) => updateElementProperty('width', parseFloat(e.target.value))} fullWidth />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Altura (%)" type="number" size="small" value={currentElement.height?.toFixed(1) || '10.0'} onChange={(e) => updateElementProperty('height', parseFloat(e.target.value))} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <Typography gutterBottom>Rotação: {currentElement.rotation?.toFixed(0) || '0'}°</Typography>
            <Slider value={currentElement.rotation || 0} onChange={(e, v) => updateElementProperty('rotation', v)} min={0} max={360} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" display="block" gutterBottom>Ordem</Typography>
            <ToggleButtonGroup size="small" fullWidth>
              <Tooltip title="Enviar para Trás">
                <ToggleButton value="back" onClick={() => handleZIndexChange(selectedField, 'back')}><FlipToBack /></ToggleButton>
              </Tooltip>
              <Tooltip title="Recuar">
                <ToggleButton value="backward" onClick={() => handleZIndexChange(selectedField, 'backward')}><ArrowDownward /></ToggleButton>
              </Tooltip>
              <Tooltip title="Avançar">
                <ToggleButton value="forward" onClick={() => handleZIndexChange(selectedField, 'forward')}><ArrowUpward /></ToggleButton>
              </Tooltip>
              <Tooltip title="Trazer para Frente">
                <ToggleButton value="front" onClick={() => handleZIndexChange(selectedField, 'front')}><FlipToFront /></ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default PositionSizeFormatting;
