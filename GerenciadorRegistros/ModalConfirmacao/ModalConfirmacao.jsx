import React from 'react';
import styles from './ModalConfirmacao.module.css'; // Criar este arquivo

const ModalConfirmacao = ({ aberto, onFechar, onConfirmar, titulo, mensagem }) => {
    if (!aberto) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button onClick={onFechar} className={styles.closeButton}>&times;</button>
                <h2>{titulo}</h2>
                <p>{mensagem}</p>
                <div className={styles.actions}>
                    <button onClick={onConfirmar} className={`${styles.btn} ${styles.btnConfirm}`}>Confirmar</button>
                    <button onClick={onFechar} className={`${styles.btn} ${styles.btnCancel}`}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export default ModalConfirmacao;
