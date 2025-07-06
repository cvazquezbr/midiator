import React from 'react';
import styles from './TabelaRegistros.module.css';
import LinhaRegistro from '../LinhaRegistro/LinhaRegistro'; // Importar o componente LinhaRegistro

const TabelaRegistros = ({ registros = [], colunas = [], onEditar, onExcluir }) => {
    // Se não há colunas definidas, mas há registros, tenta inferir as colunas do primeiro registro.
    // Esta lógica é mais um fallback; idealmente, GerenciadorRegistros sempre fornecerá colunas.
    const colunasVisiveis = colunas.length > 0 ? colunas :
                           (registros.length > 0 ? Object.keys(registros[0] || {}).filter(k => k !== 'id') : []);

    return (
        <div className={styles.tableContainer}>
            <table className={styles.tabela}>
                <thead>
                    <tr>
                        {colunasVisiveis.map(colNome => (
                            <th key={colNome}>{colNome}</th>
                        ))}
                        {/* Só mostra a coluna de Ações se houver colunas de dados ou registros (para mostrar msg de 'nenhum dado') */ }
                        {(colunasVisiveis.length > 0 || registros.length === 0) && <th>Ações</th>}
                        {/* Se não houver colunas visíveis e nenhum registro, pode mostrar uma mensagem no header ou deixar vazio */}
                        {colunasVisiveis.length === 0 && registros.length === 0 && !<th>Nenhuma coluna definida</th> /* Evita duplicar th se colunasVisiveis for vazio mas registros não */}
                        {colunasVisiveis.length === 0 && registros.length > 0 && <th>Ações</th> /* Caso existam registros mas colunas não foram passadas */}

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
