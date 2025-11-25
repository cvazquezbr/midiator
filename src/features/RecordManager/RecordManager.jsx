import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types'; // Adicionado para consistência e boas práticas
import styles from './RecordManager.module.css';
import RecordsGrid from './components/RecordsGrid/RecordsGrid';
import RecordModal from './components/RecordModal/RecordModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal/ConfirmationModal';
import TextEditorDialog from '../../components/TextEditorDialog';

/**
 * @typedef {Object} Registro
 * @property {string|number} id - Identificador único do registro. (Gerado internamente se não fornecido)
 * @property {Object.<string, any>} [outrasChaves] - Pares chave-valor correspondentes às colunas.
 * @example
 * // Se colunas = ['Nome', 'Email', 'Idade']
 * const registroExemplo = {
 *   id: 'reg-1',
 *   Nome: 'João Silva',
 *   Email: 'joao.silva@example.com',
 *   Idade: 30
 * };
 */

/**
 * Componente `RecordManager` (anteriormente GerenciadorRegistros).
 *
 * Fornece uma interface completa para visualizar, adicionar, editar e excluir registros de dados.
 * Opera inteiramente no lado do cliente, gerenciando os dados em memória durante a sessão de edição.
 * A funcionalidade de carregar dados de um CSV foi movida para o componente pai (`App.jsx`),
 * que então passa os dados para este componente através das props `registrosIniciais` e `colunasIniciais`.
 *
 * Funcionalidades Principais:
 * - **Visualização em Tabela:** Exibe os registros em uma tabela.
 * - **Adicionar Registro:** Permite adicionar novos registros através de um modal.
 *   - **Primeiro Registro:** Se a tabela estiver vazia e sem colunas definidas, o modal de adição
 *     permitirá ao usuário definir dinamicamente os nomes das colunas e seus valores para o primeiro registro.
 * - **Editar Registro:** Permite editar registros existentes através de um modal.
 * - **Excluir Registro:** Permite excluir registros com uma etapa de confirmação em um modal.
 * - **Gerenciamento de Estado Client-Side:** Todas as modificações são mantidas em memória (estado do componente React).
 * - **Retorno de Dados:** Ao concluir qualquer operação que altere os dados (salvar, excluir),
 *   os dados e colunas atualizados são retornados à aplicação pai através da callback `onDadosAlterados`.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {Registro[]} [props.registrosIniciais=[]] - Um array de objetos representando os dados iniciais para popular a tabela.
 *                                                  Cada objeto deve idealmente ter uma propriedade `id` única.
 *                                                  Se não, um ID interno será gerado.
 * @param {string[]} [props.colunasIniciais=[]] - Um array de strings definindo os nomes e a ordem das colunas.
 *                                               Se omitido e `registrosIniciais` for fornecido,
 *                                               as colunas são inferidas do primeiro registro (excluindo `id`).
 * @param {(registros: Registro[], colunas: string[]) => void} props.onDadosAlterados - Função callback chamada sempre que os registros ou colunas são alterados.
 *                                                                                  Recebe o array atualizado de registros e o array de colunas.
 * @param {boolean} [props.darkMode=false] - Flag para habilitar o modo escuro.
 */
