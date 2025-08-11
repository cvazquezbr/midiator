import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
} from '@mui/material';

const PasswordDialog = ({ open, onClose, onConfirm, title, description }) => {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    onConfirm(password);
    setPassword('');
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Senha"
          type="password"
          fullWidth
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && password) {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleConfirm} disabled={!password} variant="contained">Confirmar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordDialog;
