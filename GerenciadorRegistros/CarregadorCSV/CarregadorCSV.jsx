import React, { useRef } from 'react';
import Papa from 'papaparse';
import styles from './CarregadorCSV.module.css';

const CarregadorCSV = ({ onCSVProcessado, id = "csvInput", darkMode = false }) => {
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
                        let userFriendlyErrors = results.errors.map(err => {
                            if (err.code === "TooManyFields") {
                                return `Linha ${err.row}: A linha contém mais campos do que o cabeçalho. Verifique os delimitadores (ex: vírgulas) nesta linha. Detalhe: ${err.message}`;
                            }
                            if (err.code === "TooFewFields") {
                                 return `Linha ${err.row}: A linha contém menos campos do que o cabeçalho. Verifique os delimitadores (ex: vírgulas) nesta linha. Detalhe: ${err.message}`;
                            }
                            return `Linha ${err.row}: ${err.message} (Código: ${err.code})`;
                        }).join('\n\n');
                        alert(`Ocorreram erros ao processar o arquivo CSV:\n\n${userFriendlyErrors}\n\nPor favor, verifique a estrutura do seu arquivo.`);
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
    const containerClasses = `${styles.container} ${darkMode ? styles.darkMode : ''}`;

    return (
        <div className={containerClasses}>
            <input
                type="file"
                id={id}
                ref={inputRef}
                accept=".csv, text/csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <button type="button" onClick={triggerFileLoad} className={styles.btn}> {/* Removido btnSecondary para que o CSS module controle totalmente */}
                Carregar CSV
            </button>
        </div>
    );
};

export default CarregadorCSV;
