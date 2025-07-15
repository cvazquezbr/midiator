import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import SoundWaveAnimation from './SoundWaveAnimation';

const ProgressModal = ({ open, progress, total, onCancel, title, progressText }) => {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <Dialog open={open} aria-labelledby="progress-dialog-title">
      <DialogTitle id="progress-dialog-title">{title || 'Gerando...'}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {progressText || `Progresso: ${progress} de ${total}`}.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <SoundWaveAnimation progress={percentage} />
        </Box>
        <Box sx={{ minWidth: 35, textAlign: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">{`${percentage}%`}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary">
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressModal;
