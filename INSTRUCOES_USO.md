# 📋 Instruções Detalhadas de Uso

## 🎯 Objetivo
Este componente permite transformar dados de um arquivo CSV em imagens personalizadas, posicionando os campos sobre uma imagem de fundo.

## 📝 Pré-requisitos

### Arquivo CSV
- Deve ter cabeçalhos na primeira linha
- Codificação UTF-8 recomendada
- Separador: vírgula (,)
- Campos com texto longo devem estar entre aspas

### Imagem de Fundo
- Formatos suportados: PNG, JPG, JPEG
- Resolução recomendada: 1080x1080px ou superior
- Qualidade alta para melhor resultado final

## 🔄 Fluxo de Trabalho

### 1️⃣ Preparação dos Dados
```csv
Título,Mensagem,CTA,Descrição
"De ideia a solução real","A FATTO une estratégia...","Fale com um especialista","Transforme sua visão..."
```

### 2️⃣ Upload do CSV
- Clique em "Selecionar Arquivo CSV"
- Aguarde o processamento
- Verifique se todos os campos foram detectados

### 3️⃣ Upload da Imagem
- Clique em "Selecionar Imagem PNG/JPG"
- Escolha uma imagem com boa resolução
- Verifique o preview

### 4️⃣ Configuração da Fonte
- **Família**: Escolha entre as opções disponíveis
- **Tamanho**: Ajuste conforme o tamanho da imagem
- **Preview**: Visualize como ficará o texto

### 5️⃣ Posicionamento dos Campos

#### Método 1: Drag & Drop
1. Arraste os campos diretamente sobre a imagem
2. Posicione onde desejar
3. Os campos se ajustam automaticamente

#### Método 2: Controles Precisos
1. Use os campos X% e Y% para posicionamento exato
2. X: 0% = esquerda, 100% = direita
3. Y: 0% = topo, 100% = base

#### Controles Adicionais
- **Visibilidade**: Ative/desative campos específicos
- **Centralizar**: Botão para centralizar rapidamente
- **Preview**: Veja dados reais do primeiro registro

### 6️⃣ Configuração de Efeitos

#### Cor do Texto
- Use o seletor de cor
- Considere o contraste com o fundo

#### Contorno (Opcional)
- Ative para melhor legibilidade
- Ajuste cor e espessura
- Útil em fundos complexos

#### Sombra (Opcional)
- Configure blur e offset
- Melhora a legibilidade
- Cria profundidade visual

### 7️⃣ Geração das Imagens
1. Clique em "Gerar X Imagens"
2. Aguarde o processamento
3. Visualize os resultados
4. Faça download individual ou em lote

## 💡 Dicas e Boas Práticas

### 📐 Posicionamento
- Deixe margens adequadas nas bordas
- Evite sobrepor campos importantes
- Teste com textos de tamanhos diferentes
- Use o primeiro registro como referência

### 🎨 Design
- Escolha fontes legíveis
- Mantenha consistência visual
- Use contorno em fundos complexos
- Teste diferentes tamanhos de fonte

### 📊 Dados
- Mantenha textos concisos
- Evite caracteres especiais problemáticos
- Teste com acentos e caracteres especiais
- Verifique quebras de linha automáticas

### ⚡ Performance
- Imagens muito grandes podem ser lentas
- Muitos registros levam mais tempo
- Feche outras abas durante a geração
- Aguarde completar antes de nova geração

## 🔧 Solução de Problemas

### CSV não carrega
- Verifique a codificação (UTF-8)
- Confirme se há cabeçalhos
- Teste com arquivo menor primeiro

### Imagem não aparece
- Verifique o formato (PNG/JPG)
- Teste com imagem menor
- Confirme se não está corrompida

### Campos não aparecem
- Verifique se estão visíveis
- Confirme se estão dentro da imagem
- Ajuste o tamanho da fonte

### Texto cortado
- Reduza o tamanho da fonte
- Ajuste a posição
- Verifique quebras de linha

### Geração lenta
- Reduza o tamanho da imagem
- Diminua o número de registros
- Feche outras aplicações

## 📱 Responsividade

O componente funciona em:
- ✅ Desktop (recomendado)
- ✅ Tablet
- ⚠️ Mobile (funcionalidade limitada)

## 🎯 Casos de Uso

### Marketing Digital
- Posts para Instagram
- Banners para Facebook
- Stories personalizados
- Campanhas em lote

### Eventos
- Certificados personalizados
- Crachás de identificação
- Convites em massa
- Material promocional

### E-commerce
- Banners de produtos
- Promoções personalizadas
- Catálogos visuais
- Material de vendas

## 📞 Suporte

Se encontrar problemas:
1. Verifique as instruções acima
2. Teste com dados menores
3. Confirme os formatos de arquivo
4. Entre em contato para suporte técnico

