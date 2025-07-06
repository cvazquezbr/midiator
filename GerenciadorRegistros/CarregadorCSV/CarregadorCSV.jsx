import React, { useRef } from 'react';
import Papa from 'papaparse';
import styles from './CarregadorCSV.module.css';

const CarregadorCSV = ({ onCSVProcessado, id = "csvInput" }) => {
    const inputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (inputRef.current) inputRef.current.value = null; // Limpa input para permitir recarregar

                    if (results.errors.length > 0) {
                        console.error("Erros ao parsear CSV:", results.errors);
                        let errorMessages = results.errors.map(err => `Linha ${err.row}: ${err.message} (${err.code})`).join('\n');
                        alert(`Ocorreram erros ao processar o arquivo CSV:\n${errorMessages}`);
                        return;
                    }

                    const colunasDefinidas = results.meta.fields || [];
                    const dadosRecebidos = results.data || [];

                    if (colunasDefinidas.length > 0) {
                        onCSVProcessado(dadosRecebidos, colunasDefinidas);
                    } else if (dadosRecebidos.length > 0 && colunasDefinidas.length === 0) {
                        // Caso o CSV não tenha header, mas tenha dados (PapaParse pode gerar colunas numeradas)
                        // Para este caso, vamos alertar que o header é esperado.
                        alert("CSV inválido: Cabeçalho (primeira linha com nomes de colunas) não encontrado ou vazio.");
                    } else {
                         alert("CSV vazio ou não contém cabeçalhos válidos.");
                    }
                },
                error: (error) => {
                    if (inputRef.current) inputRef.current.value = null;
                    console.error("Erro crítico ao carregar/parsear arquivo CSV:", error);
                    alert(`Não foi possível carregar ou processar o arquivo CSV: ${error.message}`);
                }
            });
        }
    };

    const triggerFileLoad = () => {
        if (inputRef.current) {
            inputRef.current.click();
        }
    }

    return (
        <div className={styles.container}>
            <input
                type="file"
                id={id}
                ref={inputRef}
                accept=".csv, text/csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <button type="button" onClick={triggerFileLoad} className={`${styles.btn} ${styles.btnSecondary}`}>
                Carregar CSV
            </button>
        </div>
    );
};

export default CarregadorCSV;
