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
    label: 'Verifique a URL do seu Site',
    description: (
      <Typography variant="body2">
        A URL do site deve ser o endereço completo da sua instalação WordPress, incluindo `http://` ou `https://`. Por exemplo: `https://meusite.com`.
      </Typography>
    ),
  },
  {
    label: 'Use um Usuário com Permissões de Editor ou Administrador',
    description: (
      <Typography variant="body2">
        Você precisará de um nome de usuário do WordPress que tenha a função (role) de <b>Editor</b> ou <b>Administrador</b> para publicar e gerenciar conteúdo através da API.
      </Typography>
    ),
  },
  {
    label: 'Crie uma Senha de Aplicativo (Application Password)',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Senhas de aplicativo são mais seguras para integrações. Para criar uma:
        </Typography>
        <ol>
            <li>Faça login no seu painel do WordPress.</li>
            <li>Vá para <b>Usuários &gt; Perfil</b>.</li>
            <li>Role para baixo até a seção <b>"Senhas de Aplicativo"</b>.</li>
            <li>Digite um nome para a nova senha de aplicativo (ex: "Midiator") e clique em <b>"Adicionar nova senha de aplicativo"</b>.</li>
        </ol>
        <Alert severity="warning" sx={{ mt: 1 }}>
            Copie a senha gerada imediatamente. Ela não será mostrada novamente! Cole esta senha no campo "Senha de Aplicativo" no Midiator.
        </Alert>
      </>
    ),
  },
    {
    label: 'Verifique se a API REST está Ativa',
    description: (
      <Typography variant="body2">
        A API REST do WordPress geralmente está ativa por padrão. Você pode verificar acessando `https://seusite.com/wp-json/`. Se você vir uma página com texto (JSON), está tudo certo. Se não, verifique se há plugins de segurança bloqueando o acesso à API.
      </Typography>
    ),
  },
];

const WordpressInfobox = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Passo a Passo: Configurando a Integração com WordPress
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Siga estas instruções para obter as credenciais necessárias para publicar no seu site WordPress.
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

export default WordpressInfobox;
