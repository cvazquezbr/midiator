import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
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
  Fab,
  FormControl,
  InputLabel,
  Select,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Toolbar,
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
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster, toast } from 'sonner';

import MainAppBar from './components/MainAppBar';
import Sidebar from './components/Sidebar';
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
import ContentStep from './components/ContentStep';
import ImageUploadStep from './components/ImageUploadStep';
import MemorialDescritivoModal from './components/MemorialDescritivoModal';
import {
  generateCampaignContent,
  generateCampaignImage,
  generateFormattedContent,
  generateFollowupPosts,
  generateIAContent,
  generateColorPalette,
} from './utils/generationHandlers.js';
import { saveCampaignState, loadCampaignState } from './utils/campaignState.js';
import { exportCsv, exportHtml } from './utils/exportUtils.js';
import { downloadExampleCsv } from './utils/fileUtils.js';
import { parseIaResponseToCsvData } from './utils/iaResponseParser.js';
import { parseCsv } from './utils/csvParser.js';
import { lightTheme, darkTheme } from './theme.js';

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]); // Colors from image
  const [standardsColors, setStandardsColors] = useState([]); // Colors from campaign standards

  // Estados para a Campanha
  const [problema, setProblema] = useState('');
  const [solucao, setSolucao] = useState('');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [campaignContent, setCampaignContent] = useState(null);
  const [campaignGenerationFailed, setCampaignGenerationFailed] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [persona, setPersona] = useState({});
  const [autor, setAutor] = useState({});
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
  const [editingFollowup, setEditingFollowup] = useState(null);

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

  const loadCampaignStandards = useCallback(() => {
    const { persona: personaData, autor: autorData, instrucoes: instrucoesData, formato: formatoData, colors: colorsData } = getCampaignPrompt();
    setPersona(personaData || {});
    setAutor(autorData || {});
    setInstrucoes(instrucoesData || '');
    setFormato(formatoData || '');
    setStandardsColors(colorsData || []);
  }, []);

  useEffect(() => {
    loadCampaignStandards();
  }, [loadCampaignStandards]);

  const combinedPalette = useMemo(() => {
    // This palette is used for the color picker in the field formatter.
    // It should combine colors from the standards and colors extracted from the image.
    const allColors = [...(standardsColors.map(c => c.hex) || []), ...(colorPalette || [])];
    return [...new Set(allColors)];
  }, [colorPalette, standardsColors]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]);
  const [generatedAudioData, setGeneratedAudioData] = useState([]);
  const [generatedVideosData, setGeneratedVideosData] = useState([]);
  const [anchorElMenu, setAnchorElMenu] = useState(null);
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
  const [brandElements, setBrandElements] = useState([]); // State for brand elements
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showCampaignStandardsModal, setShowCampaignStandardsModal] = useState(false);
  const [showMemorialDescritivoModal, setShowMemorialDescritivoModal] = useState(false);

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
        setPersona(savedState.persona || {});
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
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

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
  const parseCsvFile = async (file) => {
    if (!file) return;

    try {
      const { data: newCsvData, headers: newHeaders } = await parseCsv(file);

      if (newCsvData && newCsvData.length > 0) {
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
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      toast.error(error.message || 'Ocorreu um erro desconhecido ao processar o arquivo CSV.');
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    parseCsvFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files[0];
    parseCsvFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
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
        brandElements,
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

  // eslint-disable-next-line no-unused-vars
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
      setPersona(loadedState.persona || {});
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
      setBrandElements(loadedState.brandElements || []);

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

  const handleSidebarStepClick = (index) => {
    setActiveStep(index);
    if (isMobile) {
      setSidebarOpen(false);
    }
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
    setCampaignGenerationFailed(false);
    setGenerationError('');

    setTimeout(async () => {
      try {
        const normalizedContent = await generateCampaignContent({ problema, solucao });
        setCampaignContent(normalizedContent);

        if (!regenerate) {
          setConteudoMedio('');
          setConteudoPequeno('');
          setConteudoFormatado('');
          setGeneratedImageUrl(null);

          const [imageSuccess] = await Promise.all([
            handleGenerateImage(normalizedContent),
            handleGenerateSummary(1800, normalizedContent),
            handleGenerateSummary(130, normalizedContent),
            handleGenerateFormattedContent(normalizedContent),
            handleGenerateFollowupPosts(normalizedContent),
          ]);

          if (!imageSuccess) {
            setCampaignGenerationFailed(true);
            setGenerationError("A geração de texto foi bem-sucedida, mas a criação da imagem falhou. Você pode tentar gerar a imagem novamente.");
          }
        }
      } catch (error) {
        // This will now only catch errors from text generation
        console.error("Erro ao gerar conteúdo da campanha:", error);
        const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
        toast.error(`Ocorreu um erro ao gerar o conteúdo da campanha: ${errorMessage}`);
        setCampaignContent(null);
        setCampaignGenerationFailed(true);
        setGenerationError(errorMessage);
      } finally {
        setIsGeneratingCampaign(false);
      }
    }, 0);
  };

  const handleGenerateImage = async (content = campaignContent) => {
    if (!content) {
      toast.error("Por favor, gere o conteúdo do texto primeiro.");
      return false;
    }
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateCampaignImage({ content, aspectRatio });
      setGeneratedImageUrl(imageUrl);
      updateImageAndPalette(imageUrl);
      return true;
    } catch (imageError) {
      console.error("Erro ao gerar imagem:", imageError);
      toast.error(`Ocorreu um erro ao gerar a imagem da campanha: ${imageError.message}`);
      setGeneratedImageUrl(null);
      return false;
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

  const handleEditFollowup = (index, content) => {
    setEditingFollowup({ index, content });
  };

  const handleSaveFollowup = (newContent) => {
    if (editingFollowup === null) return;

    const updatedPosts = followupPosts.map((post, index) => {
      if (index === editingFollowup.index) {
        return { ...post, conteudo: newContent };
      }
      return post;
    });
    setFollowupPosts(updatedPosts);
    setEditingFollowup(null);
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

  const campaignData = {
    problema,
    solucao,
    campaignContent,
    persona,
    autor,
    formato,
    instrucoes,
    aspectRatio,
    followupPosts,
    colors: standardsColors,
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Toaster richColors position="top-center" />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <MainAppBar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          setShowSetupModal={setShowSetupModal}
          handleMenuOpen={handleMenuOpen}
          handleMenuClose={handleMenuClose}
          anchorElMenu={anchorElMenu}
          setShowCampaignStandardsModal={setShowCampaignStandardsModal}
          setShowMemorialDescritivoModal={setShowMemorialDescritivoModal}
          handleSaveTemplateClick={handleSaveTemplateClick}
          handleLoadTemplateClick={handleLoadTemplateClick}
          exportCsv={exportCsv}
          csvData={csvData}
          csvHeaders={csvHeaders}
          loadStateInputRef={loadStateInputRef}
          handleLoadStateFromFile={handleLoadStateFromFile}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
        />

        <Sidebar
          sidebarOpen={sidebarOpen}
          darkMode={darkMode}
          steps={steps}
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          csvData={csvData}
          backgroundImage={backgroundImage}
          visibleFields={visibleFields}
          totalFields={totalFields}
          styledFields={styledFields}
          variant={isMobile ? 'temporary' : 'persistent'}
          onClose={() => setSidebarOpen(false)}
          onStepClick={handleSidebarStepClick}
        />

        {!isMobile && (
          <Fab
            size="small"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'}
            sx={{
              position: 'fixed',
              top: '50%',
              left: sidebarOpen ? 320 - 20 : 0,
              transform: 'translateY(-50%)',
              zIndex: (theme) => theme.zIndex.drawer + 1,
              transition: 'left 0.2s ease-in-out',
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                backgroundColor: 'background.default',
              },
            }}
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </Fab>
        )}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1, sm: 2, md: 3 },
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          <Toolbar />
          {/* Passo 0: Campanha */}
          {activeStep === 0 && (
            <Container maxWidth="lg">
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
              campaignGenerationFailed={campaignGenerationFailed}
              generationError={generationError}
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
              onEditFollowup={handleEditFollowup}
            />
            </Container>
          )}

          {/* Passo 1: Definir Dados Iniciais */}
          {activeStep === 1 && (
            <ContentStep
              steps={steps}
              inputMethod={inputMethod}
              setInputMethod={setInputMethod}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              fileInputRef={fileInputRef}
              handleCSVUpload={handleCSVUpload}
              downloadExampleCsv={downloadExampleCsv}
              setActiveStep={setActiveStep}
              getGeminiApiKey={getGeminiApiKey}
              setShowSetupModal={setShowSetupModal}
              promptNumRecords={promptNumRecords}
              setPromptNumRecords={setPromptNumRecords}
              promptText={promptText}
              setPromptText={setPromptText}
              handleGenerateIAContent={handleGenerateIAContent}
              isGenerating={isGenerating}
              csvData={csvData}
              csvHeaders={csvHeaders}
            />
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
            <ImageUploadStep
              steps={steps}
              isDraggingOverImage={isDraggingOverImage}
              handleImageDrop={handleImageDrop}
              handleImageDragOver={handleImageDragOver}
              handleImageDragEnter={handleImageDragEnter}
              handleImageDragLeave={handleImageDragLeave}
              imageInputRef={imageInputRef}
              handleImageUpload={handleImageUpload}
              backgroundImage={backgroundImage}
            />
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
                  brandElements={brandElements}
                  setBrandElements={setBrandElements}
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
                    brandElements={brandElements}
                    setBrandElements={setBrandElements}
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
              brandElements={brandElements}
              onBrandElementsChange={setBrandElements}
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
      <MemorialDescritivoModal
        open={showMemorialDescritivoModal}
        onClose={() => setShowMemorialDescritivoModal(false)}
        campaignData={campaignData}
      />
       <CampaignStandardsModal
        open={showCampaignStandardsModal}
        onClose={() => {
          setShowCampaignStandardsModal(false);
          loadCampaignStandards();
        }}
        onShowMemorial={() => setShowMemorialDescritivoModal(true)}
        onGeneratePalette={async (briefing) => {
          try {
            const palette = await generateColorPalette(briefing);
            return palette;
          } catch (error) {
            toast.error(error.message || "Ocorreu um erro ao gerar a paleta de cores.");
            // Re-throw to be caught by the modal's internal state
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
        open={editingField !== null || editingFollowup !== null}
        title={
          editingFollowup !== null
            ? `Editar Post de Follow-up ${editingFollowup.index + 1}`
            : `Editar ${
                editingField === 'conteudo'
                  ? 'Conteúdo'
                  : editingField === 'cta'
                  ? 'CTA'
                  : 'Conteúdo Formatado'
              }`
        }
        content={
          editingFollowup !== null
            ? editingFollowup.content
            : editingField === 'conteudoFormatado'
            ? conteudoFormatado
            : editingField
            ? campaignContent[editingField]
            : ''
        }
        onSave={
          editingFollowup !== null
            ? handleSaveFollowup
            : (newContent) => {
                if (editingField === 'conteudoFormatado') {
                  setConteudoFormatado(newContent);
                } else {
                  setCampaignContent({
                    ...campaignContent,
                    [editingField]: newContent,
                  });
                }
              }
        }
        onClose={() => {
          setEditingField(null);
          setEditingFollowup(null);
        }}
      />
      {isMobile && activeStep === 4 && (
        <>
          <Fab
            color="primary"
            aria-label="edit"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setIsDrawerOpen(true)}
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
            imageFilters={imageFilters}
            setImageFilters={setImageFilters}
            brandElements={brandElements}
            setBrandElements={setBrandElements}
          />
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
