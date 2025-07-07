import React, { useState, useRef, useEffect, useCallback } from 'react'; // Correção: Restaurar importação completa
import { useIsMobile } from './hooks/use-mobile'; // Importa o hook
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  IconButton, // Adicionado para botões de ícone
  Tooltip, // Adicionado para dicas de ferramenta
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  CircularProgress,
  Link as MuiLink
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  Settings,
  Image as ImageIcon,
  Palette,
  ArrowBackIosNew, // Ícone para voltar
  ArrowForwardIos, // Ícone para próximo
  MoreVert, // Ícone para o menu de ações
  Brightness4, // Ícone para modo dark
  Brightness7, // Ícone para modo light
  Edit // Ícone para editar registros
} from '@mui/icons-material';
import Papa from 'papaparse';
import ColorThief from 'colorthief';
// import React, { useState, useRef, useEffect, useCallback } from 'react'; // Removido, pois já está no topo
// import { useIsMobile } from './hooks/use-mobile'; // Removendo a duplicata - useIsMobile já é importado na linha 2
// ... (outros imports)
// Adicionar Menu e MenuItem para o menu de ações
import { Menu, MenuItem } from '@mui/material';
// Imports para Theming
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'; // Normaliza estilos e aplica cor de fundo do tema

import FieldPositioner from './components/FieldPositioner';
import ImageGeneratorFrontendOnly from './components/ImageGeneratorFrontendOnly';
import GerenciadorRegistros from '../GerenciadorRegistros/GerenciadorRegistros'; // Importar o GerenciadorRegistros
import DeepSeekAuthSetup from './components/DeepSeekAuthSetup';
import GeminiAuthSetup from './components/GeminiAuthSetup'; // Importar GeminiAuthSetup
import { getDeepSeekApiKey } from './utils/deepSeekCredentials';
import { getGeminiApiKey } from './utils/geminiCredentials'; // Importar getGeminiApiKey
import { callDeepSeekApi } from './utils/deepSeekAPI';
import { callGeminiApi } from './utils/geminiAPI'; // Importar callGeminiApi
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import GoogleIcon from '@mui/icons-material/Google'; // Ícone para Gemini (exemplo)
import './App.css';

// Definição dos temas light e dark
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Azul padrão do MUI
    },
    secondary: {
      main: '#dc004e', // Rosa padrão do MUI
    },
    background: {
      default: '#f4f6f8', // Um cinza claro para o fundo
      paper: '#ffffff',   // Branco para os Papers
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9', // Um azul mais claro para contraste no modo escuro
    },
    secondary: {
      main: '#f48fb1', // Um rosa mais claro
    },
    background: {
      default: '#121212', // Padrão do Material Design para fundo escuro
      paper: '#1e1e1e',   // Um pouco mais claro para Papers no modo escuro
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    }
  },
});


