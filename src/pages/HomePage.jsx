import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Container, Paper, Typography, Box, Button, Grid, Card, CardContent, Alert, Stepper, Step, StepLabel, StepContent, Chip, IconButton, Tooltip, ToggleButton, ToggleButtonGroup, TextField, Link as MuiLink, Fab, FormControl, InputLabel, Select, Accordion, AccordionSummary, AccordionDetails, Toolbar,
} from '@mui/material';
import {
  CloudUpload, ExpandMore as ExpandMoreIcon, FileUpload, Settings, Image as ImageIcon, Movie, Audiotrack, Palette, ArrowBackIosNew, ArrowForwardIos, MoreVert, Brightness4, Brightness7, Edit, Download as DownloadIcon, CloudQueue, ChevronRight, ChevronLeft, Check, Add, InsertDriveFileOutlined, FormatBold, Visibility, Grid3x3, Campaign as CampaignIcon, AspectRatio, Language, Publish, SaveAlt as SaveAltIcon, FileUpload as FileUploadIcon, FolderOpen as FolderOpenIcon, BarChart
} from '@mui/icons-material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster, toast } from 'sonner';

import { useUserAuth } from '../context/UserAuthContext';
import { useSettings } from '../context/SettingsContext';
import { loadSettingsFromDb } from '../utils/credentialsManager';
import { getCampaigns, saveCampaign, loadCampaign, updateCampaign } from '../utils/campaignState';
import { checkAuthStatus } from '../utils/auth';

import MyCampaignsStep from '../components/MyCampaignsStep';
import MainAppBar from '../components/MainAppBar';
import Sidebar from '../components/Sidebar';
import FieldPositioner from '../components/FieldPositioner';
import FormattingPanel from '../components/FormattingPanel';
import FormattingDrawer from '../components/FormattingDrawer';
import ImageGeneratorFrontendOnly from '../components/ImageGeneratorFrontendOnly';
import AudioGenerator from '../components/AudioGenerator';
import VideoGenerator2 from '../components/VideoGenerator2';
import PostsCurtosStep from '../components/PostsCurtosStep';
import CsvInfobox from '../components/CsvInfobox';
import Publisher from '../components/Publisher';
import Monitor from '../components/Monitor';
import SetupModal from '../components/SetupModal';
import CampaignStandardsModal from '../components/CampaignStandardsModal';
import SaveCampaignModal from '../components/SaveCampaignModal';
import LoadCampaignModal from '../components/LoadCampaignModal';
import BackgroundImageSelector from '../components/BackgroundImageSelector';

import { getGeminiApiKey } from '../utils/geminiCredentials';
import { getCampaignPrompt } from '../utils/campaignPrompt';
import geminiAPI from '../utils/geminiAPI';
import { stripHtml } from '../lib/utils';
import '../App.css';
import LoadingDialog from '../components/LoadingDialog';
import TextEditorDialog from '../components/TextEditorDialog';
import Campaign from '../components/Campaign';
import ImageStep from '../components/ImageStep';
import MemorialDescritivoModal from '../components/MemorialDescritivoModal';
import {
  generateCampaignContent, generateCampaignImage, generateFormattedContent, generateFollowupPlan, generateFollowupPosts, generateIAContent, generateColorPalette, generateCampaignImagePrompt,
} from '../utils/generationHandlers.js';
import { exportCsv, exportHtml } from '../utils/exportUtils.js';
import { downloadExampleCsv } from '../utils/fileUtils.js';
import { parseIaResponseToCsvData } from '../utils/iaResponseParser.js';
import { parseCsv } from '../utils/csvParser.js';
import { lightTheme, darkTheme } from '../theme.js';
import ColorThief from 'colorthief';
import { composeSingleImage } from '../utils/imageComposer.js';
import { autoArrangeFields } from '../utils/autoArrange.js';

import { setGoogleApiToken, setGoogleApiTokenSetter, findFolderByName, createFolder, uploadFile } from '../utils/googleApi';

