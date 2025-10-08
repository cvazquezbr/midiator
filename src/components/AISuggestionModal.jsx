import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Paper, Typography, Box, IconButton, CircularProgress, Alert
} from '@mui/material';
import { Close as CloseIcon, AutoAwesome as AIicon, CheckCircleOutline as SelectIcon } from '@mui/icons-material';

const AISuggestionModal = ({
  open,
  onClose,
  title,
  loading,
  loadingText = "Analisando o contexto e gerando sugestões...",
  error,
  suggestions,
  onSelectSuggestion,
  onRegenerate,
  suggestionType = 'default', // 'default' or 'product'
  bestPractices,
}) => {
  const hasBestPractices = Boolean(bestPractices);

  const renderSuggestionContent = (suggestion) => {
    if (suggestionType === 'product' && typeof suggestion === 'object') {
      return (
        <>
          <Typography variant="h6" component="div" gutterBottom>
            {suggestion.produtoServico}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {suggestion.descricao}
          </Typography>
        </>
      );
    }
    return (
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
        {suggestion}
      </Typography>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={hasBestPractices ? "lg" : "md"} PaperProps={{ sx: { minHeight: '400px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AIicon color="primary" />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>{title}</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={4}>
          <Grid item xs={12} md={hasBestPractices ? 7 : 12}>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexDirection: 'column', gap: 2, textAlign: 'center', height: '100%', minHeight: 300 }}>
                <CircularProgress size={40} />
                <Typography>{loadingText}</Typography>
              </Box>
            )}
            {error && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexDirection: 'column', gap: 2, textAlign: 'center', p: 2 }}>
                    <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
                </Box>
            )}
            {!loading && !error && (
                suggestions.length > 0 ? (
                <Grid container spacing={2} sx={{ pt: 1 }}>
                    {suggestions.map((suggestion, index) => (
                    <Grid item xs={12} md={suggestionType === 'product' || hasBestPractices ? 12 : 6} key={index}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: 2,
                                borderColor: 'divider',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    boxShadow: 2,
                                }
                            }}
                        >
                        <Box>
                            {suggestionType === 'product' && <Typography variant="overline" color="text.secondary">Proposta {index + 1}</Typography>}
                            {renderSuggestionContent(suggestion)}
                        </Box>
                        <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<SelectIcon />}
                            onClick={() => onSelectSuggestion(suggestion)}
                            sx={{ alignSelf: 'flex-end' }}
                        >
                            Usar esta sugestão
                        </Button>
                        </Paper>
                    </Grid>
                    ))}
                </Grid>
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, textAlign: 'center', minHeight: 300 }}>
                        <Typography color="text.secondary">Nenhuma sugestão foi encontrada. Tente gerar novamente ou ajuste o contexto.</Typography>
                    </Box>
                )
            )}
          </Grid>
          {hasBestPractices && (
            <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{p: 2, backgroundColor: 'grey.50', height: '100%'}}>
                    {bestPractices}
                </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose}>Fechar</Button>
        <Button onClick={onRegenerate} disabled={loading} variant="contained" startIcon={<AIicon />}>
          {loading ? 'Gerando...' : 'Gerar Novamente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AISuggestionModal;