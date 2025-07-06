document.addEventListener('DOMContentLoaded', () => {
    // Seletores do DOM
    const btnAdicionarNovo = document.getElementById('btnAdicionarNovo');
    const inputCarregarCsv = document.getElementById('inputCarregarCsv');
    const contadorRegistrosEl = document.getElementById('contadorRegistros');
    const tabelaRegistrosEl = document.getElementById('tabelaRegistros');
    const corpoTabelaRegistrosEl = document.getElementById('corpoTabelaRegistros');
    const btnConcluirEdicao = document.getElementById('btnConcluirEdicao');

    // Modais
    const modalAdicionarEditar = document.getElementById('modalAdicionarEditar');
    const modalConfirmarExclusao = document.getElementById('modalConfirmarExclusao');
    const fecharModalAdicionarEditar = document.getElementById('fecharModalAdicionarEditar');
    const fecharModalExcluir = document.getElementById('fecharModalExcluir');
    const modalTitulo = document.getElementById('modalTitulo');
    const formRegistro = document.getElementById('formRegistro');
    const camposFormularioDinamico = document.getElementById('camposFormularioDinamico');
    const campoIdRegistro = document.getElementById('campoIdRegistro');
    const btnSalvarRegistro = document.getElementById('btnSalvarRegistro');
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    const btnConfirmarExclusaoDefinitiva = document.getElementById('btnConfirmarExclusaoDefinitiva');
    const btnCancelarExclusao = document.getElementById('btnCancelarExclusao');

    // Estado da Aplicação
    let registros = [];
    let colunas = [];
    let editandoRegistroId = null;
    let proximoId = 1;

    // --- Funções de Integração com Aplicação Principal ---
    window.iniciarGerenciadorRegistros = (dadosIniciais = [], colunasIniciais = []) => {
        registros = []; // Limpa estado anterior
        colunas = [];   // Limpa estado anterior
        proximoId = 1;  // Reseta contador de ID

        if (dadosIniciais && Array.isArray(dadosIniciais) && dadosIniciais.length > 0) {
            // Se dados iniciais são fornecidos, usa-os
            registros = dadosIniciais.map(reg => {
                const novoReg = {...reg};
                // Garante que cada registro tenha um ID único gerenciado internamente
                if (novoReg.id === undefined || novoReg.id === null) {
                    novoReg.id = gerarIdUnico();
                } else {
                    // Se o ID já existe, precisamos garantir que proximoId seja maior que qualquer ID existente
                    const numId = parseInt(novoReg.id, 10);
                    if (!isNaN(numId) && numId >= proximoId) {
                        proximoId = numId + 1;
                    }
                }
                return novoReg;
            });

            if (colunasIniciais && Array.isArray(colunasIniciais) && colunasIniciais.length > 0) {
                colunas = [...new Set(colunasIniciais)]; // Usa colunas fornecidas, removendo duplicatas
            } else {
                // Tenta inferir colunas do primeiro registro dos dados iniciais, excluindo 'id'
                colunas = Object.keys(registros[0] || {}).filter(key => key !== 'id');
            }
        } else if (colunasIniciais && Array.isArray(colunasIniciais) && colunasIniciais.length > 0) {
            // Se apenas colunas são fornecidas (para começar com uma estrutura mas sem dados)
            colunas = [...new Set(colunasIniciais)];
        }
        // Se nem dados nem colunas iniciais, começa do zero (arrays vazios)

        renderizarTabela();
        atualizarContadorRegistros();
        console.log("Gerenciador de Registros iniciado. Colunas:", colunas, "Registros:", registros);
    };

    window.obterRegistrosAtualizados = () => {
        // Retorna os registros sem o ID interno temporário se a aplicação principal não o quiser,
        // ou com ele se for útil. Por enquanto, retorna como está.
        return JSON.parse(JSON.stringify(registros)); // Retorna uma cópia profunda
    };

    window.obterDefinicaoColunas = () => {
        return [...colunas]; // Retorna uma cópia das colunas
    };

    // --- Funções Auxiliares ---
    function gerarIdUnico() {
        return proximoId++;
    }

    function atualizarContadorRegistros() {
        if (registros.length === 0) {
            contadorRegistrosEl.textContent = 'Nenhum registro.';
        } else if (registros.length === 1) {
            contadorRegistrosEl.textContent = '1 registro.';
        } else {
            contadorRegistrosEl.textContent = `${registros.length} registros.`;
        }
    }

    function limparFormularioModal() {
        formRegistro.reset();
        campoIdRegistro.value = '';
        camposFormularioDinamico.innerHTML = '';
        // A lógica de placeholder em criarCamposDoFormulario cuidará da mensagem correta.
    }

    function criarCamposDoFormulario() {
        camposFormularioDinamico.innerHTML = '';

        if (colunas.length === 0) {
            const pInfo = document.createElement('p');
            if (registros.length === 0) { // Adicionando o PRIMEIRO registro de todos
                pInfo.textContent = 'Como este é o primeiro registro, você definirá as colunas. Insira o nome da coluna e seu valor.';
                camposFormularioDinamico.appendChild(pInfo);

                let div = document.createElement('div');
                div.className = 'form-group';
                let label = document.createElement('label');
                label.setAttribute('for', `colunaNovaNome-0`);
                label.textContent = `Nome da Coluna 1:`;
                let input = document.createElement('input');
                input.type = 'text';
                input.id = `colunaNovaNome-0`;
                input.name = `colunaNovaNome-0`;
                input.placeholder = 'Ex: Nome';
                input.required = true;
                div.appendChild(label);
                div.appendChild(input);
                camposFormularioDinamico.appendChild(div);

                div = document.createElement('div');
                div.className = 'form-group';
                label = document.createElement('label');
                label.setAttribute('for', `colunaNovaValor-0`);
                label.textContent = `Valor para Coluna 1:`;
                input = document.createElement('input');
                input.type = 'text';
                input.id = `colunaNovaValor-0`;
                input.name = `colunaNovaValor-0`;
                input.required = true;
                div.appendChild(label);
                div.appendChild(input);
                camposFormularioDinamico.appendChild(div);
            } else { // Há registros, mas colunas foram perdidas (estado inconsistente)
                pInfo.textContent = 'Erro: Existem registros, mas nenhuma coluna está definida. Considere recarregar os dados.';
                camposFormularioDinamico.appendChild(pInfo);
            }
            return;
        }

        // Cria campos normais baseados nas colunas existentes
        colunas.forEach(coluna => {
            const div = document.createElement('div');
            div.className = 'form-group';
            const label = document.createElement('label');
            const safeColumnName = coluna.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            const inputId = `campo-${safeColumnName}`;
            label.setAttribute('for', inputId);
            label.textContent = `${coluna}:`;
            const input = document.createElement('input');
            input.type = 'text';
            input.id = inputId;
            input.name = coluna; // Usa o nome original da coluna para o 'name'
            div.appendChild(label);
            div.appendChild(input);
            camposFormularioDinamico.appendChild(div);
        });
    }

    function renderizarTabela() {
        corpoTabelaRegistrosEl.innerHTML = '';
        const cabecalhoRow = tabelaRegistrosEl.querySelector('thead tr');

        if (cabecalhoRow) {
            cabecalhoRow.innerHTML = '';
            if (colunas.length > 0) {
                colunas.forEach(col => {
                    const th = document.createElement('th');
                    th.textContent = col;
                    cabecalhoRow.appendChild(th);
                });
            } else {
                const thPlaceholder = document.createElement('th');
                thPlaceholder.textContent = 'Nenhuma coluna definida';
                cabecalhoRow.appendChild(thPlaceholder);
            }
            const thAcoes = document.createElement('th');
            thAcoes.textContent = 'Ações';
            cabecalhoRow.appendChild(thAcoes);
        }

        registros.forEach(registro => {
            const tr = document.createElement('tr');
            tr.dataset.id = String(registro.id);

            if (colunas.length > 0) {
                colunas.forEach(coluna => {
                    const td = document.createElement('td');
                    td.textContent = registro[coluna] !== undefined && registro[coluna] !== null ? registro[coluna] : '';
                    tr.appendChild(td);
                });
            } else {
                const tdPlaceholder = document.createElement('td');
                tdPlaceholder.textContent = '(Dados do registro)';
                tr.appendChild(tdPlaceholder);
            }

            const tdAcoes = document.createElement('td');
            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn btn-secondary btn-editar';
            btnEditar.innerHTML = '&#9998; Editar';
            btnEditar.addEventListener('click', () => abrirModalEdicao(registro.id));
            tdAcoes.appendChild(btnEditar);

            const btnExcluir = document.createElement('button');
            btnExcluir.className = 'btn btn-danger btn-excluir';
            btnExcluir.innerHTML = '&#128465; Excluir';
            btnExcluir.addEventListener('click', () => abrirModalExclusao(registro.id));
            tdAcoes.appendChild(btnExcluir);

            tr.appendChild(tdAcoes);
            corpoTabelaRegistrosEl.appendChild(tr);
        });
        atualizarContadorRegistros();
    }

    function abrirModalAdicao() {
        editandoRegistroId = null;
        modalTitulo.textContent = 'Adicionar Novo Registro';
        limparFormularioModal(); // Limpa e depois recria os campos
        criarCamposDoFormulario();
        modalAdicionarEditar.style.display = 'block';
        const primeiroInputFocavel = camposFormularioDinamico.querySelector('input[type="text"], input:not([type="hidden"])');
        if (primeiroInputFocavel) primeiroInputFocavel.focus();
    }

    function abrirModalEdicao(id) {
        const registroIdStr = String(id);
        const registro = registros.find(r => String(r.id) === registroIdStr);

        if (!registro) {
            console.error(`Registro com ID ${registroIdStr} não encontrado para edição.`);
            return;
        }

        editandoRegistroId = registro.id;
        modalTitulo.textContent = 'Editar Registro';
        limparFormularioModal(); // Limpa e depois recria os campos
        criarCamposDoFormulario();

        campoIdRegistro.value = registro.id;
        colunas.forEach(coluna => {
            const input = formRegistro.elements[coluna];
            if (input) {
                input.value = registro[coluna] !== undefined && registro[coluna] !== null ? registro[coluna] : '';
            }
        });
        modalAdicionarEditar.style.display = 'block';
        const primeiroInputFocavel = camposFormularioDinamico.querySelector('input[type="text"], input:not([type="hidden"])');
        if (primeiroInputFocavel) primeiroInputFocavel.focus();
    }

    function fecharTodosModais() {
        limparFormularioModal(); // Garante que o formulário seja limpo ao fechar
        modalAdicionarEditar.style.display = 'none';
        modalConfirmarExclusao.style.display = 'none';
    }

    let idRegistroParaExcluir = null;
    function abrirModalExclusao(id) {
        idRegistroParaExcluir = id;
        modalConfirmarExclusao.style.display = 'block';
    }

    formRegistro.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(formRegistro);
        const dadosDoFormulario = {};
        let novasColunasTemp = [];

        if (editandoRegistroId === null && colunas.length === 0 && registros.length === 0) {
            const nomePrimeiraColuna = formData.get('colunaNovaNome-0');
            const valorPrimeiraColuna = formData.get('colunaNovaValor-0');

            if (nomePrimeiraColuna && nomePrimeiraColuna.trim() !== '') {
                const nomeColunaSanitizado = nomePrimeiraColuna.trim();
                novasColunasTemp.push(nomeColunaSanitizado);
                dadosDoFormulario[nomeColunaSanitizado] = valorPrimeiraColuna;
            } else {
                alert('O nome da primeira coluna é obrigatório.');
                return;
            }
        } else {
            colunas.forEach(coluna => {
                dadosDoFormulario[coluna] = formData.get(coluna);
            });
        }

        if (editandoRegistroId !== null) {
            const index = registros.findIndex(r => String(r.id) === String(editandoRegistroId));
            if (index > -1) {
                registros[index] = { ...registros[index], ...dadosDoFormulario };
            }
        } else {
            const novoRegistro = { id: gerarIdUnico(), ...dadosDoFormulario };
            registros.push(novoRegistro);
            if (novasColunasTemp.length > 0) {
                colunas = [...new Set([...colunas, ...novasColunasTemp])];
            }
        }

        renderizarTabela();
        fecharTodosModais();
        editandoRegistroId = null;
    });

    btnConfirmarExclusaoDefinitiva.addEventListener('click', () => {
        if (idRegistroParaExcluir !== null) {
            registros = registros.filter(r => String(r.id) !== String(idRegistroParaExcluir));
            renderizarTabela();
            fecharTodosModais();
            idRegistroParaExcluir = null;
        }
    });

    inputCarregarCsv.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && typeof Papa !== 'undefined') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    event.target.value = null; // Limpa para permitir recarregar o mesmo arquivo
                    if (results.errors.length > 0) {
                        console.error("Erros ao parsear CSV:", results.errors);
                        alert("Ocorreram erros ao processar o arquivo CSV. Verifique o console para detalhes.");
                        results.errors.forEach(err => console.error(`Erro CSV: ${err.type} - ${err.code} - ${err.message} na linha ${err.row}`));
                        return;
                    }

                    if (results.data && results.data.length > 0) {
                        const csvColunas = results.meta.fields;
                        const csvRegistros = results.data.map(item => {
                            const novoRegistro = { id: gerarIdUnico() };
                            csvColunas.forEach(coluna => {
                                novoRegistro[coluna] = item[coluna] !== undefined && item[coluna] !== null ? String(item[coluna]) : '';
                            });
                            return novoRegistro;
                        });

                        // Decide se substitui ou anexa - por agora, substitui
                        registros = csvRegistros;
                        colunas = csvColunas;

                        renderizarTabela();
                        if (modalAdicionarEditar.style.display === 'block' && camposFormularioDinamico.querySelector('#colunaNovaNome-0')) {
                            fecharTodosModais();
                        }
                        alert(`${registros.length} registros carregados com sucesso do CSV!`);
                    } else {
                        alert("Nenhum dado encontrado no arquivo CSV ou o arquivo está vazio.");
                         // Mesmo que vazio, se o CSV tiver cabeçalhos, define as colunas
                        if(results.meta && results.meta.fields && results.meta.fields.length > 0){
                            colunas = results.meta.fields;
                            registros = []; // Garante que registros esteja vazio
                            renderizarTabela();
                        }
                    }
                },
                error: (error) => {
                    event.target.value = null;
                    console.error("Erro ao carregar arquivo CSV:", error);
                    alert("Não foi possível carregar o arquivo CSV.");
                }
            });
        } else if (typeof Papa === 'undefined') {
            alert("Erro: A biblioteca de parsing de CSV (PapaParse) não foi carregada.");
            event.target.value = null;
        }
    });

    btnAdicionarNovo.addEventListener('click', abrirModalAdicao);
    fecharModalAdicionarEditar.addEventListener('click', fecharTodosModais);
    btnCancelarModal.addEventListener('click', fecharTodosModais);
    fecharModalExcluir.addEventListener('click', fecharTodosModais);
    btnCancelarExclusao.addEventListener('click', fecharTodosModais);

    window.addEventListener('click', (event) => {
        if (event.target === modalAdicionarEditar || event.target === modalConfirmarExclusao) {
            fecharTodosModais();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (modalAdicionarEditar.style.display === 'block' || modalConfirmarExclusao.style.display === 'block') {
                fecharTodosModais();
            }
        }
    });

    btnConcluirEdicao.addEventListener('click', () => {
        const dadosFinais = window.obterRegistrosAtualizados(); // Usa a função global
        const colunasFinais = window.obterDefinicaoColunas(); // Obtem as colunas também

        alert('Edição concluída! Os dados estão prontos.');
        console.log('Dados finais para a aplicação principal:', JSON.stringify({ colunas: colunasFinais, registros: dadosFinais }, null, 2));

        // A aplicação principal agora usaria 'dadosFinais' e 'colunasFinais'
        // Ex: if (typeof window.handleSalvarJson === 'function') {
        //     window.handleSalvarJson({ colunas: colunasFinais, registros: dadosFinais });
        // }
    });

    // --- Inicialização ---
    // A aplicação principal deve chamar window.iniciarGerenciadorRegistros()
    // Para desenvolvimento/teste autônomo, podemos iniciar vazio:
    if (typeof window.iniciarGerenciadorRegistros === 'function') {
        window.iniciarGerenciadorRegistros(); // Inicia vazio por padrão
    } else {
        // Fallback caso a função global não esteja pronta no momento do DOMContentLoaded (improvável)
        renderizarTabela();
        atualizarContadorRegistros();
    }
});