const RecordManager = ({
    registros: registrosIniciais = [], // Renomeado para clareza, mas usado como registros
    colunas: colunasIniciais = [],   // Renomeado para clareza, mas usado como colunas
    onDadosAlterados,
    darkMode = false,
    sidebarOpen = false,
}) => {
    // O estado local foi removido para tornar este um componente controlado.
    // O componente pai agora é a única fonte da verdade para 'registros' e 'colunas'.
    const [modalAberto, setModalAberto] = useState(null); // null, 'ADICIONAR', 'EDITAR', 'EXCLUIR'
    const [registroSelecionado, setRegistroSelecionado] = useState(null); // Para edição ou exclusão
    const [editingFieldInfo, setEditingFieldInfo] = useState(null); // { recordId, fieldName, content }

    // Simplificação: IDs agora são gerenciados pelo componente pai.
    // A lógica de geração de ID foi removida. O pai é responsável por garantir IDs únicos.

    // O useEffect foi removido. O componente agora renderiza diretamente as props recebidas.
    const registros = registrosIniciais;
    const colunas = colunasIniciais;

    // Efeito para sincronizar o registro selecionado com os dados mais recentes das props.
    // Isso evita que o modal de edição contenha dados obsoletos após uma edição de campo individual.
    useEffect(() => {
        if (registroSelecionado && registroSelecionado.id) {
            const registroAtualizado = registros.find(r => String(r.id) === String(registroSelecionado.id));
            if (registroAtualizado) {
                // Previne re-renderizações desnecessárias se os dados forem os mesmos.
                if (JSON.stringify(registroSelecionado) !== JSON.stringify(registroAtualizado)) {
                    setRegistroSelecionado(registroAtualizado);
                }
            } else {
                // O registro foi excluído, então fecha o modal.
                handleFecharModal();
            }
        }
    }, [registros, registroSelecionado]);


    // Handlers para abrir modais
    const handleAbrirModalAdicionar = () => {
        setRegistroSelecionado(null);
        setModalAberto('ADICIONAR');
    };

    const handleAbrirModalEditar = (registro) => {
        setRegistroSelecionado(registro);
        setModalAberto('EDITAR');
    };

    const handleAbrirModalExcluir = (registro) => {
        setRegistroSelecionado(registro);
        setModalAberto('EXCLUIR');
    };

    const handleFecharModal = () => {
        setModalAberto(null);
        setRegistroSelecionado(null);
    };

    // Handlers para CRUD
    const handleSalvarRegistro = (dadosFormulario, idRegistroExistente) => {
        if (onDadosAlterados) {
            if (idRegistroExistente !== null && idRegistroExistente !== undefined) {
                // Ação para ATUALIZAR um registro existente
                onDadosAlterados({
                    type: 'UPDATE_RECORD',
                    payload: { id: idRegistroExistente, data: dadosFormulario }
                });
            } else {
                // Ação para ADICIONAR um novo registro
                onDadosAlterados({
                    type: 'ADD_RECORD',
                    payload: { data: dadosFormulario }
                });
            }
        }
        handleFecharModal();
    };

    const handleConfirmarExclusao = () => {
        if (registroSelecionado && registroSelecionado.id !== undefined) {
            if (onDadosAlterados) {
                // Ação para EXCLUIR um registro
                onDadosAlterados({
                    type: 'DELETE_RECORD',
                    payload: { id: registroSelecionado.id }
                });
            }
        }
        handleFecharModal();
    };

    // Efeito para chamar onDadosAlterados quando registros ou colunas mudam
    // Removido para evitar loops. onDadosAlterados será chamado diretamente.
    // useEffect(() => {
    //     if (onDadosAlterados) {
    //         onDadosAlterados(JSON.parse(JSON.stringify(registros)), [...colunas]);
    //     }
    // }, [registros, colunas, onDadosAlterados]);

    // const handleConcluir = () => { // Removido - botão de concluir foi removido
    //     if (onConcluirEdicao) { // Agora onDadosAlterados
    //         onConcluirEdicao(JSON.parse(JSON.stringify(registros)), [...colunas]);
    //     }
    // };

    const handleStartEditField = (recordId, fieldName, content) => {
        setEditingFieldInfo({ recordId, fieldName, content });
    };

    const handleCancelEditField = () => {
        setEditingFieldInfo(null);
    };

    const handleSaveField = (newContent) => {
        if (!editingFieldInfo) return;

        const { recordId, fieldName } = editingFieldInfo;

        if (onDadosAlterados) {
            // Ação para ATUALIZAR um campo específico de um registro
            onDadosAlterados({
                type: 'UPDATE_FIELD',
                payload: { id: recordId, fieldName, newContent }
            });
        }
        setEditingFieldInfo(null);
    };

    const containerClasses = `${styles.container} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={containerClasses}>
            <div className={styles.header}>
                <div className={styles.actionsContainer}>
                    <button onClick={handleAbrirModalAdicionar} className={`${styles.btn} ${styles.btnPrimary}`}>
                        &#43; Adicionar Novo Registro
                    </button>
                </div>
            </div>

            <RecordsGrid
                registros={registros}
                colunas={colunas}
                onEditar={handleAbrirModalEditar}
                onExcluir={handleAbrirModalExcluir}
                darkMode={darkMode}
            />

            {modalAberto === 'ADICIONAR' && (
                <RecordModal
                    aberto={true}
                    onFechar={handleFecharModal}
                    onSalvar={handleSalvarRegistro}
                    colunasExistentes={colunas}
                    tituloModal="Adicionar Novo Registro"
                    isPrimeiroRegistro={colunas.length === 0 && registros.length === 0}
                    darkMode={darkMode}
                    onStartEditField={handleStartEditField}
                    sidebarOpen={sidebarOpen}
                />
            )}

            {modalAberto === 'EDITAR' && registroSelecionado && (
                <RecordModal
                    aberto={true}
                    onFechar={handleFecharModal}
                    onSalvar={handleSalvarRegistro}
                    registroParaEditar={registroSelecionado}
                    colunasExistentes={colunas}
                    tituloModal="Editar Registro"
                    isPrimeiroRegistro={false}
                    darkMode={darkMode}
                    onStartEditField={handleStartEditField}
                    sidebarOpen={sidebarOpen}
                />
            )}

            {editingFieldInfo && (
                <TextEditorDialog
                    open={!!editingFieldInfo}
                    onClose={handleCancelEditField}
                    onSave={handleSaveField}
                    title={`Editar ${editingFieldInfo.fieldName}`}
                    content={editingFieldInfo.content}
                    html={true}
                    variant="simple"
                    sidebarOpen={sidebarOpen}
                />
            )}

            {modalAberto === 'EXCLUIR' && registroSelecionado && (
                <ConfirmationModal
                    aberto={true}
                    onFechar={handleFecharModal}
                    onConfirmar={handleConfirmarExclusao}
                    titulo="Confirmar Exclusão"
                    mensagem={`Você tem certeza que deseja excluir o registro? (ID: ${registroSelecionado.id})`}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
};

RecordManager.propTypes = {
    registrosIniciais: PropTypes.arrayOf(PropTypes.object),
    colunasIniciais: PropTypes.arrayOf(PropTypes.string),
    onDadosAlterados: PropTypes.func.isRequired,
    darkMode: PropTypes.bool,
};

RecordManager.defaultProps = {
    registrosIniciais: [],
    colunasIniciais: [],
    darkMode: false,
};

export default RecordManager;
