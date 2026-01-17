import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Link,
} from '@mui/material';
import AuthLayout from '../components/AuthLayout';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, googleLogin } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Se o usuário já estiver logado, lida com o redirecionamento
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await login(email, password);
    if (!success) {
        setError('Falha ao fazer login. Verifique suas credenciais.');
        setLoading(false);
    }
    // O useEffect cuidará do redirecionamento
  };

  const initiateGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
    access_type: 'offline',
    onSuccess: async (codeResponse) => {
      setLoading(true);
      setError('');
      const success = await googleLogin(codeResponse.code);
        if (!success) {
            setError('Falha no login com o Google. Por favor, tente novamente.');
            setLoading(false);
        }
        // O useEffect cuidará do redirecionamento
    },
    onError: (error) => {
      setError('O login com o Google foi cancelado ou falhou. Por favor, tente novamente.');
      console.error('Falha no Login com Google:', error);
    },
  });

  return (
    <AuthLayout title="Entrar">
      {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
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
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Senha"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <Box sx={{ textAlign: 'right', width: '100%', mt: 1 }}>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Esqueceu a senha?
          </Link>
        </Box>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
        </Button>
        <Divider sx={{ my: 2 }}>OU</Divider>
        <Button
          variant="outlined"
          fullWidth
          onClick={() => initiateGoogleLogin()}
          disabled={loading}
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Entrar com Google'}
        </Button>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link component={RouterLink} to="/signup" state={{ from: location.state?.from }} variant="body2" sx={{ mx: 2 }}>
            Não tem uma conta? Cadastre-se
          </Link>
          <Link component={RouterLink} to="/privacy-policy" variant="body2" sx={{ mx: 2 }}>
            Política de Privacidade
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default LoginPage;
