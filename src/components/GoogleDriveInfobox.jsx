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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';

const steps = [
  {
    label: 'Acesse o Google Cloud Console',
    description: (
      <Typography variant="body2">
        Abra o{' '}
        <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
          Google Cloud Console
        </Link>{' '}
        e faça login com sua conta Google. Se você não tiver um projeto, crie um novo clicando no seletor de projetos no topo da página e depois em "Novo projeto".
      </Typography>
    ),
  },
  {
    label: 'Ative as APIs necessárias',
    description: (
        <>
            <Typography variant="body2" sx={{ mb: 1 }}>
                Você precisará ativar duas APIs para a integração funcionar corretamente:
            </Typography>
            <List dense>
                <ListItem>
                    <ListItemText
                        primary="Google Drive API"
                        secondary={
                            <Link href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center' }}>
                                Ativar API do Google Drive <OpenInNew sx={{ ml: 0.5, fontSize: 14 }} />
                            </Link>
                        }
                    />
                </ListItem>
                <ListItem>
                    <ListItemText
                        primary="Google Sheets API"
                        secondary={
                            <Link href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center' }}>
                                Ativar API do Google Sheets <OpenInNew sx={{ ml: 0.5, fontSize: 14 }} />
                            </Link>
                        }
                    />
                </ListItem>
            </List>
            <Typography variant="body2" sx={{ mt: 1 }}>
                Clique nos links acima, selecione seu projeto e clique em "Ativar".
            </Typography>
        </>
    ),
  },
  {
    label: 'Crie uma Chave de API (API Key)',
    description: (
      <Typography variant="body2">
        No menu de navegação à esquerda, vá para <b>APIs e serviços &gt; Credenciais</b>. Clique em <b>+ CRIAR CREDENCIAIS</b> e selecione <b>Chave de API</b>. Copie a chave gerada e cole-a no campo "API Key" deste aplicativo.
      </Typography>
    ),
  },
  {
    label: 'Crie um ID do Cliente OAuth 2.0',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Na mesma página de <b>Credenciais</b>, clique novamente em <b>+ CRIAR CREDENCIAIS</b> e selecione <b>ID do cliente OAuth</b>.
        </Typography>
        <List dense>
            <ListItem>
                <ListItemText primary="Tipo de aplicativo" secondary="Aplicativo da Web" />
            </ListItem>
            <ListItem>
                <ListItemText primary="Nome" secondary="Use um nome descritivo, como 'MidiatorApp'." />
            </ListItem>
        </List>
      </>
    ),
  },
  {
    label: 'Configure as Origens JavaScript e URIs de Redirecionamento',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Esta é a parte mais importante. Você precisa autorizar o endereço onde o Midiator está rodando.
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          O endereço exato (incluindo http/https e a porta) deve ser adicionado.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1 }}>
            <b>1. Em "Origens JavaScript autorizadas", adicione:</b>
        </Typography>
        <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'grey.100' }}>
            <Typography variant="body2" component="code">{window.location.origin}</Typography>
        </Paper>
        <Typography variant="body2" sx={{ mb: 1 }}>
            <b>2. Em "URIs de redirecionamento autorizados", adicione o mesmo endereço:</b>
        </Typography>
        <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'grey.100' }}>
             <Typography variant="body2" component="code">{window.location.origin}</Typography>
        </Paper>
        <Typography variant="body2">
          Após a configuração, clique em <b>CRIAR</b>. Copie o <b>ID do Cliente</b> gerado e cole-o no campo "Client ID" deste aplicativo.
        </Typography>
      </>
    ),
  },
  {
    label: 'Configure a Tela de Consentimento OAuth',
    description: (
        <Typography variant="body2">
            No menu de navegação à esquerda, vá para <b>APIs e serviços &gt; Tela de consentimento OAuth</b>.
            Configure o tipo de usuário como <b>Externo</b> e preencha as informações necessárias (nome do app, e-mail de suporte).
            Em <b>"Escopos"</b>, não precisa adicionar nada manualmente. Em <b>"Usuários de teste"</b>, adicione o e-mail da conta Google que você usará para fazer login.
            Finalmente, publique o aplicativo (pode ser necessário verificação do Google se for para uso público amplo).
        </Typography>
    ),
  },
];

const GoogleDriveInfobox = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Passo a Passo: Configurando a API do Google Drive
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Siga estas instruções cuidadosamente para gerar as credenciais necessárias para a integração com o Google Drive e o Google Sheets.
      </Alert>
      <Stepper activeStep={-1} orientation="vertical">
        {steps.map((step, index) => (
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

export default GoogleDriveInfobox;
