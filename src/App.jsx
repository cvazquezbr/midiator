import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIsMobile } from './hooks/use-mobile';
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
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  CircularProgress,
  Link as MuiLink,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  Settings,
  Image as ImageIcon,
  Palette,
  ArrowBackIosNew,
  ArrowForwardIos,
  MoreVert,
  Brightness4,
  Brightness7,
  Edit,
  Download as DownloadIcon,
  CloudQueue,
  ChevronRight,
  Check,
  Add,
  InsertDriveFileOutlined,
  FormatBold,
  Visibility,
  Grid3x3
} from '@mui/icons-material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Importar o ícone se não estiver globalmente disponível
import Papa from 'papaparse';
import ColorThief from 'colorthief';
import { Menu, MenuItem } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import FieldPositioner from './components/FieldPositioner';
import ImageGeneratorFrontendOnly from './components/ImageGeneratorFrontendOnly';
import RecordManager from './features/RecordManager/RecordManager';
import CsvInfobox from './components/CsvInfobox'; // Importar o novo componente
// import DeepSeekAuthSetup from './components/DeepSeekAuthSetup'; // Removed
import GeminiAuthSetup from './components/GeminiAuthSetup';
import GoogleDriveAuthModal from './components/GoogleDriveAuthModal';
// import { getDeepSeekApiKey } from './utils/deepSeekCredentials'; // Removed
import { getGeminiApiKey } from './utils/geminiCredentials';
// import { callDeepSeekApi } from './utils/deepSeekAPI'; // Removed
import { callGeminiApi } from './utils/geminiAPI';
// import VpnKeyIcon from '@mui/icons-material/VpnKey'; // Removed as it was for DeepSeek menu item
import GoogleIcon from '@mui/icons-material/Google';
import './App.css';

