import React from 'react';
import { Dialog, DialogContent, Typography, Box, LinearProgress } from '@mui/material';
import './LoadingDialog.css';

const LoadingDialog = ({ open, title = "Gerando conteúdo...", description = "A IA está pensando e escrevendo. Isso pode levar alguns segundos.", progress = null }) => {
  return (
    <Dialog open={open} PaperProps={{ style: { borderRadius: '16px', width: '400px' } }}>
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        {progress === null && (
          <Box className="thinking-animation" sx={{ mb: 3 }}>
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </Box>
        )}
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
        {progress !== null && (
          <Box sx={{ width: '100%', mt: 3 }}>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoadingDialog;
