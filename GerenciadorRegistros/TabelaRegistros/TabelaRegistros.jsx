import React from 'react';
import styles from './TabelaRegistros.module.css';
import LinhaRegistro from '../LinhaRegistro/LinhaRegistro'; // Importar o componente LinhaRegistro

const TabelaRegistros = ({ registros = [], colunas = [], onEditar, onExcluir, darkMode }) => {
    // Se não há colunas definidas, mas há registros, tenta inferir as colunas do primeiro registro.
    // Esta lógica é mais um fallback; idealmente, GerenciadorRegistros sempre fornecerá colunas.
    const colunasVisiveis = colunas.length > 0 ? colunas :
                           (registros.length > 0 ? Object.keys(registros[0] || {}).filter(k => k !== 'id') : []);

    const tableClasses = `${styles.tabela} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={styles.tableContainer}>
            <table className={tableClasses}>
                <thead>
                    <tr>
                        {/* Coluna de Ações primeiro */}
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
                            <LinhaRegistro
                                key={reg.id !== undefined ? reg.id : JSON.stringify(reg)} // Fallback de key se id não existir
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

export default TabelaRegistros;
