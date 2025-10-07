import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Paper, Typography, Box, IconButton, CircularProgress
} from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon, CheckCircleOutline } from '@mui/icons-material';

const ProductSuggestionModal = ({ open, onClose, suggestions, onSelectSuggestion, onRegenerate, loading, error }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          Sugestões para Produto e Descrição
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Analisando o conteúdo do link e gerando sugestões...</Typography>
          </Box>
        )}
        {error && <Typography color="error">{error}</Typography>}
        {!loading && !error && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="body1" gutterBottom>
                    Analisamos o link que você forneceu e criamos três propostas para o nome e a descrição do seu produto ou serviço. Escolha a que melhor se encaixa na sua campanha.
                </Typography>
            </Grid>
            {suggestions.map((suggestion, index) => (
              <Grid item xs={12} key={index}>
                <Paper variant="outlined" sx={{ p: 2, position: 'relative', '&:hover .select-button': { opacity: 1 } }}>
                  <Typography variant="h6" gutterBottom>Proposta {index + 1}</Typography>
                  <Typography variant="subtitle1" gutterBottom><strong>Produto/Serviço:</strong> {suggestion.produtoServico}</Typography>
                  <Typography variant="body2" color="text.secondary"><strong>Descrição:</strong> {suggestion.descricao}</Typography>
                   <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<CheckCircleOutline />}
                      onClick={() => onSelectSuggestion(suggestion)}
                      sx={{ mt: 2 }}
                    >
                      Usar esta Proposta
                    </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Cancelar</Button>
        <Button onClick={onRegenerate} disabled={loading} color="primary" variant="outlined">
          {loading ? 'Gerando...' : 'Gerar Novamente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductSuggestionModal;