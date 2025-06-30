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
  Divider
} from '@mui/material';
import {
  Google,
  Settings,
  CheckCircle,
  Error,
  OpenInNew
} from '@mui/icons-material';
import googleDriveAPI from '../utils/googleDriveAPI';

const GoogleAuthSetup = ({ onAuthSuccess, onAuthError }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authStatus, setAuthStatus] = useState('not_configured'); // not_configured, configured, signed_in
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Verificar se já está configurado e logado
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    if (googleDriveAPI.isInitialized && googleDriveAPI.isSignedIn) {
      setAuthStatus('signed_in');
      setActiveStep(2);
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } else if (googleDriveAPI.isInitialized) {
      setAuthStatus('configured');
      setActiveStep(1);
    }
  };

  const handleInitialize = async () => {
    if (!apiKey.trim() || !clientId.trim()) {
      setError('Por favor, preencha API Key e Client ID');
      return;
    }

    setIsInitializing(true);
    setError('');

    try {
      await googleDriveAPI.initialize(apiKey.trim(), clientId.trim());
      setAuthStatus('configured');
      setActiveStep(1);
    } catch (err) {
      setError(`Erro ao inicializar: ${getErrorMessage(err)}`);

      if (onAuthError) {
        onAuthError(err);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError('');

    try {
      const user = await googleDriveAPI.signIn();
      const profile = user.getBasicProfile();
      
      setUserInfo({
        name: profile.getName(),
        email: profile.getEmail(),
        imageUrl: profile.getImageUrl()
      });
      
      setAuthStatus('signed_in');
      setActiveStep(2);
      
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (err) {
      setError(`Erro no login: ${err.message}`);
      if (onAuthError) {
        onAuthError(err);
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
      setUserInfo(null);
    } catch (err) {
      setError(`Erro no logout: ${err.message}`);
    }
  };

  const steps = [
    {
      label: 'Configurar Credenciais',
      description: 'Configure API Key e Client ID do Google Cloud'
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
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          <Google sx={{ mr: 1, verticalAlign: 'middle' }} />
          Configuração do Google Drive
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Passo 1: Configurar Credenciais */}
          <Step>
            <StepLabel>
              {steps[0].label}
              {authStatus !== 'not_configured' && <CheckCircle color="success" sx={{ ml: 1 }} />}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {steps[0].description}
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Como obter as credenciais:</strong><br />
                  1. Acesse o <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener">
                    Google Cloud Console <OpenInNew fontSize="small" />
                  </Link><br />
                  2. Crie um projeto ou selecione um existente<br />
                  3. Ative as APIs: Google Drive API e Google Sheets API<br />
                  4. Vá em "Credenciais" e crie uma API Key<br />
                  5. Crie um OAuth 2.0 Client ID (Aplicação Web)<br />
                  6. Adicione sua URL como origem autorizada
                </Typography>
              </Alert>

              <Box sx={{ mb: 2 }}>
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
                  placeholder="123456789-abc.apps.googleusercontent.com"
                  disabled={authStatus !== 'not_configured'}
                />
              </Box>

              {authStatus === 'not_configured' && (
                <Button
                  variant="contained"
                  onClick={handleInitialize}
                  disabled={isInitializing}
                  startIcon={<Settings />}
                >
                  {isInitializing ? 'Configurando...' : 'Configurar'}
                </Button>
              )}

              {authStatus !== 'not_configured' && (
                <Chip 
                  icon={<CheckCircle />} 
                  label="Configurado" 
                  color="success" 
                  variant="filled" 
                />
              )}
            </StepContent>
          </Step>

          {/* Passo 2: Fazer Login */}
          <Step>
            <StepLabel>
              {steps[1].label}
              {authStatus === 'signed_in' && <CheckCircle color="success" sx={{ ml: 1 }} />}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {steps[1].description}
              </Typography>

              {authStatus === 'configured' && (
                <Button
                  variant="contained"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  startIcon={<Google />}
                  color="primary"
                >
                  {isSigningIn ? 'Fazendo login...' : 'Login com Google'}
                </Button>
              )}

              {authStatus === 'signed_in' && userInfo && (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Logado como:</strong> {userInfo.name} ({userInfo.email})
                    </Typography>
                  </Alert>
                  <Button
                    variant="outlined"
                    onClick={handleSignOut}
                    size="small"
                  >
                    Fazer Logout
                  </Button>
                </Box>
              )}
            </StepContent>
          </Step>

          {/* Passo 3: Pronto */}
          <Step>
            <StepLabel>
              {steps[2].label}
              {authStatus === 'signed_in' && <CheckCircle color="success" sx={{ ml: 1 }} />}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {steps[2].description}
              </Typography>

              {authStatus === 'signed_in' && (
                <Alert severity="success">
                  <Typography variant="body2">
                    🎉 Integração com Google Drive configurada com sucesso!<br />
                    Agora você pode gerar imagens e enviá-las automaticamente para seu Google Drive.
                  </Typography>
                </Alert>
              )}
            </StepContent>
          </Step>
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <Error sx={{ mr: 1, verticalAlign: 'middle' }} />
              {error}
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="textSecondary">
          <strong>Nota:</strong> Suas credenciais são usadas apenas localmente no seu navegador. 
          Nenhuma informação é enviada para servidores externos além das APIs oficiais do Google.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default GoogleAuthSetup;

