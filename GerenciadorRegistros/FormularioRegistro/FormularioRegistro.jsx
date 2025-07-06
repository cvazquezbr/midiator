import React, { useState, useEffect } from 'react';
import styles from './FormularioRegistro.module.css';

const FormularioRegistro = ({
    colunas = [],
    dadosIniciais = null, // Pode ser null para adição
    onSubmit,
    onCancelar,
    isPrimeiroRegistro = false // Nova prop para controlar a lógica de definir colunas
}) => {
    const [formData, setFormData] = useState({});
    // Para o primeiro registro, precisamos de estado para os nomes e valores das novas colunas
    const [novasColunas, setNovasColunas] = useState([{ nome: '', valor: '' }]);

    useEffect(() => {
        if (!isPrimeiroRegistro && dadosIniciais) {
            const initialState = {};
            colunas.forEach(col => {
                initialState[col] = dadosIniciais[col] || '';
            });
            setFormData(initialState);
        } else if (!isPrimeiroRegistro) {
            // Limpa o formulário se não for edição e não for o primeiro registro
            const initialState = {};
            colunas.forEach(col => {
                initialState[col] = '';
            });
            setFormData(initialState);
        } else {
            // Reseta o estado de novasColunas se for o primeiro registro
            setNovasColunas([{ nome: '', valor: '' }]);
            setFormData({}); // Limpa formData, pois será preenchido por novasColunas
        }
    }, [dadosIniciais, colunas, isPrimeiroRegistro]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNovaColunaChange = (index, field, value) => {
        const updated = [...novasColunas];
        updated[index][field] = value;
        setNovasColunas(updated);
    };

    const adicionarCampoNovaColuna = () => {
        setNovasColunas([...novasColunas, { nome: '', valor: '' }]);
    };

    const removerCampoNovaColuna = (index) => {
        if (novasColunas.length > 1) { // Não permite remover o último campo
            const updated = novasColunas.filter((_, i) => i !== index);
            setNovasColunas(updated);
        }
    };


    const handleSubmit = (e) => {
        e.preventDefault();
        if (isPrimeiroRegistro) {
            const colunasDefinidas = [];
            const dataToSubmit = {};
            let todasColunasNomeadas = true;
            let algumaColunaDefinida = false;

            novasColunas.forEach(nc => {
                const nomeTrimmed = nc.nome.trim();
                if (nomeTrimmed) {
                    algumaColunaDefinida = true;
                    if (colunasDefinidas.includes(nomeTrimmed)) {
                        alert(`Nome de coluna duplicado: "${nomeTrimmed}". Por favor, use nomes únicos.`);
                        todasColunasNomeadas = false; // Marca como erro para não submeter
                        return; // Sai do forEach para esta iteração
                    }
                    colunasDefinidas.push(nomeTrimmed);
                    dataToSubmit[nomeTrimmed] = nc.valor;
                } else if (nc.valor.trim()) { // Se tem valor mas não nome de coluna
                    alert("Toda coluna com valor deve ter um nome.");
                    todasColunasNomeadas = false;
                    return;
                }
                // Se nome e valor estiverem vazios, simplesmente ignora essa "nova coluna"
            });

            if (!todasColunasNomeadas) return; // Se houve erro de nome duplicado ou nome faltando

            if (!algumaColunaDefinida && novasColunas.some(nc => !nc.nome.trim() && !nc.valor.trim())) {
                // Se todos os campos de nova coluna estão vazios
                 alert("Adicione pelo menos uma coluna com nome e valor.");
                return;
            }
            if (colunasDefinidas.length === 0) { // Se após o processamento nenhuma coluna válida foi definida
                alert("É necessário definir pelo menos uma coluna com um nome válido.");
                return;
            }

            onSubmit({ _novasColunas: colunasDefinidas, ...dataToSubmit });
        } else {
            onSubmit(formData);
        }
    };

    if (isPrimeiroRegistro) {
        return (
            <form onSubmit={handleSubmit} className={styles.form}>
                <p className={styles.infoText}>Como este é o primeiro registro, você definirá as colunas e seus valores iniciais.</p>
                {novasColunas.map((nc, index) => (
                    <div key={index} className={styles.novaColunaGroup}>
                        <div className={styles.formGroup}>
                            <label htmlFor={`novaColunaNome-${index}`}>Nome da Coluna {index + 1}:</label>
                            <input
                                type="text"
                                id={`novaColunaNome-${index}`}
                                value={nc.nome}
                                onChange={(e) => handleNovaColunaChange(index, 'nome', e.target.value)}
                                placeholder="Ex: NomeCliente"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor={`novaColunaValor-${index}`}>Valor para Coluna {index + 1}:</label>
                            <input
                                type="text"
                                id={`novaColunaValor-${index}`}
                                value={nc.valor}
                                onChange={(e) => handleNovaColunaChange(index, 'valor', e.target.value)}
                            />
                        </div>
                        {novasColunas.length > 1 && (
                             <button type="button" onClick={() => removerCampoNovaColuna(index)} className={`${styles.btn} ${styles.btnRemoveField}`} title="Remover esta coluna">-</button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={adicionarCampoNovaColuna} className={`${styles.btn} ${styles.btnAddField}`}>+ Adicionar Outra Coluna</button>
                <div className={styles.formActions}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar Registro e Definir Colunas</button>
                    <button type="button" onClick={onCancelar} className={`${styles.btn} ${styles.btnSecondary}`}>Cancelar</button>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {colunas.map(col => (
                <div key={col} className={styles.formGroup}>
                    <label htmlFor={`campo-${col.replace(/\s+/g, '-')}`}>{col}:</label>
                    <input
                        type="text"
                        id={`campo-${col.replace(/\s+/g, '-')}`}
                        name={col}
                        value={formData[col] || ''}
                        onChange={handleChange}
                    />
                </div>
            ))}
            <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
                <button type="button" onClick={onCancelar} className={`${styles.btn} ${styles.btnSecondary}`}>Cancelar</button>
            </div>
        </form>
    );
};

export default FormularioRegistro;
