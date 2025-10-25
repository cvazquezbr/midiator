import React, { useState } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import AuthLayout from '../components/AuthLayout';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { requestPasswordReset } = useUserAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await requestPasswordReset(email);

    if (result.success) {
      setMessage(result.message);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <AuthLayout title="Esqueceu a Senha?">
      <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', mb: 2 }}>
        Digite seu endereço de e-mail e enviaremos um link para redefinir sua senha.
      </Typography>

      {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Endereço de E-mail"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar Link de Redefinição'}
        </Button>
        <Box sx={{ textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" variant="body2">
            Voltar para o Login
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
