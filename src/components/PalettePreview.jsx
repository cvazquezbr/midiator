import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
} from '@mui/material';

// Helper function to determine text color (black or white) based on background color
const getContrastTextColor = (hexColor) => {
  if (!hexColor) return '#000000';
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
};

const PalettePreview = ({ paletteData }) => {
  if (!paletteData || !paletteData.colors || paletteData.colors.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography color="text.secondary">A pré-visualização da paleta aparecerá aqui.</Typography>
      </Paper>
    );
  }

  const { colors } = paletteData;

  // Assign default colors if the palette has fewer than required
  const primary = colors.find(c => c.role?.toLowerCase().includes('primária')) || colors[0] || { hex: '#cccccc' };
  const secondary = colors.find(c => c.role?.toLowerCase().includes('secundária')) || colors[1] || { hex: '#e0e0e0' };
  const accent = colors.find(c => c.role?.toLowerCase().includes('acento')) || colors[2] || { hex: '#f5f5f5' };
  const text = colors.find(c => c.role?.toLowerCase().includes('texto')) || { hex: '#212121' };
  const background = colors.find(c => c.role?.toLowerCase().includes('fundo')) || { hex: '#ffffff' };


  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pré-visualização da Paleta
      </Typography>

      {/* Watch Preview */}
      <Card
        sx={{
          mb: 3,
          border: '1px solid rgba(0, 0, 0, 0.12)',
          backgroundColor: background.hex,
          color: getContrastTextColor(background.hex)
        }}
      >
        <CardContent>
          <Typography variant="h5" component="div" sx={{ color: primary.hex }}>
            Título de Exemplo
          </Typography>
          <Typography sx={{ mb: 1.5, color: text.hex }}>
            Este é um texto de exemplo para demonstrar a aplicação das cores da sua paleta em um componente de interface.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              sx={{
                backgroundColor: primary.hex,
                color: getContrastTextColor(primary.hex),
                '&:hover': { backgroundColor: secondary.hex, color: getContrastTextColor(secondary.hex) }
              }}
            >
              Ação Principal
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: accent.hex,
                color: accent.hex,
                '&:hover': { backgroundColor: accent.hex, color: getContrastTextColor(accent.hex) }
              }}
            >
              Ação Secundária
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Color Swatches */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Cores Individuais
      </Typography>
      <Grid container spacing={2}>
        {colors.map((color, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: 1,
                  backgroundColor: color.hex,
                  border: '1px solid #ccc',
                }}
              />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {color.name || 'Sem nome'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {color.role || 'Sem papel'}
                </Typography>
                <Chip label={color.hex} size="small" sx={{ mt: 0.5, fontFamily: 'monospace' }} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PalettePreview;