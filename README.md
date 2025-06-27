# Gerador de Imagens CSV - React MUI

Um componente React completo que permite carregar arquivos CSV, fazer upload de imagens PNG/JPG, posicionar campos do CSV sobre a imagem como background e gerar imagens mescladas para cada registro do arquivo.

## 🚀 Funcionalidades

- ✅ **Upload de CSV**: Leitura e parsing de arquivos CSV com validação
- ✅ **Upload de Imagem**: Suporte para PNG, JPG e JPEG como background
- ✅ **Posicionamento Visual**: Interface drag-and-drop para posicionar campos
- ✅ **Configuração de Fonte**: Seleção de família e tamanho da fonte
- ✅ **Efeitos de Texto**: Contorno, sombra e cores personalizáveis
- ✅ **Geração em Lote**: Criação automática de imagens para todos os registros
- ✅ **Preview e Download**: Visualização e download individual ou em lote
- ✅ **Interface Responsiva**: Design adaptável para desktop e mobile

## 🛠️ Tecnologias Utilizadas

- **React 19** - Framework principal
- **Material-UI (MUI)** - Componentes de interface
- **Papa Parse** - Parsing de arquivos CSV
- **HTML2Canvas** - Geração de imagens
- **Vite** - Build tool e dev server

## 📦 Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Entre no diretório
cd csv-image-generator

# Instale as dependências
pnpm install

# Inicie o servidor de desenvolvimento
pnpm run dev
```

## 🎯 Como Usar

### Passo 1: Upload do CSV
1. Clique em "Selecionar Arquivo CSV"
2. Escolha um arquivo CSV com os dados desejados
3. O sistema detectará automaticamente as colunas

### Passo 2: Upload da Imagem
1. Clique em "Selecionar Imagem PNG/JPG"
2. Escolha a imagem que servirá como background
3. A imagem será exibida para preview

### Passo 3: Configurar Fonte
1. Selecione a família da fonte desejada
2. Ajuste o tamanho usando o slider
3. Visualize o preview da fonte

### Passo 4: Posicionar Campos
1. Arraste os campos sobre a imagem de fundo
2. Use os controles para ajuste fino das posições
3. Configure visibilidade de cada campo
4. Ajuste coordenadas precisas se necessário

### Passo 5: Gerar Imagens
1. Configure efeitos de texto (cor, contorno, sombra)
2. Clique em "Gerar Imagens"
3. Aguarde o processamento
4. Faça download individual ou em lote

## 📁 Estrutura do Projeto

```
csv-image-generator/
├── src/
│   ├── components/
│   │   ├── FieldPositioner.jsx    # Componente de posicionamento
│   │   └── ImageGenerator.jsx     # Componente de geração
│   ├── assets/                    # Arquivos estáticos
│   ├── App.jsx                    # Componente principal
│   └── main.jsx                   # Ponto de entrada
├── public/                        # Arquivos públicos
├── package.json                   # Dependências
└── README.md                      # Documentação
```

## 🎨 Componentes Principais

### App.jsx
- Componente principal com stepper
- Gerenciamento de estado global
- Navegação entre etapas

### FieldPositioner.jsx
- Interface de posicionamento drag-and-drop
- Controles de visibilidade
- Ajuste fino de coordenadas

### ImageGenerator.jsx
- Configurações de texto e efeitos
- Geração de imagens usando Canvas API
- Preview e download das imagens

## 📊 Formato do CSV

O arquivo CSV deve ter cabeçalhos na primeira linha. Exemplo:

```csv
Título,Mensagem,CTA,Descrição
"Título 1","Mensagem 1","Botão 1","Descrição 1"
"Título 2","Mensagem 2","Botão 2","Descrição 2"
```

## 🎛️ Configurações Avançadas

### Efeitos de Texto
- **Cor**: Seletor de cor para o texto
- **Contorno**: Ativação e configuração de contorno
- **Sombra**: Configuração de sombra com blur e offset

### Posicionamento
- **Coordenadas**: Valores em porcentagem (0-100%)
- **Drag & Drop**: Arrastar campos diretamente na imagem
- **Controles Precisos**: Inputs numéricos para ajuste fino

## 🚀 Deploy

Para fazer deploy da aplicação:

```bash
# Build para produção
pnpm run build

# Preview do build
pnpm run preview
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🆘 Suporte

Para suporte ou dúvidas:
- Abra uma issue no GitHub
- Entre em contato através do email

---

Desenvolvido com ❤️ usando React e Material-UI

