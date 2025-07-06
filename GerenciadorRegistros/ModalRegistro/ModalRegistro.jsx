import React from 'react';
import styles from './ModalRegistro.module.css';
import FormularioRegistro from '../FormularioRegistro/FormularioRegistro'; // IMPORTAR

const ModalRegistro = ({
    aberto,
    onFechar,
    onSalvar,
    registroParaEditar,
    colunasExistentes, // Renomeado para clareza
    tituloModal,
    isPrimeiroRegistro, // Passar esta prop
    darkMode = false // Nova prop
}) => {
    if (!aberto) return null;

    // Determina as colunas a serem passadas para o formulário
    // Se for o primeiro registro, FormularioRegistro lida com a definição de colunas, então passamos array vazio.
    // Caso contrário, passamos as colunas existentes.
    const colunasParaFormulario = isPrimeiroRegistro ? [] : colunasExistentes;
    const overlayClasses = `${styles.modalOverlay} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={overlayClasses} onClick={onFechar}> {/* Fechar ao clicar no overlay */}
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> {/* Impede fechar ao clicar no conteúdo */}
                <button onClick={onFechar} className={styles.closeButton} title="Fechar">&times;</button>
                <h2>{tituloModal}</h2>
                <FormularioRegistro
                    colunas={colunasParaFormulario}
                    dadosIniciais={registroParaEditar} // Será null para adição (exceto se for o primeiro registro)
                    onSubmit={(dadosFormulario) => {
                        // Passa o ID original se estiver editando
                        onSalvar(dadosFormulario, registroParaEditar ? registroParaEditar.id : null);
                    }}
                    onCancelar={onFechar}
                    isPrimeiroRegistro={isPrimeiroRegistro}
                    darkMode={darkMode} // Passar darkMode para o formulário
                />
            </div>
        </div>
    );
};

export default ModalRegistro;