function App() {
  const [activeStep, setActiveStep] = useState(0);
  // Inicializa darkMode a partir do localStorage ou default para false (light mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]); // Para armazenar dados de ImageGeneratorFrontendOnly
  const isMobile = useIsMobile(); // Usa o hook para determinar se é mobile
  // const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(isMobile); // Removido ou ajustado
  const [anchorElMenu, setAnchorElMenu] = useState(null); // Para o menu de ações
  const [isHeaderHovered, setIsHeaderHovered] = useState(false); // Novo estado para hover no cabeçalho
  const [showDeepSeekAuthModal, setShowDeepSeekAuthModal] = useState(false); // Estado para o modal da chave DeepSeek
  const [showGeminiAuthModal, setShowGeminiAuthModal] = useState(false); // Estado para o modal da chave Gemini

  // Estados para a Geração com IA
  const [inputMethod, setInputMethod] = useState('csv'); // 'csv' ou 'ia'
  const [selectedApiModel, setSelectedApiModel] = useState('deepseek'); // 'deepseek' ou 'gemini'
  const [promptNumRecords, setPromptNumRecords] = useState(10); // Default 10, conforme sugerido
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false); // Para feedback de carregamento da IA


  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const loadStateInputRef = useRef(null); // Ref para o input de carregar estado

  // Efeito para lidar com o scroll e colapsar o header - REMOVIDO
  // useEffect(() => {
  //   // Se for mobile, o header começa colapsado e não muda com o scroll
  //   if (isMobile) {
  //     // setIsHeaderCollapsed(true); // isHeaderCollapsed foi removido ou seu uso mudou
  //     return;
  //   }

  //   const handleScroll = () => {
  //     if (window.scrollY > 50) {
  //       // setIsHeaderCollapsed(true);
  //     } else {
  //       // setIsHeaderCollapsed(false);
  //     }
  //   };

  //   window.addEventListener('scroll', handleScroll);
  //   return () => {
  //     window.removeEventListener('scroll', handleScroll);
  //   };
  // }, [isMobile]);

  // Efeito para salvar a preferência do tema no localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const steps = [
    {
      label: 'Definir Dados Iniciais',
      description: 'Carregue um CSV ou prepare para adicionar dados manualmente.'
    },
    {
      label: 'Editar Dados',
      description: 'Adicione, edite ou remova registros conforme necessário.'
    },
    {
      label: 'Upload da Imagem',
      description: 'Carregue a imagem de fundo PNG/JPG.'
    },
    {
      label: 'Posicionar e Formatar',
      description: 'Posicione os campos e configure a formatação.'
    },
    {
      label: 'Gerar Imagens',
      description: 'Gere as imagens finais.'
    }
  ];

  // Função para ler arquivo CSV
  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const newCsvData = results.data;
            const newHeaders = Object.keys(newCsvData[0] || {});
            
            setCsvData(newCsvData);
            setCsvHeaders(newHeaders);
            
            // Adaptar fieldPositions e fieldStyles existentes
            const updatedFieldPositions = {};
            const updatedFieldStyles = {};

            const defaultStylesBase = {
              fontFamily: 'Arial',
              fontSize: 24,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              color: '#000000',
              textStroke: false,
              strokeColor: '#ffffff',
              strokeWidth: 2,
              textShadow: false,
              shadowColor: '#000000',
              shadowBlur: 4,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
              textAlign: 'left', // Adicionado para consistência com defaults iniciais
              verticalAlign: 'top' // Adicionado para consistência
            };
            
            newHeaders.forEach((header, index) => {
              // Posições
              if (fieldPositions[header]) {
                updatedFieldPositions[header] = fieldPositions[header];
              } else {
                updatedFieldPositions[header] = {
                  x: 10 + (index % 5) * 18, // Ajustado para caber mais campos inicialmente
                  y: 10 + Math.floor(index / 5) * 12,
                  width: 15, // Ligeiramente menor para caber mais
                  height: 10,
                  visible: true
                };
              }
              
              // Estilos
              if (fieldStyles[header]) {
                updatedFieldStyles[header] = fieldStyles[header];
              } else {
                updatedFieldStyles[header] = { ...defaultStylesBase };
              }
            });
            
            setFieldPositions(updatedFieldPositions);
            setFieldStyles(updatedFieldStyles);
            
            setActiveStep(1); // Avança para a etapa de Edição de Dados (índice 1)
            // alert(`${newCsvData.length} registros carregados do CSV com sucesso! Clique em 'Próximo' para editar ou continuar.`); // Removido
          }
        },
        error: (error) => {
          console.error('Erro ao ler CSV:', error);
          alert('Erro ao ler o arquivo CSV. Verifique se o formato está correto.');
        }
      });
    }
  };

  // Função para upload da imagem de fundo
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setBackgroundImage(imageUrl);

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(img, 5); // Extrai 5 cores
          setColorPalette(palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`));
        };
        img.src = imageUrl;

        // setActiveStep(2) -> Se Upload da Imagem é a etapa 2, a próxima é a 3 (Posicionar e Formatar)
        // O array de steps é 0-indexed:
        // 0: Definir Dados Iniciais
        // 1: Editar Dados
        // 2: Upload da Imagem
        // 3: Posicionar e Formatar
        // 4: Gerar Imagens
        const etapaPosicionarFormatarIndex = steps.findIndex(step => step.label === 'Posicionar e Formatar');
        if (etapaPosicionarFormatarIndex !== -1) {
            setActiveStep(etapaPosicionarFormatarIndex);
        }
        // alert("Imagem de fundo carregada com sucesso! Clique em 'Próximo' para continuar."); // Removido
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const canProceedToStep = (nextStepIndex) => {
    // `nextStepIndex` é o índice do passo PARA o qual queremos ir.
    // `activeStep` é o passo atual.
    switch (activeStep) {
      case 0: // Saindo de 'Definir Dados Iniciais' para 'Editar Dados' (nextStepIndex === 1)
        return true; // Sempre pode ir para a edição, mesmo que não haja dados CSV carregados.
      case 1: // Saindo de 'Editar Dados' para 'Upload da Imagem' (nextStepIndex === 2)
        return csvData.length > 0; // Precisa ter dados para prosseguir para a imagem.
      case 2: // Saindo de 'Upload da Imagem' para 'Posicionar e Formatar' (nextStepIndex === 3)
        return backgroundImage !== null; // Precisa ter imagem de fundo.
      case 3: // Saindo de 'Posicionar e Formatar' para 'Gerar Imagens' (nextStepIndex === 4)
        return true; // Posicionamento é opcional para gerar.
      default:
        return true; // Permite avançar de outros passos por padrão (ex: de Gerar para um futuro Resumo)
    }
  };

  // Calcular estatísticas dos campos
  const getFieldStats = () => {
    const visibleFields = Object.values(fieldPositions).filter(pos => pos.visible).length;
    const totalFields = csvHeaders.length;
    const styledFields = Object.keys(fieldStyles).length;
    
    return { visibleFields, totalFields, styledFields };
  };

  const { visibleFields, totalFields, styledFields } = getFieldStats();

  // Função para salvar o estado do template
  const handleSaveState = async () => {
    // Função auxiliar para converter Blob para Base64
    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    // Mapear generatedImagesData para um formato serializável
    const serializableGeneratedImages = await Promise.all(
      generatedImagesData.map(async (img) => {
        let imageBase64 = null;
        if (img.blob) {
          try {
            imageBase64 = await blobToBase64(img.blob);
          } catch (error) {
            console.error("Erro ao converter blob para Base64:", error);
            // Continuar mesmo se um blob falhar, para não impedir o salvamento do resto
          }
        }
        return {
          ...img,
          blob: undefined, // Remover o blob original
          url: undefined, // Remover o objectURL temporário
          imageBase64: imageBase64, // Adicionar a string base64
          // Manter: record, filename, customFieldPositions, customFieldStyles, backgroundImage (se individual)
        };
      })
    );

    const stateToSave = {
      version: "1.1", // Incrementar versão para refletir a nova estrutura
      backgroundImageUrl: backgroundImage, // Este é o BG global/template, já é uma string (dataURL ou URL externa)
      fieldPositions: fieldPositions,
      fieldStyles: fieldStyles,
      csvHeaders: csvHeaders,
      colorPalette: colorPalette,
      csvData: csvData,
      generatedImages: serializableGeneratedImages, // Salvar os dados das imagens geradas
    };

    const jsonString = JSON.stringify(stateToSave, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_config.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("Configuração do template salva como template_config.json!");
  };

  // Função para carregar o estado do template de um arquivo
  const handleLoadStateFromFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => { // Tornar async para aguardar conversões
        try {
          const loadedState = JSON.parse(e.target.result);

          // Função auxiliar para converter Base64 para Blob
          const base64ToBlob = async (base64, type = 'image/png') => {
            const res = await fetch(base64);
            const blob = await res.blob();
            return blob;
          };

          // Verificar versão e campos essenciais
          if (loadedState.version && (loadedState.version === "1.0" || loadedState.version === "1.1") &&
              loadedState.backgroundImageUrl !== undefined &&
              loadedState.fieldPositions &&
              loadedState.fieldStyles &&
              loadedState.csvHeaders) {

            setBackgroundImage(loadedState.backgroundImageUrl);
            setFieldPositions(loadedState.fieldPositions);
            setFieldStyles(loadedState.fieldStyles);
            setCsvHeaders(loadedState.csvHeaders);
            
            if (loadedState.colorPalette) {
              setColorPalette(loadedState.colorPalette);
            } else {
              // Fallback se a paleta não estiver no JSON (templates antigos)
              // Poderia tentar extrair da imagem carregada se backgroundImage existir
              if (loadedState.backgroundImageUrl) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                  const colorThief = new ColorThief();
                  try {
                    const palette = colorThief.getPalette(img, 5);
                    setColorPalette(palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`));
                  } catch (error) {
                    console.warn("Não foi possível extrair paleta da imagem carregada no JSON.", error);
                    setColorPalette([]); // Reset ou paleta padrão
                  }
                };
                img.src = loadedState.backgroundImageUrl;
              } else {
                setColorPalette([]); // Reset ou paleta padrão
              }
            }
            
            if (loadedState.csvData) {
              setCsvData(loadedState.csvData);
              // Se csvHeaders não vierem explicitamente ou forem inconsistentes,
              // poderíamos derivá-los de loadedState.csvData[0] aqui,
              // mas como loadedState.csvHeaders é obrigatório, confiamos nele.
            } else {
              setCsvData([]);
            }

            // Restaurar generatedImages se presentes (versão 1.1+)
            if (loadedState.version === "1.1" && loadedState.generatedImages) {
              const restoredGeneratedImages = await Promise.all(
                loadedState.generatedImages.map(async (imgData) => {
                  let blob = null;
                  let url = null;
                  if (imgData.imageBase64) {
                    try {
                      blob = await base64ToBlob(imgData.imageBase64);
                      url = URL.createObjectURL(blob);
                    } catch (error) {
                      console.error("Erro ao converter base64 para blob ao carregar:", error);
                    }
                  }
                  return {
                    ...imgData,
                    blob: blob,
                    url: url,
                    imageBase64: undefined, // Remover para não manter em memória desnecessariamente
                  };
                })
              );
              setGeneratedImagesData(restoredGeneratedImages);
            } else {
              setGeneratedImagesData([]); // Limpar se não houver dados ou for versão antiga
            }
            
            // Navegação de passo
            if (loadedState.backgroundImageUrl && loadedState.csvHeaders.length > 0) {
              setActiveStep(2); 
            } else if (loadedState.csvHeaders.length > 0) {
              setActiveStep(1); 
            } else {
              setActiveStep(0);
            }

            alert("Configuração do template carregada com sucesso!");
          } else {
            alert("Arquivo JSON inválido, formato incorreto ou versão incompatível.");
            console.log("Loaded state:", loadedState); // Adicionar log para depuração
          }
        } catch (error) {
          console.error("Erro ao carregar o arquivo JSON:", error);
          alert("Erro ao ler o arquivo JSON.");
        }
      };
      reader.readAsText(file);
      event.target.value = null; 
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorElMenu(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorElMenu(null);
  };

  const handleLoadTemplateClick = () => {
    handleMenuClose();
    // Acionar o clique no input de arquivo escondido
    if (loadStateInputRef.current) {
      loadStateInputRef.current.click();
    }
  };

  const handleSaveTemplateClick = () => {
    handleMenuClose();
    handleSaveState();
  };

  const handleOpenGerenciadorRegistros = () => {
    // setShowGerenciadorRegistros(true); // Removido
    setActiveStep(1); // Avança para a etapa de edição
    handleMenuClose(); // Fechar o menu de ações se estiver aberto
  };

  // Renomeado de handleConcluirEdicaoRegistros para handleDadosAlterados
  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    // console.log('[App] handleDadosAlterados Recebeu Registros:', JSON.parse(JSON.stringify(novosRegistros)), 'Colunas:', novasColunas);
    setCsvData(novosRegistros);
    setCsvHeaders(novasColunas);

    // Atualizar fieldPositions e fieldStyles com base nas novas colunas
    const updatedFieldPositions = {};
    const updatedFieldStyles = {};
    const defaultStylesBase = {
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: darkMode ? '#FFFFFF' : '#000000', // Ajustar cor padrão com base no tema
      textStroke: false,
      strokeColor: darkMode ? '#000000' : '#FFFFFF',
      strokeWidth: 2,
      textShadow: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      textAlign: 'left',
      verticalAlign: 'top'
    };

    novasColunas.forEach((header, index) => {
      updatedFieldPositions[header] = fieldPositions[header] || {
        x: 10 + (index % 5) * 18,
        y: 10 + Math.floor(index / 5) * 12,
        width: 15,
        height: 10,
        visible: true
      };
      updatedFieldStyles[header] = fieldStyles[header] || { ...defaultStylesBase };
    });

    setFieldPositions(updatedFieldPositions);
    setFieldStyles(updatedFieldStyles);

    // setShowGerenciadorRegistros(false); // Removido
    // A lógica de avançar o passo foi removida daqui, será controlada pelos botões globais Next/Back
    // e pela lógica em canProceedToStep.
  }, [darkMode, fieldPositions, fieldStyles, setCsvData, setCsvHeaders, setFieldPositions, setFieldStyles]);

  const handleGenerateIAContent = async () => {
    setIsGenerating(true);

    let apiKey;
    let apiToCall;
    let apiName = "";

    if (selectedApiModel === 'deepseek') {
      apiKey = getDeepSeekApiKey();
      apiToCall = callDeepSeekApi;
      apiName = "DeepSeek";
    } else if (selectedApiModel === 'gemini') {
      apiKey = getGeminiApiKey();
      apiToCall = callGeminiApi;
      apiName = "Gemini";
    } else {
      alert('Modelo de IA não selecionado ou inválido.');
      setIsGenerating(false);
      return;
    }

    if (!apiKey) {
      alert(`Por favor, configure sua chave da API ${apiName} primeiro.\nVocê pode fazer isso no menu "Mais ações" (ícone de três pontos) no cabeçalho.`);
      setIsGenerating(false);
      return;
    }

    if (!promptText.trim()) {
      alert('Por favor, forneça um texto descritivo para o prompt.');
      setIsGenerating(false);
      return;
    }

    if (promptNumRecords <= 0) {
        alert('A quantidade de registros a gerar deve ser maior que zero.');
        setIsGenerating(false);
        return;
    }

    const finalPrompt = `Elabore um carrossel para Instagram com ${promptNumRecords} elementos baseado no texto abaixo. Ajuste o prompt para que o retorno permita o preenchimento equivalente ao do csv:
${promptText}
Cada elemento deve conter:
### Requisitos para cada elemento:
1. **Título** (até 4 palavras):
   - Impactante e curto
   - Use emojis relevantes no início
   - Exemplo: "✨ Segredo Revelado"

2. **Texto Principal** (120-180 caracteres):
   - Fragmento do texto base adaptado para o elemento
   - Linguagem direta e conversacional
   - Incluir 1 pergunta retórica
   - Exemplo: "Sabia que 80% dos negócios falham nisso? Descubra como evitar esse erro..."

3. **Ponte para o Próximo** (até 40 caracteres):
   - Criar curiosidade para o próximo elemento
   - Usar fórmula: Emoji + Chamada + Dica do próximo
   - Exemplos:
     → "Próximo: O passo que muda tudo!"
     → "Siga para o segredo nº3 👇"

### Estrutura de Progressão:
- Elemento 1: Dado impactante + pergunta instigante
- Elementos 2-${promptNumRecords > 1 ? promptNumRecords -1 : 1}: Conteúdo principal dividido em passos (ajustar se promptNumRecords for 1 ou 2)
- Elemento ${promptNumRecords}: CTA claro + bônus surpresa (ou Case de sucesso/resumo se for o penúltimo e CTA no último, ajustar para ${promptNumRecords})

### Tom de Voz:
- Empático e motivacional (use "você" e "vamos")
- Urgência controlada ("Agora você pode...")
- Toque de storytelling`;

    console.log("Prompt para DeepSeek:", finalPrompt);
    console.log("Número de Registros para Gerar:", promptNumRecords);

    // console.log("Prompt para DeepSeek:", finalPrompt); // Manter para depuração se necessário
    // console.log("Número de Registros para Gerar:", promptNumRecords);

    try {
      let iaResponseText = "";
      if (apiToCall) { // Verifica se apiToCall está definida
        iaResponseText = await apiToCall(finalPrompt, apiKey);
        console.log(`Resposta da API ${apiName} (bruta):`, iaResponseText);
      } else {
        throw new Error("Nenhuma função de API válida foi selecionada.");
      }

      const parsedResult = parseIaResponseToCsvData(iaResponseText, promptNumRecords);

      if (parsedResult && parsedResult.data && parsedResult.data.length > 0) {
        setCsvData(parsedResult.data);
        setCsvHeaders(parsedResult.headers);

        const updatedFieldPositions = {};
        const updatedFieldStyles = {};
        const defaultStylesBase = {
          fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
          textDecoration: 'none', color: darkMode ? '#FFFFFF' : '#000000', textStroke: false,
          strokeColor: darkMode ? '#000000' : '#FFFFFF', strokeWidth: 2, textShadow: false,
          shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
          textAlign: 'left', verticalAlign: 'top'
        };

        parsedResult.headers.forEach((header, index) => {
          updatedFieldPositions[header] = {
            x: 10 + (index % 5) * 18, y: 10 + Math.floor(index / 5) * 12,
            width: 15, height: 10, visible: true
          };
          updatedFieldStyles[header] = { ...defaultStylesBase };
        });
        setFieldPositions(updatedFieldPositions);
        setFieldStyles(updatedFieldStyles);

        setActiveStep(1); // Avança para Edição de Dados
      } else {
        alert('Não foi possível processar a resposta da IA para o formato de tabela. Verifique o console para a resposta bruta da IA e a saída do parser.');
        console.log(`[App] Falha no parsing ou dados vazios. Resposta da API ${apiName}:`, iaResponseText, "Resultado do Parser:", parsedResult);
      }

    } catch (error) {
      console.error(`Erro ao chamar ou processar API ${apiName}:`, error);
      alert(`Erro ao gerar conteúdo com IA via ${apiName}: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const parseIaResponseToCsvData = (responseText, numRecords) => {
    const headers = ["Título", "Texto Principal", "Ponte para o Próximo"];
    const data = [];

    if (!responseText || typeof responseText !== 'string') {
        console.error("Resposta da IA inválida ou vazia para parsing.");
        return { data: [], headers };
    }

    // Tenta dividir a resposta em elementos. Isso é altamente dependente do formato da IA.
    // Uma suposição inicial: cada elemento começa com algo como "Elemento X:" ou um padrão numérico.
    // Ou, se a IA for bem comportada, poderíamos tentar um split mais genérico por blocos de texto.
    // Por agora, vamos tentar uma abordagem bem simples baseada nos campos esperados.

    // Regex para encontrar "Título:", "Texto Principal:", "Ponte para o Próximo:"
    // Esta é uma regex muito básica e pode precisar de muitos ajustes.
    const elementoRegex = /Título\s*:(.*?)(?:Texto Principal\s*:|\n\n|$)/gis;
    let match;
    let currentMatchIndex = 0;

    // Este loop tenta encontrar blocos que começam com "Título:"
    // e depois extrai os outros campos a partir daí.
    // É uma heurística e pode falhar facilmente dependendo da formatação da IA.

    // Uma abordagem mais robusta seria se a IA usasse delimitadores claros, ex: "---ELEMENTO---"
    // Por enquanto, vamos tentar uma abordagem mais direta de extração de campos.

    const lines = responseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentRecord = {};
    let fieldOrderIndex = 0; // 0: Título, 1: Texto Principal, 2: Ponte

    for (const line of lines) {
        if (line.toLowerCase().startsWith("título:") || line.toLowerCase().startsWith("titulo:")) {
            if (Object.keys(currentRecord).length > 0 && data.length < numRecords) {
                 // Antes de começar um novo título, se o registro anterior tem algo, adicione-o
                 // e preencha campos faltantes se necessário
                if (!currentRecord["Título"]) currentRecord["Título"] = "";
                if (!currentRecord["Texto Principal"]) currentRecord["Texto Principal"] = "";
                if (!currentRecord["Ponte para o Próximo"]) currentRecord["Ponte para o Próximo"] = "";
                data.push(currentRecord);
            }
            currentRecord = {}; // Começa novo registro
            currentRecord["Título"] = line.substring(line.indexOf(':') + 1).trim();
            fieldOrderIndex = 1;
        } else if (line.toLowerCase().startsWith("texto principal:")) {
            currentRecord["Texto Principal"] = line.substring(line.indexOf(':') + 1).trim();
            fieldOrderIndex = 2;
        } else if (line.toLowerCase().startsWith("ponte para o próximo:") || line.toLowerCase().startsWith("ponte:")) {
            currentRecord["Ponte para o Próximo"] = line.substring(line.indexOf(':') + 1).trim();
            fieldOrderIndex = 0; // Reset para próximo título
             if (Object.keys(currentRecord).length >= 1 && data.length < numRecords) { // Garante que tem pelo menos um título
                if (!currentRecord["Título"]) currentRecord["Título"] = "Título não encontrado"; // Fallback
                if (!currentRecord["Texto Principal"]) currentRecord["Texto Principal"] = "";
                if (!currentRecord["Ponte para o Próximo"]) currentRecord["Ponte para o Próximo"] = "";
                data.push(currentRecord);
                currentRecord = {};
            }
        } else {
            // Se a linha não é um header de campo conhecido, tenta anexar ao último campo detectado
            // Isso é muito propenso a erros e depende da IA não colocar texto extra entre os campos.
            if (fieldOrderIndex === 1 && currentRecord["Título"] && !currentRecord["Texto Principal"]) {
                 // Assume que é continuação do Título ou início do Texto Principal se Texto Principal estiver vazio
                currentRecord["Texto Principal"] = (currentRecord["Texto Principal"] || "") + " " + line;
                currentRecord["Texto Principal"] = currentRecord["Texto Principal"].trim();
            } else if (fieldOrderIndex === 2 && currentRecord["Texto Principal"] && !currentRecord["Ponte para o Próximo"]) {
                // Assume que é continuação do Texto Principal ou início da Ponte
                 currentRecord["Ponte para o Próximo"] = (currentRecord["Ponte para o Próximo"] || "") + " " + line;
                 currentRecord["Ponte para o Próximo"] = currentRecord["Ponte para o Próximo"].trim();
            }
        }
    }
    // Adicionar o último registro se ele existir e não tiver sido adicionado
    if (Object.keys(currentRecord).length > 0 && data.length < numRecords && currentRecord["Título"]) {
        if (!currentRecord["Texto Principal"]) currentRecord["Texto Principal"] = "";
        if (!currentRecord["Ponte para o Próximo"]) currentRecord["Ponte para o Próximo"] = "";
        data.push(currentRecord);
    }

    // Se gerou menos registros que o solicitado, preenche com vazios até numRecords
    // while(data.length < numRecords && data.length > 0) { // Apenas se já começou a gerar algo
    //   data.push({ "Título": `Elemento ${data.length + 1} (placeholder)`, "Texto Principal": "", "Ponte para o Próximo": "" });
    // }

    console.log("[parseIaResponseToCsvData] Dados Parseados:", data);
    return { data, headers };
  };


  const currentTheme = darkMode ? darkTheme : lightTheme;

  // Removida a renderização condicional do GerenciadorRegistros aqui,
  // ele será renderizado como parte do conteúdo da etapa.

  // Efeito temporário para logar csvData após atualização (para depuração da exclusão)
  // useEffect(() => {
  //   console.log('[App] Estado csvData atualizado (dentro do useEffect):', JSON.parse(JSON.stringify(csvData)));
  // }, [csvData]);

  const headerExpandedHeight = '280px'; // Altura do header quando expandido
  const headerCollapsedHeight = '80px'; // Altura do header quando colapsado (para padding do container)
  const headerPaperHeightCollapsed = '60px'; // Altura do Paper do header quando colapsado

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline /> {/* Adiciona normalização e cor de fundo do tema */}
      {/* Ajustar pt (padding-top) do Container com base em isMobile ou isHeaderHovered */}
      <Container
        maxWidth="xl"
        sx={{
          pt: isMobile ? headerCollapsedHeight : (isHeaderHovered ? headerExpandedHeight : headerCollapsedHeight),
          transition: 'padding-top 0.3s ease-in-out'
        }}
      >
        <Paper 
          elevation={3} 
          onMouseEnter={() => !isMobile && setIsHeaderHovered(true)}
          onMouseLeave={() => !isMobile && setIsHeaderHovered(false)}
          sx={{ 
            p: isMobile ? 2 : (isHeaderHovered ? 4 : 2),
            mb: 4,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            height: isMobile ? headerPaperHeightCollapsed : (isHeaderHovered ? 'auto' : headerPaperHeightCollapsed),
            minHeight: headerPaperHeightCollapsed,
            overflow: 'hidden',
            transition: 'height 0.3s ease-in-out, padding 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Box>
            <Typography 
              variant={isMobile || !isHeaderHovered ? 'h5' : 'h3'}
              component="h3" 
              color="primary"
              sx={{
                transition: 'font-size 0.3s ease-in-out',
                m:0, p:0,
                lineHeight: isMobile || !isHeaderHovered ? 'normal': 'inherit'
              }}
            >
              Midiator - Mesclar conteúdo
            </Typography>
            {/* Mostrar subtítulo apenas se não for mobile E o header estiver expandido (hover) */}
            {!isMobile && isHeaderHovered && (
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{
                  mb: 0,
                  transition: 'opacity 0.3s ease-in-out, height 0.3s ease-in-out',
                  opacity: isHeaderHovered ? 1 : 0,
                  height: isHeaderHovered ? 'auto' : 0
                }}
              >
                Crie imagens personalizadas com controles de formatação individual
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}> {/* Container para os ícones do lado direito */}
            <Tooltip title={darkMode ? "Alternar para modo claro" : "Alternar para modo escuro"}>
              <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Mais ações">
              <IconButton
                aria-label="Mais ações"
                aria-controls="actions-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                color="inherit"
              >
                <MoreVert />
              </IconButton>
            </Tooltip>
            <Menu
              id="actions-menu"
              anchorEl={anchorElMenu}
              keepMounted
              open={Boolean(anchorElMenu)}
              onClose={handleMenuClose}
            >
              {/* <MenuItem onClick={handleOpenGerenciadorRegistros}> // Removido - Edição agora é uma etapa
                <Edit sx={{ mr: 1 }} />
                Editar Registros
              </MenuItem> */}
              <MenuItem onClick={() => setActiveStep(1)}> {/* Atalho para ir para Etapa de Edição */}
                <Edit sx={{ mr: 1 }} />
                Ir para Edição de Dados
              </MenuItem>
              <MenuItem onClick={() => { setShowDeepSeekAuthModal(true); handleMenuClose(); }}>
                <VpnKeyIcon sx={{ mr: 1 }} /> {/* Considerar um ícone específico para DeepSeek se houver */}
                Configurar API DeepSeek
              </MenuItem>
              <MenuItem onClick={() => { setShowGeminiAuthModal(true); handleMenuClose(); }}>
                <GoogleIcon sx={{ mr: 1 }} /> {/* Exemplo de ícone para Gemini */}
                Configurar API Gemini
              </MenuItem>
              <MenuItem onClick={handleSaveTemplateClick}>Salvar Config. Template</MenuItem>
              <MenuItem onClick={handleLoadTemplateClick}>Carregar Config. Template</MenuItem>
            </Menu>
            {/* Input de arquivo escondido para carregar template */}
            <input 
              type="file" 
              hidden 
              accept=".json" 
              onChange={handleLoadStateFromFile} 
              ref={loadStateInputRef} 
            />
          </Box>
        </Box>
        
        {/* Mostrar indicadores de status apenas se não for mobile E o header estiver expandido (hover) */}
        {!isMobile && isHeaderHovered && (
          <>
            {/* Indicadores de status */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, mb: 2, flexWrap: 'wrap', transition: 'opacity 0.3s ease-in-out, height 0.3s ease-in-out', opacity: isHeaderHovered ? 1 : 0, height: isHeaderHovered ? 'auto' : 0 }}>
              <Chip 
                icon={<FileUpload />}
                label={`${csvData.length} registros`}
                color={csvData.length > 0 ? 'success' : 'default'}
                variant={csvData.length > 0 ? 'filled' : 'outlined'}
                size={!isHeaderHovered ? 'small' : 'medium'}
              />
              <Chip 
                icon={<ImageIcon />}
                label="Imagem de fundo"
                color={backgroundImage ? 'success' : 'default'}
                variant={backgroundImage ? 'filled' : 'outlined'}
                size={!isHeaderHovered ? 'small' : 'medium'}
              />
              <Chip 
                icon={<Settings />}
                label={`${visibleFields}/${totalFields} campos`}
                color={visibleFields > 0 ? 'info' : 'default'}
                variant="filled"
                size={!isHeaderHovered ? 'small' : 'medium'}
              />
              <Chip 
                icon={<Palette />}
                label={`${styledFields} estilos`}
                color={styledFields > 0 ? 'secondary' : 'default'}
                variant="filled"
                size={!isHeaderHovered ? 'small' : 'medium'}
              />
            </Box>
            {/* Botões Salvar/Carregar Configuração foram movidos para o Menu */}
          </>
        )}
      </Paper>

      <Grid container spacing={3} sx={{ mt: 0 }}> {/* mt:0 porque o padding do container já cuida do espaço */}
        {/* Stepper lateral */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel
                      optional={
                        index === steps.length - 1 ? (
                          <Typography variant="caption">Último passo</Typography>
                        ) : null
                      }
                    >
                      {step.label}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="textSecondary">
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Grid>

        {/* Conteúdo principal */}
        <Grid item xs={12} md={9} 
           >
          
          {/* Passo 0: Definir Dados Iniciais (Upload CSV ou Manual) */}
          {activeStep === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <FileUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {steps[0].label}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <ToggleButtonGroup
                    color="primary"
                    value={inputMethod}
                    exclusive
                    onChange={(event, newInputMethod) => {
                      if (newInputMethod !== null) {
                        setInputMethod(newInputMethod);
                      }
                    }}
                    aria-label="Método de entrada de dados"
                  >
                    <ToggleButton value="csv">Carregar CSV</ToggleButton>
                    <ToggleButton value="ia">Gerar com IA</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {inputMethod === 'csv' && (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Button
                      variant="contained"
                      component="label"
                      size="large"
                      startIcon={<FileUpload />}
                      sx={{ mb: 2 }}
                    >
                      Selecionar Arquivo CSV
                      <input
                        type="file"
                        accept=".csv"
                        hidden
                        ref={fileInputRef}
                        onChange={handleCSVUpload}
                      />
                    </Button>
                    <Typography variant="body2" color="textSecondary" sx={{mt:1}}>
                      Carregue um arquivo CSV para definir os dados.
                    </Typography>
                    {csvData.length > 0 && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        ✅ {csvData.length} registros carregados. Campos: {csvHeaders.join(', ')}.
                        <br/>Clique em "Próximo" para editar.
                      </Alert>
                    )}
                     {csvData.length === 0 && activeStep === 0 && (
                       <Alert severity="info" sx={{mt: 2,  maxWidth: '60%', margin: '10px auto' } }>
                          Nenhum dado CSV carregado.
                       </Alert>
                    )}
                  </Box>
                )}

                {inputMethod === 'ia' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', py: 2 }}>
                    <ToggleButtonGroup
                      color="secondary"
                      value={selectedApiModel}
                      exclusive
                      onChange={(event, newModel) => {
                        if (newModel !== null) {
                          setSelectedApiModel(newModel);
                        }
                      }}
                      aria-label="Selecionar Modelo de IA"
                      sx={{ mb: 2 }}
                    >
                      <ToggleButton value="deepseek">DeepSeek</ToggleButton>
                      <ToggleButton value="gemini">Gemini</ToggleButton>
                    </ToggleButtonGroup>

                    {selectedApiModel === 'deepseek' && !getDeepSeekApiKey() && (
                      <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: '500px' }}>
                        Chave da API DeepSeek não configurada.
                        <MuiLink component="button" variant="body2" onClick={() => setShowDeepSeekAuthModal(true)} sx={{ml:1}}>
                          Configurar Chave DeepSeek
                        </MuiLink>
                      </Alert>
                    )}
                    {selectedApiModel === 'gemini' && !getGeminiApiKey() && (
                      <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: '500px' }}>
                        Chave da API Gemini não configurada.
                        <MuiLink component="button" variant="body2" onClick={() => setShowGeminiAuthModal(true)} sx={{ml:1}}>
                          Configurar Chave Gemini
                        </MuiLink>
                      </Alert>
                    )}

                    <TextField
                      label="Quantidade de Elementos/Registros"
                      type="number"
                      value={promptNumRecords}
                      onChange={(e) => setPromptNumRecords(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      inputProps={{ min: 1 }}
                      variant="outlined"
                      sx={{ width: '100%', maxWidth: '500px' }}
                    />
                    <TextField
                      label="Texto Descritivo do Prompt (Objetivo)"
                      multiline
                      rows={4}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', maxWidth: '500px' }}
                      placeholder="Ex: Um carrossel sobre os benefícios da meditação para reduzir o estresse, focado em dicas práticas para iniciantes."
                    />
                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      onClick={handleGenerateIAContent}
                      disabled={
                        isGenerating ||
                        !promptText.trim() ||
                        (selectedApiModel === 'deepseek' && !getDeepSeekApiKey()) ||
                        (selectedApiModel === 'gemini' && !getGeminiApiKey())
                      }
                      sx={{ mt: 1, position: 'relative' }}
                    >
                      {isGenerating && (
                        <CircularProgress
                          size={24}
                          sx={{
                            color: 'primary.contrastText',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-12px',
                            marginLeft: '-12px',
                          }}
                        />
                      )}
                      {isGenerating ? 'Gerando...' : 'Gerar Conteúdo com IA'}
                    </Button>
                     <Typography variant="body2" color="textSecondary" sx={{mt:1}}>
                        Após gerar, os dados aparecerão abaixo. Clique em "Próximo" para editá-los.
                    </Typography>
                     {csvData.length > 0 && ( // Mostrar dados gerados se houver
                      <Alert severity="success" sx={{ mt: 2 }}>
                        ✅ {csvData.length} registros gerados/carregados. Campos: {csvHeaders.join(', ')}.
                        <br/>Clique em "Próximo" para editar.
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Mensagem genérica para quando não há dados e está na Etapa 0, para o modo IA */}
                {inputMethod === 'ia' && csvData.length === 0 && !isGenerating && (
                   <Alert severity="info" sx={{mt: 2, maxWidth: '70%', margin: '20px auto' } }>
                      Preencha os campos acima e clique em "Gerar Conteúdo com IA" para iniciar. Alternativamente, selecione "Carregar CSV" para usar um arquivo.
                   </Alert>
                )}
                {/* O Box que engloba os conteúdos de 'csv' ou 'ia' já foi fechado dentro de suas respectivas condições.
                    Não há um </Box> extra necessário aqui antes de </CardContent>
                */}
              </CardContent>
            </Card>
          )}

          {/* Passo 1: Editar Dados */}
          {activeStep === 1 && (
            <GerenciadorRegistros
              registrosIniciais={csvData}
              colunasIniciais={csvHeaders}
              onDadosAlterados={handleDadosAlterados} // Nome da prop atualizado
              darkMode={darkMode}
            />
          )}

          {/* Passo 2: Upload Imagem */}
          {activeStep === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <CloudUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {steps[2].label}
                </Typography>
                
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Button
                    variant="contained"
                    component="label"
                    size="large"
                    startIcon={<CloudUpload />}
                    sx={{ mb: 2 }}
                  >
                    Selecionar Imagem PNG/JPG
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      hidden
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                    />
                  </Button>
                  
                  <Typography variant="body2" color="textSecondary">
                    Esta imagem será usada como fundo para todas as imagens geradas
                  </Typography>
                  
                  {backgroundImage && (
                    <Box sx={{ mt: 3 }}>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        ✅ Imagem de fundo carregada com sucesso!
                      </Alert>
                      <img
                        src={backgroundImage}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '300px',
                          objectFit: 'contain',
                          border: '2px solid #ddd',
                          borderRadius: '8px'
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Passo 3: Posicionamento e Formatação */}
          {activeStep === 3 && (
            <FieldPositioner
              backgroundImage={backgroundImage}
              csvHeaders={csvHeaders}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              fieldStyles={fieldStyles}
              setFieldStyles={setFieldStyles}
              csvData={csvData}
              onImageDisplayedSizeChange={setDisplayedImageSize}
              colorPalette={colorPalette}
            />
          )}

          {/* Passo 4: Geração */}
          {activeStep === 4 && (
            <ImageGeneratorFrontendOnly
              csvData={csvData}
              backgroundImage={backgroundImage}
              fieldPositions={fieldPositions}
              fieldStyles={fieldStyles}
              displayedImageSize={displayedImageSize}
              csvHeaders={csvHeaders} // <-- ADICIONADO
              colorPalette={colorPalette}
              // Passar o setter para que ImageGeneratorFrontendOnly possa atualizar App.jsx
              setGeneratedImagesData={setGeneratedImagesData} 
              // Passar os dados existentes, caso o ImageGeneratorFrontendOnly precise deles ao iniciar
              initialGeneratedImagesData={generatedImagesData}
            />
          )}

          {/* Botões de navegação não estão mais aqui */}
        </Grid> {/* Fecha Grid item xs={12} md={9} do conteúdo principal */}
      </Grid> {/* Fecha Grid container spacing={3} */}

      {/* Botões de Navegação Circulares Flutuantes */}
      <Box
        sx={{
          position: 'fixed',
          bottom: '50%', // Centraliza verticalmente
          left: '20px', // Distância da esquerda
          transform: 'translateY(50%)', // Ajuste fino para centralização vertical
          zIndex: 1000, // Para garantir que fiquem acima de outros elementos
        }}
      >
        <Tooltip title="Anterior" placement="right">
          <span> {/* Span para habilitar tooltip em botão desabilitado */}
            <IconButton
              aria-label="anterior"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <ArrowBackIosNew />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: '50%', // Centraliza verticalmente
          right: '20px', // Distância da direita
          transform: 'translateY(50%)', // Ajuste fino para centralização vertical
          zIndex: 1000, // Para garantir que fiquem acima de outros elementos
        }}
      >
        <Tooltip title={activeStep === steps.length - 1 ? 'Finalizar' : 'Próximo'} placement="left">
          <span> {/* Span para habilitar tooltip em botão desabilitado */}
            <IconButton
              aria-label="próximo"
              onClick={handleNext}
              disabled={activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <ArrowForwardIos />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Modal de Configuração da Chave API DeepSeek */}
      <DeepSeekAuthSetup
        open={showDeepSeekAuthModal}
        onClose={() => setShowDeepSeekAuthModal(false)}
      />

      {/* Modal de Configuração da Chave API Gemini */}
      <GeminiAuthSetup
        open={showGeminiAuthModal}
        onClose={() => setShowGeminiAuthModal(false)}
      />
    </Container>
    </ThemeProvider>
  );
}

export default App;

