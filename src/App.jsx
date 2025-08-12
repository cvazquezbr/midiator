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
  Campaign,
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

import { saveCredentialsToFile, loadCredentialsFromFile } from './utils/credentialsManager';
import PasswordDialog from './components/PasswordDialog';
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
import { callGeminiApi, generateImage } from './utils/geminiAPI';
import GoogleIcon from '@mui/icons-material/Google';
import pako from 'pako';
import { stripHtml } from './lib/utils';
import { handleGenerateColorPalette, exportCsv, exportHtml, handleDownloadExampleCSV } from './lib/helpers';
import './App.css';
import LoadingDialog from './components/LoadingDialog';
import TextEditorDialog from './components/TextEditorDialog';

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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogAction, setPasswordDialogAction] = useState(null); // 'save' or 'load'
  const [credentialsPassword, setCredentialsPassword] = useState('');

  const saveStateToSessionStorage = async () => {
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
  };

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
  }, [generatedVideosData]);


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

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const loadStateInputRef = useRef(null);
  const loadCredentialsInputRef = useRef(null);

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
            setShowLinkedinAuthModal(true);
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
      icon: Campaign,
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

      const serializableGeneratedAudio = await Promise.all(
          generatedAudioData.map(async (audio) => {
              let audioBase64 = null;
              if (audio.blob) {
                  try {
                      audioBase64 = await blobToBase64(audio.blob);
                  } catch (error) {
                      console.error("Erro ao converter blob de áudio para Base64:", error);
                  }
              }
              return {
                  ...audio,
                  blob: undefined,
                  audioBase64: audioBase64,
              };
          })
      );

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
        version: "2.0", // Version bump to save followup posts
        backgroundImageUrl: backgroundImage,
        originalImageSize: originalImageSize,
        imageFilters: imageFilters,
        fieldPositions: fieldPositions,
        fieldStyles: fieldStyles,
        csvHeaders: csvHeaders,
        colorPalette: colorPalette,
        csvData: csvData,
        generatedImages: serializableGeneratedImages,
        generatedAudio: serializableGeneratedAudio,
        generatedVideos: serializableGeneratedVideos,
        problema: problema,
        solucao: solucao,
        campaignContent: campaignContent,
        persona: persona,
        autor: autor,
        instrucoes: instrucoes,
        formato: formato,
        conteudoMedio: conteudoMedio,
        conteudoPequeno: conteudoPequeno,
        conteudoFormatado: conteudoFormatado,
        followupPosts: followupPosts,
        // Add scheduling state
        isScheduled: isScheduled,
        scheduleDate: scheduleDate,
        weeklySchedule: weeklySchedule,
        // Add other publisher state
        selectedProfile: selectedProfile,
        selectedImages: selectedImages,
        selectedVideos: selectedVideos,
      };

      const jsonString = JSON.stringify(stateToSave, null, 2);
      const compressedData = pako.gzip(jsonString);
      const blob = new Blob([compressedData], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTitle = campaignContent?.titulo?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'sem-titulo';
      link.download = `${safeTitle}.midiator`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error("Erro ao salvar o estado:", error);
      alert("Ocorreu um erro ao salvar a configuração.");
    } finally {
      setIsSaving(false);
    }
  };

  // Função para carregar o estado do template de um arquivo
  const handleLoadStateFromFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => { // Tornar async para aguardar conversões
        try {
          let loadedState;
          if (file.name.endsWith('.midiator')) {
            const compressedData = new Uint8Array(e.target.result);
            const decompressedData = pako.ungzip(compressedData, { to: 'string' });
            loadedState = JSON.parse(decompressedData);
          } else {
            loadedState = JSON.parse(e.target.result);
          }

          // Função auxiliar para converter Base64 para Blob
          const base64ToBlob = async (base64) => {
            const res = await fetch(base64);
            const blob = await res.blob();
            return blob;
          };

          // Verificar versão e campos essenciais
          if (loadedState.version && ["1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "2.0"].includes(loadedState.version) &&
            loadedState.backgroundImageUrl !== undefined &&
            loadedState.fieldPositions &&
            loadedState.fieldStyles &&
            loadedState.csvHeaders) {

            setBackgroundImage(loadedState.backgroundImageUrl);
            setFieldPositions(loadedState.fieldPositions);
            setFieldStyles(loadedState.fieldStyles);
            setCsvHeaders(loadedState.csvHeaders);

            // Restore originalImageSize if it exists in the saved file
            if (loadedState.originalImageSize) {
              setOriginalImageSize(loadedState.originalImageSize);
            }

            // Restore imageFilters if they exist in the saved file
            if (loadedState.imageFilters) {
              setImageFilters(loadedState.imageFilters);
            }

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
            if (parseFloat(loadedState.version) >= 1.1 && loadedState.generatedImages) {
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

            if (parseFloat(loadedState.version) >= 1.1 && loadedState.generatedAudio) {
                const restoredGeneratedAudio = await Promise.all(
                    loadedState.generatedAudio.map(async (audioData) => {
                        let blob = null;
                        if (audioData.audioBase64) {
                            try {
                                blob = await base64ToBlob(audioData.audioBase64);
                            } catch (error) {
                                console.error("Erro ao converter base64 para blob de áudio ao carregar:", error);
                            }
                        }
                        return {
                            ...audioData,
                            blob: blob,
                            audioBase64: undefined,
                        };
                    })
                );
                setGeneratedAudioData(restoredGeneratedAudio);
            } else {
                setGeneratedAudioData([]);
            }

            if (parseFloat(loadedState.version) >= 1.9 && loadedState.generatedVideos) {
              const restoredGeneratedVideos = await Promise.all(
                loadedState.generatedVideos.map(async (videoData) => {
                  let blob = null;
                  let url = null;
                  if (videoData.videoBase64) {
                    try {
                      blob = await base64ToBlob(videoData.videoBase64);
                      url = URL.createObjectURL(blob);
                    } catch (error) {
                      console.error("Erro ao converter base64 para blob de vídeo ao carregar:", error);
                    }
                  }
                  return {
                    ...videoData,
                    blob: blob,
                    url: url,
                    videoBase64: undefined,
                  };
                })
              );
              setGeneratedVideosData(restoredGeneratedVideos);
            } else {
              setGeneratedVideosData([]);
            }

            // Restaurar dados da campanha se presentes
            if (parseFloat(loadedState.version) >= 1.2) {
              setProblema(loadedState.problema || '');
              setSolucao(loadedState.solucao || '');
              setCampaignContent(loadedState.campaignContent || null);
            } else {
              setProblema('');
              setSolucao('');
              setCampaignContent(null);
            }

            // Restaurar novos campos de prompt se presentes (versão 1.3+)
            if (parseFloat(loadedState.version) >= 1.3) {
              setPersona(loadedState.persona || '');
              setAutor(loadedState.autor || '');
              setInstrucoes(loadedState.instrucoes || '');
            } else {
              setPersona('');
              setAutor('');
              setInstrucoes('');
            }

            if (parseFloat(loadedState.version) >= 1.4) {
              setFormato(loadedState.formato || '');
            } else {
              setFormato('');
            }

            if (parseFloat(loadedState.version) >= 1.5) {
              setConteudoMedio(loadedState.conteudoMedio || '');
              setConteudoPequeno(loadedState.conteudoPequeno || '');
            } else {
              setConteudoMedio('');
              setConteudoPequeno('');
            }

            if (parseFloat(loadedState.version) >= 1.6) {
              setConteudoFormatado(loadedState.conteudoFormatado || '');
            } else {
              setConteudoFormatado('');
            }

            if (parseFloat(loadedState.version) >= 2.0) {
              setFollowupPosts(loadedState.followupPosts || []);
            } else {
              setFollowupPosts([]);
            }

            // Restore scheduling state (add a version check if this feature is versioned)
            if (loadedState.isScheduled !== undefined) {
              setIsScheduled(loadedState.isScheduled);
            }
            if (loadedState.scheduleDate) {
              setScheduleDate(new Date(loadedState.scheduleDate));
            }
            if (loadedState.weeklySchedule) {
              setWeeklySchedule(loadedState.weeklySchedule);
            }
            if (loadedState.selectedProfile) {
              setSelectedProfile(loadedState.selectedProfile);
            }
            if (loadedState.selectedImages) {
              setSelectedImages(loadedState.selectedImages);
            }
            if (loadedState.selectedVideos) {
              setSelectedVideos(loadedState.selectedVideos);
            }

            // Navegação de passo
            if (loadedState.backgroundImageUrl && loadedState.csvHeaders.length > 0) {
              const etapaPosicionarFormatarIndex = steps.findIndex(step => step.label === 'Posicionar e Formatar');
              if (etapaPosicionarFormatarIndex !== -1) {
                setActiveStep(etapaPosicionarFormatarIndex);
              } else {
                setActiveStep(4); // Fallback para o índice 4 se a busca falhar
              }
            } else if (loadedState.csvHeaders.length > 0) {
              setActiveStep(2);
            } else {
              setActiveStep(1); // Ir para a etapa de conteúdo se não houver dados
            }
          } else {
            alert("Arquivo JSON inválido, formato incorreto ou versão incompatível.");
            console.log("Loaded state:", loadedState); // Adicionar log para depuração
          }
        } catch (error) {
          console.error("Erro ao carregar o arquivo JSON:", error);
          alert("Erro ao ler o arquivo JSON.");
        } finally {
          setIsLoading(false);
        }
      };
      if (file.name.endsWith('.midiator')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
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

  const handlePasswordConfirm = async (password) => {
    setShowPasswordDialog(false);
    if (passwordDialogAction === 'save') {
      try {
        await saveCredentialsToFile(password);
        toast.success('Arquivo de credenciais salvo com sucesso!');
      } catch (error) {
        toast.error(`Erro ao salvar credenciais: ${error.message}`);
      }
    } else if (passwordDialogAction === 'load') {
      setCredentialsPassword(password);
      loadCredentialsInputRef.current.click();
    }
  };

  const handleLoadCredentialsFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && credentialsPassword) {
      try {
        await loadCredentialsFromFile(file, credentialsPassword);
        toast.success('Credenciais carregadas com sucesso! A página será recarregada.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        toast.error(`Erro ao carregar credenciais: ${error.message}`);
      } finally {
        setCredentialsPassword('');
        // Reset file input
        if (loadCredentialsInputRef.current) {
          loadCredentialsInputRef.current.value = '';
        }
      }
    }
  };

  const handleExportCSV = () => {
    exportCsv(csvData, csvHeaders, "dados_exportados");
    handleMenuClose();
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
    if (!regenerate) {
      setIsGeneratingCampaign(true);
    } else {
      // Se for apenas regeneração de texto, usar um estado de loading diferente se desejar
      // Por enquanto, vamos usar o mesmo.
      setIsGeneratingCampaign(true);
    }

    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      alert('Por favor, configure sua chave de API Gemini primeiro.');
      setIsGeneratingCampaign(false);
      return;
    }

    const { persona, autor, instrucoes, formato } = getCampaignPrompt();

    const promptCompleto = `
      Persona: ${stripHtml(persona)}
      Autor: ${stripHtml(autor)}
      Formato: ${stripHtml(formato)}
      Problema: ${stripHtml(problema)}
      Solução: ${stripHtml(solucao)}
      ${stripHtml(instrucoes)}
    `;

    const finalPrompt = `${promptCompleto}\n\nGere uma resposta JSON com os seguintes campos: "titulo" (string), "conteudo" (string), "cta" (string), e "hashtags" (string, separadas por vírgula). A resposta deve ser apenas o JSON.`;
console.log(finalPrompt)
    try {
      const response = await callGeminiApi(finalPrompt, apiKey);
      console.log("Resposta da IA (Campanha):", response);

      const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
      let parsedContent;

      if (jsonMatch && jsonMatch[1]) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        parsedContent = JSON.parse(response);
      }

      let hashtags = [];
      if (Array.isArray(parsedContent.hashtags)) {
        hashtags = parsedContent.hashtags;
      } else if (typeof parsedContent.hashtags === 'string') {
        hashtags = parsedContent.hashtags.split(',').map(h => h.trim());
      }

      const normalizedContent = {
        titulo: parsedContent.titulo || parsedContent.title || '',
        conteudo: parsedContent.conteudo || parsedContent.body || '',
        cta: parsedContent.cta || '',
        hashtags: hashtags,
      };

      setCampaignContent(normalizedContent);
      if (!regenerate) {
        setConteudoMedio('');
        setConteudoPequeno('');
        setConteudoFormatado('');
        setGeneratedImageUrl(null);
      }

      // Se não for apenas regeneração, dispara as outras gerações
      if (!regenerate) {
        await Promise.all([
          handleGenerateImage(normalizedContent),
          handleGenerateSummary(1800, normalizedContent),
          handleGenerateSummary(130, normalizedContent),
          handleGenerateFormattedContent(normalizedContent),
          handleGenerateFollowupPosts(normalizedContent)
        ]);
      }

    } catch (error) {
      console.error("Erro ao gerar conteúdo da campanha:", error);
      alert("Ocorreu um erro ao gerar o conteúdo da campanha. Verifique o console para mais detalhes.");
      setCampaignContent(null);
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  const handleGenerateImage = async (content = campaignContent) => {
    if (!content) {
      alert("Por favor, gere o conteúdo do texto primeiro.");
      return;
    }
    setIsGeneratingImage(true);
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      alert('Por favor, configure sua chave de API Gemini primeiro.');
      setIsGeneratingImage(false);
      return;
    }

    const { persona, autor, colors } = getCampaignPrompt();
    try {
      const colorPalettePrompt = colors && colors.length > 0
        ? `A imagem deve usar predominantemente a seguinte paleta de cores: ${colors.join(', ')}.`
        : '';

      const imagePrompt = `
        Persona: ${stripHtml(persona)}
        Autor: ${stripHtml(autor)}
        Resumo do Conteúdo: ${stripHtml(content.titulo)}. ${stripHtml(content.conteudo)}
        Razão de Aspecto: ${aspectRatio}
        ${colorPalettePrompt}
        ATENÇÃO: A imagem gerada não deve conter, sob NENHUMA CIRCUNSTÂNCIA, qualquer tipo de texto, escrita, letras, números ou palavras. A imagem deve ser puramente visual.
      `;
      const base64Image = await generateImage(imagePrompt, apiKey);

      const imageUrl = `data:image/png;base64,${base64Image}`;

      // A composição não é mais feita aqui.
      // A imagem gerada pela IA é definida como a imagem de fundo e a imagem da campanha.
      setGeneratedImageUrl(imageUrl);
      updateImageAndPalette(imageUrl);

    } catch (imageError) {
      console.error("Erro ao gerar imagem:", imageError);
      alert("Ocorreu um erro ao gerar a imagem da campanha. Verifique o console para mais detalhes.");
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
      alert("Por favor, gere o conteúdo principal primeiro.");
      return;
    }

    setIsGeneratingConteudoFormatado(true);

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      alert('Por favor, configure sua chave de API Gemini primeiro.');
      setIsGeneratingConteudoFormatado(false);
      return;
    }

    try {
      const prompt = `
        Com o objetivo de gerar um post de blog no WordPress corporativo, Formatar o texto a seguir observando o padrão com HTML.
        Considere que o conteúdo gerado já estará embutido em uma página no contexto de seu BODY.
        Elabore o HTML para melhor estruturar o texto, facilitar a leitura, hierarquizar a informação conforme a importância.
        O primeiro nível de Header que deve ser utilizado é o H3, já há H1 e H2 no contexto no qual o texto produzido se insere.
        Elabore um resumo com os três pontos chave no texto de entrada e apresente o resumo com caixas de destaque logo no início.
        ATENÇÃO aos campos que requeiram escape como aspas. Adicionalmente, o uso de &quot; é válido em HTML mas causa problemas em JSON. Atenção para evitar quebras de linha no conteúdo HTML e caracteres especiais não escapados.
        Segue o texto:

        Título: ${stripHtml(content.titulo)}
        Conteúdo: ${stripHtml(content.conteudo)}
        CTA: ${stripHtml(content.cta)}
      `;

      const rawContent = await callGeminiApi(prompt, apiKey);
      // Remove markdown code block delimiters if they exist
      const match = rawContent.match(/^`{3}(?:html)?\s*([\s\S]+?)\s*`{3}$/);
      const finalContent = match && match[1] ? match[1].trim() : rawContent.trim();
      setConteudoFormatado(finalContent);

    } catch (error) {
      console.error(`Erro ao gerar conteúdo formatado:`, error);
      alert(`Ocorreu um erro ao gerar o conteúdo formatado. Verifique o console.`);
    } finally {
      setIsGeneratingConteudoFormatado(false);
    }
  };

  const handleGenerateFollowupPosts = async (content = campaignContent) => {
    if (!content?.conteudo) {
      alert("Por favor, gere o conteúdo principal primeiro.");
      return;
    }

    setIsGeneratingFollowup(true);
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      alert('Por favor, configure sua chave de API Gemini primeiro.');
      setIsGeneratingFollowup(false);
      return;
    }

    const { persona } = getCampaignPrompt();

    try {
      const prompt = `
        Você é um especialista em marketing de conteúdo e copywriting para líderes técnicos. Sua tarefa é criar ${followupPostsQuantity} posts "isca" baseados no conteúdo principal fornecido.

        CONTEXTO:
        O conteúdo principal aborda: [${stripHtml(content.titulo)} - ${stripHtml(content.conteudo)}]

        PERSONAS-ALVO:
        - ${stripHtml(persona)}

        DIRETRIZES PARA OS POSTS:

        1. Ganchos Psicológicos: Use gatilhos mentais como:
           - Dor/Problema (rotatividade, custos, pressão)
           - Curiosidade (estatísticas, casos reais)
           - Urgência (mercado competitivo, riscos iminentes)
           - Autoridade (experiência, casos de sucesso)
           - Social Proof (situações reconhecíveis)

        2. Estrutura de cada post:
           - Hook inicial (pergunta provocativa ou estatística impactante)
           - Desenvolvimento do problema/insight
           - Call-to-action sutil direcionando para o conteúdo completo

        3. Variação de Abordagens:
           - Post 1: Foco na dor/problema
           - Post 2: Estatística ou dado curioso
           - Post 3: Caso real ou situação
           - Post 4: Pergunta reflexiva
           - Post 5: Insight contraintuitivo

        ESPECIFICAÇÕES TÉCNICAS:
        - Cada post deve ter entre 150-250 caracteres
        - Tom profissional mas conversacional
        - Inclua emojis estratégicos (máximo 2 por post)
        - CTAs variados: "Leia mais", "Descubra como", "Saiba o que fazer"

        FORMATO DE RESPOSTA:
        Retorne um array JSON com a seguinte estrutura:

        \`\`\`json
        [
          {
            "post_numero": 1,
            "tipo_gancho": "dor/problema",
            "conteudo": "Texto do post aqui...",
            "cta": "Call-to-action específico",
            "hashtags_sugeridas": ["#liderancatecnica", "#gestaoequipes"]
          }
        ]
        \`\`\`

        OBJETIVO:
        Cada post deve despertar curiosidade e criar um gap de informação que só será preenchido ao ler o conteúdo principal completo.
      `;

      const response = await callGeminiApi(prompt, apiKey);
      const jsonMatch = response.match(/```json\s*([\s\S]+?)\s*```/);
      let parsedContent;

      if (jsonMatch && jsonMatch[1]) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        parsedContent = JSON.parse(response);
      }

      setFollowupPosts(parsedContent);

    } catch (error) {
      console.error(`Erro ao gerar posts de follow-up:`, error);
      alert(`Ocorreu um erro ao gerar os posts de follow-up. Verifique o console.`);
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

  const handleExportHtml = () => {
    exportHtml(campaignContent, backgroundImage, followupPosts, conteudoMedio, conteudoPequeno, conteudoFormatado);
  };

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
${stripHtml(promptText)}

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
   - Precisa ser curto e impactante.
   - Exemplo: "Segredo Revelado"
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
        console.log("Resposta da IA (Conteúdo):", iaResponseText);
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

        setActiveStep(2); // Avança para Edição de Dados
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

  const parseIaResponseToCsvData = (responseText) => {
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
            if (Object.prototype.hasOwnProperty.call(rawRecord, iaHeaderMapped)) {
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
                <MenuItem onClick={handleExportCSV} disabled={csvData.length === 0}>
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
              <input
                type="file"
                hidden
                accept=".midiatorsetup"
                onChange={handleLoadCredentialsFileChange}
                ref={loadCredentialsInputRef}
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
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Campaign />
                  {steps[0].label}
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Problema"
                      multiline
                      rows={4}
                      value={problema}
                      onChange={(e) => setProblema(e.target.value)}
                      variant="outlined"
                      fullWidth
                      placeholder="Descreva o problema que sua campanha busca resolver."
                      disabled={campaignContent !== null}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Solução"
                      multiline
                      rows={4}
                      value={solucao}
                      onChange={(e) => setSolucao(e.target.value)}
                      variant="outlined"
                      fullWidth
                      placeholder="Descreva a solução que sua campanha oferece."
                      disabled={campaignContent !== null}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                        label="Quantidade de Posts de Follow-up"
                        type="number"
                        value={followupPostsQuantity}
                        onChange={(e) => setFollowupPostsQuantity(parseInt(e.target.value, 10))}
                        fullWidth
                        variant="outlined"
                        disabled={campaignContent !== null}
                        InputProps={{ inputProps: { min: 1, max: 10 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" disabled={campaignContent !== null}>
                      <InputLabel id="aspect-ratio-label">Razão de Aspecto</InputLabel>
                      <Select
                        labelId="aspect-ratio-label"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        label="Razão de Aspecto"
                      >
                        <MenuItem value="1:1">Quadrado (1:1)</MenuItem>
                        <MenuItem value="4:5">Retrato (4:5)</MenuItem>
                        <MenuItem value="16:9">Paisagem (16:9)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => handleGenerateCampaignContent(false)}
                    disabled={!problema.trim() || !solucao.trim() || isGeneratingCampaign || campaignContent !== null}
                  >
                    {isGeneratingCampaign ? 'Gerando...' : 'Gerar Tudo com IA'}
                  </Button>
                  {campaignContent && (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleResetCampaign}
                    >
                      Resetar
                    </Button>
                  )}
                </Box>

                {campaignContent && (
                  <Box sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={handleExportHtml}
                      >
                        Exportar como HTML
                      </Button>
                    </Box>
                    <Typography variant="h6" gutterBottom>Conteúdo Gerado</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          label="Título"
                          value={campaignContent.titulo}
                          onChange={(e) => setCampaignContent({ ...campaignContent, titulo: e.target.value })}
                          variant="outlined"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          label="Conteúdo"
                          multiline
                          rows={4}
                          value={campaignContent.conteudo}
                          onClick={() => setEditingField('conteudo')}
                          readOnly
                          variant="outlined"
                          fullWidth
                          sx={{ cursor: 'pointer' }}
                        />
                        <Button onClick={() => handleGenerateCampaignContent(true)} disabled={isGeneratingCampaign}>Gerar</Button>
                      </Grid>

                      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          label="Conteúdo Médio (máx. 1800 caracteres)"
                          multiline
                          rows={2}
                          value={conteudoMedio}
                          onChange={(e) => setConteudoMedio(e.target.value)}
                          variant="outlined"
                          fullWidth
                        />
                        <Button onClick={() => handleGenerateSummary(1800)} disabled={isGeneratingSummaryMedio || !campaignContent}>
                          {isGeneratingSummaryMedio ? 'Gerando...' : 'Gerar'}
                        </Button>
                      </Grid>

                      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          label="Conteúdo Pequeno (máx. 130 caracteres)"
                          multiline
                          rows={1}
                          value={conteudoPequeno}
                          onChange={(e) => setConteudoPequeno(e.target.value)}
                          variant="outlined"
                          fullWidth
                        />
                         <Button onClick={() => handleGenerateSummary(130)} disabled={isGeneratingSummaryPequeno || !campaignContent}>
                          {isGeneratingSummaryPequeno ? 'Gerando...' : 'Gerar'}
                        </Button>
                      </Grid>

                      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          label="Conteúdo Formatado (HTML)"
                          multiline
                          rows={3}
                          value={conteudoFormatado}
                          onClick={() => setEditingField('conteudoFormatado')}
                          readOnly
                          variant="outlined"
                          fullWidth
                          sx={{ cursor: 'pointer' }}
                        />
                         <Button onClick={() => handleGenerateFormattedContent()} disabled={isGeneratingConteudoFormatado || !campaignContent}>
                          {isGeneratingConteudoFormatado ? 'Gerando...' : 'Gerar'}
                        </Button>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="CTA (Chamada para Ação)"
                          multiline
                          rows={2}
                          value={campaignContent.cta}
                          onClick={() => setEditingField('cta')}
                          readOnly
                          variant="outlined"
                          fullWidth
                          sx={{ cursor: 'pointer' }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Hashtags</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {campaignContent.hashtags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              onDelete={() => {
                                const newHashtags = [...campaignContent.hashtags];
                                newHashtags.splice(index, 1);
                                setCampaignContent({ ...campaignContent, hashtags: newHashtags });
                              }}
                            />
                          ))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <TextField
                            label="Nova Hashtag"
                            size="small"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.target.value.trim() !== '') {
                                e.preventDefault();
                                setCampaignContent({ ...campaignContent, hashtags: [...campaignContent.hashtags, e.target.value.trim()] });
                                e.target.value = '';
                              }
                            }}
                          />
                           <Button onClick={() => {
                              const newTag = document.querySelector('input[label="Nova Hashtag"]').value.trim();
                              if (newTag) {
                                setCampaignContent({ ...campaignContent, hashtags: [...campaignContent.hashtags, newTag] });
                                document.querySelector('input[label="Nova Hashtag"]').value = '';
                              }
                           }}>Adicionar</Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {isGeneratingFollowup && (
                  <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>Gerando Posts de Follow-up...</Typography>
                  </Box>
                )}

                {followupPosts.length > 0 && !isGeneratingFollowup && (
                  <Box sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" gutterBottom>Posts de Follow-up Gerados</Typography>
                      <Button onClick={() => handleGenerateFollowupPosts()} disabled={isGeneratingFollowup}>
                        {isGeneratingFollowup ? 'Gerando...' : 'Regenerar Posts'}
                      </Button>
                    </Box>
                    {followupPosts.map((post, index) => (
                      <Accordion key={index}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>Post {post.post_numero}: {post.tipo_gancho}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {post.conteudo}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                            CTA: {post.cta}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {post.hashtags_sugeridas.map((tag, i) => (
                              <Chip key={i} label={tag} size="small" />
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}

                {isGeneratingImage && (
                  <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Gerando Imagem...
                    </Typography>
                    {/* Pode adicionar um componente de loading mais elaborado aqui */}
                  </Box>
                )}

                {generatedImageUrl && !isGeneratingImage && (
                  <Box sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" gutterBottom>Imagem Gerada</Typography>
                      <Button onClick={handleGenerateImage} disabled={isGeneratingImage}>
                        {isGeneratingImage ? 'Gerando...' : 'Regenerar Imagem'}
                      </Button>
                    </Box>
                    <img src={generatedImageUrl} alt="Imagem gerada pela IA" style={{ maxWidth: '100%', borderRadius: '8px', mt: 2 }} />
                  </Box>
                )}
              </CardContent>
            </Card>
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
        onGeneratePalette={async (briefing) => {
          try {
            const apiKey = getGeminiApiKey();
            const palette = await handleGenerateColorPalette(briefing, apiKey, callGeminiApi);
            return palette;
          } catch (error) {
            toast.error('Por favor, configure sua chave de API Gemini primeiro.');
            throw error;
          }
        }}
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
      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={handlePasswordConfirm}
        title={passwordDialogAction === 'save' ? 'Salvar Credenciais' : 'Carregar Credenciais'}
        description={
          passwordDialogAction === 'save'
            ? 'Digite uma senha para criptografar o arquivo de credenciais.'
            : 'Digite a senha para descriptografar o arquivo de credenciais.'
        }
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

