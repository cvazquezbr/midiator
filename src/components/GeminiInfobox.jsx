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
    label: 'Acesse o Google AI Studio',
    description: (
      <Typography variant="body2">
        Abra o{' '}
        <Link href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" sx={{ color: '#90caf9' }}>
          Google AI Studio
        </Link>{' '}
        e faça login com sua conta Google.
      </Typography>
    ),
  },
  {
    label: 'Crie uma Nova Chave de API',
    description: (
      <Typography variant="body2">
        No menu à esquerda, clique em <b>"Get API key"</b> (Obter chave de API). Na página seguinte, clique em <b>"Create API key in new project"</b> (Criar chave de API em um novo projeto).
      </Typography>
    ),
  },
  {
    label: 'Copie e Use a Chave',
    description: (
      <Typography variant="body2">
        Uma nova chave de API será gerada e exibida para você. Copie esta chave.
        Volte para a tela de configuração do Gemini no Midiator, cole a chave no campo de texto e clique em Salvar.
      </Typography>
    ),
  },
];

const GeminiInfobox = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Passo a Passo: Configurando a API do Gemini
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Siga estas instruções para gerar sua chave de API para o Google Gemini.
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

export default GeminiInfobox;
