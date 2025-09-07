# Correção de Layout: Sobreposição de Controles no Editor de Página

## User Story
Como um criador de campanhas, eu quero que os controles do editor de página (como o título e a navegação de registros) sejam organizados de forma limpa ao redor da área de edição, para que estejam sempre visíveis e não se sobreponham ao conteúdo que estou editando.

## Comportamento Atual (O Bug)
Atualmente, na etapa "Imagem e Formatação", a área de edição principal (o componente `FieldPositioner`) está se sobrepondo aos seus próprios controles. O título "Editor de Página" e o navegador de registros (`<`, `>`, etc.) ficam obscurecidos pelo conteúdo da página, como visto na imagem enviada em `https://i.postimg.cc/GpCwQF2C/Screenshot-20250907-001836-Edge.jpg`.

Múltiplas tentativas de refatorar o layout usando os componentes `Grid` e `Stack` do Material-UI não resolveram o problema, indicando uma questão complexa na estrutura do layout.

## Comportamento Esperado
O layout deve ser estruturado de forma que o título, a área de edição (canvas) e o navegador de registros fiquem organizados verticalmente, sem nenhuma sobreposição. O componente `FieldPositioner` deve ser contido dentro de sua área de layout e não pode "vazar" ou sobrepor outros elementos.

## Arquivos Relevantes
*   `src/components/ImageStep.jsx` (provavelmente onde o layout principal precisa ser corrigido)
*   `src/components/FieldPositioner.jsx` (o componente que contém a área de edição)

## Contexto Adicional
As funcionalidades de fundo (cor/gradiente/imagem), redimensionamento de imagem no upload e o comportamento do painel de propriedades já foram implementadas e devem ser preservadas. O foco exclusivo desta tarefa é corrigir o arranjo visual dos componentes na tela.

## Critérios de Aceitação
1.  O título "Editor de Página" deve estar sempre visível acima da área de edição.
2.  A navegação de registros deve estar sempre visível abaixo da área de edição.
3.  Nenhum elemento da UI deve se sobrepor a outro, tanto na visão de desktop quanto na de mobile.
4.  O painel de formatação lateral (desktop) e a gaveta (mobile) devem continuar funcionando como esperado.
