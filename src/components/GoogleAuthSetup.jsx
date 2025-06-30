import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Link,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Google,
  Settings,
  CheckCircle,
  Error as ErrorIcon,
  OpenInNew,
  Warning
} from '@mui/icons-material';
import googleDriveAPI from '../utils/googleDriveAPI';

function getErrorMessage(err) {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err?.error?.message) return err.error.message;
  if (err?.details) return err.details;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Erro desconhecido';
  }
}

const GoogleAuthSetup = ({ onAuthSuccess, onAuthError }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authStatus, setAuthStatus] = useState('not_configured');
  const [error, setError] = useState('');
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  useEffect(() => {
    const storedApiKey = localStorage.getItem("google_api_key");
    const storedClientId = localStorage.getItem("google_client_id");
    if (storedApiKey) setApiKey(storedApiKey);
    if (storedClientId) setClientId(storedClientId);
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (googleDriveAPI.isInitialized) {
        setAuthStatus('configured');
        setActiveStep(1);

        if (googleDriveAPI.isUserSignedIn()) {
          setAuthStatus('signed_in');
          setActiveStep(2);
          if (onAuthSuccess) {
            onAuthSuccess();
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
    }
  };

  const handleInitialize = async () => {
    if (!apiKey.trim() || !clientId.trim()) {
      setError('Por favor, preencha a API Key e Client ID');
      return;
    }

    setIsInitializing(true);
    setError('');

    try {
      await googleDriveAPI.initialize(apiKey, clientId);
      setAuthStatus("configured");
      setActiveStep(1);
      setError("");
      setInitializationAttempts(0);
      localStorage.setItem("google_api_key", apiKey);
      localStorage.setItem("google_client_id", clientId);
    } catch (error) {
      console.error('Erro na inicialização:', error);
      const errorMessage = getErrorMessage(error);
      setError(`Erro na inicialização: ${errorMessage}`);
      setInitializationAttempts(prev => prev + 1);
      if (onAuthError) {
        onAuthError(error);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError('');

    try {
      await googleDriveAPI.signIn();
      setAuthStatus('signed_in');
      setActiveStep(2);

      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (error) {
      console.error('Erro no login:', error);
      const errorMessage = getErrorMessage(error);
      setError(`Erro no login: ${errorMessage}`);

      if (onAuthError) {
        onAuthError(error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleDriveAPI.signOut();
      setAuthStatus('configured');
      setActiveStep(1);
    } catch (error) {
      console.error('Erro no logout:', error);
      setError(`Erro no logout: ${getErrorMessage(error)}`);
    }
  };

  const resetConfiguration = () => {
    setAuthStatus('not_configured');
    setActiveStep(0);
    setApiKey('');
    setClientId('');
    setError('');
    setInitializationAttempts(0);
  };

  const steps = [
    {
      label: 'Configurar Credenciais',
      description: 'Configure sua API Key e Client ID do Google Cloud Console'
    },
    {
      label: 'Fazer Login',
      description: 'Faça login com sua conta Google'
    },
    {
      label: 'Pronto!',
      description: 'Integração configurada com sucesso'
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Google sx={{ mr: 1, verticalAlign: 'middle' }} />
        Configuração da Integração Google Drive
      </Typography>

      <Stepper activeStep={activeStep} orientation="vertical">
        <Step>
          <StepLabel>
            {steps[0].label}
            {authStatus !== 'not_configured' && <CheckCircle color="success" sx={{ ml: 1 }} />}
          </StepLabel>
          <StepContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {steps[0].description}
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Para usar a integração com Google Drive, você precisa:
              </Typography>
              <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Criar um projeto no Google Cloud Console</li>
                <li>Ativar a API do Google Drive</li>
                <li>Criar credenciais (API Key e OAuth 2.0 Client ID)</li>
                <li>Configurar domínios autorizados</li>
              </ol>
              <Link
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'inline-flex', alignItems: 'center', mt: 1 }}
              >
                Abrir Google Cloud Console <OpenInNew sx={{ ml: 0.5, fontSize: 16 }} />
              </Link>
            </Alert>

            <TextField
              fullWidth
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              sx={{ mb: 2 }}
              disabled={authStatus !== 'not_configured'}
            />

            <TextField
              fullWidth
              label="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abc...apps.googleusercontent.com"
              sx={{ mb: 2 }}
              disabled={authStatus !== 'not_configured'}
            />

            {error && initializationAttempts > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {error}
                </Typography>
                {initializationAttempts > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Dicas para resolver:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      <li>Verifique se a API Key e Client ID estão corretos</li>
                      <li>Confirme se a API do Google Drive está ativada no seu projeto</li>
                      <li>Verifique se o domínio atual está autorizado nas configurações OAuth</li>
                      <li>Aguarde alguns minutos se acabou de criar as credenciais</li>
                    </ul>
                  </Typography>
                )}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              {authStatus === 'not_configured' ? (
                <Button
                  variant="contained"
                  onClick={handleInitialize}
                  disabled={isInitializing || !apiKey.trim() || !clientId.trim()}
                  startIcon={isInitializing ? <CircularProgress size={16} /> : <Settings />}
                >
                  {isInitializing ? 'Inicializando...' : 'Configurar'}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={resetConfiguration}
                  startIcon={<Settings />}
                >
                  Reconfigurar
                </Button>
              )}
            </Box>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>
            {steps[1].label}
            {authStatus === 'signed_in' && <CheckCircle color="success" sx={{ ml: 1 }} />}
          </StepLabel>
          <StepContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {steps[1].description}
            </Typography>

            {authStatus === 'configured' && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Clique no botão abaixo para fazer login com sua conta Google e autorizar o acesso ao Google Drive.
                </Alert>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  startIcon={isSigningIn ? <CircularProgress size={16} /> : <Google />}
                >
                  {isSigningIn ? 'Fazendo login...' : 'Fazer Login com Google'}
                </Button>
              </>
            )}

            {authStatus === 'signed_in' && (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Login realizado com sucesso!
                </Alert>

                <Button
                  variant="outlined"
                  onClick={handleSignOut}
                  startIcon={<Google />}
                >
                  Fazer Logout
                </Button>
              </>
            )}
          </StepContent>
        </Step>

        <Step>
          <StepLabel>
            {steps[2].label}
            {authStatus === 'signed_in' && <CheckCircle color="success" sx={{ ml: 1 }} />}
          </StepLabel>
          <StepContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {steps[2].description}
            </Typography>

            {authStatus === 'signed_in' && (
              <Alert severity="success">
                A integração com Google Drive está configurada e pronta para uso!
              </Alert>
            )}
          </StepContent>
        </Step>
      </Stepper>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Status Atual:
        </Typography>
        <Chip
          icon={
            authStatus === 'signed_in' ? <CheckCircle /> :
              authStatus === 'configured' ? <Warning /> : <ErrorIcon />
          }
          label={
            authStatus === 'signed_in' ? 'Conectado e Pronto' :
              authStatus === 'configured' ? 'Configurado - Faça Login' : 'Não Configurado'
          }
          color={
            authStatus === 'signed_in' ? 'success' :
              authStatus === 'configured' ? 'warning' : 'error'
          }
        />
      </Box>
    </Box>
  );
};

export default GoogleAuthSetup;