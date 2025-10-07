import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Typography, Box, IconButton, CircularProgress, Alert, Paper
} from '@mui/material';
import { Close as CloseIcon, AutoAwesomeOutlined as GeminiIcon } from '@mui/icons-material';

const SuggestionModal = ({
  open,
  onClose,
  title,
  suggestionTitle,
  suggestionDescription,
  bestPractices,
  suggestions,
  onSelectSuggestion,
  onRegenerate,
  loading,
  error,
}) => {
  const hasBestPractices = Boolean(bestPractices);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={hasBestPractices ? "lg" : "md"}>
      <DialogTitle>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={hasBestPractices ? 4 : 2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={hasBestPractices ? 6 : 12}>
            <Typography variant="h6" gutterBottom>{suggestionTitle}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {suggestionDescription}
            </Typography>

            <Button
              variant="contained"
              startIcon={<GeminiIcon />}
              onClick={onRegenerate}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? 'Sugerindo...' : 'Sugerir Novamente'}
            </Button>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            {suggestions.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {suggestions.map((suggestion, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    onClick={() => onSelectSuggestion(suggestion)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'primary.main'
                      },
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <Typography variant="body2">{suggestion}</Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Grid>
          {hasBestPractices && (
            <Grid item xs={12} md={6}>
              {bestPractices}
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuggestionModal;