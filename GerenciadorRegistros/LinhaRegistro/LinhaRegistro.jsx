import React from 'react';
import styles from './LinhaRegistro.module.css';

const LinhaRegistro = ({ registro, colunas, onEditar, onExcluir }) => {
    return (
        <tr>
            {colunas.map(colunaNome => (
                <td key={`${registro.id}-${colunaNome}`}>
                    {registro[colunaNome] !== undefined && registro[colunaNome] !== null ? String(registro[colunaNome]) : ''}
                </td>
            ))}
            <td className={styles.actionsCell}>
                <button
                    onClick={() => onEditar(registro)}
                    className={`${styles.btnAction} ${styles.btnEdit}`}
                    title="Editar"
                >
                    &#9998; {/* Ícone de lápis */}
                </button>
                <button
                    onClick={() => onExcluir(registro)}
                    className={`${styles.btnAction} ${styles.btnDelete}`}
                    title="Excluir"
                >
                    &#128465; {/* Ícone de lixeira */}
                </button>
            </td>
        </tr>
    );
};

export default LinhaRegistro;
