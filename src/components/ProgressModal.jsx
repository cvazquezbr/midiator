import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';

const ProgressModal = ({ open, progress, total, onCancel }) => {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <Dialog open={open} aria-labelledby="progress-dialog-title">
      <DialogTitle id="progress-dialog-title">Gerando Áudios</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Progresso: {progress} de {total} áudios gerados.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={percentage} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${percentage}%`}</Typography>
          </Box>
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
