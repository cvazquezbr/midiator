import React, { useState, useEffect, useCallback } from 'react';
import styles from './GerenciadorRegistros.module.css';
import TabelaRegistros from './TabelaRegistros/TabelaRegistros';
import ModalRegistro from './ModalRegistro/ModalRegistro';
import ModalConfirmacao from './ModalConfirmacao/ModalConfirmacao';
import CarregadorCSV from './CarregadorCSV/CarregadorCSV';
// Assumindo que PapaParse será importado em CarregadorCSV ou globalmente

const GerenciadorRegistros = ({
    registrosIniciais = [],
    colunasIniciais = [],
    onConcluirEdicao,
    darkMode = false // Nova prop para modo escuro
}) => {
    const [registros, setRegistros] = useState([]);
    const [colunas, setColunas] = useState([]);
    const [modalAberto, setModalAberto] = useState(null); // null, 'ADICIONAR', 'EDITAR', 'EXCLUIR'
    const [registroSelecionado, setRegistroSelecionado] = useState(null); // Para edição ou exclusão
    const [proximoId, setProximoId] = useState(1);

    // Função para gerar IDs únicos para novos registros
    const gerarIdUnico = useCallback(() => {
        const novoId = proximoId;
        setProximoId(prevId => prevId + 1);
        return `reg-${novoId}`; // Adiciona um prefixo para evitar conflitos com IDs numéricos puros
    }, [proximoId]);

    // Inicialização e sincronização com props externas
    useEffect(() => {
        // console.log("Efeito de inicialização disparado. Registros Iniciais:", registrosIniciais, "Colunas Iniciais:", colunasIniciais);
        let maxId = 0;
        const dadosProcessados = registrosIniciais.map(reg => {
            const idOriginal = reg.id;
            let idFinal = (idOriginal !== undefined && idOriginal !== null) ? String(idOriginal) : gerarIdUnico();

            const numIdMatch = String(idFinal).match(/\d+$/);
            if (numIdMatch) {
                const numId = parseInt(numIdMatch[0], 10);
                if (numId >= maxId) { // Ajusta maxId para o cálculo do próximoId
                    maxId = numId;
                }
            }
            return { ...reg, id: idFinal };
        });

        setRegistros(dadosProcessados);
        // Define proximoId para ser um a mais que o maior ID numérico encontrado, ou 1 se nenhum ID numérico foi encontrado.
        setProximoId(maxId + 1);


        if (colunasIniciais && colunasIniciais.length > 0) {
            setColunas([...new Set(colunasIniciais)]);
        } else if (dadosProcessados.length > 0) {
            setColunas(Object.keys(dadosProcessados[0]).filter(k => k !== 'id'));
        } else {
            setColunas([]);
        }
    }, [registrosIniciais, colunasIniciais, gerarIdUnico]);


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
        if (idRegistroExistente !== null && idRegistroExistente !== undefined) {
            setRegistros(prevRegistros =>
                prevRegistros.map(reg =>
                    String(reg.id) === String(idRegistroExistente) ? { ...reg, ...dadosFormulario } : reg
                )
            );
        } else {
            if (dadosFormulario._novasColunas) {
                const { _novasColunas, ...primeiroRegistroData } = dadosFormulario;
                const novasColunasUnicas = [...new Set(_novasColunas.filter(Boolean))]; // Filtra vazias e garante unicidade
                setColunas(novasColunasUnicas);
                setRegistros([{ id: gerarIdUnico(), ...primeiroRegistroData }]);
            } else {
                setRegistros(prevRegistros => [
                    ...prevRegistros,
                    { id: gerarIdUnico(), ...dadosFormulario },
                ]);
            }
        }
        handleFecharModal();
    };

    const handleConfirmarExclusao = () => {
        if (registroSelecionado && registroSelecionado.id !== undefined) {
            setRegistros(prevRegistros =>
                prevRegistros.filter(reg => String(reg.id) !== String(registroSelecionado.id))
            );
        }
        handleFecharModal();
    };

    // Handler para CSV
    const handleCSVProcessado = (dadosCSV, colunasCSV) => {
        const colunasUnicasCSV = [...new Set(colunasCSV.filter(Boolean))];
        setColunas(colunasUnicasCSV);

        let currentMaxId = proximoId -1; // Pega o último ID usado antes de processar o CSV

        const novosRegistros = dadosCSV.map(item => {
            currentMaxId++;
            const novoRegistro = { id: `reg-${currentMaxId}` };
            colunasUnicasCSV.forEach(coluna => {
                novoRegistro[coluna] = item[coluna] !== undefined && item[coluna] !== null ? String(item[coluna]) : '';
            });
            return novoRegistro;
        });
        setProximoId(currentMaxId + 1); // Atualiza proximoId globalmente
        setRegistros(novosRegistros);

        console.log("CSV Processado. Colunas:", colunasUnicasCSV, "Registros:", novosRegistros);
        alert(`${novosRegistros.length} registros carregados do CSV!`);
        if (modalAberto === 'ADICIONAR' && (registros.length === 0 && colunas.length === 0) ) { // Se o modal de primeiro add estava aberto
            handleFecharModal();
        }
    };

    const handleConcluir = () => {
        if (onConcluirEdicao) {
            onConcluirEdicao(JSON.parse(JSON.stringify(registros)), [...colunas]);
        }
        // console.log('Concluir Edição. Dados atuais:', registros, colunas);
        // alert('Dados prontos para serem salvos pela aplicação principal. Ver console.');
    };

  const containerClasses = `${styles.container} ${darkMode ? styles.darkMode : ''}`;

    return (
    <div className={containerClasses}>
            <div className={styles.header}>
                <h1>Gerenciar Registros</h1>
                <div className={styles.actionsContainer}>
                    <button onClick={handleAbrirModalAdicionar} className={`${styles.btn} ${styles.btnPrimary}`}>
                        &#43; Adicionar Novo
                    </button>
                    <CarregadorCSV onCSVProcessado={handleCSVProcessado} darkMode={darkMode} />
                </div>
            </div>

            <TabelaRegistros
                registros={registros}
                colunas={colunas}
                onEditar={handleAbrirModalEditar}
                onExcluir={handleAbrirModalExcluir}
        darkMode={darkMode}
            />

            {modalAberto === 'ADICIONAR' && (
                <ModalRegistro
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
                <ModalRegistro
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
                <ModalConfirmacao
                    aberto={true}
                    onFechar={handleFecharModal}
                    onConfirmar={handleConfirmarExclusao}
                    titulo="Confirmar Exclusão"
                    mensagem={`Você tem certeza que deseja excluir o registro? (ID: ${registroSelecionado.id})`}
          darkMode={darkMode}
                />
            )}

      {/* Botão de concluir edição sempre visível para permitir sair mesmo sem registros */}
      <div className={styles.actionsFooter}>
        <button onClick={handleConcluir} className={`${styles.btn} ${styles.btnSuccess}`}>
          Concluir Edição e Retornar Dados
        </button>
      </div>
        </div>
    );
};

export default GerenciadorRegistros;
