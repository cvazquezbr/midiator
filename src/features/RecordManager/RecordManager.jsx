import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types'; // Adicionado para consistência e boas práticas
import styles from './RecordManager.module.css';
import RecordsTable from './components/RecordsTable/RecordsTable';
import RecordModal from './components/RecordModal/RecordModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal/ConfirmationModal';
// PapaParse não é mais usado diretamente aqui, apenas em App.jsx

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
    registrosIniciais = [],
    colunasIniciais = [],
    onDadosAlterados,
    darkMode = false
}) => {
    const [registros, setRegistros] = useState([]);
    const [colunas, setColunas] = useState([]);
    const [modalAberto, setModalAberto] = useState(null); // null, 'ADICIONAR', 'EDITAR', 'EXCLUIR'
    const [registroSelecionado, setRegistroSelecionado] = useState(null); // Para edição ou exclusão
    const [proximoId, setProximoId] = useState(1);

    // Renomeado para indicar que é para um único novo registro.
    const gerarIdParaNovoRegistroSingular = useCallback(() => {
        const novoIdValor = proximoId;
        setProximoId(prevId => prevId + 1);
        return `reg-${novoIdValor}`;
    }, [proximoId]);

    // Inicialização e sincronização com props externas
    useEffect(() => {
        let maxIdCalculado = 0;
        registrosIniciais.forEach(reg => {
            if (reg.id !== undefined && reg.id !== null) {
                const numIdMatch = String(reg.id).match(/\d+$/);
                if (numIdMatch) {
                    const numId = parseInt(numIdMatch[0], 10);
                    if (numId > maxIdCalculado) {
                        maxIdCalculado = numId;
                    }
                }
            }
        });

        let idCounterParaLote = maxIdCalculado + 1;

        const dadosProcessados = registrosIniciais.map(reg => {
            const idOriginal = reg.id;
            let idFinal;
            if (idOriginal !== undefined && idOriginal !== null) {
                idFinal = String(idOriginal);
            } else {
                idFinal = `reg-${idCounterParaLote}`;
                idCounterParaLote++;
            }
            return { ...reg, id: idFinal };
        });

        setRegistros(dadosProcessados);
        setProximoId(idCounterParaLote); // Atualiza o proximoId global com base no último ID gerado em lote

        let currentCols;
        if (colunasIniciais && colunasIniciais.length > 0) {
            currentCols = [...new Set(colunasIniciais)];
        } else if (dadosProcessados.length > 0 && dadosProcessados[0]) {
            currentCols = Object.keys(dadosProcessados[0]).filter(k => k !== 'id');
        } else {
            currentCols = [];
        }
        setColunas(currentCols);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registrosIniciais, colunasIniciais, proximoId]); // proximoId é necessário como dependência porque é lido para inicializar idCounterParaLote.
                                                      // A lógica de maxIdCalculado e idCounterParaLote garante que os IDs sejam únicos por lote.

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
        let novosRegistros;
        let novasColunas = colunas; // Preserva as colunas atuais por padrão

        if (idRegistroExistente !== null && idRegistroExistente !== undefined) {
            novosRegistros = registros.map(reg =>
                String(reg.id) === String(idRegistroExistente) ? { ...reg, ...dadosFormulario } : reg
            );
            setRegistros(novosRegistros);
        } else {
            if (dadosFormulario._novasColunas) {
                const { _novasColunas, ...primeiroRegistroData } = dadosFormulario;
                novasColunas = [...new Set(_novasColunas.filter(Boolean))];
                setColunas(novasColunas);
                novosRegistros = [{ id: gerarIdParaNovoRegistroSingular(), ...primeiroRegistroData }];
                setRegistros(novosRegistros);
            } else {
                novosRegistros = [
                    ...registros,
                    { id: gerarIdParaNovoRegistroSingular(), ...dadosFormulario },
                ];
                setRegistros(novosRegistros);
            }
        }

        if (onDadosAlterados) {
            onDadosAlterados(JSON.parse(JSON.stringify(novosRegistros)), [...novasColunas]);
        }
        handleFecharModal();
    };

    const handleConfirmarExclusao = () => {
        // console.log('[GR] handleConfirmarExclusao - Início. Registro Selecionado:', JSON.parse(JSON.stringify(registroSelecionado)));
        // console.log('[GR] handleConfirmarExclusao - Todos os Registros ANTES:', JSON.parse(JSON.stringify(registros)));

        if (registroSelecionado && registroSelecionado.id !== undefined) {
            const idParaExcluir = String(registroSelecionado.id);
            // console.log('[GR] ID para excluir:', idParaExcluir);

            const registrosAposExclusao = registros.filter(reg => {
                const idAtual = String(reg.id);
                return idAtual !== idParaExcluir;
            });

            // console.log('[GR] Registros APÓS filtrar:', JSON.parse(JSON.stringify(registrosAposExclusao)));

            setRegistros(registrosAposExclusao);

            if (onDadosAlterados) {
                // console.log('[GR] Chamando onDadosAlterados com Registros:', JSON.parse(JSON.stringify(registrosAposExclusao)), 'Colunas:', [...colunas]);
                onDadosAlterados(
                    JSON.parse(JSON.stringify(registrosAposExclusao)),
                    [...colunas]
                );
            }
        } else {
            // console.warn('[GR] Tentativa de exclusão sem registro selecionado ou ID indefinido.');
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

  const containerClasses = `${styles.container} ${darkMode ? styles.darkMode : ''}`;

    return (
    <div className={containerClasses}>
            <div className={styles.header}>
                <h1>Gerenciar Registros</h1>
                <div className={styles.actionsContainer}>
                    <button onClick={handleAbrirModalAdicionar} className={`${styles.btn} ${styles.btnPrimary}`}>
                        &#43; Adicionar Novo
                    </button>
                    {/* O carregamento de CSV agora é tratado pelo App.jsx na etapa inicial */}
                </div>
            </div>

            <RecordsTable
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
                    // Passa true se não houver colunas E não houver registros,
                    // indicando que o formulário deve permitir definir colunas.
                    isPrimeiroRegistro={colunas.length === 0 && registros.length === 0}
                    darkMode={darkMode}
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

      {/* Botão de concluir edição removido, pois a navegação é feita pelo App.jsx */}
      {/* <div className={styles.actionsFooter}>
        <button onClick={handleConcluir} className={`${styles.btn} ${styles.btnSuccess}`}>
          Concluir Edição e Retornar Dados
        </button>
      </div> */}
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
