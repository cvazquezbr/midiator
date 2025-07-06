import React from 'react';
import styles from './ModalConfirmacao.module.css'; // Criar este arquivo

const ModalConfirmacao = ({
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
        <div className={overlayClasses} onClick={onFechar}> {/* Aplicar onClick para fechar no overlay */}
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> {/* Evitar fechar ao clicar no conteúdo */}
                <button onClick={onFechar} className={styles.closeButton} title="Fechar">&times;</button> {/* Adicionar title */}
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
