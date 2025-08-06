import React from 'react';
import { Dialog, DialogContent, Typography, Box } from '@mui/material';
import './LoadingDialog.css';

const LoadingDialog = ({ open }) => {
  return (
    <Dialog open={open} PaperProps={{ style: { borderRadius: '16px' } }}>
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        <Box className="thinking-animation" sx={{ mb: 3 }}>
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </Box>
        <Typography variant="h6">Gerando conteúdo...</Typography>
        <Typography variant="body2" color="text.secondary">
          A IA está pensando e escrevendo. Isso pode levar alguns segundos.
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingDialog;
