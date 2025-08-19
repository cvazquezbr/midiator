# Midiator - Versão Frontend Only com Google Drive

Esta é uma versão 100% frontend do projeto [Midiator](https://github.com/cvazquezbr/midiator) que integra diretamente com Google Drive usando a conta Google do usuário.

## ✨ Características Principais

### 🔐 Autenticação 100% Frontend
- **OAuth 2.0 direto no navegador**: Usuário faz login com sua própria conta Google
- **Sem backend necessário**: Toda integração via Google API JavaScript Client Library
- **Dados seguros**: Credenciais ficam apenas no navegador do usuário
- **Acesso pessoal**: Usa o Google Drive pessoal do usuário

### 🚀 Funcionalidades

Após a geração das imagens, o sistema:

1. **Cria uma nova pasta no Google Drive** do usuário com nome personalizado
2. **Faz upload de todas as imagens** para essa pasta
3. **Torna as imagens públicas** para acesso via link
4. **Cria uma planilha Google Sheets** na mesma pasta com:
   - **Coluna A**: Sequencial (1, 2, 3...)
   - **Coluna B**: Link direto para cada imagem
   - **Demais colunas**: Todos os campos do CSV original

## 🏗️ Arquitetura

```
Frontend React (100%)
├── Google API JavaScript Client Library
├── OAuth 2.0 Authentication
├── Google Drive API v3
└── Google Sheets API v4
```

**Sem backend necessário!** Toda a integração é feita diretamente no navegador.

## 📋 Pré-requisitos

1. **Conta Google** com acesso ao Google Drive
2. **Projeto no Google Cloud Platform** com APIs ativadas
3. **Credenciais OAuth 2.0** configuradas

## ⚙️ Configuração

### 1. Google Cloud Platform

#### 1.1 Criar Projeto
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto: "Midiator Frontend"

#### 1.2 Ativar APIs
Ative as seguintes APIs:
- **Google Drive API**
- **Google Sheets API**

#### 1.3 Criar Credenciais OAuth 2.0
1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Escolha "Web application"
4. Configure:
   - **Name**: Midiator Frontend
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (desenvolvimento)
     - `https://seu-dominio.com` (produção)
   - **Authorized redirect URIs**: (deixe vazio para aplicações JavaScript)

#### 1.4 Criar API Key
1. Clique em "Create Credentials" > "API Key"
2. Restrinja a chave (recomendado):
   - **Application restrictions**: HTTP referrers
   - **API restrictions**: Google Drive API, Google Sheets API

### 2. Instalação

```bash
# Clonar/baixar o projeto
cd midiator_frontend_only

# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev
```

### 3. Configuração na Interface

1. **Acesse a aplicação** em `http://localhost:5173`
2. **Vá até a etapa de geração** (Passo 4)
3. **Ative a integração** com Google Drive
4. **Clique em "Configurar Google Drive"**
5. **Insira suas credenciais**:
   - API Key (obtida no passo 1.4)
   - Client ID (obtido no passo 1.3)
6. **Faça login** com sua conta Google
7. **Autorize** o acesso ao Drive e Sheets

## 🎯 Como Usar

### Fluxo Completo

1. **Upload CSV**: Carregue arquivo com dados
2. **Upload Imagem**: Defina imagem de fundo  
3. **Configurar Campos**: Posicione e formate textos
4. **Configurar Google Drive**:
   - Ative a integração
   - Configure credenciais (uma vez)
   - Defina nome do projeto
5. **Gerar Imagens**: Clique em "Gerar X Imagens"

### Resultado Automático

- ✅ **Pasta criada** no seu Google Drive
- ✅ **Imagens enviadas** e organizadas
- ✅ **Planilha criada** com dados estruturados:

```
| Sequencial | Link_Imagem | Nome | Idade | Cidade |
|------------|-------------|------|-------|--------|
| 1          | https://... | João | 30    | SP     |
| 2          | https://... | Maria| 25    | RJ     |
```

## 🔒 Segurança e Privacidade

### ✅ Vantagens da Abordagem Frontend-Only

- **Dados locais**: Credenciais ficam apenas no seu navegador
- **Sem intermediários**: Comunicação direta com APIs do Google
- **Controle total**: Você controla seus próprios dados
- **Transparência**: Código aberto e auditável

### 🔐 Fluxo de Autenticação

1. **Usuário insere credenciais** (API Key + Client ID)
2. **JavaScript carrega Google API** Client Library
3. **Popup de login** abre com domínio google.com
4. **Usuário autoriza** acesso ao Drive/Sheets
5. **Token de acesso** fica na memória do navegador
6. **Operações** são feitas diretamente com Google APIs

## 📁 Estrutura do Projeto

```
midiator_frontend_only/
├── src/
│   ├── components/
│   │   ├── ImageGeneratorFrontendOnly.jsx  # Gerador principal
│   │   ├── GoogleAuthSetup.jsx             # Configuração OAuth
│   │   └── ...                             # Outros componentes
│   ├── utils/
│   │   └── googleDriveAPI.js               # Wrapper da Google API
│   └── App.jsx                             # App principal
├── package.json                            # Dependências
└── README_FRONTEND_ONLY.md                 # Esta documentação
```

## 🛠️ Tecnologias Utilizadas

- **React 18**: Framework frontend
- **Material-UI**: Interface de usuário
- **Google API JavaScript Client Library**: Integração com Google
- **Vite**: Build tool e dev server

## 🚀 Deploy

### Opção 1: Netlify/Vercel
```bash
npm run build
# Upload da pasta dist/
```

### Opção 2: GitHub Pages
```bash
npm run build
# Commit da pasta dist/ para gh-pages branch
```

### Opção 3: Servidor próprio
```bash
npm run build
# Servir pasta dist/ com nginx/apache
```

**Importante**: Atualize as "Authorized JavaScript origins" no Google Cloud Console com a URL de produção.

## 🔧 Troubleshooting

### Erro: "API Key inválida"
- Verifique se a API Key está correta
- Confirme se as APIs estão ativadas
- Verifique restrições da chave

### Erro: "Client ID inválido"
- Confirme se o Client ID está correto
- Verifique se a origem está autorizada
- Teste em localhost primeiro

### Erro: "Acesso negado"
- Usuário precisa autorizar acesso
- Verifique escopos solicitados
- Tente fazer logout e login novamente

### Erro: "Quota excedida"
- Google Drive tem limites de API
- Aguarde alguns minutos
- Considere otimizar uploads

## 📊 Limitações

- **Quota da API**: Google limita requisições por minuto
- **Tamanho de arquivos**: Limite de upload do Google Drive
- **Navegador**: Requer JavaScript habilitado
- **Internet**: Necessária conexão estável

## 🆚 Comparação: Frontend vs Backend

| Aspecto | Frontend Only | Com Backend |
|---------|---------------|-------------|
| **Configuração** | Simples | Complexa |
| **Segurança** | Alta (dados locais) | Média (servidor) |
| **Escalabilidade** | Limitada por quotas | Melhor |
| **Manutenção** | Mínima | Requer servidor |
| **Custo** | Gratuito | Hosting necessário |
| **Controle** | Total pelo usuário | Compartilhado |

## 🎉 Vantagens desta Versão

1. **Simplicidade**: Sem backend para configurar
2. **Segurança**: Dados ficam com o usuário
3. **Custo**: Totalmente gratuito
4. **Velocidade**: Deploy instantâneo
5. **Transparência**: Código 100% visível
6. **Controle**: Usuário tem controle total

## 📞 Suporte

Para dúvidas:
1. Verifique a documentação do Google Cloud
2. Consulte logs do navegador (F12)
3. Teste com dados menores primeiro
4. Verifique configurações de CORS

---

**🎯 Ideal para**: Usuários que querem controle total, simplicidade de deploy e máxima segurança dos dados.

