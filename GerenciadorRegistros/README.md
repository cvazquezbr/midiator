# GerenciadorRegistros Component

O componente `GerenciadorRegistros` fornece uma interface completa para visualizar, adicionar, editar, excluir e carregar (via CSV) registros de dados. Ele opera inteiramente no lado do cliente, gerenciando os dados em memória durante a sessão de edição.

## Instalação/Uso

1.  **Importar o componente:**
    ```jsx
    import GerenciadorRegistros from './path/to/GerenciadorRegistros/GerenciadorRegistros';
    ```

2.  **Dependências:**
    *   Este componente utiliza a biblioteca `papaparse` para processar arquivos CSV. Certifique-se de que ela esteja instalada no seu projeto (`npm install papaparse` ou `yarn add papaparse`) e que o `CarregadorCSV.jsx` possa importá-la ou acessá-la globalmente (se incluída via CDN).

3.  **Renderizar o componente:**
    ```jsx
    <GerenciadorRegistros
        registrosIniciais={meusDadosIniciais}
        colunasIniciais={minhasColunasIniciais}
        onConcluirEdicao={handleDadosFinais}
    />
    ```

## Props

| Prop               | Tipo                                       | Obrigatório | Padrão | Descrição                                                                                                                                                                                             |
| ------------------ | ------------------------------------------ | ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrosIniciais`| `Array<Object>`                            | Não         | `[]`   | Um array de objetos representando os dados iniciais para popular a tabela. Cada objeto deve idealmente ter uma propriedade `id` única. Se não, um ID interno será gerado.                     |
| `colunasIniciais`  | `Array<string>`                            | Não         | `[]`   | Um array de strings definindo os nomes e a ordem das colunas. Se omitido e `registrosIniciais` for fornecido, as colunas são inferidas do primeiro registro (excluindo `id`).                         |
| `onConcluirEdicao` | `(registros: Array<Object>, colunas: Array<string>) => void` | Sim         |        | Função callback chamada quando o usuário clica em "Concluir Edição". Recebe o array atualizado de registros e o array de colunas como argumentos, permitindo à aplicação pai salvar/processar os dados. |

## Estrutura de Dados dos Registros

Cada objeto no array `registros` (tanto em `registrosIniciais` quanto nos dados retornados por `onConcluirEdicao`) é um objeto simples chave-valor, onde as chaves correspondem aos nomes das colunas.

Exemplo:
```javascript
// Se colunas = ['Nome', 'Email', 'Idade']
const registroExemplo = {
  id: 'reg-1', // ID interno gerado ou do dado inicial
  Nome: 'João Silva',
  Email: 'joao.silva@example.com',
  Idade: 30
};
```

## Funcionalidades

*   **Visualização em Tabela:** Exibe os registros em uma tabela paginada (se implementado) e com cabeçalho fixo.
*   **Adicionar Registro:** Permite adicionar novos registros através de um modal.
    *   **Primeiro Registro:** Se a tabela estiver vazia e sem colunas definidas, o modal de adição permitirá ao usuário definir dinamicamente os nomes das colunas e seus valores para o primeiro registro.
*   **Editar Registro:** Permite editar registros existentes através de um modal.
*   **Excluir Registro:** Permite excluir registros com uma etapa de confirmação em um modal.
*   **Carregar CSV:** Permite carregar dados de um arquivo CSV. A primeira linha do CSV é tratada como cabeçalho (nomes das colunas). Os dados carregados substituem os existentes.
*   **Gerenciamento de Estado Client-Side:** Todas as modificações são mantidas em memória (estado do componente React) durante a sessão.
*   **Retorno de Dados:** Ao concluir, os dados e colunas atualizados são retornados à aplicação pai através da callback `onConcluirEdicao`.

## Componentes Internos (Estrutura)

*   `TabelaRegistros`: Exibe a tabela.
    *   `LinhaRegistro`: Renderiza cada linha da tabela.
*   `ModalRegistro`: Modal para adicionar/editar.
    *   `FormularioRegistro`: Formulário usado dentro do `ModalRegistro`.
*   `ModalConfirmacao`: Modal para confirmações (ex: exclusão).
*   `CarregadorCSV`: Componente para o input de arquivo CSV.

## Estilização

Os componentes utilizam CSS Modules para estilização escopada. Os arquivos `.module.css` correspondentes estão localizados junto com cada componente.

## Considerações Futuras e Melhorias

*   Melhorar a interface de definição de múltiplas colunas ao adicionar o primeiro registro.
*   Permitir especificação de tipos de dados para colunas (para inputs de formulário mais apropriados e validação).
*   Implementar um sistema de notificações "toast" mais elegante em vez de `alert()`.
*   Adicionar funcionalidades de ordenação e filtragem na tabela.
*   Paginação para grandes conjuntos de dados.
*   Testes unitários e de integração mais abrangentes.
```
