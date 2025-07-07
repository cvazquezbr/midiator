import React from 'react';
import PropTypes from 'prop-types';
import styles from './RecordModal.module.css';
import RecordForm from '../RecordForm/RecordForm';

/**
 * Modal para adicionar ou editar um registro.
 * Utiliza o RecordForm internamente.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {boolean} props.aberto - Controla a visibilidade do modal.
 * @param {Function} props.onFechar - Callback para fechar o modal.
 * @param {Function} props.onSalvar - Callback para salvar o registro.
 * @param {Object} [props.registroParaEditar=null] - Dados do registro para edição.
 * @param {string[]} props.colunasExistentes - Array de nomes das colunas existentes.
 * @param {string} props.tituloModal - Título a ser exibido no modal.
 * @param {boolean} [props.isPrimeiroRegistro=false] - Indica se é o primeiro registro.
 * @param {boolean} [props.darkMode=false] - Flag para habilitar o modo escuro.
 */
const RecordModal = ({
    aberto,
    onFechar,
    onSalvar,
    registroParaEditar,
    colunasExistentes,
    tituloModal,
    isPrimeiroRegistro,
    darkMode = false
}) => {
    if (!aberto) return null;

    const colunasParaFormulario = isPrimeiroRegistro ? [] : colunasExistentes;
    const overlayClasses = `${styles.modalOverlay} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={overlayClasses} onClick={onFechar}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={onFechar} className={styles.closeButton} title="Fechar">&times;</button>
                <h2>{tituloModal}</h2>
                <RecordForm
                    colunas={colunasParaFormulario}
                    dadosIniciais={registroParaEditar}
                    onSubmit={(dadosFormulario) => {
                        onSalvar(dadosFormulario, registroParaEditar ? registroParaEditar.id : null);
                    }}
                    onCancelar={onFechar}
                    isPrimeiroRegistro={isPrimeiroRegistro}
                    darkMode={darkMode}
                />
            </div>
        </div>
    );
};

RecordModal.propTypes = {
    aberto: PropTypes.bool.isRequired,
    onFechar: PropTypes.func.isRequired,
    onSalvar: PropTypes.func.isRequired,
    registroParaEditar: PropTypes.object,
    colunasExistentes: PropTypes.arrayOf(PropTypes.string).isRequired,
    tituloModal: PropTypes.string.isRequired,
    isPrimeiroRegistro: PropTypes.bool,
    darkMode: PropTypes.bool,
};

RecordModal.defaultProps = {
    registroParaEditar: null,
    isPrimeiroRegistro: false,
    darkMode: false,
};

export default RecordModal;
