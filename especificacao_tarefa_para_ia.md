### **Especificação de Tarefa para Análise de Causa Raiz**

**Objetivo:** Analisar as informações fornecidas sobre um bug complexo de gerenciamento de estado em uma aplicação React e avaliar a correção final. A IA deve confirmar a análise da causa raiz e a validade da solução implementada.

---

#### **1. Descrição do Problema (Sintomas)**

Um usuário da aplicação reportou um bug crítico durante a edição de páginas de uma campanha:

1.  Ao adicionar uma nova imagem a uma página (seja por upload manual de um arquivo ou via geração por IA), a imagem aparece brevemente na tela ("pisca").
2.  Imediatamente após, a nova imagem desaparece.
3.  **Crucialmente, todas as edições feitas anteriormente na página (como mover caixas de texto, alterar estilos, etc.) são perdidas, e a página retorna ao seu estado inicial.**
4.  O console do navegador exibe um erro `net::ERR_FILE_NOT_FOUND` para a URL de uma imagem anterior, indicando que a referência a um recurso temporário foi perdida.

---

#### **2. Contexto da Arquitetura e Codebase**

*   **Framework:** A aplicação é construída com **React** e utiliza o **Vite** como ferramenta de build.
*   **Gerenciamento de Estado Global:** É utilizado o **React Context API** para gerenciar o estado global da campanha.
    *   **`src/context/CampaignContext.jsx`**: Este arquivo define o `CampaignProvider` e o `useCampaign` hook. Ele mantém um único e grande objeto de estado chamado `campaignState`.
    *   **Atualizações de Estado:** As atualizações são feitas de forma atômica através de uma única função `setCampaignState`, que é passada para os componentes filhos.
*   **Gerenciamento de Ativos (Imagens):** Quando um usuário faz upload de uma nova imagem ou a gera por IA, a imagem (como um `Blob`) não é salva permanentemente de imediato. Em vez disso:
    1.  Ela é adicionada a um mapa no estado global: `campaignState.pendingAssets`.
    2.  Uma URL temporária (`blob:https://...`) é criada usando `URL.createObjectURL()`.
    3.  Esta `blob:` URL é usada no `src` das tags `<img>` para exibição imediata na UI.
    4.  A revogação dessas URLs (`URL.revokeObjectURL()`) é gerenciada pelo `CampaignContext` para evitar vazamentos de memória.
*   **Estrutura de Componentes Relevantes:**
    *   **`src/pages/HomePage.jsx`**: O principal componente "controlador" que gerencia o fluxo de trabalho da criação de campanhas e renderiza os componentes de cada etapa.
    *   **`src/components/PageGeneratorFrontendOnly.jsx`**: Exibe uma grade de miniaturas de todas as páginas geradas. Clicar em uma miniatura abre o `PageEditor`.
    *   **`src/components/PageEditor.jsx`**: Um componente de diálogo modal (`Dialog`) que abre sobre a UI principal para permitir a edição detalhada de uma **única página**. Este é o epicentro do bug.
    *   **Lógica do `PageEditor`:** Ao ser aberto, o `PageEditor` cria uma **cópia local** do estado da página que está sendo editada (posições dos elementos, estilos, etc.) usando `useState`. Isso permite que o usuário faça alterações isoladas que só são salvas no estado global quando o botão "Salvar" é clicado.

---

#### **3. Jornada de Depuração e Hipóteses**

1.  **Hipótese Inicial (Incorreta):** O problema parecia ser uma revogação prematura da `blob:` URL. A primeira suspeita foi um `useEffect` no `CampaignContext.jsx` cuja matriz de dependências estava configurada incorretamente, fazendo com que ele executasse sua função de limpeza (revogando todas as URLs) toda vez que um novo ativo era adicionado.
    *   **Ação:** Corrigi a matriz de dependências.
    *   **Resultado:** O problema persistiu, indicando que a causa era outra.

2.  **Hipótese Secundária (Incompleta):** A investigação mudou para o `HomePage.jsx`. Havia um `useEffect` responsável por sincronizar a UI com os dados carregados de uma campanha salva. A hipótese era que este `useEffect` estava sendo acionado indevidamente após a adição de uma nova imagem, revertendo todo o estado da UI.
    *   **Ação:** Corrigi a matriz de dependências deste `useEffect` para que ele fosse acionado apenas quando uma campanha inteira fosse carregada.
    *   **Resultado:** O problema persistiu. A descrição do usuário de que "**todas as edições anteriores são perdidas**" foi a pista de que o problema não estava no nível da `HomePage`, mas sim dentro do componente de edição.

3.  **Diagnóstico Final e Causa Raiz Definitiva:** O foco mudou para o `PageEditor.jsx`. A análise revelou a verdadeira cadeia de eventos:
    a. O `PageEditor` possui um `useEffect` principal que inicializa seu estado local (criando a "cópia" para edição) quando o modal é aberto.
    b. A matriz de dependências deste `useEffect` era muito ampla, incluindo objetos (como `pageDataFromHook`) que mudavam sempre que o estado global `campaignState` era atualizado.
    c. Quando o usuário adicionava uma nova imagem, a função `addPendingAsset` atualizava o `campaignState` global.
    d. Essa atualização global fazia com que o `pageDataFromHook` mudasse, o que, por sua vez, **re-disparava o `useEffect` de inicialização do `PageEditor`**.
    e. Consequentemente, o `PageEditor` **descartava todo o seu estado local atual** (incluindo as posições de texto que o usuário havia movido) e **reiniciava-se completamente do zero**, criando uma nova cópia do estado global. É por isso que todas as edições eram perdidas. A imagem antiga era "esquecida" neste processo, levando à revogação de sua URL e ao erro `FILE_NOT_FOUND`.

---

#### **4. A Solução Implementada**

A correção definitiva foi refatorar o `useEffect` principal dentro de `src/components/PageEditor.jsx`.

*   **Antes:** A matriz de dependências era algo como `[open, pageData, pageDataFromHook, csvHeaders]`.
*   **Depois (A Correção):** A matriz de dependências foi alterada para `[open, pageData?.index]`.

**Raciocínio da Correção:**
Esta nova matriz de dependências garante que o `useEffect` de inicialização seja executado **apenas uma vez** quando o editor é aberto para uma página específica (identificada por `pageData.index`). Ele cria um "snapshot" do estado da página para a sessão de edição e, crucialmente, **ignora todas as atualizações subsequentes** no estado global (`pageDataFromHook`, `globalPageTemplate`, etc.). Isso isola o ambiente de edição, preservando o trabalho do usuário até que ele clique em "Salvar", resolvendo assim a perda de estado e os erros em cascata.

---

#### **5. Tarefa para a IA Avaliadora**

Com base em todas as informações fornecidas, sua tarefa é:

1.  **Validar a Análise da Causa Raiz:** Confirme se a "Causa Raiz Definitiva" descrita é a explicação lógica e tecnicamente correta para os sintomas observados, incluindo a perda de edições e o erro `net::ERR_FILE_NOT_FOUND`.
2.  **Avaliar a Solução:** Determine se a solução implementada (a alteração na matriz de dependências do `useEffect` no `PageEditor.jsx`) aborda de forma eficaz e robusta a causa raiz identificada.
3.  **Sugerir Alternativas (Opcional):** Se aplicável, sugira abordagens alternativas ou melhorias adicionais que poderiam ter sido consideradas para resolver este tipo de bug de gerenciamento de estado em React.
