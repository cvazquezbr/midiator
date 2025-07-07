import React from 'react';
import PropTypes from 'prop-types';
import styles from './ConfirmationModal.module.css';

/**
 * Modal de confirmação genérico.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {boolean} props.aberto - Controla a visibilidade do modal.
 * @param {Function} props.onFechar - Callback para fechar o modal.
 * @param {Function} props.onConfirmar - Callback para ação de confirmar.
 * @param {string} props.titulo - Título do modal.
 * @param {string} props.mensagem - Mensagem de confirmação.
 * @param {boolean} [props.darkMode=false] - Flag para habilitar o modo escuro.
 */
const ConfirmationModal = ({
    aberto,
    onFechar,
    onConfirmar,
    titulo,
    mensagem,
    darkMode = false // Nova prop
}) => {
    if (!aberto) return null;

    const overlayClasses = `${styles.modalOverlay} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={overlayClasses} onClick={onFechar}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={onFechar} className={styles.closeButton} title="Fechar">&times;</button>
                <h2>{titulo}</h2>
                <p>{mensagem}</p>
                <div className={styles.actions}>
                    <button type="button" onClick={onConfirmar} className={`${styles.btn} ${styles.btnConfirm}`}>Confirmar</button>
                    <button type="button" onClick={onFechar} className={`${styles.btn} ${styles.btnCancel}`}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};

ConfirmationModal.propTypes = {
    aberto: PropTypes.bool.isRequired,
    onFechar: PropTypes.func.isRequired,
    onConfirmar: PropTypes.func.isRequired,
    titulo: PropTypes.string.isRequired,
    mensagem: PropTypes.string.isRequired,
    darkMode: PropTypes.bool,
};

ConfirmationModal.defaultProps = {
    darkMode: false,
};

export default ConfirmationModal;
