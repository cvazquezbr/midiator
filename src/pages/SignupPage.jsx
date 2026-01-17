import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@mui/material';
import AuthLayout from '../components/AuthLayout';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signup } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    const success = await signup(name, email, password);
    if (success) {
      // O contexto exibe uma mensagem de brinde. Nós redirecionamos para o login.
      navigate('/login');
    } else {
      // O contexto mostra um erro genérico, podemos ser mais específicos aqui.
      setError('Falha ao cadastrar. Uma conta com este e-mail já pode existir.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Cadastre-se">
      {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label="Nome Completo"
          name="name"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Endereço de E-mail"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Senha (mín. 8 caracteres)"
          type="password"
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <FormControlLabel
          control={<Checkbox value="allowExtraEmails" color="primary" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />}
          label={
            <Typography variant="body2">
              Eu aceito os <Link component={RouterLink} to="/terms-of-service">Termos de Serviço</Link>
            </Typography>
          }
          sx={{ mt: 1 }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 2, mb: 2 }}
          disabled={loading || !termsAccepted}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Cadastrar'}
        </Button>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link component={RouterLink} to="/login" variant="body2" sx={{ mx: 2 }}>
            Já tem uma conta? Entre
          </Link>
          <Link component={RouterLink} to="/privacy-policy" variant="body2" sx={{ mx: 2 }}>
            Política de Privacidade
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default SignupPage;
