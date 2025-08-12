import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useIsMobile } from './hooks/use-mobile.js';
import { LinkedIn } from '@mui/icons-material';
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
  Link as MuiLink,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Fab,
  FormControl,
  InputLabel,
  Select,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CloudUpload,
  ExpandMore as ExpandMoreIcon,
  FileUpload,
  Settings,
  Image as ImageIcon,
  Movie,
  Audiotrack,
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
  ChevronLeft,
  Check,
  Add,
  InsertDriveFileOutlined,
  FormatBold,
  Visibility,
  Grid3x3,
  Campaign as CampaignIcon,
  AspectRatio,
  Language,
  Publish,
  SaveAlt as SaveAltIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Papa from 'papaparse';
import ColorThief from 'colorthief';
import { Menu, MenuItem } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster, toast } from 'sonner';

import FieldPositioner from './components/FieldPositioner';
import FormattingPanel from './components/FormattingPanel';
import FormattingDrawer from './components/FormattingDrawer';
import ImageGeneratorFrontendOnly from './components/ImageGeneratorFrontendOnly';
import AudioGenerator from './components/AudioGenerator';
import VideoGenerator2 from './components/VideoGenerator2';
import RecordManager from './features/RecordManager/RecordManager';
import CsvInfobox from './components/CsvInfobox';
import Publisher from './components/Publisher';
import SetupModal from './components/SetupModal';
import CampaignStandardsModal from './components/CampaignStandardsModal';
import { getGeminiApiKey } from './utils/geminiCredentials';
import { saveLinkedinConfig } from './utils/linkedinCredentials';
import { getCampaignPrompt } from './utils/campaignPrompt';
import { callGeminiApi } from './utils/geminiAPI';
import GoogleIcon from '@mui/icons-material/Google';
import { stripHtml } from './lib/utils';
import './App.css';
import LoadingDialog from './components/LoadingDialog';
import TextEditorDialog from './components/TextEditorDialog';
import Campaign from './components/Campaign';
import {
  generateCampaignContent,
  generateCampaignImage,
  generateFormattedContent,
  generateFollowupPosts,
  generateIAContent,
} from './utils/generationHandlers.js';
import { saveCampaignState, loadCampaignState } from './utils/campaignState.js';
import { exportCsv, exportHtml } from './utils/exportUtils.js';
import { downloadExampleCsv } from './utils/fileUtils.js';
import { parseIaResponseToCsvData } from './utils/iaResponseParser.js';

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
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [campaignColors, setCampaignColors] = useState([]);

  // Estados para a Campanha
  const [problema, setProblema] = useState('');
  const [solucao, setSolucao] = useState('');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [campaignContent, setCampaignContent] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [persona, setPersona] = useState('');
  const [autor, setAutor] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [formato, setFormato] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [conteudoMedio, setConteudoMedio] = useState('');
  const [conteudoPequeno, setConteudoPequeno] = useState('');
  const [isGeneratingSummaryMedio, setIsGeneratingSummaryMedio] = useState(false);
  const [isGeneratingSummaryPequeno, setIsGeneratingSummaryPequeno] = useState(false);
  const [conteudoFormatado, setConteudoFormatado] = useState('');
  const [isGeneratingConteudoFormatado, setIsGeneratingConteudoFormatado] = useState(false);
  const [followupPosts, setFollowupPosts] = useState([]);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [followupPostsQuantity, setFollowupPostsQuantity] = useState(5);

  // Publisher State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date(new Date().getTime() + 24 * 60 * 60 * 1000)); // Default to tomorrow
  const [weeklySchedule, setWeeklySchedule] = useState({}); // { 0: '09:00', 1: '10:00', ... }
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedImages, setSelectedImages] = useState({});
  const [selectedVideos, setSelectedVideos] = useState({});


  // Estados para a Geração com IA
  const [inputMethod, setInputMethod] = useState('csv');
  // const [selectedApiModel, setSelectedApiModel] = useState('deepseek'); // Removed, defaulting to gemini
  const [promptNumRecords, setPromptNumRecords] = useState(10);
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadCampaignColors = useCallback(() => {
    const { colors } = getCampaignPrompt();
    setCampaignColors(colors || []);
  }, []);

  useEffect(() => {
    loadCampaignColors();
  }, [loadCampaignColors]);

  const combinedPalette = useMemo(() => {
    const allColors = [...(colorPalette || []), ...(campaignColors || [])];
    return [...new Set(allColors)];
  }, [colorPalette, campaignColors]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]);
  const [generatedAudioData, setGeneratedAudioData] = useState([]);
  const [generatedVideosData, setGeneratedVideosData] = useState([]);
  const isMobile = useIsMobile();
  const [anchorElMenu, setAnchorElMenu] = useState(null);
  const [isDraggingOverCsv, setIsDraggingOverCsv] = useState(false);
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [imageFilters, setImageFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    blur: 0,
    opacity: 100,
  });
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeEmpresa, setIncludeEmpresa] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showCampaignStandardsModal, setShowCampaignStandardsModal] = useState(false);
  const handleGenerateColorPalette = async (briefing) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      toast.error('Por favor, configure sua chave de API Gemini primeiro.');
      throw new Error('Missing API Key');
    }

    const prompt = `Crie uma paleta harmoniosa de 5 cores baseada no briefing abaixo, aplicando princípios da psicologia das cores na cultura ocidental.

**Briefing do Cliente:**
${briefing}

**Diretrizes de Psicologia das Cores (Cultura Ocidental):**
- Considere estas associações-chave:
  * **Vermelho:** Energia, paixão, urgência (comida, liquidações), perigo.
  * **Azul:** Confiança, segurança, calma, profissionalismo (bancos, saúde, tech).
  * **Verde:** Natureza, crescimento, sustentabilidade, saúde, tranquilidade.
  * **Amarelo:** Otimismo, criatividade, atenção (uso moderado), cautela.
  * **Roxo:** Luxo, criatividade, espiritualidade, realeza (beleza, artes).
  * **Laranja:** Entusiasmo, jovialidade, acessibilidade (diversão, calls-to-action).
  * **Rosa:** Feminilidade, ternura, compaixão (beleza, infantil).
  * **Preto:** Sofisticação, poder, elegância (luxo, moda).
  * **Branco:** Pureza, simplicidade, limpeza (saúde, minimalismo).
  * **Cinza:** Neutralidade, equilíbrio, modernidade (tecnologia, corporativo).
  * **Marrom:** Solidez, confiabilidade, natureza (orgânico, artesanal).
- Tons **pastéis** transmitem suavidade; **vibrantes** geram impacto.
- Evite combinações culturalmente negativas (ex: vermelho+puro preto = agressão/extremismo).

**Formato de Saída OBRIGATÓRIO:**
A resposta DEVE ser um único objeto JSON, sem nenhum texto ou formatação markdown (como \`\`\`json) antes ou depois. O JSON deve ter a seguinte estrutura:
{
  "palette": [
    {
      "hex": "#RRGGBB",
      "rgb": "RGB(R, G, B)",
      "name": "Nome da Cor",
      "role": "Primária | Secundária | Acento | Neutro Claro | Neutro Escuro",
      "justification": "Explicação psicológica em uma frase."
    }
  ],
  "harmony": "Nome da Harmonia (Análoga, Complementar, Triádica, etc.)"
}
`;

    try {
      const response = await callGeminiApi(prompt, apiKey);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Não foi possível extrair o JSON da resposta da IA.");
    } catch (error) {
      console.error("Erro ao gerar paleta de cores com IA:", error);
      throw error;
    }
  };

  const saveStateToSessionStorage = useCallback(async () => {
    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    // const serializableGeneratedImages = await Promise.all(
    //   generatedImagesData.map(async (img) => {
    //     let imageBase64 = null;
    //     if (img.blob) {
    //       try {
    //         imageBase64 = await blobToBase64(img.blob);
    //       } catch (error) {
    //         console.error("Erro ao converter blob para Base64:", error);
    //       }
    //     }
    //     return {
    //       ...img,
    //       blob: undefined,
    //       url: undefined,
    //       imageBase64: imageBase64,
    //     };
    //   })
    // );

    // const serializableGeneratedAudio = await Promise.all(
    //   generatedAudioData.map(async (audio) => {
    //     let audioBase64 = null;
    //     if (audio.blob) {
    //       try {
    //         audioBase64 = await blobToBase64(audio.blob);
    //       } catch (error) {
    //         console.error("Erro ao converter blob de áudio para Base64:", error);
    //       }
    //     }
    //     return {
    //       ...audio,
    //       blob: undefined,
    //       audioBase64: audioBase64,
    //     };
    //   })
    // );

    const serializableGeneratedVideos = await Promise.all(
      generatedVideosData.map(async (video) => {
        let videoBase64 = null;
        if (video.blob) {
          try {
            videoBase64 = await blobToBase64(video.blob);
          } catch (error) {
            console.error("Erro ao converter blob de vídeo para Base64:", error);
          }
        }
        return {
          ...video,
          blob: undefined,
          url: undefined,
          videoBase64: videoBase64,
        };
      })
    );

    const stateToSave = {
      activeStep,
      csvData,
      csvHeaders,
      backgroundImage,
      colorPalette,
      fieldPositions,
      fieldStyles,
      displayedImageSize,
      originalImageSize,
      generatedVideosData: serializableGeneratedVideos,
      problema,
      solucao,
      campaignContent,
      persona,
      autor,
      instrucoes,
      formato,
      aspectRatio,
      generatedImageUrl,
      conteudoMedio,
      conteudoPequeno,
      promptText,
    };
    sessionStorage.setItem('appState', JSON.stringify(stateToSave));
  }, [
    activeStep,
    csvData,
    csvHeaders,
    backgroundImage,
    colorPalette,
    fieldPositions,
    fieldStyles,
    displayedImageSize,
    originalImageSize,
    generatedVideosData,
    problema,
    solucao,
    campaignContent,
    persona,
    autor,
    instrucoes,
    formato,
    aspectRatio,
    generatedImageUrl,
    conteudoMedio,
    conteudoPequeno,
    promptText,
  ]);

  useEffect(() => {
    const loadStateFromSession = async () => {
      const savedStateJSON = sessionStorage.getItem('appState');
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);

        const base64ToBlob = async (base64) => {
          if (!base64) return null;
          const res = await fetch(base64);
          const blob = await res.blob();
          return blob;
        };

        setActiveStep(savedState.activeStep || 0);
        setCsvData(savedState.csvData || []);
        setCsvHeaders(savedState.csvHeaders || []);
        setBackgroundImage(savedState.backgroundImage || null);
        setColorPalette(savedState.colorPalette || []);
        setFieldPositions(savedState.fieldPositions || {});
        setFieldStyles(savedState.fieldStyles || {});
        setDisplayedImageSize(savedState.displayedImageSize || { width: 0, height: 0 });
        setOriginalImageSize(savedState.originalImageSize || { width: 0, height: 0 });

        if (savedState.generatedImagesData) {
          const restoredGeneratedImages = await Promise.all(
            savedState.generatedImagesData.map(async (imgData) => {
              const blob = await base64ToBlob(imgData.imageBase64);
              return { ...imgData, blob, url: blob ? URL.createObjectURL(blob) : null };
            })
          );
          setGeneratedImagesData(restoredGeneratedImages);
        }

        if (savedState.generatedAudioData) {
            const restoredGeneratedAudio = await Promise.all(
                savedState.generatedAudioData.map(async (audioData) => {
                    const blob = await base64ToBlob(audioData.audioBase64);
                    return { ...audioData, blob };
                })
            );
            setGeneratedAudioData(restoredGeneratedAudio);
        }

        setProblema(savedState.problema || '');
        setSolucao(savedState.solucao || '');
        setCampaignContent(savedState.campaignContent || null);
        setPersona(savedState.persona || '');
        setAutor(savedState.autor || '');
        setInstrucoes(savedState.instrucoes || '');
        setFormato(savedState.formato || '');
        setAspectRatio(savedState.aspectRatio || '1:1');
        setGeneratedImageUrl(savedState.generatedImageUrl || null);
        setConteudoMedio(savedState.conteudoMedio || '');
        setConteudoPequeno(savedState.conteudoPequeno || '');
        setPromptText(savedState.promptText || '');

        if (savedState.generatedVideosData) {
          const restoredGeneratedVideos = await Promise.all(
            savedState.generatedVideosData.map(async (videoData) => {
              const blob = await base64ToBlob(videoData.videoBase64);
              return { ...videoData, blob, url: blob ? URL.createObjectURL(blob) : null };
            })
          );
          setGeneratedVideosData(restoredGeneratedVideos);
        }

        sessionStorage.removeItem('appState');
      }
    };
    loadStateFromSession();
  }, []);

  useEffect(() => {
    if (generatedVideosData.length > 0) {
      saveStateToSessionStorage();
    }
  }, [generatedVideosData, saveStateToSessionStorage]);




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

  useEffect(() => {
    const { persona, autor, instrucoes, formato, aspectRatio } = getCampaignPrompt();
    setPersona(persona);
    setAutor(autor);
    setInstrucoes(instrucoes);
    setFormato(formato);
    setAspectRatio(aspectRatio || '1:1');
  }, []);

  useEffect(() => {
    const handleLinkedinCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // Limpa os parâmetros da URL para evitar reprocessamento.
      if (code || error) {
        window.history.replaceState({}, document.title, "/");
      }

      if (error) {
        console.error(`LinkedIn OAuth Error: ${error}. Description: ${errorDescription}`);
        alert(`Ocorreu um erro ao conectar com o LinkedIn: ${errorDescription || error}`);
        return;
      }

      if (code) {
        const redirectUri = window.location.origin;

        try {
          const response = await fetch('/api/linkedin-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'tokenExchange', code, redirectUri }),
          });

          const data = await response.json();

          if (response.ok) {
            const { access_token, expires_in } = data;

            saveLinkedinConfig({
              accessToken: access_token,
              tokenExpiration: Date.now() + expires_in * 1000,
            });

            // Abre o modal para mostrar que a conexão foi bem-sucedida
            toast.success('LinkedIn conectado com sucesso!');
          } else {
            console.error('Erro ao obter o token de acesso do LinkedIn:', data);
            // Tratar erro, talvez mostrar mensagem
          }
        } catch (error) {
          console.error('Erro de rede ao contatar o LinkedIn:', error);
        }
      }
    };

    handleLinkedinCallback();
  }, []);

  useEffect(() => {
    if (activeStep === 1 && campaignContent) {
      const { titulo, conteudo, cta } = campaignContent;
      const newPromptText = `${titulo || ''}\n\n${conteudo || ''}\n\n${cta || ''}`;
      setPromptText(newPromptText);
    }
  }, [activeStep, campaignContent]);

  const steps = [
    {
      label: 'Campanha',
      description: 'Criar o material de referência para a campanha.',
      icon: CampaignIcon,
    },
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
    },
    {
      label: 'Gerar Áudio',
      description: 'Crie a narração para os slides.',
      icon: Audiotrack
    },
    {
      label: 'Gerar Vídeo',
      description: 'Crie um vídeo a partir das imagens geradas.',
      icon: Movie
    },
    {
      label: 'Publicar',
      description: 'Publique o conteúdo no WordPress.',
      icon: Publish
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
                if (index === 0) {
                  updatedFieldStyles[header] = {
                    ...defaultStylesBase,
                    fontFamily: 'Anton',
                    fontSize: 72,
                  };
                } else {
                  updatedFieldStyles[header] = { ...defaultStylesBase };
                }
              }
            });

            setFieldPositions(updatedFieldPositions);
            setFieldStyles(updatedFieldStyles);
            setActiveStep(2);
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

  const updateImageAndPalette = (imageUrl) => {
    setBackgroundImage(imageUrl);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height });
        try {
            const colorThief = new ColorThief();
            const palette = colorThief.getPalette(img, 5);
            setColorPalette(palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`));
        } catch (error) {
            console.error("Error extracting color palette:", error);
            setColorPalette([]);
        }
    };
    img.onerror = (err) => {
        console.error("Error loading image to extract colors:", err);
        setBackgroundImage(null);
        setColorPalette([]);
    }
    img.src = imageUrl;
  };

  // Função para processar o arquivo de imagem de fundo
  const parseImageFile = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        // A composição não é mais feita aqui. Apenas atualiza a imagem de fundo.
        updateImageAndPalette(imageUrl);
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

  const canProceedToStep = () => {
    switch (activeStep) {
      case 0: // Campanha
        return campaignContent !== null;
      case 1: // Conteúdo
        return true; // Pode ir para a edição mesmo sem dados, para adicionar manualmente
      case 2: // Editar Conteúdo
        return csvData.length > 0;
      case 3: // Upload Imagem
        return backgroundImage !== null;
      case 4: // Posicionar e Formatar
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
    setIsSaving(true);
    try {
      const stateToSave = {
        backgroundImageUrl: backgroundImage,
        originalImageSize,
        imageFilters,
        fieldPositions,
        fieldStyles,
        csvHeaders,
        colorPalette,
        csvData,
        generatedImagesData,
        generatedAudioData,
        generatedVideosData,
        problema,
        solucao,
        campaignContent,
        persona,
        autor,
        instrucoes,
        formato,
        conteudoMedio,
        conteudoPequeno,
        conteudoFormatado,
        followupPosts,
        isScheduled,
        scheduleDate,
        weeklySchedule,
        selectedProfile,
        selectedImages,
        selectedVideos,
      };
      await saveCampaignState(stateToSave);
      toast.success("Campanha salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar o estado:", error);
      toast.error(`Ocorreu um erro ao salvar a configuração: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadStateFromFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const loadedState = await loadCampaignState(file);

      // Restore state from the loaded object
      setBackgroundImage(loadedState.backgroundImageUrl);
      setFieldPositions(loadedState.fieldPositions);
      setFieldStyles(loadedState.fieldStyles);
      setCsvHeaders(loadedState.csvHeaders);
      setOriginalImageSize(loadedState.originalImageSize || { width: 0, height: 0 });
      setImageFilters(loadedState.imageFilters || { brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 });
      setColorPalette(loadedState.colorPalette || []);
      setCsvData(loadedState.csvData || []);
      setGeneratedImagesData(loadedState.generatedImagesData || []);
      setGeneratedAudioData(loadedState.generatedAudioData || []);
      setGeneratedVideosData(loadedState.generatedVideosData || []);
      setProblema(loadedState.problema || '');
      setSolucao(loadedState.solucao || '');
      setCampaignContent(loadedState.campaignContent || null);
      setPersona(loadedState.persona || '');
      setAutor(loadedState.autor || '');
      setInstrucoes(loadedState.instrucoes || '');
      setFormato(loadedState.formato || '');
      setConteudoMedio(loadedState.conteudoMedio || '');
      setConteudoPequeno(loadedState.conteudoPequeno || '');
      setConteudoFormatado(loadedState.conteudoFormatado || '');
      setFollowupPosts(loadedState.followupPosts || []);
      setIsScheduled(loadedState.isScheduled || false);
      setScheduleDate(loadedState.scheduleDate ? new Date(loadedState.scheduleDate) : new Date());
      setWeeklySchedule(loadedState.weeklySchedule || {});
      setSelectedProfile(loadedState.selectedProfile || '');
      setSelectedImages(loadedState.selectedImages || {});
      setSelectedVideos(loadedState.selectedVideos || {});

      // Navigate to the appropriate step
      if (loadedState.backgroundImageUrl && loadedState.csvHeaders.length > 0) {
        const etapaPosicionarFormatarIndex = steps.findIndex(step => step.label === 'Posicionar e Formatar');
        setActiveStep(etapaPosicionarFormatarIndex !== -1 ? etapaPosicionarFormatarIndex : 4);
      } else if (loadedState.csvHeaders.length > 0) {
        setActiveStep(2);
      } else {
        setActiveStep(1);
      }
      toast.success("Campanha carregada com sucesso!");

    } catch (error) {
      console.error("Erro ao carregar o arquivo de estado:", error);
      toast.error(`Erro ao carregar o arquivo: ${error.message}`);
    } finally {
      setIsLoading(false);
      // Reset file input value to allow loading the same file again
      if (event.target) {
        event.target.value = null;
      }
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
  }, [darkMode, fieldPositions, fieldStyles, setCsvData, setCsvHeaders, setFieldPositions, setFieldStyles, backgroundImage]);

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

  const handleGenerateCampaignContent = async (regenerate = false) => {
    setIsGeneratingCampaign(true);
    try {
      const normalizedContent = await generateCampaignContent({ problema, solucao });
      setCampaignContent(normalizedContent);

      if (!regenerate) {
        setConteudoMedio('');
        setConteudoPequeno('');
        setConteudoFormatado('');
        setGeneratedImageUrl(null);

        await Promise.all([
          handleGenerateImage(normalizedContent),
          handleGenerateSummary(1800, normalizedContent),
          handleGenerateSummary(130, normalizedContent),
          handleGenerateFormattedContent(normalizedContent),
          handleGenerateFollowupPosts(normalizedContent),
        ]);
      }
    } catch (error) {
      console.error("Erro ao gerar conteúdo da campanha:", error);
      toast.error(`Ocorreu um erro ao gerar o conteúdo da campanha: ${error.message}`);
      setCampaignContent(null);
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  const handleGenerateImage = async (content = campaignContent) => {
    if (!content) {
      toast.error("Por favor, gere o conteúdo do texto primeiro.");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateCampaignImage({ content, aspectRatio });
      setGeneratedImageUrl(imageUrl);
      updateImageAndPalette(imageUrl);
    } catch (imageError) {
      console.error("Erro ao gerar imagem:", imageError);
      toast.error(`Ocorreu um erro ao gerar a imagem da campanha: ${imageError.message}`);
      setGeneratedImageUrl(null);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateSummary = async (targetLength, content = campaignContent) => {
    if (!content?.conteudo) {
      alert("Por favor, gere o conteúdo principal primeiro.");
      return;
    }

    const setLoading = targetLength === 1800 ? setIsGeneratingSummaryMedio : setIsGeneratingSummaryPequeno;
    setLoading(true);

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      alert('Por favor, configure sua chave de API Gemini primeiro.');
      setLoading(false);
      return;
    }

    try {
      const summaryPrompt = `Resuma o seguinte texto para ter no máximo ${targetLength} caracteres, mantendo a essência e o tom: "${stripHtml(content.conteudo)}"`;
      const summary = await callGeminiApi(summaryPrompt, apiKey);

      if (targetLength === 1800) {
        setConteudoMedio(summary);
      } else {
        setConteudoPequeno(summary);
      }
    } catch (error) {
      console.error(`Erro ao gerar resumo de ${targetLength} caracteres:`, error);
      alert(`Ocorreu um erro ao gerar o resumo. Verifique o console.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFormattedContent = async (content = campaignContent) => {
    if (!content?.conteudo) {
      toast.error("Por favor, gere o conteúdo principal primeiro.");
      return;
    }
    setIsGeneratingConteudoFormatado(true);
    try {
      const finalContent = await generateFormattedContent({ content });
      setConteudoFormatado(finalContent);
    } catch (error) {
      console.error(`Erro ao gerar conteúdo formatado:`, error);
      toast.error(`Ocorreu um erro ao gerar o conteúdo formatado: ${error.message}`);
    } finally {
      setIsGeneratingConteudoFormatado(false);
    }
  };

  const handleGenerateFollowupPosts = async (content = campaignContent) => {
    if (!content?.conteudo) {
      toast.error("Por favor, gere o conteúdo principal primeiro.");
      return;
    }
    setIsGeneratingFollowup(true);
    try {
      const posts = await generateFollowupPosts({ content, followupPostsQuantity });
      setFollowupPosts(posts);
    } catch (error) {
      console.error(`Erro ao gerar posts de follow-up:`, error);
      toast.error(`Ocorreu um erro ao gerar os posts de follow-up: ${error.message}`);
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const handleResetCampaign = () => {
    setCampaignContent(null);
    // setProblema(''); // Keep the problem
    // setSolucao(''); // Keep the solution
    setGeneratedImageUrl(null);
    setConteudoMedio('');
    setConteudoPequeno('');
    setConteudoFormatado('');
    setFollowupPosts([]);
    setFollowupPostsQuantity(5);
  };

  const handleGenerateIAContent = async () => {
    setIsGenerating(true);
    try {
      const iaResponseText = await generateIAContent({ promptText, promptNumRecords });
      const parsedResult = parseIaResponseToCsvData(iaResponseText); // This function stays in App.jsx

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

        setActiveStep(2); // Avança para Edição de Dados
      } else {
        toast.error('Não foi possível processar a resposta da IA para o formato de tabela.');
        console.log(`[App] Falha no parsing ou dados vazios. Resposta da API:`, iaResponseText, "Resultado do Parser:", parsedResult);
      }
    } catch (error) {
      console.error(`Erro ao gerar conteúdo com IA:`, error);
      toast.error(`Erro ao gerar conteúdo com IA: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentTheme = darkMode ? darkTheme : lightTheme;

  // Componente do indicador de step moderno
  const StepIndicator = ({ step, isActive, isCompleted, onClick }) => {
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
      <Toaster richColors position="top-center" />
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
              <Tooltip title={darkMode ? "Alternar para modo claro" : "Alternar para modo escuro"}>
                <IconButton
                  onClick={() => setDarkMode(!darkMode)}
                  sx={{ color: 'white' }}
                  aria-label="toggle-dark-mode"
                >
                  {darkMode ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Configurações">
                <IconButton
                  onClick={() => setShowSetupModal(true)}
                  sx={{ color: 'white' }}
                  aria-label="Configurações"
                >
                  <Settings />
                </IconButton>
              </Tooltip>
              <Tooltip title="Mais ações">
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{ color: 'white' }}
                  aria-label="Mais ações"
                >
                  <MoreVert />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorElMenu}
                open={Boolean(anchorElMenu)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => { setShowCampaignStandardsModal(true); handleMenuClose(); }}>
                  <Edit sx={{ mr: 1 }} />
                  Padrões de Campanha
                </MenuItem>
                <MenuItem onClick={handleSaveTemplateClick}>
                  <DownloadIcon sx={{ mr: 1 }} />
                  Salvar Campanha
                </MenuItem>
                <MenuItem onClick={handleLoadTemplateClick}>
                  <FileUploadIcon sx={{ mr: 1 }} />
                  Carregar Campanha
                </MenuItem>
                <MenuItem onClick={() => { exportCsv(csvData, csvHeaders); handleMenuClose(); }} disabled={csvData.length === 0}>
                  <DownloadIcon sx={{ mr: 1 }} />
                  Exportar CSV
                </MenuItem>
              </Menu>
              <input
                type="file"
                hidden
                accept=".json,.midiator"
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

        <Fab
          size="small"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          sx={{
            position: 'fixed',
            top: '50%',
            left: sidebarOpen ? 320 - 20 : 0,
            transform: 'translateY(-50%)',
            zIndex: (theme) => theme.zIndex.drawer + 2,
            transition: 'left 0.2s ease-in-out',
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              backgroundColor: 'background.default'
            }
          }}
        >
          {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </Fab>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1, sm: 2, md: 3 },
            mt: 8,
            ml: sidebarOpen ? 0 : 0,
            transition: 'margin-left 0.3s ease',
          }}
        >
          {/* Passo 0: Campanha */}
          {activeStep === 0 && (
            <Campaign
              steps={steps}
              problema={problema}
              setProblema={setProblema}
              solucao={solucao}
              setSolucao={setSolucao}
              followupPostsQuantity={followupPostsQuantity}
              setFollowupPostsQuantity={setFollowupPostsQuantity}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              isGeneratingCampaign={isGeneratingCampaign}
              campaignContent={campaignContent}
              handleGenerateCampaignContent={handleGenerateCampaignContent}
              handleResetCampaign={handleResetCampaign}
              handleExportHtml={() => exportHtml({
                campaignContent,
                backgroundImage,
                followupPosts,
                conteudoMedio,
                conteudoPequeno,
                conteudoFormatado
              })}
              editingField={editingField}
              setEditingField={setEditingField}
              conteudoMedio={conteudoMedio}
              setConteudoMedio={setConteudoMedio}
              isGeneratingSummaryMedio={isGeneratingSummaryMedio}
              handleGenerateSummary={handleGenerateSummary}
              conteudoPequeno={conteudoPequeno}
              setConteudoPequeno={setConteudoPequeno}
              isGeneratingSummaryPequeno={isGeneratingSummaryPequeno}
              conteudoFormatado={conteudoFormatado}
              isGeneratingConteudoFormatado={isGeneratingConteudoFormatado}
              handleGenerateFormattedContent={handleGenerateFormattedContent}
              followupPosts={followupPosts}
              isGeneratingFollowup={isGeneratingFollowup}
              handleGenerateFollowupPosts={handleGenerateFollowupPosts}
              generatedImageUrl={generatedImageUrl}
              isGeneratingImage={isGeneratingImage}
              handleGenerateImage={handleGenerateImage}
              setCampaignContent={setCampaignContent}
            />
          )}

          {/* Passo 1: Definir Dados Iniciais */}
          {activeStep === 1 && (
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <InsertDriveFileOutlined />
                  {steps[1].label}
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
                          p: { xs: 1.5, sm: 2, md: 4 },
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
                            onClick={downloadExampleCsv}
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
                        p: { xs: 1.5, sm: 2, md: 4 },
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
                          onClick={() => setActiveStep(2)}
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
                        <MuiLink component="button" variant="body2" onClick={() => setShowSetupModal(true)} sx={{ ml: 1 }}>
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

          {/* Passo 2: Editar Dados */}
          {activeStep === 2 && (
            <RecordManager
              registrosIniciais={csvData}
              colunasIniciais={csvHeaders}
              onDadosAlterados={handleDadosAlterados}
              darkMode={darkMode}
            />
          )}

          {/* Passo 3: Upload Imagem */}
          {activeStep === 3 && (
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <ImageIcon />
                  {steps[3].label}
                </Typography>

                <Grid container spacing={4}>
                  <Grid item xs={12} lg={6}>
                    <Card
                      sx={{
                        border: isDraggingOverImage ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                        backgroundColor: isDraggingOverImage ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        textAlign: 'center',
                        p: { xs: 1.5, sm: 2, md: 4 },
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

          {/* Passo 4: Posicionamento e Formatação */}
          {activeStep === 4 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={!isMobile ? 8 : 12}>
                <FieldPositioner
                  backgroundImage={backgroundImage}
                  csvHeaders={csvHeaders}
                  fieldPositions={fieldPositions}
                  setFieldPositions={setFieldPositions}
                  fieldStyles={fieldStyles}
                  setFieldStyles={setFieldStyles}
                  csvData={csvData}
                  onImageDisplayedSizeChange={setDisplayedImageSize}
                  colorPalette={combinedPalette}
                  onCsvDataUpdate={handleCsvRecordContentUpdate}
                  onSelectFieldExternal={setSelectedField}
                  originalImageSize={originalImageSize}
                  imageFilters={imageFilters}
                  includeLogo={includeLogo}
                  includeEmpresa={includeEmpresa}
                />
              </Grid>
              {!isMobile && (
                <Grid item xs={12} md={4}>
                  <FormattingPanel
                    selectedField={selectedField}
                    fieldStyles={fieldStyles}
                    setFieldStyles={setFieldStyles}
                    fieldPositions={fieldPositions}
                    setFieldPositions={setFieldPositions}
                    csvHeaders={csvHeaders}
                    imageFilters={imageFilters}
                    setImageFilters={setImageFilters}
                    includeLogo={includeLogo}
                    setIncludeLogo={setIncludeLogo}
                    includeEmpresa={includeEmpresa}
                    setIncludeEmpresa={setIncludeEmpresa}
                  />
                </Grid>
              )}
            </Grid>
          )}

          {/* Passo 5: Geração */}
          {activeStep === 5 && (
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
              originalImageSize={originalImageSize}
              imageFilters={imageFilters}
              includeLogo={includeLogo}
              includeEmpresa={includeEmpresa}
            />
          )}

          {/* Passo 6: Geração de Áudio */}
          <div hidden={activeStep !== 6}>
            <AudioGenerator
              csvData={csvData}
              fieldPositions={fieldPositions}
              onAudiosGenerated={setGeneratedAudioData}
              initialAudioData={generatedAudioData}
            />
          </div>

          {/* Passo 7: Geração de Vídeo */}
          {activeStep === 7 && (
            <VideoGenerator2
              generatedImages={generatedImagesData}
              generatedAudioData={generatedAudioData}
              onVideoGenerated={(videoData) => setGeneratedVideosData(videoData)}
            />
          )}

          {/* Passo 8: Publicar */}
          {activeStep === 8 && (
            <Publisher
              campaignContent={campaignContent}
              conteudoFormatado={conteudoFormatado}
              generatedImagesData={generatedImagesData}
              generatedVideosData={generatedVideosData}
              followupPosts={followupPosts}
              isScheduled={isScheduled}
              setIsScheduled={setIsScheduled}
              scheduleDate={scheduleDate}
              setScheduleDate={setScheduleDate}
              weeklySchedule={weeklySchedule}
              setWeeklySchedule={setWeeklySchedule}
              selectedProfile={selectedProfile}
              setSelectedProfile={setSelectedProfile}
              selectedImages={selectedImages}
              setSelectedImages={setSelectedImages}
              selectedVideos={selectedVideos}
              setSelectedVideos={setSelectedVideos}
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

            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mx: 2 }}>
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
      <SetupModal
        open={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onBeforeLinkedinRedirect={saveStateToSessionStorage}
      />
       <CampaignStandardsModal
        open={showCampaignStandardsModal}
        onClose={() => {
          setShowCampaignStandardsModal(false);
          loadCampaignColors();
        }}
        onGeneratePalette={handleGenerateColorPalette}
      />
      <LoadingDialog
        open={isGeneratingCampaign || isSaving || isLoading}
        title={
          isSaving ? "Salvando configuração..." :
          isLoading ? "Carregando configuração..." :
          "Gerando conteúdo..." // Default for isGeneratingCampaign
        }
        description={
          isSaving ? "Aguarde um momento, estamos empacotando tudo para você." :
          isLoading ? "Estamos desempacotando sua configuração. Quase pronto!" :
          "A IA está pensando e escrevendo. Isso pode levar alguns segundos." // Default
        }
      />
      <TextEditorDialog
        open={editingField !== null}
        title={`Editar ${
          editingField === 'conteudo' ? 'Conteúdo'
          : editingField === 'cta' ? 'CTA'
          : 'Conteúdo Formatado'
        }`}
        content={
          editingField === 'conteudoFormatado' ? conteudoFormatado
          : editingField ? campaignContent[editingField] : ''
        }
        onSave={(newContent) => {
          if (editingField === 'conteudoFormatado') {
            setConteudoFormatado(newContent);
          } else {
            setCampaignContent({ ...campaignContent, [editingField]: newContent });
          }
        }}
        onClose={() => setEditingField(null)}
      />
      {isMobile && activeStep === 4 && (
        <>
          <Fab
            color="primary"
            aria-label="edit"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setIsDrawerOpen(true)}
            disabled={!selectedField}
          >
            <Edit />
          </Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            selectedField={selectedField}
            fieldStyles={fieldStyles}
            setFieldStyles={setFieldStyles}
            fieldPositions={fieldPositions}
            setFieldPositions={setFieldPositions}
            csvHeaders={csvHeaders}
          />
        </>
      )}
    </ThemeProvider>
  );
}

export default App;

