import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import { Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { toast } from 'sonner';

const PaletteReportModal = ({ open, onClose, paletteData, onApplyPalette, briefing }) => {
  const handlePrint = () => {
    const printSection = document.querySelector('.printable-section');
    if (printSection) {
      window.print();
    } else {
      toast.error('Não foi possível encontrar a seção para impressão.');
    }
  };

  if (!paletteData || !briefing) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Memorial Descritivo da Paleta de Cores
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              .printable-section, .printable-section * {
                visibility: visible;
              }
              .printable-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .no-print {
                display: none;
              }
            }
          `}
        </style>
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
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
              <Typography variant="body2"><strong>Objetivo:</strong> {briefing.objective}</Typography>
              <Typography variant="body2"><strong>Público-alvo:</strong> {briefing.targetAudience}</Typography>
              <Typography variant="body2"><strong>Mensagem Principal:</strong> {briefing.mainMessage}</Typography>
              <Typography variant="body2"><strong>Atmosfera Desejada:</strong> {briefing.atmosphere}</Typography>
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
      </DialogContent>
      <DialogActions sx={{ p: 2 }} className="no-print">
        <Button onClick={handlePrint} startIcon={<PrintIcon />}>
          Imprimir
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onApplyPalette();
            onClose();
          }}
        >
          Usar Esta Paleta
        </Button>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaletteReportModal;