function HomePage() {
  const { user, googleAccessToken, setGoogleAccessToken } = useUserAuth();
  const { settings, updateSetting, saveSettings } = useSettings();

  // Component State
  const [activeStep, setActiveStep] = useState(null);
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
  const [colorPalette, setColorPalette] = useState([]);
  const [standardsColors, setStandardsColors] = useState([]);
  const [problema, setProblema] = useState('');
  const [solucao, setSolucao] = useState('');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [campaignContent, setCampaignContent] = useState(null);
  const [campaignGenerationFailed, setCampaignGenerationFailed] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [isHtmlField, setIsHtmlField] = useState(false);
  const [persona, setPersona] = useState({});
  const [autor, setAutor] = useState({});
  const [instrucoes, setInstrucoes] = useState('');
  const [formato, setFormato] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [conteudoMedio, setConteudoMedio] = useState('');
  const [conteudoPequeno, setConteudoPequeno] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingSummaryMedio, setIsGeneratingSummaryMedio] = useState(false);
  const [isGeneratingSummaryPequeno, setIsGeneratingSummaryPequeno] = useState(false);
  const [isGeneratingConteudoFormatado, setIsGeneratingConteudoFormatado] = useState(false);
  const [followupPosts, setFollowupPosts] = useState([]);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [followupPostsQuantity, setFollowupPostsQuantity] = useState(5);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedImages, setSelectedImages] = useState({});
  const [selectedVideos, setSelectedVideos] = useState({});
  const [inputMethod, setInputMethod] = useState('ia');
  const [promptNumRecords, setPromptNumRecords] = useState(5);
  const [promptText, setPromptText] = useState('');
  const [generateImagesAutomatically, setGenerateImagesAutomatically] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(true);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]);
  const [generatedAudioData, setGeneratedAudioData] = useState([]);
  const [generatedVideosData, setGeneratedVideosData] = useState([]);
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [imageFilters, setImageFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 });
  const [brandElements, setBrandElements] = useState([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showCampaignStandardsModal, setShowCampaignStandardsModal] = useState(false);
  const [showMemorialDescritivoModal, setShowMemorialDescritivoModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [fontScale, setFontScale] = useState(1);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Use a ref to hold the latest campaignContent to avoid stale state in callbacks.
  const campaignContentRef = useRef(campaignContent);
  campaignContentRef.current = campaignContent;

  const applyAppState = (state) => {
    if (!state) return;

    console.log("Applying loaded state:", state);

    setActiveStep(state.activeStep ?? 0);
    setDarkMode(state.darkMode ?? false);
    setSidebarOpen(state.sidebarOpen ?? !isMobile);

    setCsvData(Array.isArray(state.csvData) ? state.csvData : []);
    setCsvHeaders(Array.isArray(state.csvHeaders) ? state.csvHeaders : []);
    setColorPalette(Array.isArray(state.colorPalette) ? state.colorPalette : []);
    setStandardsColors(Array.isArray(state.standardsColors) ? state.standardsColors : []);
    setFollowupPosts(Array.isArray(state.followupPosts) ? state.followupPosts : []);
    setGeneratedImagesData(Array.isArray(state.generatedImagesData) ? state.generatedImagesData : []);
    // FIX: Filter out invalid audio data on load to prevent crashes
    setGeneratedAudioData(
      Array.isArray(state.generatedAudioData)
        ? state.generatedAudioData.filter(a => a && typeof a.duration === 'number')
        : []
    );
    setGeneratedVideosData(Array.isArray(state.generatedVideosData) ? state.generatedVideosData : []);
    setBrandElements(Array.isArray(state.brandElements) ? state.brandElements : []);

    if (state.backgroundImage) {
      updateImageAndPalette(state.backgroundImage);
    } else {
      setBackgroundImage(null);
    }
    setProblema(state.problema ?? '');
    setSolucao(state.solucao ?? '');
    setCampaignContent(state.campaignContent ?? null);
    setPersona(state.persona ?? {});
    setAutor(state.autor ?? {});
    setInstrucoes(state.instrucoes ?? '');
    setFormato(state.formato ?? '');
    setAspectRatio(state.aspectRatio ?? '1:1');
    setGeneratedImageUrl(state.generatedImageUrl ?? null);
    setConteudoMedio(state.conteudoMedio ?? '');
    setConteudoPequeno(state.conteudoPequeno ?? '');
    setFollowupPostsQuantity(state.followupPostsQuantity ?? 5);
    setIsScheduled(state.isScheduled ?? false);
    setScheduleDate(state.scheduleDate ? new Date(state.scheduleDate) : new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
    setWeeklySchedule(state.weeklySchedule ?? {});
    setSelectedProfile(state.selectedProfile ?? '');
    setSelectedImages(state.selectedImages ?? {});
    setSelectedVideos(state.selectedVideos ?? {});
    setInputMethod(state.inputMethod ?? 'ia');
    setPromptNumRecords(state.promptNumRecords ?? 10);
    setPromptText(state.promptText ?? '');
    setFieldPositions(state.fieldPositions ?? {});

    // Ensure loaded fieldStyles are complete with all default values.
    const loadedStyles = state.fieldStyles ?? {};
    const completeStyles = {};
    const defaultStylesBase = {
      fontFamily: 'Inter', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
      textDecoration: 'none', color: darkMode ? '#FFFFFF' : '#000000', textStroke: false,
      strokeColor: darkMode ? '#000000' : '#FFFFFF', strokeWidth: 2, textShadow: false,
      shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
      textAlign: 'left', verticalAlign: 'top',
      backgroundColor: 'rgba(0,0,0,0)', borderColor: '#000000', borderWidth: 0,
      borderRadius: 0, padding: 5, backgroundOpacity: 0,
    };
    if (state.csvHeaders && Array.isArray(state.csvHeaders)) {
      state.csvHeaders.forEach(header => {
        completeStyles[header] = {
          ...defaultStylesBase,
          ...(loadedStyles[header] || {}),
        };
      });
    }
    setFieldStyles(completeStyles);

    setDisplayedImageSize(state.displayedImageSize ?? { width: 0, height: 0 });
    setOriginalImageSize(state.originalImageSize ?? { width: 0, height: 0 });
    setImageFilters(state.imageFilters ?? { brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 });
  };

  const handleSaveCampaign = async (name) => {
    console.log(`[HomePage] Attempting to save campaign: "${name}"`);

    try {
      await checkAuthStatus();
    } catch (error) {
      toast.error(error.message || "Could not verify your session.");
      return;
    }

    if (!user || !user.uuid) {
      toast.error("Your session appears to be invalid. Please try logging out and logging back in.");
      return;
    }

    const campaignDataToSave = {
      activeStep,
      problema,
      solucao,
      campaignContent,
      persona,
      autor,
      instrucoes,
      formato,
      aspectRatio,
      followupPosts,
      followupPostsQuantity,
      fieldPositions,
      fieldStyles,
      imageFilters,
      brandElements,
      backgroundImage,
      generatedImageUrl,
      generatedImagesData,
      generatedAudioData,
      generatedVideosData,
      standardsColors,
      csvData,
      csvHeaders,
    };
    console.log("[HomePage] Campaign data object created:", campaignDataToSave);


    setIsSaving(true);
    setUploadProgress({ current: 0, total: 0 });
    try {
      if (currentCampaign) {
        console.log(`[HomePage] Updating existing campaign, ID: ${currentCampaign.id}`);
        const updated = await updateCampaign(currentCampaign.id, name, campaignDataToSave, setUploadProgress, user.uuid);
        toast.success(`Campaign "${name}" updated.`);
        setCurrentCampaign(updated);
      } else {
        console.log(`[HomePage] Saving new campaign.`);
        const newCampaign = await saveCampaign(name, campaignDataToSave, setUploadProgress, user.uuid);
        toast.success(`Campaign "${name}" saved.`);
        setCurrentCampaign(newCampaign);
      }
      console.log("[HomePage] Save/Update operation completed successfully.");
    } catch (err) {
      console.error("[HomePage] Error during save/update campaign:", err);
      toast.error(err.message || 'An unknown error occurred while saving the campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadCampaign = async (id) => {
    try {
      await checkAuthStatus();
    } catch (error) {
      toast.error(error.message);
      return;
    }

    setIsLoading(true);
    try {
      const loadedCampaign = await loadCampaign(id);
      console.log("Loaded campaign data from DB:", loadedCampaign); // Diagnostic log
      applyAppState(loadedCampaign.campaign_data);
      setCurrentCampaign({ id: loadedCampaign.id, name: loadedCampaign.name });
      toast.success(`Campaign "${loadedCampaign.name}" loaded successfully!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
    const apiKey = getGeminiApiKey();
    if (apiKey) geminiAPI.initialize(apiKey);
  }, [loadCampaignStandards]);

  useEffect(() => {
    const checkCampaignsAndSetInitialStep = async () => {
      try {
        const existingCampaigns = await getCampaigns();
        if (existingCampaigns && existingCampaigns.length > 0) {
          setActiveStep(0);
        } else {
          setActiveStep(1);
        }
      } catch (error) {
        toast.error("Could not check for existing campaigns. Starting fresh.");
        console.error("Failed to fetch initial campaigns:", error);
        setActiveStep(1); // Default to campaign creation on error
      } finally {
        setIsFetchingCampaigns(false);
      }
    };

    if (user) { // Only run if user is logged in
      checkCampaignsAndSetInitialStep();
    } else {
      // If there's no user, we can't fetch campaigns, so go to the first public step.
      // This might need adjustment depending on which steps are public.
      // For now, let's assume the flow starts after login.
      setActiveStep(null); // Or some other default state for logged-out users
      setIsFetchingCampaigns(false);
    }
  }, [user]);


  // Configure googleApi module with the token and setter from context
  useEffect(() => {
    if (googleAccessToken) {
      console.log("[HomePage] googleAccessToken updated, configuring googleApi module.");
      setGoogleApiToken(googleAccessToken);
      setGoogleApiTokenSetter(setGoogleAccessToken);
    }
  }, [googleAccessToken, setGoogleAccessToken]);

  useEffect(() => {
    const loadInitialSettings = async () => {
        if (user) {
            try {
                await loadSettingsFromDb();
                const apiKey = getGeminiApiKey();
                if (apiKey) geminiAPI.initialize(apiKey);
                toast.info("Your cloud settings have been loaded.");
            } catch (error) {
                toast.error(`Could not load your settings: ${error.message}`);
            }
        }
    };
    loadInitialSettings();
  }, [user?.uuid]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.classList.toggle('dark-mode-active', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (activeStep === 1 && campaignContent) {
      const { titulo, conteudo, cta } = campaignContent;
      setPromptText(`${titulo || ''}\n\n${conteudo || ''}\n\n${cta || ''}`);
    }
  }, [activeStep, campaignContent]);

  useEffect(() => {
    const handleLinkedInRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        window.history.replaceState({}, document.title, "/");
        toast.loading('Finalizando conexão com o LinkedIn...');

        try {
          const response = await fetch('/api/linkedin-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'tokenExchange',
              code: code,
              redirectUri: window.location.origin
            }),
          });

          toast.dismiss();
          const data = await response.json();

          if (response.ok) {
            const currentLinkedinConfig = settings.linkedin || {};
            const newConfig = {
              ...currentLinkedinConfig,
              accessToken: data.access_token,
              expiry: Date.now() + data.expires_in * 1000,
            };
            updateSetting('linkedin', newConfig);
            await saveSettings(); // Save immediately after getting the token
            toast.success('Conexão com o LinkedIn estabelecida com sucesso!');
            setShowSetupModal(true);
          } else {
            throw new Error(data.error_description || data.error || 'Falha na troca de token do LinkedIn.');
          }
        } catch (error) {
          toast.dismiss();
          toast.error(`Erro ao conectar com o LinkedIn: ${error.message}`);
        }
      }
    };

    handleLinkedInRedirect();
  }, []); // Should only run once on page load

  const steps = [ { label: 'Minhas Campanhas', description: 'Gerencie suas campanhas existentes ou crie uma nova.', icon: FolderOpenIcon }, { label: 'Campanha', description: 'Criar o material de referência para a campanha.', icon: CampaignIcon }, { label: 'Posts Curtos', description: 'Gere, carregue ou edite os posts para redes sociais.', icon: InsertDriveFileOutlined }, { label: 'Imagem e Formatação', description: 'Carregue a imagem de fundo, posicione os campos e configure a formatação.', icon: ImageIcon }, { label: 'Gerar Imagens', description: 'Gere as imagens finais.', icon: FormatBold }, { label: 'Gerar Áudio', description: 'Crie a narração para os slides.', icon: Audiotrack }, { label: 'Gerar Vídeo', description: 'Crie um vídeo a partir das imagens geradas.', icon: Movie }, { label: 'Publicar', description: 'Publique o conteúdo no WordPress.', icon: Publish }, { label: 'Monitorar', description: 'Acompanhe as estatísticas de suas publicações.', icon: BarChart } ];
  const handleCreateNewCampaign = () => {
    // Reset all campaign-specific state to their defaults
    applyAppState({}); // Clears most of the state
    setCurrentCampaign(null); // Ensure we're not editing an existing campaign
    setActiveStep(1); // Move to the 'Campanha' step
  };
  const handleEditCampaign = (campaign) => {
    setCurrentCampaign(campaign);
    setShowSaveModal(true);
  };
  const parseCsvFile = async (file) => {
    if (!file) return;
    try {
      const { data: newCsvData, headers: newHeaders } = await parseCsv(file);
      if (newCsvData && newCsvData.length > 0) {
        setCsvData(newCsvData);
        setCsvHeaders(newHeaders);

        const { newPositions, newStyles } = autoArrangeFields({
          csvHeaders: newHeaders,
          fieldPositions: {}, // Start from scratch
          fieldStyles: {}, // Start from scratch
          csvData: newCsvData,
          effectiveImageSize: originalImageSize,
          standardsColors,
        });

        setFieldPositions(newPositions);
        setFieldStyles(newStyles);
        setInputMethod('manual');
      }
    } catch (error) {
      toast.error(error.message || 'Ocorreu um erro desconhecido ao processar o arquivo CSV.');
    }
  };
  const handleCSVUpload = (event) => { const file = event.target.files[0]; parseCsvFile(file); };
  const handleDrop = (event) => { event.preventDefault(); event.stopPropagation(); const file = event.dataTransfer.files[0]; parseCsvFile(file); };
  const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
  const updateImageAndPalette = useCallback((imageUrl) => {
    console.log('[HomePage] DIAGNOSTIC: updateImageAndPalette called. Setting backgroundImage. Value starts with:', String(imageUrl).substring(0, 100));
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
    };
    img.src = imageUrl;
  }, []); // State setters are stable.
  const parseImageFile = async (file) => {
    if (!file) return;
    console.log(`[HomePage] Parsing image file: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      updateImageAndPalette(imageUrl);

      const imageStepIndex = steps.findIndex(step => step.label === 'Imagem e Formatação');
      if (imageStepIndex !== -1) {
        setActiveStep(imageStepIndex);
      }

      if (window.confirm("Deseja salvar esta imagem na sua biblioteca de fundos no Google Drive?")) {
        const uploadToDrive = async () => {
            const toastId = toast.loading("Salvando imagem na biblioteca...");
            console.log("[HomePage] Starting image upload to Drive process.");
            try {
                if (!googleAccessToken) {
                    throw new Error("Por favor, conecte sua conta Google primeiro.");
                }

                let midiatorFolder = await findFolderByName('midiator');
                if (!midiatorFolder) {
                    console.log("[HomePage] 'midiator' folder not found, creating it.");
                    midiatorFolder = await createFolder('midiator');
                    if (!midiatorFolder) throw new Error("Falha ao criar a pasta 'midiator' no Drive.");
                }

                let backgroundsFolder = await findFolderByName('backgrounds', midiatorFolder.id);
                if (!backgroundsFolder) {
                    console.log("[HomePage] 'backgrounds' folder not found, creating it.");
                    backgroundsFolder = await createFolder('backgrounds', midiatorFolder.id);
                    if (!backgroundsFolder) throw new Error("Falha ao criar a pasta 'backgrounds' no Drive.");
                }

                const uploadedFile = await uploadFile(file, file.name, backgroundsFolder.id);
                if (!uploadedFile) {
                    throw new Error("O upload do arquivo para o Drive falhou e não retornou informações.");
                }

                toast.success("Imagem salva com sucesso na sua biblioteca!", { id: toastId });
                console.log("[HomePage] Image successfully uploaded to Drive:", uploadedFile);

            } catch (err) {
                console.error("[HomePage] Failed to upload background to Drive:", err);
                toast.error(`Falha ao salvar imagem: ${err.message}`, { id: toastId });
            }
        };
        uploadToDrive();
      }
    };
    reader.readAsDataURL(file);
  };
  const handleImageUpload = (event) => { const file = event.target.files[0]; parseImageFile(file); };
  const handleImageDrop = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); const file = event.dataTransfer.files[0]; parseImageFile(file); };
  const handleImageDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
  const handleImageDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(true); };
  const handleImageDragLeave = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); };
  const handleNext = () => { setActiveStep((prevActiveStep) => prevActiveStep + 1); };
  const handleBack = () => { setActiveStep((prevActiveStep) => prevActiveStep - 1); };
  const canProceedToStep = (step) => {
    switch (step) {
      case 1: // -> Campanha
        return true; // Always allowed to go from My Campaigns to new Campaign
      case 2: // -> Posts Curtos
        return campaignContent !== null;
      case 3: // -> Imagem e Formatação
        return csvData.length > 0;
      case 4: // -> Gerar Imagens
        return backgroundImage !== null;
      case 5: // -> Gerar Áudio
        if (generatedImagesData.length === 0 || !generatedImagesData.every(img => img.blob)) {
            toast.error("Por favor, gere todas as imagens na etapa 4 antes de prosseguir.");
            return false;
        }
        return true;
      default:
        return true;
    }
  };
  const getFieldStats = () => { const visibleFields = Object.values(fieldPositions).filter(pos => pos.visible).length; const totalFields = csvHeaders.length; const styledFields = Object.keys(fieldStyles).length; return { visibleFields, totalFields, styledFields }; };
  const { visibleFields, totalFields, styledFields } = getFieldStats();
  const handleZIndexChange = (elementId, action) => { if (!elementId) return; let allElements = [ ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, isBrand: false })), ...brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, isBrand: true })), ]; allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)); const currentIndex = allElements.findIndex(el => el.id === elementId); if (currentIndex === -1) return; const [currentElement] = allElements.splice(currentIndex, 1); switch (action) { case 'front': allElements.push(currentElement); break; case 'back': allElements.unshift(currentElement); break; case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement); break; case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement); break; default: allElements.splice(currentIndex, 0, currentElement); return; } const newPositions = { ...fieldPositions }; const newBrandElements = [...brandElements]; allElements.forEach((el, index) => { el.zIndex = index; if (el.isBrand) { const brandEl = newBrandElements.find(b => b.id === el.id); if (brandEl) brandEl.zIndex = index; } else { if (newPositions[el.id]) { newPositions[el.id].zIndex = index; } } }); setFieldPositions(newPositions); setBrandElements(newBrandElements); };
  const handleSidebarStepClick = (index) => { setActiveStep(index); if (isMobile) { setSidebarOpen(false); } };
  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    setCsvData(novosRegistros);
    setCsvHeaders(novasColunas);

    // This logic doesn't need to be inside the setGeneratedImagesData callback
    const updatedFieldPositions = {};
    const updatedFieldStyles = {};
    const defaultStylesBase = {
      fontFamily: 'Inter', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
      textDecoration: 'none', color: darkMode ? '#FFFFFF' : '#000000', textStroke: false,
      strokeColor: darkMode ? '#000000' : '#FFFFFF', strokeWidth: 2, textShadow: false,
      shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
      textAlign: 'left', verticalAlign: 'top',
      // Box properties
      backgroundColor: 'rgba(0,0,0,0)',
      borderColor: '#000000',
      borderWidth: 0,
      borderRadius: 0,
      padding: 5,
      backgroundOpacity: 0,
    };
    novasColunas.forEach((header, index) => {
      updatedFieldPositions[header] = fieldPositions[header] || { x: 10 + (index % 5) * 18, y: 10 + Math.floor(index / 5) * 12, width: 15, height: 10, visible: true };
      updatedFieldStyles[header] = { ...defaultStylesBase, ...(fieldStyles[header] || {}) };
    });
    setFieldPositions(updatedFieldPositions);
    setFieldStyles(updatedFieldStyles);

    // When rebuilding the generatedImagesData array due to a change in the number of records,
    // we must check if a specific background image already exists for that index in the *previous*
    // state. If it does, we preserve it. Otherwise, we fall back to the global background.
    setGeneratedImagesData(prevGeneratedImages => {
        const newGeneratedImages = novosRegistros.map((record, index) => {
            const existingImage = prevGeneratedImages.find(img => img.index === index);

            // If an image with the same index exists, preserve its properties,
            // especially the unique 'backgroundImage', and just update the record.
            if (existingImage) {
                return {
                    ...existingImage,
                    record: record, // Update the data record
                };
            }

            // If no image exists for this index (e.g., a new row was added),
            // create a new image data object using the global background.
            return {
                index,
                record,
                blob: null,
                url: null,
                filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
                backgroundImage: backgroundImage, // Use global background for new rows
            };
        });
        return newGeneratedImages;
    });
  }, [darkMode, fieldPositions, fieldStyles, backgroundImage, setCsvData, setCsvHeaders, setFieldPositions, setFieldStyles]);
  const handleCsvRecordContentUpdate = useCallback((newCsvData) => { setCsvData(newCsvData); }, [setCsvData]);
  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => { setCsvData(prevCsvData => { if (recordIndex < 0 || recordIndex >= prevCsvData.length) { return prevCsvData; } return prevCsvData.map((row, idx) => { if (idx === recordIndex) { return updatedRecord; } return row; }); }); }, [setCsvData]);
  const handleGenerateCampaignContent = async (regenerate = false) => {
    setIsGeneratingCampaign(true);
    setCampaignGenerationFailed(false);
    setGenerationError('');
    setGenerationStatus('Iniciando geração de campanha...');

    try {
      // Etapa 1: Gerar conteúdo principal
      setGenerationStatus('Criando o conteúdo geral da campanha...');
      const normalizedContent = await generateCampaignContent({ problema, solucao });
      if (!normalizedContent) {
        throw new Error("A geração do conteúdo principal falhou e não retornou dados.");
      }
      setCampaignContent(normalizedContent);

      if (regenerate) {
        // Se for apenas regeneração, para por aqui.
        toast.success("Conteúdo principal da campanha foi regenerado.");
        return;
      }

      // Resetar estados dependentes para uma nova geração completa
      setFollowupPosts([]);

      // Etapa 2: Gerar imagem principal
      setGenerationStatus('Gerando a imagem de referência da campanha...');
      const imageSuccess = await handleGenerateImage(normalizedContent);
      if (!imageSuccess) {
        // A geração de imagem falhou, mas o conteúdo de texto foi criado.
        // O usuário pode tentar gerar a imagem novamente.
        setCampaignGenerationFailed(true);
        setGenerationError("A geração de texto foi bem-sucedida, mas a criação da imagem falhou. Você pode tentar gerar a imagem novamente.");
        toast.warning("Geração de imagem falhou, mas o texto está pronto.");
      }

      // Etapa 3: Gerar resumos e conteúdo formatado (pode ser em paralelo se quisermos)
      setGenerationStatus('Gerando resumos e conteúdo formatado...');
      await Promise.all([
        handleGenerateSummary(1800, normalizedContent),
        handleGenerateSummary(130, normalizedContent),
        handleGenerateFormattedContent(normalizedContent),
      ]);

      // Etapa 4: Gerar posts de follow-up (sequencialmente com status)
      if (followupPostsQuantity > 0) {
        setGenerationStatus('Planejando os posts de follow-up...');
        const plan = await generateFollowupPlan({
          content: normalizedContent,
          neededQuantity: followupPostsQuantity,
          existingPosts: [], // Sempre começa do zero para uma nova campanha
        });

        const newPosts = [];
        for (let i = 0; i < plan.length; i++) {
          const postPlan = plan[i];
          setGenerationStatus(`Gerando post de follow-up ${i + 1}/${plan.length}...`);
          // A lógica de generateFollowupPosts foi movida para cá para podermos ter o status
          const generatedPost = await generateFollowupPosts({ content: normalizedContent, plan: [postPlan] });
          if (generatedPost && generatedPost.length > 0) {
            newPosts.push(...generatedPost);
            // Atualiza o estado a cada post gerado para o usuário ver o progresso
            setFollowupPosts([...newPosts]);
          }
        }
      }

      toast.success("Campanha gerada com sucesso!");

    } catch (error) {
      const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
      toast.error(`Ocorreu um erro ao gerar o conteúdo da campanha: ${errorMessage}`);
      setCampaignContent(null); // Limpa o conteúdo se qualquer parte crítica falhar
      setCampaignGenerationFailed(true);
      setGenerationError(errorMessage);
    } finally {
      setIsGeneratingCampaign(false);
      setGenerationStatus('');
    }
  };
  const handleGenerateImage = useCallback(async (content) => {
    const finalContent = content || campaignContentRef.current;
    if (!finalContent) {
      toast.error("Por favor, gere o conteúdo do texto primeiro.");
      return false;
    }
    setIsGeneratingImage(true);
    try {
      const imagePrompt = await generateCampaignImagePrompt({ content: finalContent, aspectRatio });
      const imageUrl = await generateCampaignImage({ prompt: imagePrompt, aspectRatio });
      console.log('[HomePage] DIAGNOSTIC: handleGenerateImage succeeded. Setting generatedImageUrl. Value starts with:', String(imageUrl).substring(0, 100));
      setGeneratedImageUrl(imageUrl);
      updateImageAndPalette(imageUrl);
      return true;
    } catch (imageError) {
      toast.error(`Ocorreu um erro ao gerar a imagem da campanha: ${imageError.message}`);
      console.log('[HomePage] DIAGNOSTIC: handleGenerateImage failed. Setting generatedImageUrl to null.');
      setGeneratedImageUrl(null);
      return false;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [aspectRatio, updateImageAndPalette]);
  const handleGenerateSummary = async (targetLength, content = campaignContent) => { if (!content?.conteudo) { alert("Por favor, gere o conteúdo principal primeiro."); return; } const setLoading = targetLength === 1800 ? setIsGeneratingSummaryMedio : setIsGeneratingSummaryPequeno; setLoading(true); if (!geminiAPI.isInitialized) { const apiKey = getGeminiApiKey(); if (!apiKey) { alert('Por favor, configure sua chave de API Gemini primeiro.'); setLoading(false); return; } geminiAPI.initialize(apiKey); } try { const summaryPrompt = `Resuma o seguinte texto para ter no máximo ${targetLength} caracteres, mantendo a essência e o tom: "${stripHtml(content.conteudo)}"`; const summary = await geminiAPI.generateContent(summaryPrompt); const fieldName = targetLength === 1800 ? 'conteudoMedio' : 'conteudoPequeno'; setCampaignContent(prev => ({ ...prev, [fieldName]: summary })); } catch (error) { alert(`Ocorreu um erro ao gerar o resumo. Verifique o console.`); } finally { setLoading(false); } };
  const handleGenerateFormattedContent = async (content = campaignContent) => { if (!content?.conteudo) { toast.error("Por favor, gere o conteúdo principal primeiro."); return; } setIsGeneratingConteudoFormatado(true); try { const finalContent = await generateFormattedContent({ content }); setCampaignContent(prev => ({ ...prev, conteudoFormatado: finalContent })); } catch (error) { toast.error(`Ocorreu um erro ao gerar o conteúdo formatado: ${error.message}`); } finally { setIsGeneratingConteudoFormatado(false); } };
  const handleGenerateFollowupPosts = async (content = campaignContent) => {
    if (!content?.conteudo) {
      toast.error("Por favor, gere o conteúdo principal primeiro.");
      return;
    }

    if (followupPosts.length >= followupPostsQuantity) {
      toast.info('A quantidade de posts desejada já foi atingida ou superada.');
      return;
    }

    setIsGeneratingFollowup(true);
    try {
      const neededQuantity = followupPostsQuantity - followupPosts.length;
      const plan = await generateFollowupPlan({
        content,
        neededQuantity,
        existingPosts: followupPosts,
      });
      const newPosts = await generateFollowupPosts({ content, plan });
      setFollowupPosts(prevPosts => [...prevPosts, ...newPosts]);
    } catch (error) {
      toast.error(`Ocorreu um erro ao gerar os posts de follow-up: ${error.message}`);
    } finally {
      setIsGeneratingFollowup(false);
    }
  };
  const handleResetCampaign = () => {
    console.log('[HomePage] DIAGNOSTIC: handleResetCampaign called. Setting generatedImageUrl to null.');
    setCampaignContent(null);
    setGeneratedImageUrl(null);
    setConteudoMedio('');
    setConteudoPequeno('');
    setConteudoFormatado('');
    setFollowupPosts([]);
    setFollowupPostsQuantity(5);
  };
  const handleEditFollowup = (index, content) => { setEditingFollowup({ index, content }); };
  const handleSaveFollowup = (newContent) => { if (editingFollowup === null) return; const updatedPosts = followupPosts.map((post, index) => { if (index === editingFollowup.index) { return { ...post, conteudo: newContent }; } return post; }); setFollowupPosts(updatedPosts); setEditingFollowup(null); };
  const handleGenerateIAContent = async () => {
    setIsGenerating(true);
    setGenerationStatus('Gerando texto para os posts...');
    try {
      const iaResponseText = await generateIAContent({ promptText, promptNumRecords });
      const parsedResult = parseIaResponseToCsvData(iaResponseText);

      if (!parsedResult || !parsedResult.data || !parsedResult.data.length > 0) {
        toast.error('Não foi possível processar a resposta da IA para o formato de tabela.');
        return;
      }

      const { data: csvDataResult, headers: csvHeadersResult } = parsedResult;

      // Reset field positions and styles for the new content
      const { newPositions: updatedFieldPositions, newStyles: updatedFieldStyles } = autoArrangeFields({
        csvHeaders: csvHeadersResult,
        fieldPositions: {}, // Start from scratch
        fieldStyles: {}, // Start from scratch
        csvData: csvDataResult,
        effectiveImageSize: originalImageSize,
        standardsColors,
      });

      // Create the new image data array, preserving backgrounds from the previous state
      const newGeneratedImagesData = csvDataResult.map((record, index) => {
        const existingImage = generatedImagesData.find(img => img.index === index);
        if (existingImage) {
          return {
            ...existingImage,
            record: record, // Update the record with new text
          };
        }
        // For new records, fall back to the global background
        return {
          index,
          record,
          blob: null,
          url: null,
          filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
          backgroundImage: backgroundImage,
        };
      });

      // Set all states together
      setCsvData(csvDataResult);
      setCsvHeaders(csvHeadersResult);
      setFieldPositions(updatedFieldPositions);
      setFieldStyles(updatedFieldStyles);
      setGeneratedImagesData(newGeneratedImagesData);
      setInputMethod('manual');

      if (generateImagesAutomatically) {
        toast.info('Geração de posts concluída. Iniciando geração automática de imagens...');
        let firstImageSet = false;
        // Use the newly created array, not a stale copy of the old state
        let currentImagesData = [...newGeneratedImagesData];

        for (let i = 0; i < currentImagesData.length; i++) {
          const record = currentImagesData[i].record;
          const imagePrompt = record.prompt_imagem_carrossel;

          if (imagePrompt && imagePrompt.trim() !== '') {
            setGenerationStatus(`Gerando imagem para o post ${i + 1}/${currentImagesData.length}...`);
            try {
              const rawBgImageUrl = await generateCampaignImage({ content: { titulo: imagePrompt }, aspectRatio });

              const blob = await (await fetch(rawBgImageUrl)).blob();
              const stableDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              if (!firstImageSet) {
                updateImageAndPalette(stableDataUrl);
                firstImageSet = true;
              }

              // The final image must be composed with the unique background (stableDataUrl),
              // not the potentially stale one in the currentImagesData array item.
              const finalImageData = await composeSingleImage({
                record: record,
                index: i,
                itemBackgroundImage: stableDataUrl,
                imageFilters,
                brandElements,
                fieldPositions: updatedFieldPositions,
                fieldStyles: updatedFieldStyles,
              });

              // Also update the item in our local array with the new background
              finalImageData.backgroundImage = stableDataUrl;

              currentImagesData[i] = finalImageData;
              setGeneratedImagesData([...currentImagesData]);
              toast.success(`Imagem final para o post #${i + 1} gerada.`);

            } catch (error) {
              console.error(`Error during automatic generation for post ${i + 1}:`, error);
              toast.error(`Falha na geração automática para o post #${i + 1}: ${error.message}`);
            }
          }
        }
        toast.success('Geração automática de imagens concluída!');
      }
    } catch (error) {
      toast.error(`Erro ao gerar conteúdo com IA: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };
  const currentTheme = darkMode ? darkTheme : lightTheme;
  const campaignData = { problema, solucao, campaignContent, persona, autor, formato, instrucoes, aspectRatio, followupPosts, colors: standardsColors, };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <MainAppBar darkMode={darkMode} setDarkMode={setDarkMode} setShowSetupModal={setShowSetupModal} setShowCampaignStandardsModal={setShowCampaignStandardsModal} setShowMemorialDescritivoModal={setShowMemorialDescritivoModal} onMenuClick={() => setSidebarOpen(!sidebarOpen)} isMobile={isMobile} onSaveCampaign={() => setShowSaveModal(true)} onLoadCampaign={() => setShowLoadModal(true)} />
        <Sidebar sidebarOpen={sidebarOpen} darkMode={darkMode} steps={steps} activeStep={activeStep} setActiveStep={setActiveStep} csvData={csvData} backgroundImage={backgroundImage} visibleFields={visibleFields} totalFields={totalFields} styledFields={styledFields} variant={isMobile ? 'temporary' : 'persistent'} onClose={() => setSidebarOpen(false)} onStepClick={handleSidebarStepClick} />
        {!isMobile && <Fab size="small" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'} sx={{ position: 'fixed', top: '50%', left: sidebarOpen ? 320 - 20 : 0, transform: 'translateY(-50%)', zIndex: (theme) => theme.zIndex.drawer + 1, transition: 'left 0.2s ease-in-out', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: 'background.default' } }} >{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}</Fab>}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, transition: theme.transitions.create('margin', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }) }} >
          <Toolbar />
          <div hidden={activeStep !== 0}>
            <MyCampaignsStep
              onLoadCampaign={handleLoadCampaign}
              onEditCampaign={handleEditCampaign}
              onCreateNew={handleCreateNewCampaign}
            />
          </div>
          <div hidden={activeStep !== 1}><Container maxWidth="lg"><Campaign steps={steps} activeStep={activeStep} {...campaignData} setProblema={setProblema} setSolucao={setSolucao} isGeneratingCampaign={isGeneratingCampaign} campaignGenerationFailed={campaignGenerationFailed} generationError={generationError} handleGenerateCampaignContent={handleGenerateCampaignContent} handleResetCampaign={handleResetCampaign} handleExportHtml={() => exportHtml(campaignData)} editingField={editingField} setEditingField={(field) => {
            setEditingField(field);
            setIsHtmlField(field === 'conteudoFormatado');
          }} isGeneratingSummaryMedio={isGeneratingSummaryMedio} handleGenerateSummary={handleGenerateSummary} isGeneratingSummaryPequeno={isGeneratingSummaryPequeno} isGeneratingConteudoFormatado={isGeneratingConteudoFormatado} handleGenerateFormattedContent={handleGenerateFormattedContent} isGeneratingFollowup={isGeneratingFollowup} handleGenerateFollowupPosts={handleGenerateFollowupPosts} generatedImageUrl={generatedImageUrl} isGeneratingImage={isGeneratingImage} handleGenerateImage={handleGenerateImage} setCampaignContent={setCampaignContent} onEditFollowup={handleEditFollowup} followupPostsQuantity={followupPostsQuantity} setFollowupPostsQuantity={setFollowupPostsQuantity} setAspectRatio={setAspectRatio} /></Container></div>
          <div hidden={activeStep !== 2}><PostsCurtosStep steps={steps} inputMethod={inputMethod} setInputMethod={setInputMethod} handleDrop={handleDrop} handleDragOver={handleDragOver} fileInputRef={fileInputRef} handleCSVUpload={handleCSVUpload} downloadExampleCsv={downloadExampleCsv} setShowSetupModal={setShowSetupModal} promptNumRecords={promptNumRecords} setPromptNumRecords={setPromptNumRecords} promptText={promptText} setPromptText={setPromptText} generateImagesAutomatically={generateImagesAutomatically} setGenerateImagesAutomatically={setGenerateImagesAutomatically} handleGenerateIAContent={handleGenerateIAContent} isGenerating={isGenerating} csvData={csvData} csvHeaders={csvHeaders} onDadosAlterados={handleDadosAlterados} darkMode={darkMode} exportCsv={exportCsv} /></div>
          <div hidden={activeStep !== 3}>
            <ImageStep
              steps={steps}
              isDraggingOverImage={isDraggingOverImage}
              handleImageDrop={handleImageDrop}
              handleImageDragOver={handleImageDragOver}
              handleImageDragEnter={handleImageDragEnter}
              handleImageDragLeave={handleImageDragLeave}
              imageInputRef={imageInputRef}
              handleImageUpload={handleImageUpload}
              backgroundImage={backgroundImage}
              onChangeBackgroundImage={() => setShowBgSelector(true)}
              csvHeaders={csvHeaders}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              fieldStyles={fieldStyles}
              setFieldStyles={setFieldStyles}
              csvData={csvData}
              onImageDisplayedSizeChange={setDisplayedImageSize}
              colorPalette={colorPalette}
              standardsColors={standardsColors}
              onCsvDataUpdate={handleCsvRecordContentUpdate}
              originalImageSize={originalImageSize}
              imageFilters={imageFilters}
              setImageFilters={setImageFilters}
              brandElements={brandElements}
              setBrandElements={setBrandElements}
              onZIndexChange={handleZIndexChange}
              isMobile={isMobile}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              onDeselectField={() => setSelectedField(null)}
              onOpenHtmlEditor={(fieldId) => {
                setEditingField(fieldId);
                // This is a guess, I might need to create a new state for this
                // setIsHtmlEditorOpen(true);
              }}
              currentPreviewIndex={currentPreviewIndex}
              setCurrentPreviewIndex={setCurrentPreviewIndex}
              onFontScaleChange={setFontScale}
            />
          </div>
          <div hidden={activeStep !== 4}><ImageGeneratorFrontendOnly csvData={csvData} backgroundImage={backgroundImage} fieldPositions={fieldPositions} fieldStyles={fieldStyles} displayedImageSize={displayedImageSize} csvHeaders={csvHeaders} colorPalette={colorPalette} setGeneratedImagesData={setGeneratedImagesData} initialGeneratedImagesData={generatedImagesData} onThumbnailRecordTextUpdate={handleThumbnailRecordTextUpdate} originalImageSize={originalImageSize} imageFilters={imageFilters} brandElements={brandElements} onBrandElementsChange={setBrandElements} fontScale={fontScale} /></div>
          <div hidden={activeStep !== 5}><AudioGenerator csvData={csvData} fieldPositions={fieldPositions} onAudiosGenerated={setGeneratedAudioData} initialAudioData={generatedAudioData} /></div>
          <div hidden={activeStep !== 6}><VideoGenerator2 generatedImages={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={(videoData) => setGeneratedVideosData(videoData)} /></div>
          <div hidden={activeStep !== 7}><Publisher settings={settings} campaignContent={campaignContent} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} followupPosts={followupPosts} isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile} selectedImages={selectedImages} setSelectedImages={setSelectedImages} selectedVideos={selectedVideos} setSelectedVideos={setSelectedVideos} currentCampaign={currentCampaign} /></div>
          <div hidden={activeStep !== 8}><Monitor currentCampaign={currentCampaign} /></div>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} ><Button onClick={handleBack} disabled={activeStep === 0} variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Anterior</Button><Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300', transition: 'all 0.3s ease' }} />))}</Box><Button onClick={handleNext} disabled={isGenerating || activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)} variant="contained" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Próximo</Button></Box>
        </Box>
      </Box>
      <SetupModal open={showSetupModal} onClose={() => setShowSetupModal(false)} />
      <SaveCampaignModal open={showSaveModal} onClose={() => setShowSaveModal(false)} onSave={handleSaveCampaign} campaignToEdit={currentCampaign} isSaving={isSaving} />
      <LoadCampaignModal open={showLoadModal} onClose={() => setShowLoadModal(false)} onLoad={handleLoadCampaign} onEdit={(campaign) => { setCurrentCampaign(campaign); setShowSaveModal(true); }} />
      <MemorialDescritivoModal open={showMemorialDescritivoModal} onClose={() => setShowMemorialDescritivoModal(false)} campaignData={campaignData} />
      <CampaignStandardsModal open={showCampaignStandardsModal} onClose={() => { setShowCampaignStandardsModal(false); loadCampaignStandards(); }} onShowMemorial={() => setShowMemorialDescritivoModal(true)} onGeneratePalette={async (briefing) => { try { const palette = await generateColorPalette(briefing); return palette; } catch (error) { toast.error(error.message || "Ocorreu um erro ao gerar a paleta de cores."); throw error; } }} />
      <BackgroundImageSelector
        open={showBgSelector}
        onClose={() => setShowBgSelector(false)}
        onSelect={updateImageAndPalette}
        onLocalUpload={parseImageFile}
      />
      <LoadingDialog
        open={isGeneratingCampaign || isSaving || isLoading || isGenerating || isFetchingCampaigns}
        title={
          isFetchingCampaigns
            ? "Carregando campanhas..."
            : generationStatus ||
              (isSaving
                ? `Salvando Campanha... (${uploadProgress.current}/${uploadProgress.total})`
                : isLoading
                ? "Carregando configuração..."
                : "Gerando conteúdo...")
        }
        description={
          isFetchingCampaigns
            ? "Aguarde enquanto buscamos suas campanhas."
            : generationStatus
            ? "A IA está trabalhando. Isso pode levar alguns instantes."
            : isSaving
            ? "Aguarde um momento, estamos fazendo o upload dos seus arquivos."
            : isLoading
            ? "Estamos desempacotando sua configuração. Quase pronto!"
            : "A IA está pensando e escrevendo. Isso pode levar alguns segundos."
        }
        progress={isSaving ? (uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0) : null}
      />
      <TextEditorDialog
        open={editingField !== null || editingFollowup !== null}
        html={isHtmlField}
        title={
          editingFollowup !== null
            ? `Editar Post de Follow-up ${editingFollowup.index + 1}`
            : `Editar ${
                {
                  conteudo: 'Conteúdo',
                  conteudoMedio: 'Conteúdo Médio',
                  conteudoPequeno: 'Conteúdo Pequeno',
                  conteudoFormatado: 'Conteúdo Formatado',
                  cta: 'CTA',
                }[editingField] || editingField || 'Conteúdo'
              }`
        }
        content={
          (() => {
            if (editingFollowup) return editingFollowup.content;
            if (!editingField) return '';

            // Step 1: Campaign content
            if (activeStep === 1) {
              return campaignContent ? campaignContent[editingField] || '' : '';
            }

            // Step 3: Image/Formatting step (from CSV)
            if (activeStep === 3) {
              const currentRecord = csvData[currentPreviewIndex];
              return currentRecord ? currentRecord[editingField] || '' : '';
            }

            return '';
          })()
        }
        onSave={
          (newContent) => {
            if (editingFollowup) {
              handleSaveFollowup(newContent);
            } else if (editingField) {
              if (activeStep === 1) {
                setCampaignContent((prev) => ({ ...prev, [editingField]: newContent }));
              } else if (activeStep === 3) {
                const updatedCsvData = csvData.map((row, index) => {
                  if (index === currentPreviewIndex) {
                    return { ...row, [editingField]: newContent };
                  }
                  return row;
                });
                handleCsvRecordContentUpdate(updatedCsvData);
              }
            }
          }
        }
        onClose={() => {
          setEditingField(null);
          setEditingFollowup(null);
          setIsHtmlField(false);
        }}
      />
    </ThemeProvider>
  );
}

export default HomePage;
