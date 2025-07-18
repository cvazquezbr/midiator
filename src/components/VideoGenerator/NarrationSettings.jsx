import React from 'react';
import {
  Box, Button, Typography, Grid,
  TextField, Paper,
  FormControlLabel,
  Switch,
  Slider
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';

const NarrationSettings = ({
  narrationVideoData,
  handleNarrationVideoUpload,
  videoScale,
  setVideoScale,
  chromaKeyColor,
  setChromaKeyColor,
  chromaKeySimilarity,
  setChromaKeySimilarity,
  chromaKeyBlend,
  setChromaKeyBlend,
  useChromaKey,
  setUseChromaKey,
}) => {
  return (
    <Paper elevation={0} sx={{ p: 2, mt: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
        Configurações da Narração
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<UploadFile />}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            Carregar Vídeo de Narração
            <input
              type="file"
              hidden
              accept=".mp4,.mov,.webm"
              onChange={handleNarrationVideoUpload}
            />
          </Button>
          {narrationVideoData.file && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Arquivo: {narrationVideoData.file.name}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={useChromaKey}
                onChange={(e) => setUseChromaKey(e.target.checked)}
                color="secondary"
                disabled={!narrationVideoData.file}
              />
            }
            label="Ativar Chroma Key"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography gutterBottom>Zoom (Escala)</Typography>
          <Slider
            value={videoScale}
            onChange={(e, newValue) => setVideoScale(newValue)}
            aria-labelledby="scale-slider"
            valueLabelDisplay="auto"
            step={0.05}
            min={0.1}
            max={2}
          />
        </Grid>
        {useChromaKey && (
          <Grid item xs={12}>
            <Typography gutterBottom>Chroma Key (Remoção de Fundo)</Typography>
            <TextField
              label="Cor do Fundo"
              type="color"
              value={chromaKeyColor}
              onChange={(e) => setChromaKeyColor(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <Typography gutterBottom>Tolerância ({chromaKeySimilarity})</Typography>
            <Slider
              value={chromaKeySimilarity}
              onChange={(e, newValue) => setChromaKeySimilarity(newValue)}
              aria-labelledby="similarity-slider"
              valueLabelDisplay="auto"
              step={0.01}
              min={0.01}
              max={0.4}
            />
            <Typography gutterBottom>Suavização da Borda ({chromaKeyBlend})</Typography>
            <Slider
              value={chromaKeyBlend}
              onChange={(e, newValue) => setChromaKeyBlend(newValue)}
              aria-labelledby="blend-slider"
              valueLabelDisplay="auto"
              step={0.01}
              min={0}
              max={0.5}
            />
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default NarrationSettings;
