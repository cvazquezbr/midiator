import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { resetPassword } = useUserAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token de redefinição não encontrado. Por favor, solicite uma nova redefinição de senha.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Não é possível redefinir a senha sem um token válido.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não correspondem.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    const result = await resetPassword(token, password, confirmPassword);

    if (result.success) {
      setMessage(result.message);
      setTimeout(() => navigate('/login'), 3000); // Redireciona para o login após 3 segundos
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <AuthLayout title="Redefina Sua Senha">
      {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}

      {token ? (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Nova Senha (mín. 8 caracteres)"
            type="password"
            id="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirme a Nova Senha"
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !!message} // Desativa após o sucesso
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Redefinir Senha'}
          </Button>
          {message && (
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Prosseguir para o Login
              </Link>
            </Box>
          )}
        </Box>
      ) : (
         <Typography sx={{ mt: 2 }}>
           Link de redefinição de senha inválido.
         </Typography>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
