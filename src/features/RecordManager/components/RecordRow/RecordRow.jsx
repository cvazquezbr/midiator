import React from 'react';
import PropTypes from 'prop-types';
import styles from './RecordRow.module.css';

/**
 * Componente para renderizar uma linha na tabela de registros.
 * Inclui botões de ação para editar e excluir.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {Object} props.registro - O objeto do registro a ser exibido.
 * @param {string[]} props.colunas - Array com os nomes das colunas a serem exibidas.
 * @param {Function} props.onEditar - Callback para ação de editar.
 * @param {Function} props.onExcluir - Callback para ação de excluir.
 * @param {boolean} [props.darkMode=false] - Flag para habilitar o modo escuro.
 */
const RecordRow = ({ registro, colunas, onEditar, onExcluir, darkMode = false }) => {
    const trClasses = `${darkMode ? styles.darkMode : ''}`;
    return (
        <tr className={trClasses}>
            <td className={styles.actionsCell}>
                <button
                    type="button"
                    onClick={() => onEditar(registro)}
                    className={`${styles.btnAction} ${styles.btnEdit}`}
                    title="Editar"
                >
                    &#9998; {/* Ícone de lápis */}
                </button>
                <button
                    type="button"
                    onClick={() => onExcluir(registro)}
                    className={`${styles.btnAction} ${styles.btnDelete}`}
                    title="Excluir"
                >
                    &#128465; {/* Ícone de lixeira */}
                </button>
            </td>
            {colunas.map(colunaNome => (
                <td key={`${registro.id}-${colunaNome}`}>
                    {registro[colunaNome] !== undefined && registro[colunaNome] !== null ? String(registro[colunaNome]) : ''}
                </td>
            ))}
        </tr>
    );
};

RecordRow.propTypes = {
    registro: PropTypes.object.isRequired,
    colunas: PropTypes.arrayOf(PropTypes.string).isRequired,
    onEditar: PropTypes.func.isRequired,
    onExcluir: PropTypes.func.isRequired,
    darkMode: PropTypes.bool,
};

RecordRow.defaultProps = {
    darkMode: false,
};

export default RecordRow;
