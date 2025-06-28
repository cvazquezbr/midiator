# 📖 Guia Completo de Funcionalidades - Midiator Editor Avançado

## 🎯 **Visão Geral**

O Midiator Editor Avançado é uma aplicação React que permite criar imagens personalizadas a partir de dados CSV, com controles de formatação individual para cada campo e funcionalidades de edição estilo Canva.

## 🚀 **Funcionalidades Principais**

### 1. **Editor de Texto Avançado**

#### **Visualização Direta do Conteúdo**
- **Antes**: Caixas com nomes dos campos (ex: "[Título]")
- **Agora**: Conteúdo real dos dados CSV (ex: "Promoção Especial")
- **Benefício**: Preview mais realista do resultado final

#### **Áreas Retangulares para Text Wrapping**
- **Definição**: Cada campo possui uma área retangular definida
- **Funcionalidade**: Texto quebra automaticamente dentro da área
- **Controle**: Largura e altura ajustáveis em porcentagem
- **Inteligência**: Quebra respeitando palavras completas

### 2. **Controles de Redimensionamento Estilo Canva**

#### **8 Handles de Redimensionamento**
```
NW ---- N ---- NE
|              |
W      +       E    (+ = handle central)
|              |
SW ---- S ---- SE
```

#### **Tipos de Controle**:
- **Vértices (NW, NE, SE, SW)**: Redimensiona duas bordas simultaneamente
- **Bordas (N, E, S, W)**: Move apenas uma borda
- **Centro (+)**: Move toda a área sem redimensionar

#### **Feedback Visual**:
- **Cursores contextuais**: Cada handle mostra cursor apropriado
- **Destaque de seleção**: Borda azul quando selecionado
- **Hover effects**: Handles aumentam ao passar o mouse

### 3. **Formatação Individual por Campo**

#### **Configurações de Fonte**
- **Família**: 15+ opções (Arial, Roboto, Montserrat, etc.)
- **Tamanho**: 8px a 120px com slider
- **Peso**: Thin (100) a Black (900)
- **Estilo**: Normal, Itálico, Oblíquo
- **Decoração**: Sublinhado, Sobrelinha, Riscado
- **Cor**: Seletor de cor completo

#### **Efeitos de Texto**
- **Contorno**:
  - Ativação: Switch on/off
  - Cor: Seletor de cor
  - Espessura: 1px a 10px
- **Sombra**:
  - Ativação: Switch on/off
  - Cor: Seletor de cor
  - Desfoque: 0px a 20px
  - Offset X/Y: -20px a +20px

### 4. **Interface de Usuário Avançada**

#### **Stepper Visual**
1. **Upload do CSV**: Carregamento e validação
2. **Upload da Imagem**: Seleção do background
3. **Posicionar e Formatar**: Editor principal
4. **Gerar Imagens**: Processamento final

#### **Indicadores de Status**
- **Registros CSV**: Quantidade de dados carregados
- **Imagem de fundo**: Status do background
- **Campos visíveis**: Contagem de campos ativos
- **Estilos configurados**: Quantidade de formatações

#### **Painel de Formatação**
- **Organização**: Acordeões por categoria
- **Seções**:
  - 📐 Posição e Tamanho
  - 🔤 Fonte
  - 🎨 Estilo
  - ✨ Efeitos

## 🎮 **Como Usar**

### **Passo 1: Upload do CSV**
1. Clique em "Selecionar Arquivo CSV"
2. Escolha arquivo com cabeçalhos na primeira linha
3. Aguarde confirmação de carregamento

### **Passo 2: Upload da Imagem**
1. Clique em "Selecionar Imagem PNG/JPG"
2. Escolha imagem de fundo
3. Visualize preview da imagem

### **Passo 3: Posicionar e Formatar**

#### **Seleção de Campo**
- Clique em qualquer campo de texto para selecioná-lo
- Campo selecionado fica com borda azul e handles visíveis

#### **Movimentação**
- **Arrastar campo**: Clique e arraste o handle central (círculo)
- **Posicionamento preciso**: Use inputs numéricos no painel

#### **Redimensionamento**
- **Bordas**: Arraste handles nas bordas (N, E, S, W)
- **Vértices**: Arraste handles nos cantos (NW, NE, SE, SW)
- **Dimensões precisas**: Use inputs no painel lateral

#### **Formatação**
- **Fonte**: Selecione família, tamanho, peso, estilo
- **Cor**: Use seletor de cor para texto
- **Efeitos**: Configure contorno e sombra
- **Aplicar a todos**: Botão para copiar estilo atual

#### **Ações Rápidas**
- **Centralizar**: Botão para centralizar todos os campos
- **Auto Organizar**: Distribui campos automaticamente
- **Resetar Estilo**: Volta configurações padrão
- **Visibilidade**: Toggle para mostrar/ocultar campo

### **Passo 4: Gerar Imagens**
1. Revise configurações no resumo
2. Clique em "Gerar X Imagens"
3. Aguarde processamento
4. Faça download individual ou em lote

## 🔧 **Funcionalidades Técnicas**

### **Text Wrapping Inteligente**
```javascript
// Algoritmo de quebra de texto
const wrapText = (text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    if (measureText(testLine) > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
};
```

### **Sistema de Coordenadas**
- **Unidade**: Porcentagem (0-100%)
- **Origem**: Canto superior esquerdo (0,0)
- **Conversão**: Automática para pixels na geração

### **Geração de Imagens**
- **Canvas API**: Renderização de alta qualidade
- **Formato**: PNG com transparência
- **Resolução**: Mantém resolução original da imagem de fundo
- **Processamento**: Assíncrono com feedback de progresso

## 🎨 **Dicas de Uso**

### **Melhores Práticas**
1. **Organize campos**: Use "Auto Organizar" como ponto de partida
2. **Teste estilos**: Configure um campo e use "Aplicar a Todos"
3. **Áreas adequadas**: Defina áreas maiores para textos longos
4. **Contraste**: Use contorno para texto sobre fundos complexos
5. **Preview**: Sempre visualize antes de gerar todas as imagens

### **Resolução de Problemas**
- **Texto cortado**: Aumente altura da área
- **Texto não visível**: Verifique cor e contraste
- **Performance lenta**: Reduza quantidade de efeitos
- **Erro de geração**: Verifique se todos os campos estão configurados

## 📊 **Comparação: Antes vs Depois**

| Aspecto | Versão Anterior | Versão Refatorada |
|---------|----------------|-------------------|
| **Visualização** | Caixas com nomes | Conteúdo real |
| **Formatação** | Global | Individual |
| **Posicionamento** | Coordenadas simples | Áreas retangulares |
| **Redimensionamento** | Não disponível | 8 handles estilo Canva |
| **Text Wrapping** | Não disponível | Automático |
| **Interface** | Básica | Stepper profissional |
| **Efeitos** | Limitados | Contorno e sombra |
| **Produtividade** | Manual | Ações em lote |

## 🚀 **Próximos Passos**

Após dominar estas funcionalidades, considere explorar:
- Templates personalizados
- Múltiplas imagens de fundo
- Exportação em diferentes formatos
- Integração com APIs externas

