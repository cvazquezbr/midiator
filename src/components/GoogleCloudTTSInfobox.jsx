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

const steps = [
  {
    label: 'Acesse o Google Cloud Console e Ative a API',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Abra o{' '}
          <Link href="https://console.cloud.google.com/apis/library/texttospeech.googleapis.com" target="_blank" rel="noopener noreferrer" sx={{ color: '#90caf9' }}>
            Cloud Text-to-Speech API
          </Link>{' '}
          no Google Cloud Console.
        </Typography>
        <Typography variant="body2">
          Selecione o seu projeto (ou crie um novo) e clique em <b>ATIVAR</b>.
        </Typography>
      </>
    ),
  },
  {
    label: 'Crie uma Conta de Serviço (Service Account)',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Para autenticar, você usará uma Conta de Serviço. No menu de navegação, vá para <b>IAM e admin &gt; Contas de serviço</b>.
        </Typography>
        <Typography variant="body2">
          Clique em <b>+ CRIAR CONTA DE SERVIÇO</b>. Dê um nome e uma descrição para a conta (ex: "midiator-tts-user"). Clique em <b>CRIAR E CONTINUAR</b>.
        </Typography>
      </>
    ),
  },
  {
    label: 'Atribua o Papel (Role) correto',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Na etapa "Conceder a esta conta de serviço acesso ao projeto", você precisa dar a permissão para que ela possa usar a API de TTS.
        </Typography>
        <List dense>
            <ListItem>
                <ListItemText primary="Selecione um papel" secondary="Pesquise por e selecione o papel 'Usuário da API Cloud Translation' (Cloud Translation API User). Este papel geralmente inclui as permissões necessárias para o TTS." />
            </ListItem>
        </List>
        <Alert severity="warning" sx={{ mt: 1 }}>
            Se o papel de 'Translation' não funcionar, você pode precisar de um papel mais específico como 'Editor de Projeto' para testes, ou criar um papel customizado com a permissão <b>ml.speechModels.predict</b>.
        </Alert>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Clique em <b>CONTINUAR</b> e depois em <b>CONCLUÍDO</b>.
        </Typography>
      </>
    ),
  },
  {
    label: 'Crie e Baixe a Chave JSON',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Agora que a conta de serviço está criada, você precisa gerar uma chave de autenticação para ela.
        </Typography>
         <List dense>
            <ListItem>
                <ListItemText primary="Encontre a conta de serviço" secondary="Na lista de contas de serviço, encontre a que você acabou de criar." />
            </ListItem>
            <ListItem>
                <ListItemText primary="Crie a chave" secondary="Clique nos três pontos (Ações) ao lado dela, selecione 'Gerenciar chaves', depois 'ADICIONAR CHAVE' e 'Criar nova chave'." />
            </ListItem>
             <ListItem>
                <ListItemText primary="Selecione o formato" secondary="Escolha o formato JSON e clique em CRIAR." />
            </ListItem>
        </List>
        <Typography variant="body2" sx={{ mt: 2 }}>
            Um arquivo JSON será baixado para o seu computador. Este arquivo contém as credenciais.
        </Typography>
      </>
    ),
  },
    {
    label: 'Use as Credenciais no Midiator',
    description: (
      <>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Abra o arquivo JSON que você baixou em um editor de texto. Copie <b>todo o conteúdo</b> do arquivo.
        </Typography>
        <Typography variant="body2">
          Volte para a tela de configuração do Google Cloud TTS no Midiator e cole o conteúdo JSON no campo de texto. Clique em Salvar.
        </Typography>
      </>
    ),
  },
];

const GoogleCloudTTSInfobox = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Passo a Passo: Configurando a API Google Cloud Text-to-Speech
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Siga estas instruções para gerar um arquivo de credenciais JSON para a API de TTS.
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

export default GoogleCloudTTSInfobox;
