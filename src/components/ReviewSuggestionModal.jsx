import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton, Alert, Divider, Paper
} from '@mui/material';
import { Close as CloseIcon, CheckCircleOutline, HighlightOff, TaskAlt } from '@mui/icons-material';

const ReviewSuggestionModal = ({
  open,
  onClose,
  review,
  originalText,
  onSelectSuggestion,
}) => {
  if (!review) return null;

  const { pontosFortes, pontosFracos, sugestoes } = review;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Revisão do Objetivo da Mensagem
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Seu Texto Original</Typography>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'action.hover' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {originalText || 'Nenhum texto fornecido.'}
            </Typography>
          </Paper>
        </Box>

        <Divider sx={{ my: 2 }}><Typography variant="overline">Análise da IA</Typography></Divider>

        <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
              <CheckCircleOutline sx={{ mr: 1 }} /> Pontos Fortes
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {pontosFortes || 'Nenhum ponto forte identificado.'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
              <HighlightOff sx={{ mr: 1 }} /> Pontos a Melhorar
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {pontosFracos || 'Nenhum ponto a melhorar identificado.'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }}><Typography variant="overline">Sugestões Alternativas</Typography></Divider>

        {sugestoes && sugestoes.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sugestoes.map((suggestion, index) => (
              <Alert
                key={index}
                icon={<TaskAlt />}
                severity="info"
                onClick={() => onSelectSuggestion(suggestion)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' },
                  width: '100%',
                  alignItems: 'center'
                }}
              >
                <Typography variant="body2">{suggestion}</Typography>
              </Alert>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">Nenhuma sugestão alternativa foi gerada.</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" color="secondary">
          Manter Texto Original
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewSuggestionModal;