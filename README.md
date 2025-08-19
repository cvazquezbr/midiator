# M.I.D.I.A.T.O.R. - Módulo de Integração e Difusão de Informação para Automação de Tarefas em Orquestração de Redes

O M.I.D.I.A.T.O.R. é uma aplicação front-end completa, construída com React e Material-UI, projetada para orquestrar a criação e publicação de campanhas de marketing de ponta a ponta. A plataforma integra IA generativa para auxiliar na criação de conteúdo, desde a definição da campanha até a geração de posts, imagens, áudios e vídeos, finalizando com a publicação em diversas plataformas.

## 🚀 Funcionalidades Principais

### 1. Padrões de Campanha
A base de qualquer campanha de sucesso. Defina os pilares estratégicos que guiarão toda a geração de conteúdo.
- **Persona**: Crie perfis detalhados do seu público-alvo, definindo cargos, segmentos, dores e desafios. A criação pode ser manual ou assistida por IA.
- **Autor**: Defina a voz e a identidade da sua marca, incluindo descrição, tipo de organização e objetivos estratégicos. Também com suporte de IA.
- **Formato e Instruções**: Dê diretrizes claras para a IA sobre a estrutura e o tom do conteúdo a ser gerado.
- **Paleta de Cores**: Estabeleça uma identidade visual consistente, definindo cores manualmente, extraindo de uma imagem de referência ou usando o assistente de IA.
- **Memorial Descritivo**: Gere um documento consolidado com todos os padrões da campanha para fácil referência.

### 2. Geração de Conteúdo em Etapas
Um fluxo de trabalho guiado para transformar suas ideias em conteúdo pronto para publicação.
- **Etapa 1: Campanha**: Defina o problema e a solução centrais da sua campanha. A plataforma orquestra a geração de textos, imagens e posts a partir desta base.
- **Etapa 2: Posts Curtos**: Crie conteúdo em lote para redes sociais.
  - **Geração com IA**: Use um prompt para que a IA gere uma tabela de posts.
  - **Upload de CSV**: Carregue um arquivo CSV com conteúdo pré-definido.
- **Etapa 3: Upload de Imagem**: Defina uma imagem de fundo para suas criações.
- **Etapa 4: Posicionar e Formatar**: Um editor visual avançado, estilo Canva, para total controle sobre o design:
  - **Movimentação e Redimensionamento**: Arraste e redimensione caixas de texto com 8 handles de controle.
  - **Formatação Individual**: Estilize cada campo de forma independente com mais de 15 fontes, cores, tamanhos e pesos.
  - **Text Wrapping**: O texto se ajusta automaticamente dentro das áreas definidas.
  - **Efeitos Avançados**: Adicione contornos e sombras personalizáveis ao texto.
- **Etapa 5: Gerar Imagens**: Produza as imagens finais para cada post, combinando o texto estilizado com a imagem de fundo.
- **Etapa 6: Gerar Áudio**: Crie narrações para seus posts ou vídeos usando tecnologia Text-to-Speech (TTS).
- **Etapa 7: Gerar Vídeo**: Transforme suas imagens e áudios gerados em vídeos dinâmicos.
- **Etapa 8: Publicar**: Envie seu conteúdo final para as plataformas conectadas.

### 3. Recursos e Integrações
- **Autenticação Simplificada**: Conecte-se facilmente a serviços de terceiros através de um modal de configuração central:
  - Google Gemini (IA Generativa)
  - Google Cloud TTS (Áudio)
  - Google Drive (Upload/Download)
  - LinkedIn
  - WordPress
- **Gestão de Estado**: Salve todo o progresso da sua campanha em um arquivo e carregue-o posteriormente para continuar de onde parou.
- **UI Moderna e Responsiva**: Interface construída com Material-UI, com suporte a temas claro e escuro, totalmente funcional em desktops e dispositivos móveis.

## 🛠️ Tecnologias Utilizadas

- **React 19** - Framework principal
- **Material-UI (MUI)** - Componentes de interface
- **Vite** - Build tool e servidor de desenvolvimento
- **Papa Parse** - Processamento de arquivos CSV
- **HTML2Canvas** - Geração de imagens a partir do DOM
- **FFmpeg.wasm** - Manipulação de vídeo e áudio no navegador
- **ColorThief** - Extração de paleta de cores de imagens
- **IA Generativa** - Integração com a API do Google Gemini

## 📦 Instalação e Execução

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>

# 2. Entre no diretório do projeto
cd midiator-google-drive-frontend

# 3. Instale as dependências (recomenda-se pnpm)
pnpm install

# 4. Inicie o servidor de desenvolvimento
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
