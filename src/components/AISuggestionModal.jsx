import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemText, CircularProgress, Box, Typography, Grid
} from '@mui/material';

const AISuggestionModal = ({ open, title, suggestions, loading, onClose, onSelect, bestPractices }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={bestPractices ? 8 : 12}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {suggestions.map((suggestion, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton onClick={() => onSelect(suggestion.mensagem || suggestion.descricao || suggestion.texto)}>
                      <ListItemText primary={suggestion.mensagem || suggestion.descricao || suggestion.texto} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Grid>
          {bestPractices && (
            <Grid item xs={12} md={4}>
              <Box sx={{ pl: 2, borderLeft: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>Melhores Práticas</Typography>
                <Typography variant="body2" whiteSpace="pre-wrap">
                  {bestPractices}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AISuggestionModal;