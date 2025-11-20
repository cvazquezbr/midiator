
import React from 'react';
import { Typography, Box, Link, List, ListItem, ListItemText } from '@mui/material';

const VertexAIInfobox = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configurando a Geração de Imagem com a Vertex AI
      </Typography>
      <Typography variant="body1" paragraph>
        Para gerar imagens, nossa aplicação utiliza a API Vertex AI do Google Cloud, que requer um método de autenticação seguro chamado "Conta de Serviço". Você precisará criar uma credencial de Conta de Serviço em seu projeto Google Cloud e colar o conteúdo do arquivo JSON gerado aqui.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Passos para Configuração:
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary="1. Acesse o Google Cloud Console"
            secondary={
              <>
                Navegue até a seção "IAM & Admin" > "Service Accounts" ou clique neste {' '}
                <Link href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer">
                  link direto
                </Link>.
              </>
            }
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="2. Crie ou Selecione uma Conta de Serviço"
            secondary="Crie uma nova conta de serviço ou selecione uma existente. Recomendamos dar a ela o papel de 'Vertex AI User' para garantir que ela tenha as permissões necessárias."
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="3. Gere uma Nova Chave"
            secondary="Clique na sua conta de serviço, vá para a aba 'KEYS', clique em 'ADD KEY', e escolha 'Create new key'. Selecione 'JSON' como o tipo de chave. Um arquivo .json será baixado para o seu computador."
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="4. Cole o Conteúdo do Arquivo"
            secondary="Abra o arquivo JSON que você baixou, copie todo o seu conteúdo e cole-o no campo 'Chave da Conta de Serviço (JSON)' na nossa aplicação."
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="5. Preencha o ID do Projeto e a Região"
            secondary="Você pode encontrar o ID do seu projeto no painel principal do Google Cloud. Uma região comum para usar é 'us-central1'."
          />
        </ListItem>
      </List>
      <Typography variant="body2" color="text.secondary" paragraph>
        Armazenamos essas credenciais de forma segura. Elas são usadas apenas pelo nosso servidor para se autenticar com o Google em seu nome e nunca são expostas no lado do cliente.
      </Typography>
    </Box>
  );
};

export default VertexAIInfobox;
