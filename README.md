# M.I.D.I.A.T.O.R. - Módulo de Integração e Difusão de Informação para Automação de Tarefas em Orquestração de Redes

O M.I.D.I.A.T.O.R. é uma aplicação web full-stack, construída com React e Node.js, projetada para orquestrar a criação e publicação de campanhas de marketing de ponta a ponta. A plataforma integra IA generativa para auxiliar na criação de conteúdo, desde a definição da campanha até a geração de posts, imagens, áudios e vídeos, finalizando com o agendamento e publicação em diversas plataformas.

## 🏛️ Arquitetura

A aplicação é construída sobre uma arquitetura moderna de três camadas, garantindo escalabilidade, segurança e uma experiência de usuário rica.

### 1. Frontend
- **Framework**: **React 18** com **Vite** como build tool.
- **Linguagem**: JavaScript (ESM)
- **UI/UX**: **Material-UI (MUI)** para uma interface rica e responsiva, com suporte a temas claro e escuro.
- **Geração no Navegador**:
    - **Imagens**: `html2canvas` para renderizar componentes React como imagens.
    - **Áudio/Vídeo**: `ffmpeg.wasm` para manipulação de mídia diretamente no cliente.
- **Estado e Roteamento**: Gerenciamento de estado com React Context e roteamento com `react-router-dom`.

### 2. Backend
- **Ambiente**: **Node.js** em um ambiente **Serverless**, hospedado na **Vercel**.
- **API**: Endpoints de API localizados no diretório `api/`, seguindo a convenção da Vercel.
- **Responsabilidades**:
    - **Autenticação**: Gerenciamento de usuários e sessões com JSON Web Tokens (JWT).
    - **Lógica de Negócio**: Orquestração de chamadas para serviços de IA, integrações e acesso ao banco de dados.
    - **Integrações Seguras**: Comunicação segura com APIs de terceiros (Google, LinkedIn, etc.).
- **Armazenamento**: **Vercel Blob** para armazenamento de arquivos gerados, como imagens e vídeos.

### 3. Database
- **Sistema**: **PostgreSQL**.
- **Gerenciamento de Schema**: Migrações SQL (localizadas em `db/migrations/`) para garantir a consistência do banco de dados entre ambientes.
- **Dados Armazenados**: Contas de usuário, campanhas, personas, autores, prompts de IA, paletas de cores e agendamentos de publicação.

## 🚀 Funcionalidades Principais

### 1. Padrões de Campanha
Defina os pilares estratégicos que guiarão toda a geração de conteúdo.
- **Persona**: Crie perfis detalhados do seu público-alvo, definindo cargos, segmentos, dores e desafios (com suporte de IA).
- **Autor**: Defina a voz e a identidade da sua marca (com suporte de IA).
- **Formato e Instruções**: Dê diretrizes claras para a IA sobre a estrutura e o tom do conteúdo.
- **Paleta de Cores**: Estabeleça uma identidade visual consistente, definindo cores manualmente, extraindo de uma imagem ou usando IA.
- **Memorial Descritivo**: Gere um documento consolidado com todos os padrões da campanha.

### 2. Geração de Conteúdo em Lote
Um fluxo de trabalho guiado para transformar suas ideias em conteúdo pronto para publicação.
- **Etapa 1: Definição da Campanha**: Defina o problema e a solução centrais da sua campanha.
- **Etapa 2: Geração de Posts**: Crie conteúdo em lote para redes sociais, seja com IA ou fazendo upload de um arquivo CSV.
- **Etapa 3: Editor Visual Avançado**: Um editor estilo Canva para total controle sobre o design:
  - **Posicionamento Livre**: Arraste e redimensione caixas de texto com 8 handles de controle.
  - **Formatação Individual**: Estilize cada campo com fontes, cores, tamanhos, pesos e efeitos (contorno, sombra).
  - **Text Wrapping**: O texto se ajusta automaticamente dentro das áreas definidas.
- **Etapa 4: Geração de Mídia**:
    - **Imagens**: Produza as imagens finais para cada post.
    - **Áudio**: Crie narrações usando tecnologia Text-to-Speech (TTS) do Google Cloud.
    - **Vídeo**: Transforme imagens e áudios em vídeos dinâmicos.
- **Etapa 5: Publicação e Agendamento**: Envie seu conteúdo para as plataformas conectadas (LinkedIn, WordPress) ou agende para mais tarde.

### 3. Integrações e Recursos
- **Autenticação Simplificada**: Conecte-se facilmente a serviços de terceiros: Google (Gemini, Cloud TTS, Drive), LinkedIn e WordPress.
- **Gestão de Estado**: Salve e carregue o progresso da sua campanha a qualquer momento.
- **Responsividade**: Interface totalmente funcional em desktops e dispositivos móveis.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Vite, Material-UI, Vitest
- **Backend**: Node.js, Serverless (Vercel)
- **Database**: PostgreSQL
- **IA Generativa**: Google Gemini API
- **Mídia no Navegador**: Papa Parse, HTML2Canvas, FFmpeg.wasm, ColorThief
- **APIs de Terceiros**: Google APIs (TTS, Drive), LinkedIn API, WordPress API

## 📦 Instalação e Execução

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>

# 2. Entre no diretório do projeto
cd <nome-do-diretorio>

# 3. Instale as dependências (recomenda-se pnpm ou npm)
# O pnpm é recomendado por causa do pnpm-lock.yaml
pnpm install

# 4. Configure as variáveis de ambiente
# Copie o .env.test para .env e preencha as chaves
cp .env.test .env

# 5. Inicie o servidor de desenvolvimento
pnpm run dev
```
A aplicação estará disponível em `http://localhost:5173`.

## ⚙️ Configuração Inicial

Antes de usar todas as funcionalidades, é necessário configurar as chaves de API para os serviços externos:
1. Clique no ícone de **Configurações** (engrenagem) no canto superior direito.
2. No modal de configuração, insira as chaves e autorize o acesso para:
   - Google Gemini
   - Google Cloud TTS
   - Google Drive
   - LinkedIn
   - WordPress

## 🤝 Contribuição

Contribuições são bem-vindas! Siga os passos abaixo:
1. Faça um Fork do projeto.
2. Crie uma branch para sua nova feature (`git checkout -b feature/AmazingFeature`).
3. Faça o commit de suas mudanças (`git commit -m 'Add some AmazingFeature'`).
4. Faça o push para a branch (`git push origin feature/AmazingFeature`).
5. Abra um Pull Request.

## 📝 Licença

Todos os direitos reservados.
