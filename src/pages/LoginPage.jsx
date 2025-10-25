import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Link,
} from '@mui/material';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, googleLogin } = useUserAuth();
  const navigate = useNavigate();

  // If the user is already logged in, redirect them to the home page.
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      // The error toast is shown by the context, but we can set a local error for the UI
      setError('Failed to log in. Please check your credentials.');
      setLoading(false);
    }
    // No need to setLoading(false) on success because the component will unmount
  };

  const initiateGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
    access_type: 'offline',
    onSuccess: async (codeResponse) => {
      setLoading(true);
      setError('');
      const success = await googleLogin(codeResponse.code);
      if (success) {
        // Introduce a small delay to allow the Google Auth library to clean up.
        setTimeout(() => navigate('/'), 100);
      } else {
        setError('Google Sign-In failed. Please try again.');
        setLoading(false);
      }
    },
    onError: (error) => {
      setError('Google Sign-In was cancelled or failed. Please try again.');
      console.error('Google Login Failed:', error);
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>
        {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
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
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
          <Divider sx={{ my: 2 }}>OR</Divider>
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 2 }}>
            {loading ? (
              <CircularProgress />
            ) : (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => initiateGoogleLogin()}
                disabled={loading}
              >
                Sign In with Google
              </Button>
            )}
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link component={RouterLink} to="/signup" variant="body2" sx={{ mx: 2 }}>
              {"Don't have an account? Sign Up"}
            </Link>
            <Link component={RouterLink} to="/privacy-policy" variant="body2" sx={{ mx: 2 }}>
              Privacy Policy
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
