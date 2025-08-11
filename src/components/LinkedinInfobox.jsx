import React from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Link,
  Paper,
  Alert,
} from '@mui/material';

const steps = [
  {
    label: 'Acesse o LinkedIn Developer Portal',
    description: (
      <Typography variant="body2">
        Abra o{' '}
        <Link href="https://www.linkedin.com/developers/apps/" target="_blank" rel="noopener noreferrer" sx={{ color: 'primary.main' }}>
          LinkedIn Developer Portal
        </Link>{' '}
        e faça login com sua conta do LinkedIn.
      </Typography>
    ),
  },
  {
    label: 'Crie um Novo Aplicativo (App)',
    description: (
        <>
            <Typography variant="body2" sx={{ mb: 1 }}>
                Clique em <b>"Create app"</b>. Preencha as informações do aplicativo, como nome, empresa associada e logo.
            </Typography>
            <Alert severity="info">
                Você precisará ter uma página de empresa (Company Page) no LinkedIn para associar ao aplicativo.
            </Alert>
        </>
    ),
  },
  {
    label: 'Configure os Produtos (Products)',
    description: (
      <Typography variant="body2">
        Na aba <b>"Products"</b> do seu aplicativo, solicite acesso aos produtos necessários. Para o Midiator, você provavelmente precisará de:
        <ul>
            <li><b>Sign In with LinkedIn</b></li>
            <li><b>Share on LinkedIn</b></li>
        </ul>
        Pode ser necessário aguardar a aprovação do LinkedIn para alguns produtos.
      </Typography>
    ),
  },
  {
    label: 'Configure a Autenticação (Auth)',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Na aba <b>"Auth"</b>, você encontrará seu <b>Client ID</b>. Copie este valor e cole-o no campo correspondente no Midiator.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Em <b>"Authorized redirect URIs for your app"</b>, você deve adicionar o endereço exato onde o Midiator está rodando.
        </Typography>
        <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'grey.100' }}>
            <Typography variant="body2" component="code">{window.location.origin}</Typography>
        </Paper>
        <Typography variant="body2">
          Clique em <b>"Update"</b> para salvar o URI de redirecionamento.
        </Typography>
      </>
    ),
  },
];

const LinkedinInfobox = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Passo a Passo: Configurando a Integração com LinkedIn
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Siga estas instruções para obter o Client ID para a integração com o LinkedIn.
      </Alert>
      <Stepper activeStep={-1} orientation="vertical">
        {steps.map((step) => (
          <Step key={step.label} active={true}>
            <StepLabel>
              <Typography variant="subtitle1">{step.label}</Typography>
            </StepLabel>
            <StepContent>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    {step.description}
                </Paper>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default LinkedinInfobox;
