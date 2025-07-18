import React from 'react';
import {
  Typography, Grid,
  TextField, Paper,
  FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Checkbox
} from '@mui/material';

const SlidesSettings = ({
  slideDuration,
  setSlideDuration,
  fps,
  setFps,
  transition,
  setTransition,
  transitionOptions,
  compatibilityMode,
  generatePerRecord,
  setGeneratePerRecord
}) => {
  return (
    <Paper elevation={0} sx={{ p: 2, mt: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
        Configurações dos Slides
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Duração por Slide (segundos)"
            type="number"
            value={slideDuration}
            onChange={(e) => setSlideDuration(Math.max(1, Math.min(45, Number(e.target.value))))}
            fullWidth
            InputProps={{ style: { color: 'white' } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Quadros por Segundo (FPS)"
            type="number"
            value={fps}
            onChange={(e) => setFps(Math.max(10, Math.min(60, Number(e.target.value))))}
            fullWidth
            InputProps={{ style: { color: 'white' } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Transição</InputLabel>
            <Select
              value={transition}
              onChange={(e) => setTransition(e.target.value)}
              sx={{ color: 'white' }}
              disabled={compatibilityMode}
            >
              {transitionOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label} {compatibilityMode && option.value !== 'none' ? '(Indisponível)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={generatePerRecord}
                onChange={(e) => setGeneratePerRecord(e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label="Gerar um vídeo por registro"
            sx={{ color: 'white' }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SlidesSettings;
