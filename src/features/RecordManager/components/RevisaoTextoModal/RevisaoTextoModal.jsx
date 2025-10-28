import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './RevisaoTextoModal.module.css';

const RevisaoTextoModal = ({
    textoOriginal,
    onFechar,
    onSalvar,
    darkMode = false,
}) => {
    const [sugestao, setSugestao] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        const fetchSugestao = async () => {
            setCarregando(true);
            setErro(null);
            try {
                const response = await fetch('/api/revisar-texto', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ texto: textoOriginal }),
                });

                if (!response.ok) {
                    throw new Error('Falha ao obter sugestão da IA.');
                }

                const data = await response.json();
                setSugestao(data.textoRevisado);
            } catch (error) {
                setErro(error.message);
            } finally {
                setCarregando(false);
            }
        };

        if (textoOriginal) {
            fetchSugestao();
        }
    }, [textoOriginal]);

    const handleSalvar = () => {
        onSalvar(sugestao);
    };

    const modalClasses = `${styles.modal} ${darkMode ? styles.darkMode : ''}`;
    const modalContentClasses = `${styles.modalContent} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={modalClasses}>
            <div className={modalContentClasses}>
                <h2>Revisão de Texto</h2>
                <div className={styles.textoContainer}>
                    <h3>Texto Original</h3>
                    <p>{textoOriginal}</p>
                </div>
                <div className={styles.textoContainer}>
                    <h3>Sugestão de Revisão</h3>
                    {carregando ? (
                        <p>Carregando sugestão...</p>
                    ) : erro ? (
                        <p className={styles.erro}>{erro}</p>
                    ) : (
                        <textarea
                            value={sugestao}
                            onChange={(e) => setSugestao(e.target.value)}
                            className={styles.textarea}
                            rows="10"
                        />
                    )}
                </div>
                <div className={styles.modalActions}>
                    <button onClick={handleSalvar} className={`${styles.btn} ${styles.btnPrimary}`} disabled={carregando}>
                        Aceitar Sugestão
                    </button>
                    <button onClick={onFechar} className={`${styles.btn} ${styles.btnSecondary}`}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

RevisaoTextoModal.propTypes = {
    textoOriginal: PropTypes.string.isRequired,
    onFechar: PropTypes.func.isRequired,
    onSalvar: PropTypes.func.isRequired,
    darkMode: PropTypes.bool,
};

RevisaoTextoModal.defaultProps = {
    darkMode: false,
};

export default RevisaoTextoModal;
