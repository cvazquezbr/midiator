import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Grid,
  Paper,
  Chip,
} from '@mui/material';

const PaletteReport = ({ paletteData, briefing }) => {
  if (!paletteData || !briefing) return null;

  return (
    <Paper elevation={0} className="printable-section" sx={{ p: 4, fontFamily: 'serif' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
          Memorial Descritivo de Cores
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Análise e Justificativa da Paleta de Cores para a Campanha
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>1. Briefing Criativo</Typography>
        <Typography variant="body1" paragraph>
          A paleta de cores a seguir foi gerada com base nos seguintes parâmetros criativos fornecidos:
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
          <Typography variant="body2"><strong>Objetivo:</strong> {briefing.objetivo}</Typography>
          <Typography variant="body2"><strong>Público-alvo:</strong> {briefing.publicoAlvo}</Typography>
          <Typography variant="body2"><strong>Mensagem Principal:</strong> {briefing.mensagemPrincipal}</Typography>
          <Typography variant="body2"><strong>Atmosfera Desejada:</strong> {briefing.atmosfera}</Typography>
          {briefing.details && <Typography variant="body2"><strong>Detalhes Adicionais:</strong> {briefing.details}</Typography>}
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>2. Harmonia da Paleta</Typography>
        <Typography variant="body1">
          A harmonia de cores selecionada foi a <strong>{paletteData.harmony}</strong>. Esta escolha visa criar um equilíbrio visual coeso e psicologicamente alinhado aos objetivos do briefing.
        </Typography>
      </Box>

      <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>3. Detalhamento da Paleta</Typography>
      <Grid container spacing={3}>
        {paletteData.palette.map((color, index) => (
          <Grid item xs={12} key={index}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={2}>
                  <Box sx={{ width: '100%', height: 80, borderRadius: 2, backgroundColor: color.hex }} />
                </Grid>
                <Grid item xs={12} sm={10}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>{index + 1}. {color.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Função:</strong> {color.role}
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                    {color.justification}
                  </Typography>
                  <Chip label={`HEX: ${color.hex}`} size="small" sx={{ mr: 1 }} />
                  <Chip label={`RGB: ${color.rgb}`} size="small" />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default PaletteReport;