// Temas atualizados com gradientes e cores modernas
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#8b5cf6', // Purple
    },
    secondary: {
      main: '#ec4899', // Pink
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e5e7eb',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
          }
        }
      }
    }
  }
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a78bfa',
    },
    secondary: {
      main: '#f472b6',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          }
        }
      }
    }
  }
});

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]);
  const isMobile = useIsMobile();
  const [anchorElMenu, setAnchorElMenu] = useState(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isDraggingOverCsv, setIsDraggingOverCsv] = useState(false);
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  // const [showDeepSeekAuthModal, setShowDeepSeekAuthModal] = useState(false); // Removed
  const [showGeminiAuthModal, setShowGeminiAuthModal] = useState(false);
  const [showGoogleDriveAuthModal, setShowGoogleDriveAuthModal] = useState(false);

  // Estados para a Geração com IA
  const [inputMethod, setInputMethod] = useState('csv');
  // const [selectedApiModel, setSelectedApiModel] = useState('deepseek'); // Removed, defaulting to gemini
  const [promptNumRecords, setPromptNumRecords] = useState(10);
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const loadStateInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark-mode-active');
    } else {
      document.documentElement.classList.remove('dark-mode-active');
    }
  }, [darkMode]);

  const steps = [
    {
      label: 'Conteúdo',
      description: 'Carregar CSV ou criar manualmente',
      icon: InsertDriveFileOutlined
    },
    {
      label: 'Editar Conteúdo',
      description: 'Adicione, edite ou remova posts conforme necessário.',
      icon: Edit
    },
    {
      label: 'Upload da Imagem',
      description: 'Carregue a imagem de fundo PNG/JPG.',
      icon: ImageIcon
    },
    {
      label: 'Posicionar e Formatar',
      description: 'Posicione os campos e configure a formatação.',
      icon: Palette
    },
    {
      label: 'Gerar Imagens',
      description: 'Gere as imagens finais.',
      icon: FormatBold
    }
  ];
  // Função para ler arquivo CSV
  const parseCsvFile = (file) => {
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

            const updatedFieldPositions = {};
            const updatedFieldStyles = {};

            const defaultStylesBase = {
              fontFamily: 'Inter',
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
              textAlign: 'left',
              verticalAlign: 'top'
            };

            newHeaders.forEach((header, index) => {
              if (fieldPositions[header]) {
                updatedFieldPositions[header] = fieldPositions[header];
              } else {
                updatedFieldPositions[header] = {
                  x: 10 + (index % 5) * 18,
                  y: 10 + Math.floor(index / 5) * 12,
                  width: 15,
                  height: 10,
                  visible: true
                };
              }

              if (fieldStyles[header]) {
                updatedFieldStyles[header] = fieldStyles[header];
              } else {
                updatedFieldStyles[header] = { ...defaultStylesBase };
              }
            });

            setFieldPositions(updatedFieldPositions);
            setFieldStyles(updatedFieldStyles);
            setActiveStep(1);
          }
        },
        error: (error) => {
          console.error('Erro ao ler CSV:', error);
          alert('Erro ao ler o arquivo CSV. Verifique se o formato está correto.');
        }
      });
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    parseCsvFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverCsv(false);
    const file = event.dataTransfer.files[0];
    parseCsvFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverCsv(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverCsv(false);
  };

  // Função para processar o arquivo de imagem de fundo
  const parseImageFile = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setBackgroundImage(imageUrl);

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(img, 5);
          setColorPalette(palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`));
        };
        img.src = imageUrl;

        const etapaPosicionarFormatarIndex = steps.findIndex(step => step.label === 'Posicionar e Formatar');
        if (etapaPosicionarFormatarIndex !== -1) {
          setActiveStep(etapaPosicionarFormatarIndex);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para upload da imagem de fundo via clique
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    parseImageFile(file);
  };

  // Funções para drag and drop da imagem de fundo
  const handleImageDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverImage(false);
    const file = event.dataTransfer.files[0];
    parseImageFile(file);
  };

  const handleImageDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleImageDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverImage(true);
  };

  const handleImageDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverImage(false);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const canProceedToStep = (nextStepIndex) => {
    switch (activeStep) {
      case 0:
        return true;
      case 1:
        return csvData.length > 0;
      case 2:
        return backgroundImage !== null;
      case 3:
        return true;
      default:
        return true;
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

  // Outras funções mantidas do código original...

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
              // console.log("App.jsx - handleLoadStateFromFile - BEFORE setGeneratedImagesData - restoredGeneratedImages:", JSON.stringify(restoredGeneratedImages, null, 2)); // LOG REMOVED
              // Example to check a specific item if you know its expected index, e.g., 7 for thumbnail #8
              // if (restoredGeneratedImages && restoredGeneratedImages.length > 7) {
              //   console.log("App.jsx - handleLoadStateFromFile - restoredGeneratedImages[7]:", JSON.stringify(restoredGeneratedImages[7], null, 2));
              // }
              setGeneratedImagesData(restoredGeneratedImages);
            } else {
              // console.log("App.jsx - handleLoadStateFromFile - No generatedImages in JSON or old version, clearing generatedImagesData."); // LOG REMOVED
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

  const handleDownloadExampleCSV = useCallback(async () => {
    try {
      const response = await fetch("/exemplo_posts.csv");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();

      // Adicionar BOM UTF-8
      const csvWithBOM = "\uFEFF" + csvText;

      const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "exemplo_posts.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar o CSV de exemplo:", error);
      alert("Não foi possível baixar o arquivo CSV de exemplo. Verifique o console para mais detalhes.");
    }
  }, []);

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

  const handleExportCSV = () => {
    if (csvData.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    // Papa.unparse espera um array de objetos ou um array de arrays.
    // Se csvHeaders for usado, ele garante a ordem das colunas.
    // Se csvData já for um array de objetos com as chaves corretas,
    // Papa.unparse(csvData) pode ser suficiente, mas usar 'fields' garante a ordem.
    const config = {
      quotes: true, // Adiciona aspas em todos os campos
      delimiter: ";", // Usa ponto e vírgula como delimitador
      header: true, // Inclui a linha de cabeçalho
      fields: csvHeaders // Garante a ordem das colunas e quais incluir
    };
    const csvString = Papa.unparse(csvData, config);

    const blob = new Blob([`\uFEFF${csvString}`], { type: "text/csv;charset=utf-8;" }); // Adiciona BOM para UTF-8 Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dados_exportados.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    handleMenuClose(); // Fechar o menu após a ação
  };
  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    setCsvData(novosRegistros);
    setCsvHeaders(novasColunas);

    const updatedFieldPositions = {};
    const updatedFieldStyles = {};
    const defaultStylesBase = {
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: darkMode ? '#FFFFFF' : '#000000',
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

    setGeneratedImagesData(prevGeneratedImages => {
      if (prevGeneratedImages.length !== novosRegistros.length) {
        const rebuiltGeneratedImages = novosRegistros.map((record, index) => ({
          index,
          record,
          blob: null,
          url: null,
          filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
          backgroundImage: backgroundImage,
        }));
        return rebuiltGeneratedImages;
      } else {
        const updatedGeneratedImages = prevGeneratedImages.map((oldImage, index) => ({
          ...oldImage,
          record: novosRegistros[index],
          index: index,
        }));
        return updatedGeneratedImages;
      }
    });
  }, [darkMode, fieldPositions, fieldStyles, setCsvData, setCsvHeaders, setFieldPositions, setFieldStyles, backgroundImage, generatedImagesData.length]);

  const handleCsvRecordContentUpdate = useCallback((newCsvData) => {
    setCsvData(newCsvData);
  }, [setCsvData]);

  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => {
    setCsvData(prevCsvData => {
      if (recordIndex < 0 || recordIndex >= prevCsvData.length) {
        console.error("handleThumbnailRecordTextUpdate: recordIndex out of bounds", recordIndex);
        return prevCsvData;
      }
      return prevCsvData.map((row, idx) => {
        if (idx === recordIndex) {
          return updatedRecord;
        }
        return row;
      });
    });
  }, [setCsvData]);

  const handleGenerateIAContent = async () => {
    setIsGenerating(true);

    let apiKey;
    let apiToCall;
    let apiName = "Gemini"; // Defaulting to Gemini

    apiKey = getGeminiApiKey();
    apiToCall = callGeminiApi;

    if (!apiKey) {
      alert(`Por favor, configure sua chave da API Gemini primeiro.\nVocê pode fazer isso no menu "Mais ações" (ícone de três pontos) no cabeçalho.`);
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

    const finalPrompt = `A partir do TEXTO BASE fornecido abaixo, gere conteúdo para um carrossel de Instagram com ${promptNumRecords} elementos.

TEXTO BASE:
${promptText}

INSTRUÇÕES DE FORMATAÇÃO DA SAÍDA (MUITO IMPORTANTE):
A SUA RESPOSTA DEVE CONTER *APENAS E SOMENTE* UM BLOCO DE TEXTO FORMATADO COMO CSV, SEM NENHUM TEXTO ADICIONAL ANTES OU DEPOIS DO BLOCO CSV.
O BLOCO CSV DEVE SER DELIMITADO EXATAMENTE POR TRÊS CRASE SEGUIDAS E A PALAVRA "csv" (\`\`\`csv) NO INÍCIO, E TRÊS CRASE SEGUIDAS (\`\`\`) NO FINAL.
DENTRO DO BLOCO CSV:
- A primeira linha DEVE SER o cabeçalho: Titulo;Texto Principal;Ponte para o Próximo
- As linhas subsequentes DEVERÃO ser os dados de cada elemento, com os campos separados por PONTO E VÍRGULA (;).
- NÃO inclua números de elemento ou qualquer outra coluna além de "Titulo", "Texto Principal", e "Ponte para o Próximo".
- NÃO inclua explicações, introduções, ou qualquer texto fora do bloco \`\`\`csv ... \`\`\`.

REQUISITOS PARA O CONTEÚDO DE CADA ELEMENTO (LINHA DO CSV):
1. **Titulo** (Coluna 1):
   - Máximo de 4 palavras.
   - Deve começar com um emoji relevante.
   - Precisa ser curto e impactante.
   - Exemplo: "✨ Segredo Revelado"
2. **Texto Principal** (Coluna 2):
   - Entre 120 e 180 caracteres.
   - Adaptado do TEXTO BASE, com linguagem conversacional e direta.
   - Deve conter 1 pergunta retórica para engajamento.
   - Exemplo: "Sabia que 80% dos negócios falham nisso? Descubra como evitar esse erro..."
3. **Ponte para o Próximo** (Coluna 3):
   - Máximo de 40 caracteres.
   - Criar curiosidade para o próximo elemento.
   - Usar fórmula: Emoji + Chamada + Dica do próximo.
   - No último elemento, substitua por uma Chamada para Ação (CTA) final.
   - Exemplos:
     → "Próximo: O passo que muda tudo!"
     → "Siga para o segredo nº3 👇"

ESTRUTURA NARRATIVA SUGERIDA:
- Elemento 1: Dado impactante ou pergunta instigante extraída do início do TEXTO BASE.
- Elementos intermediários: Desenvolver os pontos principais do TEXTO BASE.
- Último Elemento: CTA claro ou resumo conclusivo.

TOM DE VOZ:
- Empático e motivacional (use "você" e "vamos").
- Urgência controlada ("Agora você pode...").
- Toque de storytelling.

Exemplo de como o BLOCO CSV deve se parecer na sua resposta (não inclua este exemplo na sua resposta final, apenas o bloco gerado):
\`\`\`csv
Titulo;Texto Principal;Ponte para o Próximo
✨ Grande Novidade;Descubra algo incrível que vai mudar seu dia! Você está pronto para a surpresa?;➡️ Veja o próximo!
🎉 Outra Dica;Continuando nossa jornada com mais um segredo. Já se perguntou como isso é possível?;CTA Final Aqui!
\`\`\`
Lembre-se: Sua resposta final deve conter APENAS o bloco \`\`\`csv ... \`\`\` com os dados.`;

    console.log("Prompt para Gemini/DeepSeek:", finalPrompt); // Log atualizado para ser genérico
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
    // Definição dos cabeçalhos esperados pelo GerenciadorRegistros
    const finalHeaders = ["Título", "Texto Principal", "Ponte para o Próximo"];
    const data = [];

    if (!responseText || typeof responseText !== 'string') {
      console.error("[parseIaResponseToCsvData] Resposta da IA inválida ou vazia.");
      return { data: [], headers: finalHeaders };
    }

    console.log("[parseIaResponseToCsvData] Resposta bruta recebida para parsing:", responseText);

    // 1. Extrair o bloco CSV
    const csvBlockRegex = /```csv\s*([\s\S]+?)\s*```/;
    const csvMatch = responseText.match(csvBlockRegex);
    console.log("[parseIaResponseToCsvData] Resultado do match da regex (csvMatch):", csvMatch);

    if (csvMatch && csvMatch[1] && csvMatch[1].trim() !== "") {
      const csvContent = csvMatch[1].trim();
      console.log("[parseIaResponseToCsvData] Conteúdo CSV bruto extraído (csvMatch[1]):", csvMatch[1]);
      console.log("[parseIaResponseToCsvData] Conteúdo CSV após trim (csvContent):", csvContent);

      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      console.log("[parseIaResponseToCsvData] Resultado do Papa.parse:", parseResult);

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.error("[parseIaResponseToCsvData] Erros durante o parsing com PapaParse:", parseResult.errors.map(err => ({ ...err, input: undefined })));
      }

      if (parseResult.data && parseResult.data.length > 0) {
        const actualHeadersFromIA = parseResult.meta.fields || [];
        console.log("[parseIaResponseToCsvData] Cabeçalhos reais detectados pela IA (via PapaParse):", actualHeadersFromIA);

        const headerMap = {};
        actualHeadersFromIA.forEach(iaHeader => {
          const iaHeaderTrimmed = iaHeader.trim();
          const iaHeaderLower = iaHeaderTrimmed.toLowerCase();
          if (iaHeaderLower.includes('titulo') || iaHeaderLower.includes('título')) headerMap[iaHeaderTrimmed] = "Título";
          else if (iaHeaderLower.includes('texto_principal') || iaHeaderLower.includes('texto principal')) headerMap[iaHeaderTrimmed] = "Texto Principal";
          else if (iaHeaderLower.includes('ponte_proximo') || iaHeaderLower.includes('ponte para o próximo')) headerMap[iaHeaderTrimmed] = "Ponte para o Próximo";
          else if (iaHeaderLower.includes('id_elemento') || iaHeaderLower.includes('id') || iaHeaderLower.includes('num_slide') || iaHeaderLower.includes('elemento')) headerMap[iaHeaderTrimmed] = "id";
        });
        console.log("[parseIaResponseToCsvData] Mapa de Cabeçalhos construído:", headerMap);

        parseResult.data.forEach(rawRecord => {
          const record = {};
          let hasTitle = false;
          for (const iaHeaderMapped in headerMap) {
            const targetAppHeader = headerMap[iaHeaderMapped];
            if (rawRecord.hasOwnProperty(iaHeaderMapped)) {
              let value = rawRecord[iaHeaderMapped];
              record[targetAppHeader] = value !== null && value !== undefined ? String(value).trim() : "";
              if (targetAppHeader === "Título" && record[targetAppHeader]) {
                hasTitle = true;
              }
            }
          }
          if (hasTitle) {
            finalHeaders.forEach(appFinalHeader => {
              if (!record[appFinalHeader]) record[appFinalHeader] = "";
            });
            data.push(record);
          } else {
            console.warn("[parseIaResponseToCsvData] Registro ignorado por não ter um 'Título' mapeado:", rawRecord);
          }
        });
        console.log("[parseIaResponseToCsvData] Dados Parseados com Sucesso (Gemini CSV via PapaParse):", data);
        return { data, headers: finalHeaders };
      } else {
        console.error("[parseIaResponseToCsvData] PapaParse não retornou dados ou dados eram vazios, mesmo após encontrar bloco CSV.");
      }
    } else {
      console.error("[parseIaResponseToCsvData] Bloco CSV não encontrado ou vazio na resposta da IA. Detalhes do csvMatch:", csvMatch);
    }

    // Se chegou aqui, o parsing do bloco CSV falhou ou não havia bloco CSV. Tentar fallback.
    console.log("[parseIaResponseToCsvData] Tentando parser de fallback (formato DeepSeek).");
    const fallbackLines = responseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentRecord = {};
    const fallbackData = []; // Usar um novo array para o fallback

    for (const line of fallbackLines) {
      if (line.toLowerCase().startsWith("título:") || line.toLowerCase().startsWith("titulo:")) {
        if (Object.keys(currentRecord).length > 0 && currentRecord["Título"]) fallbackData.push(currentRecord);
        currentRecord = { "Título": line.substring(line.indexOf(':') + 1).trim() };
      } else if (line.toLowerCase().startsWith("texto principal:")) {
        currentRecord["Texto Principal"] = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().startsWith("ponte para o próximo:") || line.toLowerCase().startsWith("ponte:")) {
        currentRecord["Ponte para o Próximo"] = line.substring(line.indexOf(':') + 1).trim();
        if (currentRecord["Título"]) fallbackData.push(currentRecord);
        currentRecord = {};
      }
    }
    if (Object.keys(currentRecord).length > 0 && currentRecord["Título"]) fallbackData.push(currentRecord);

    if (fallbackData.length > 0) {
      console.log("[parseIaResponseToCsvData] Parseado como fallback (formato DeepSeek):", JSON.parse(JSON.stringify(fallbackData)));
      const processedData = fallbackData.map(record => ({
        "Título": record["Título"] || "",
        "Texto Principal": record["Texto Principal"] || "",
        "Ponte para o Próximo": record["Ponte para o Próximo"] || "",
      }));
      return { data: processedData, headers: finalHeaders };
    } else {
      console.error("[parseIaResponseToCsvData] Fallback também não encontrou dados estruturados.");
      return { data: [], headers: finalHeaders }; // Retorna data vazia se tudo falhar
    }
    return { data, headers: finalHeaders }; // Retorna os cabeçalhos finais esperados
  };

  const currentTheme = darkMode ? darkTheme : lightTheme;

  // Componente do indicador de step moderno
  const StepIndicator = ({ step, isActive, isCompleted, onClick, index }) => {
    const Icon = step.icon;
    return (
      <ListItem
        button
        onClick={onClick}
        sx={{
          borderRadius: 3,
          mb: 1,
          background: isActive
            ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
            : isCompleted
              ? 'rgba(34, 197, 94, 0.1)'
              : 'transparent',
          color: isActive ? 'white' : 'inherit',
          '&:hover': {
            backgroundColor: isActive ? undefined : 'rgba(139, 92, 246, 0.1)',
          },
          transition: 'all 0.3s ease',
          px: 2,
          py: 1.5
        }}
      >
        <ListItemIcon sx={{
          color: isActive ? 'white' : isCompleted ? '#22c55e' : 'inherit',
          minWidth: 40
        }}>
          {isCompleted && !isActive ? <Check /> : <Icon />}
        </ListItemIcon>
        <ListItemText
          primary={step.label}
          secondary={step.description}
          primaryTypographyProps={{
            sx: {
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.95rem'
            }
          }}
          secondaryTypographyProps={{
            sx: {
              color: isActive ? 'rgba(255,255,255,0.8)' : 'text.secondary',
              fontSize: '0.75rem'
            }
          }}
        />
        {isActive && <ChevronRight sx={{ color: 'white' }} />}
      </ListItem>
    );
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Header moderno com gradiente */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        >
          <Toolbar>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1, // Adjusted gap to accommodate the wider logo text
              flexGrow: 1
            }}>
              {/* New SVG Logo */}
              <img src="/logo.svg" alt="Midiator Logo" style={{ height: '40px' }} />
              {/* Text is now part of the SVG, so no separate text elements needed here. */}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Alternar sidebar">
                <IconButton
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  sx={{ color: 'white' }}
                >
                  {sidebarOpen ? <Grid3x3 /> : <Visibility />}
                </IconButton>
              </Tooltip>
              <Tooltip title={darkMode ? "Alternar para modo claro" : "Alternar para modo escuro"}>
                <IconButton
                  onClick={() => setDarkMode(!darkMode)}
                  sx={{ color: 'white' }}
                >
                  {darkMode ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Mais ações">
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{ color: 'white' }}
                >
                  <MoreVert />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorElMenu}
                open={Boolean(anchorElMenu)}
                onClose={handleMenuClose}
              >
                {/* <MenuItem onClick={() => { setShowDeepSeekAuthModal(true); handleMenuClose(); }}>
                  <VpnKeyIcon sx={{ mr: 1 }} />
                  Configurar API DeepSeek
                </MenuItem> */}
                <MenuItem onClick={() => { setShowGeminiAuthModal(true); handleMenuClose(); }}>
                  <GoogleIcon sx={{ mr: 1 }} />
                  Configurar API Gemini
                </MenuItem>
                <MenuItem onClick={() => { setShowGoogleDriveAuthModal(true); handleMenuClose(); }}>
                  <CloudQueue sx={{ mr: 1 }} />
                  Configurar API Google Drive
                </MenuItem>
                <MenuItem onClick={handleSaveTemplateClick}>Salvar Config. Template</MenuItem>
                <MenuItem onClick={handleLoadTemplateClick}>Carregar Config. Template</MenuItem>
                <MenuItem onClick={handleExportCSV} disabled={csvData.length === 0}>
                  <DownloadIcon sx={{ mr: 1 }} />
                  Exportar CSV
                </MenuItem>
              </Menu>
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleLoadStateFromFile}
                ref={loadStateInputRef}
              />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Sidebar moderna */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={sidebarOpen}
          sx={{
            width: sidebarOpen ? 320 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              boxSizing: 'border-box',
              mt: 8,
              borderRight: '1px solid',
              borderColor: 'divider',
              background: darkMode ? '#1e293b' : '#ffffff'
            },
          }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Etapas do Processo
            </Typography>
            <List sx={{ p: 0 }}>
              {steps.map((step, index) => (
                <StepIndicator
                  key={index}
                  step={step}
                  index={index}
                  isActive={activeStep === index}
                  isCompleted={index < activeStep}
                  onClick={() => setActiveStep(index)}
                />
              ))}
            </List>

            {/* Indicadores de status */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Status do Projeto
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip
                  icon={<FileUpload />}
                  label={`${csvData.length} registros`}
                  color={csvData.length > 0 ? 'success' : 'default'}
                  variant={csvData.length > 0 ? 'filled' : 'outlined'}
                  size="small"
                />
                <Chip
                  icon={<ImageIcon />}
                  label="Imagem de fundo"
                  color={backgroundImage ? 'success' : 'default'}
                  variant={backgroundImage ? 'filled' : 'outlined'}
                  size="small"
                />
                <Chip
                  icon={<Settings />}
                  label={`${visibleFields}/${totalFields} campos`}
                  color={visibleFields > 0 ? 'info' : 'default'}
                  variant="filled"
                  size="small"
                />
                <Chip
                  icon={<Palette />}
                  label={`${styledFields} estilos`}
                  color={styledFields > 0 ? 'secondary' : 'default'}
                  variant="filled"
                  size="small"
                />
              </Box>
            </Box>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8,
            ml: sidebarOpen ? 0 : 0,
            transition: 'margin-left 0.3s ease',
          }}
        >
          {/* Passo 0: Definir Dados Iniciais */}
          {activeStep === 0 && (
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <InsertDriveFileOutlined />
                  {steps[0].label}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                  <ToggleButtonGroup
                    color="primary"
                    value={inputMethod}
                    exclusive
                    onChange={(event, newInputMethod) => {
                      if (newInputMethod !== null) {
                        setInputMethod(newInputMethod);
                      }
                    }}
                    sx={{
                      '& .MuiToggleButton-root': {
                        borderRadius: 2,
                        px: 3,
                        py: 1.5,
                        fontWeight: 600
                      }
                    }}
                  >
                    <ToggleButton value="csv">Carregar CSV</ToggleButton>
                    <ToggleButton value="ia">Gerar com IA</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {inputMethod === 'csv' && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card
                        sx={{
                          border: isDraggingOverCsv ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                          backgroundColor: isDraggingOverCsv ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                          textAlign: 'center',
                          p: 4,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'rgba(139, 92, 246, 0.05)'
                          }
                        }}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                      >
                        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>Arraste e solte ou clique para Upload texto dos posts</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            Carregue um arquivo CSV com o conteúdo de seus posts
                          </Typography>
                          <CsvInfobox />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                          <Button
                            variant="contained"
                            component="label"
                            sx={{ borderRadius: 2 }}
                          >
                            Selecionar Arquivo
                            <input
                              type="file"
                              accept=".csv"
                              hidden
                              ref={fileInputRef}
                              onChange={handleCSVUpload}
                            />
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleDownloadExampleCSV}
                            sx={{ borderRadius: 2 }}
                          >
                            Baixar CSV Exemplo
                          </Button>
                        </Box>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card sx={{
                        border: '2px dashed #d1d5db',
                        backgroundColor: 'transparent',
                        textAlign: 'center',
                        p: 4,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'rgba(139, 92, 246, 0.05)'
                        }
                      }}>
                        <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>Criar Manualmente</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Adicione registros um por um
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={() => setActiveStep(1)}
                          sx={{ borderRadius: 2 }}
                        >
                          Novo Registro
                        </Button>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {inputMethod === 'ia' && (
                  <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                    {/* ToggleButtonGroup for AI model selection removed */}
                    {/* {selectedApiModel === 'deepseek' && !getDeepSeekApiKey() && ( // This block is removed
                      <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: '500px' }}>
                        Chave da API DeepSeek não configurada.
                        <MuiLink component="button" variant="body2" onClick={() => setShowDeepSeekAuthModal(true)} sx={{ ml: 1 }}>
                          Configurar Chave DeepSeek
                        </MuiLink>
                      </Alert>
                    )} */}
                    {!getGeminiApiKey() && (
                      <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: '500px' }}>
                        Chave da API Gemini não configurada.
                        <MuiLink component="button" variant="body2" onClick={() => setShowGeminiAuthModal(true)} sx={{ ml: 1 }}>
                          Configurar Chave Gemini
                        </MuiLink>
                      </Alert>
                    )}

                    <TextField
                      label="Quantidade de Elementos"
                      type="number"
                      value={promptNumRecords}
                      onChange={(e) => setPromptNumRecords(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      inputProps={{ min: 1 }}
                      variant="outlined"
                      fullWidth
                      sx={{ mb: 3 }}
                    />

                    <TextField
                      label="Descrição do Conteúdo"
                      multiline
                      rows={4}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      variant="outlined"
                      fullWidth
                      placeholder="Ex: Um carrossel sobre os benefícios da meditação para reduzir o estresse..."
                      sx={{ mb: 3 }}
                    />

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={handleGenerateIAContent}
                      disabled={
                        isGenerating ||
                        !promptText.trim() ||
                        !getGeminiApiKey() // Only check for Gemini Key
                      } sx={{
                        py: 1.5,
                        borderRadius: 2,
                        position: 'relative'
                      }}
                    >
                      {isGenerating && (
                        <CircularProgress
                          size={24}
                          sx={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            marginLeft: '-12px',
                            marginTop: '-12px',
                          }}
                        />
                      )}
                      {isGenerating ? 'Gerando...' : 'Gerar Conteúdo com IA'}
                    </Button>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Após gerar, os dados aparecerão abaixo. Clique em "Próximo" para editá-los.
                    </Typography>
                    {csvData.length > 0 && ( // Mostrar dados gerados se houver
                      <Alert severity="success" sx={{ mt: 2 }}>
                        ✅ {csvData.length} registros gerados/carregados. Campos: {csvHeaders.join(', ')}.
                        <br />Clique em "Próximo" para editar.
                      </Alert>
                    )}
                  </Box>
                )}

                {csvData.length > 0 && (
                  <Alert severity="success" sx={{ mt: 3 }}>
                    ✅ {csvData.length} registros carregados. Campos: {csvHeaders.join(', ')}.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Passo 1: Editar Dados */}
          {activeStep === 1 && (
            <RecordManager
              registrosIniciais={csvData}
              colunasIniciais={csvHeaders}
              onDadosAlterados={handleDadosAlterados}
              darkMode={darkMode}
            />
          )}

          {/* Passo 2: Upload Imagem */}
          {activeStep === 2 && (
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <ImageIcon />
                  {steps[2].label}
                </Typography>

                <Grid container spacing={4}>
                  <Grid item xs={12} lg={6}>
                    <Card
                      sx={{
                        border: isDraggingOverImage ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                        backgroundColor: isDraggingOverImage ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        textAlign: 'center',
                        p: 4,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'rgba(139, 92, 246, 0.05)'
                        }
                      }}
                      onDrop={handleImageDrop}
                      onDragOver={handleImageDragOver}
                      onDragEnter={handleImageDragEnter}
                      onDragLeave={handleImageDragLeave}
                    >
                      <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>Arraste e solte ou clique para Upload de Imagem</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        PNG, JPG ou JPEG
                      </Typography>
                      <Button
                        variant="contained"
                        component="label"
                        sx={{ borderRadius: 2 }}
                      >
                        Selecionar Imagem
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          hidden
                          ref={imageInputRef}
                          onChange={handleImageUpload}
                        />
                      </Button>
                    </Card>
                  </Grid>

                  <Grid item xs={12} lg={6}>
                    <Card sx={{
                      height: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'grey.100',
                      border: backgroundImage ? 'none' : '2px dashed #d1d5db'
                    }}>
                      {backgroundImage ? (
                        <img
                          src={backgroundImage}
                          alt="Preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: 8
                          }}
                        />
                      ) : (
                        <Box sx={{ textAlign: 'center' }}>
                          <Visibility sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                          <Typography color="text.secondary">Preview do Template</Typography>
                        </Box>
                      )}
                    </Card>
                  </Grid>
                </Grid>
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
              onCsvDataUpdate={handleCsvRecordContentUpdate}
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
              csvHeaders={csvHeaders}
              colorPalette={colorPalette}
              setGeneratedImagesData={setGeneratedImagesData}
              initialGeneratedImagesData={generatedImagesData}
              onThumbnailRecordTextUpdate={handleThumbnailRecordTextUpdate}
            />
          )}

          {/* Navigation */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 4,
            px: 2
          }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              variant="outlined"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5
              }}
            >
              Anterior
            </Button>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {steps.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: index === activeStep
                      ? 'primary.main'
                      : index < activeStep
                        ? 'success.main'
                        : 'grey.300',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Box>

            <Button
              onClick={handleNext}
              disabled={activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)}
              variant="contained"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5
              }}
            >
              Próximo
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Modals */}
      {/* <DeepSeekAuthSetup
        open={showDeepSeekAuthModal}
        onClose={() => setShowDeepSeekAuthModal(false)}
      /> */}
      <GeminiAuthSetup
        open={showGeminiAuthModal}
        onClose={() => setShowGeminiAuthModal(false)}
      />
      <GoogleDriveAuthModal
        open={showGoogleDriveAuthModal}
        onClose={() => setShowGoogleDriveAuthModal(false)}
      />
    </ThemeProvider>
  );
}

export default App;

