import React from 'react';
import PropTypes from 'prop-types';
import styles from './RecordsTable.module.css';
import RecordRow from '../RecordRow/RecordRow';

/**
 * Componente para exibir uma tabela de registros.
 * Utiliza RecordRow para renderizar cada linha.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {Object[]} [props.registros=[]] - Array de objetos de registro.
 * @param {string[]} [props.colunas=[]] - Array com os nomes das colunas.
 * @param {Function} props.onEditar - Callback para ação de editar.
 * @param {Function} props.onExcluir - Callback para ação de excluir.
 * @param {boolean} [props.darkMode=false] - Flag para habilitar o modo escuro.
 */
const RecordsTable = ({ registros = [], colunas = [], onEditar, onExcluir, darkMode = false }) => {
    const colunasVisiveis = colunas.length > 0 ? colunas :
                           (registros.length > 0 ? Object.keys(registros[0] || {}).filter(k => k !== 'id') : []);

    const tableClasses = `${styles.tabela} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={styles.tableContainer}>
            <table className={tableClasses}>
                <thead>
                    <tr>
                        {(colunasVisiveis.length > 0 || registros.length === 0) && <th className={styles.actionsHeader}>Ações</th>}
                        {colunasVisiveis.length === 0 && registros.length === 0 && !<th>Nenhuma coluna definida</th>}
                        {colunasVisiveis.length === 0 && registros.length > 0 && <th className={styles.actionsHeader}>Ações</th>}

                        {colunasVisiveis.map(colNome => (
                            <th key={colNome}>{colNome}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {registros.length > 0 ? (
                        registros.map(reg => (
                            <RecordRow
                                key={reg.id !== undefined ? reg.id : JSON.stringify(reg)}
                                registro={reg}
                                colunas={colunasVisiveis}
                                onEditar={onEditar}
                                onExcluir={onExcluir}
                                darkMode={darkMode}
                            />
                        ))
                    ) : (
                        <tr>
                            <td colSpan={colunasVisiveis.length > 0 ? colunasVisiveis.length + 1 : 2} className={styles.noDataCell}>
                                Nenhum registro para exibir.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

RecordsTable.propTypes = {
    registros: PropTypes.arrayOf(PropTypes.object),
    colunas: PropTypes.arrayOf(PropTypes.string),
    onEditar: PropTypes.func.isRequired,
    onExcluir: PropTypes.func.isRequired,
    darkMode: PropTypes.bool,
};

RecordsTable.defaultProps = {
    registros: [],
    colunas: [],
    darkMode: false,
};

export default RecordsTable;
