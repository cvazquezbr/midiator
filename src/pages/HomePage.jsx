// Re-submitting the fix for the persona saving bug.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Container, Paper, Typography, Box, Button, Grid, Card, CardContent, Alert, Stepper, Step, StepLabel, StepContent, Chip, IconButton, Tooltip, ToggleButton, ToggleButtonGroup, TextField, Link as MuiLink, Fab, FormControl, InputLabel, Select, Accordion, AccordionSummary, AccordionDetails, Toolbar, Divider, Drawer, List, ListItemButton, ListItemText, CircularProgress,
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
import { getPersonas, savePersona, updatePersona } from '../utils/personaState';
import { getAutores } from '../utils/autorState';

import MyCampaignsStep from '../components/MyCampaignsStep';
import PersonasPage from './PersonasPage';
import AutoresPage from './AutoresPage';
import MainAppBar from '../components/MainAppBar';
import Sidebar from '../components/Sidebar';
import FieldPositioner from '../components/FieldPositioner';
import FormattingPanel from '../components/FormattingPanel';
import FormattingDrawer from '../components/FormattingDrawer';
import PageGeneratorFrontendOnly from '../components/PageGeneratorFrontendOnly';
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
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';


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

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}).join('');

const defaultBackgroundElement = {
  id: '__background__',
  type: 'background',
  src: null,
  visible: true,
  rotation: 0,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  crop: null,
  // Background-specific properties
  backgroundType: 'color', // 'color', 'gradient', or 'image'
  backgroundColor: '#FFFFFF',
  gradient: null, // Initialized as null, created on-demand
  // Filters
  filters: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    blur: 0,
    opacity: 100
  },
  // Shadow
  shadow: false,
  shadowColor: '#000000',
  shadowBlur: 10,
  shadowOffsetX: 5,
  shadowOffsetY: 5,
};

function HomePage() {
  const { user, googleAccessToken, setGoogleAccessToken } = useUserAuth();
  const { settings, updateSetting, saveSettings } = useSettings();

  // Component State
  const [personaList, setPersonaList] = useState([]);
  const [autorList, setAutorList] = useState([]);
  const [currentView, setCurrentView] = useState('campaigns');
  const [activeStep, setActiveStep] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [personaDrawerOpen, setPersonaDrawerOpen] = useState(!isMobile);
  const [autorDrawerOpen, setAutorDrawerOpen] = useState(!isMobile);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [colorPalette, setColorPalette] = useState([]);
  const [standardsColors, setStandardsColors] = useState([]);
  const [problema, setProblema] = useState('');
  const [solucao, setSolucao] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [tomDeVoz, setTomDeVoz] = useState('');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [campaignContent, setCampaignContent] = useState(null);
  const [campaignGenerationFailed, setCampaignGenerationFailed] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [isHtmlField, setIsHtmlField] = useState(false);
  const [formato, setFormato] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generatedPageUrl, setGeneratedPageUrl] = useState(null);
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(true);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [initialFieldStyles, setInitialFieldStyles] = useState({});
  const [templateFieldStyles, setTemplateFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const [generatedPagesData, setGeneratedPagesData] = useState([]);
  const [generatedAudioData, setGeneratedAudioData] = useState([]);
  const [generatedVideosData, setGeneratedVideosData] = useState([]);
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [brandElements, setBrandElements] = useState([]);
  const [backgroundElement, setBackgroundElement] = useState(defaultBackgroundElement);
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

  const [selectedPersonaForCampaign, setSelectedPersonaForCampaign] = useState('');
  const [selectedAutorForCampaign, setSelectedAutorForCampaign] = useState('');

  // State for unsaved changes guard
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);


  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Use a ref to hold the latest campaignContent to avoid stale state in callbacks.
  const campaignContentRef = useRef(campaignContent);
  campaignContentRef.current = campaignContent;

    // --- Navigation Guard Logic ---
    const handleNavigation = (targetAction) => {
        // TODO: This guard should be adapted to handle unsaved changes in the campaign view as well.
        // For now, it only blocks navigation away from the persona page.
        // A more robust solution would involve a context or a more generic dirty flag.
        targetAction();
    };

    const handleDialogClose = () => {
        setShowUnsavedDialog(false);
        setNavigationTarget(null);
    };

    const handleDialogDiscard = () => {
        setShowUnsavedDialog(false);
        if (navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

    const handleDialogSaveAndNavigate = async () => {
        // This needs to be implemented for the campaign saving logic if we adapt the dialog.
        // const success = await handleSaveCampaign();
        setShowUnsavedDialog(false);
        // if (success && navigationTarget) {
        //     navigationTarget();
        // }
        setNavigationTarget(null);
    };


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
    setGeneratedPagesData(Array.isArray(state.generatedPagesData) ? state.generatedPagesData : []);
    // FIX: Filter out invalid audio data on load to prevent crashes
    setGeneratedAudioData(
      Array.isArray(state.generatedAudioData)
        ? state.generatedAudioData.filter(a => a && typeof a.duration === 'number')
        : []
    );
    setGeneratedVideosData(Array.isArray(state.generatedVideosData) ? state.generatedVideosData : []);
    setBrandElements(Array.isArray(state.brandElements) ? state.brandElements : []);

    // Logic to load background image and its associated element state correctly.
    const loadedBackground = state.backgroundElement;

    if (loadedBackground) {
      // Merge loaded data with defaults to ensure all properties exist
      const mergedBackground = {
        ...defaultBackgroundElement,
        ...loadedBackground,
        filters: {
          ...defaultBackgroundElement.filters,
          ...(loadedBackground.filters || {}),
        },
        gradient: loadedBackground.gradient ? {
          ...defaultBackgroundElement.gradient,
          ...loadedBackground.gradient,
        } : defaultBackgroundElement.gradient,
      };

      // Handle legacy campaigns that only had `backgroundImage`
      if (!mergedBackground.src && state.backgroundImage) {
        mergedBackground.src = state.backgroundImage;
      }

      // If there's a src, let updateImageAndPalette handle setting the state
      // as it needs to load the image to get dimensions, etc.
      if (mergedBackground.src) {
        updateImageAndPalette(mergedBackground.src, mergedBackground);
      } else {
        setBackgroundElement(mergedBackground);
      }
    } else if (state.backgroundImage) {
      // Legacy case: only backgroundImage is present
      updateImageAndPalette(state.backgroundImage, { ...defaultBackgroundElement, src: state.backgroundImage });
    } else {
      // No background info in the loaded state, reset to the default
      setBackgroundElement(defaultBackgroundElement);
    }

    setProblema(state.problema ?? '');
    setSolucao(state.solucao ?? '');
    setObjetivo(state.objetivo ?? '');
    setTomDeVoz(state.tomDeVoz ?? '');
    setCampaignContent(state.campaignContent ?? null);
    setFormato(state.formato ?? '');
    setAspectRatio(state.aspectRatio ?? '1:1');
    setGeneratedPageUrl(state.generatedPageUrl ?? null);
    setFollowupPostsQuantity(state.followupPostsQuantity ?? 5);
    setIsScheduled(state.isScheduled ?? false);
    setScheduleDate(state.scheduleDate ? new Date(state.scheduleDate) : new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
    setWeeklySchedule(state.weeklySchedule ?? {});
    setSelectedProfile(state.selectedProfile ?? '');
    setSelectedImages(state.selectedImages ?? {});
    setSelectedVideos(state.selectedVideos ?? {});
    setInputMethod(state.inputMethod ?? 'ia');
    // Default to 5, which matches the slider's max value in PostsCurtosStep.
    setPromptNumRecords(state.promptNumRecords ?? 5);
    setPromptText(state.promptText ?? '');
    setFieldPositions(state.fieldPositions ?? {});
    setTemplateFieldStyles(state.templateFieldStyles ?? {});

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
    setInitialFieldStyles(completeStyles);

    setDisplayedImageSize(state.displayedImageSize ?? { width: 0, height: 0 });
    setOriginalImageSize(state.originalImageSize ?? { width: 0, height: 0 });
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
      objetivo,
      tomDeVoz,
      campaignContent,
      formato,
      aspectRatio,
      followupPosts,
      followupPostsQuantity,
      fieldPositions,
      fieldStyles,
      templateFieldStyles,
      brandElements,
      backgroundElement,
      generatedPageUrl,
      generatedPagesData,
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
        const updated = await updateCampaign(currentCampaign.id, name, campaignDataToSave, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign);
        toast.success(`Campaign "${name}" updated.`);
        setCurrentCampaign(updated);
      } else {
        console.log(`[HomePage] Saving new campaign.`);
        const newCampaign = await saveCampaign(name, campaignDataToSave, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign);
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
      console.log("Loaded campaign data from DB:", loadedCampaign);

      // Apply the general state from campaign_data
      applyAppState(loadedCampaign.campaign_data);

      // Explicitly set the author and persona IDs from the top-level of the loaded campaign
      setSelectedAutorForCampaign(loadedCampaign.autor_id || '');
      setSelectedPersonaForCampaign(loadedCampaign.persona_id || '');

      setCurrentCampaign({ id: loadedCampaign.id, name: loadedCampaign.name });
      toast.success(`Campaign "${loadedCampaign.name}" loaded successfully!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaignStandards = useCallback(() => {
    const { formato: formatoData, colors: colorsData } = getCampaignPrompt();
    setFormato(formatoData || '');
    setStandardsColors(colorsData || []);
  }, []);

  useEffect(() => {
    loadCampaignStandards();
    const apiKey = getGeminiApiKey();
    if (apiKey) geminiAPI.initialize(apiKey);
  }, [loadCampaignStandards]);

  const fetchPersonasForCampaign = useCallback(() => {
    return getPersonas()
      .then(setPersonaList)
      .catch(err => {
        console.error("Failed to fetch personas for campaign step:", err);
        toast.error('Could not load personas for campaign dropdown.');
      });
  }, []);

  const fetchAutoresForCampaign = useCallback(() => {
    return getAutores()
      .then(setAutorList)
      .catch(err => {
        console.error("Failed to fetch autores for campaign step:", err);
        toast.error('Could not load autores for campaign dropdown.');
      });
  }, []);

  useEffect(() => {
    // Fetch personas for the campaign step dropdown
    if (user) {
      fetchPersonasForCampaign();
      fetchAutoresForCampaign();
    }
  }, [user, fetchPersonasForCampaign, fetchAutoresForCampaign]);

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
        setActiveStep(1);
      } finally {
        setIsFetchingCampaigns(false);
      }
    };

    if (user) {
      checkCampaignsAndSetInitialStep();
    } else {
      setActiveStep(null);
      setIsFetchingCampaigns(false);
    }
  }, [user]);


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
    console.log('[HomePage] backgroundElement state changed:', backgroundElement);
  }, [backgroundElement]);

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
            await saveSettings();
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
  }, [settings.linkedin, updateSetting, saveSettings]);

  const steps = [ { label: 'Minhas Campanhas', description: 'Gerencie suas campanhas existentes ou crie uma nova.', icon: FolderOpenIcon }, { label: 'Campanha', description: 'Criar o material de referência para a campanha.', icon: CampaignIcon }, { label: 'Posts Curtos', description: 'Gere, carregue ou edite os posts para redes sociais.', icon: InsertDriveFileOutlined }, { label: 'Imagem e Formatação', description: 'Carregue a imagem de fundo, posicione os campos e configure a formatação.', icon: ImageIcon }, { label: 'Gerar Páginas', description: 'Gere as páginas finais.', icon: FormatBold }, { label: 'Gerar Áudio', description: 'Crie a narração para os slides.', icon: Audiotrack }, { label: 'Gerar Vídeo', description: 'Crie um vídeo a partir das imagens geradas.', icon: Movie }, { label: 'Publicar', description: 'Publique o conteúdo no WordPress.', icon: Publish }, { label: 'Monitorar', description: 'Acompanhe as estatísticas de suas publicações.', icon: BarChart } ];
  const handleCreateNewCampaign = () => {
    applyAppState({});
    setCurrentCampaign(null);
    // Also explicitly reset the background element to the default state for a new campaign
    setBackgroundElement(defaultBackgroundElement);
    setActiveStep(1);
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
          fieldPositions: {},
          fieldStyles: {},
          csvData: newCsvData,
          effectiveImageSize: originalImageSize,
          standardsColors,
        });

        setFieldPositions(newPositions);
        setFieldStyles(newStyles);
        setInitialFieldStyles(newStyles);
        setInputMethod('manual');
      }
    } catch (error) {
      toast.error(error.message || 'Ocorreu um erro desconhecido ao processar o arquivo CSV.');
    }
  };
  const handleCSVUpload = (event) => { const file = event.target.files[0]; parseCsvFile(file); };
  const handleDrop = (event) => { event.preventDefault(); event.stopPropagation(); const file = event.dataTransfer.files[0]; parseCsvFile(file); };
  const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
  const updateImageAndPalette = useCallback((imageUrl, existingBackgroundElement = null) => {
    console.log('[HomePage] updateImageAndPalette called.', {
      hasImageUrl: !!imageUrl,
      hasExistingBackgroundElement: !!existingBackgroundElement
    });
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      setOriginalImageSize({ width: img.width, height: img.height });
      if (existingBackgroundElement) {
        // Ensure the new imageUrl is always set, even on an existing element
        setBackgroundElement({ ...existingBackgroundElement, src: imageUrl });
      } else {
        // FIX: The src property was missing, causing the image not to appear
        setBackgroundElement({
          id: '__background__',
          type: 'background',
          src: imageUrl,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          visible: true,
          filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 },
          shadow: false,
          shadowColor: '#000000',
          shadowBlur: 10,
          shadowOffsetX: 5,
          shadowOffsetY: 5,
          crop: null,
        });
      }
      try {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 5);
        setColorPalette(palette.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2])));
      } catch (error) {
        console.error("Error extracting color palette:", error);
        setColorPalette([]);
      }
    };
    img.onerror = (err) => {
      console.error("Error loading image to extract colors:", err);
      setColorPalette([]);
      setBackgroundElement(null);
    };
    img.src = imageUrl;
  }, []);
  const parseImageFile = (file) => {
    if (!file) return;
    handleBackgroundImageUpload(file);
  };
  const handleImageUpload = (event) => { const file = event.target.files[0]; parseImageFile(file); };
  const handleImageDrop = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); const file = event.dataTransfer.files[0]; parseImageFile(file); };
  const handleImageDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
  const handleImageDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(true); };
  const handleImageDragLeave = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); };

  const handleBackgroundImageUpload = async (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;

      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 720;
        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round(height * (MAX_DIMENSION / width));
            width = MAX_DIMENSION;
          } else {
            width = Math.round(width * (MAX_DIMENSION / height));
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const resizedDataUrl = canvas.toDataURL(file.type);

        updateImageAndPalette(resizedDataUrl, null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // TODO: Move the Google Drive upload to a separate, user-initiated action
    // to avoid unconditional uploads. For now, the logic is disabled.
    /*
    const toastId = toast.loading("Salvando imagem na sua biblioteca do Google Drive (opcional)...");
    try {
      if (!googleAccessToken) {
        toast.info("Conecte sua conta Google para salvar a imagem na sua biblioteca.", { id: toastId });
        return;
      }

      let midiatorFolder = await findFolderByName('midiator');
      if (!midiatorFolder) {
        midiatorFolder = await createFolder('midiator');
      }

      let backgroundsFolder = await findFolderByName('backgrounds', midiatorFolder.id);
      if (!backgroundsFolder) {
        backgroundsFolder = await createFolder('backgrounds', midiatorFolder.id);
      }

      let uploadedFile;
      const existingFile = await findFileByNameInFolder(file.name, backgroundsFolder.id);
      if (existingFile) {
        toast.info(`Imagem "${file.name}" já existe na sua biblioteca do Google Drive.`, { id: toastId });
        uploadedFile = existingFile;
      } else {
        uploadedFile = await uploadFile(file, file.name, backgroundsFolder.id);
        toast.success(`Imagem "${file.name}" salva na sua biblioteca do Google Drive!`, { id: toastId });
      }

      if (!uploadedFile || !uploadedFile.id) {
        throw new Error("O upload do arquivo para o Drive falhou.");
      }

      const permanentUrl = `https://lh3.googleusercontent.com/d/${uploadedFile.id}`;
      setBackgroundImage(permanentUrl);
      setBackgroundElement(prev => {
        if (prev) {
          return { ...prev, src: permanentUrl };
        }
        return null; // Should not happen if onload has fired
      });

    } catch (err) {
      console.error("Failed to upload and set background image to Google Drive:", err);
      toast.error(`Falha ao salvar no Google Drive: ${err.message}`, { id: toastId });
    }
    */
  };

  const handleNext = () => {
    handleNavigation(() => {
      if (activeStep === 3) {
        console.log("[HomePage] Snapshotting styles from step 3 to templateFieldStyles");
        setTemplateFieldStyles(fieldStyles);
      }
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    });
  };
  const handleBack = () => {
    handleNavigation(() => setActiveStep((prevActiveStep) => prevActiveStep - 1));
  };
  const canProceedToStep = (step) => {
    switch (step) {
      case 1: return true;
      case 2: return campaignContent !== null;
      case 3: return csvData.length > 0;
      case 4: return true; // Always allow proceeding to formatting step
      case 5: if (generatedPagesData.length === 0 || !generatedPagesData.every(img => img.blob)) { toast.error("Por favor, gere todas as páginas na etapa 4 antes de prosseguir."); return false; } return true;
      default: return true;
    }
  };
  const getFieldStats = () => { const visibleFields = Object.values(fieldPositions).filter(pos => pos.visible).length; const totalFields = csvHeaders.length; const styledFields = Object.keys(fieldStyles).length; return { visibleFields, totalFields, styledFields }; };
  const { visibleFields, totalFields, styledFields } = getFieldStats();
  const handleZIndexChange = (elementId, action) => { if (!elementId) return; let allElements = [ ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, isBrand: false })), ...brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, isBrand: true })), ]; allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)); const currentIndex = allElements.findIndex(el => el.id === elementId); if (currentIndex === -1) return; const [currentElement] = allElements.splice(currentIndex, 1); switch (action) { case 'front': allElements.push(currentElement); break; case 'back': allElements.unshift(currentElement); break; case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement); break; case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement); break; default: allElements.splice(currentIndex, 0, currentElement); return; } const newPositions = { ...fieldPositions }; const newBrandElements = [...brandElements]; allElements.forEach((el, index) => { el.zIndex = index; if (el.isBrand) { const brandEl = newBrandElements.find(b => b.id === el.id); if (brandEl) brandEl.zIndex = index; } else { if (newPositions[el.id]) { newPositions[el.id].zIndex = index; } } }); setFieldPositions(newPositions); setBrandElements(newBrandElements); };
  const handleSidebarStepClick = (index) => {
    handleNavigation(() => {
      setActiveStep(index);
      if (isMobile) {
        setSidebarOpen(false);
      }
    });
  };
  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    setCsvData(novosRegistros);
    // A atualização de colunas é mantida para o caso de adição/remoção de colunas.
    if (JSON.stringify(novasColunas) !== JSON.stringify(csvHeaders)) {
        setCsvHeaders(novasColunas);
    }

    // A lógica de reposicionamento e re-estilização foi removida daqui
    // para evitar que a edição de um simples campo de texto reorganize a UI inteira.
    // Essa lógica agora deve ser chamada explicitamente quando as colunas mudam.

    // A atualização dos dados das páginas geradas é mantida para consistência.
    setGeneratedPagesData(prevGeneratedPages => {
        const newGeneratedPages = novosRegistros.map((record, index) => {
            const existingPage = prevGeneratedPages.find(img => img.index === index);
            if (existingPage) {
                return { ...existingPage, record: record };
            }
            return {
                index,
                record,
                blob: null,
                url: null,
                filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
                customFieldPositions: null,
                customFieldStyles: null,
                customBrandElements: null,
                customImageFilters: null,
                fontScale: 1,
            };
        });
        return newGeneratedPages;
    });
  }, [csvHeaders]);
  const handleCsvRecordContentUpdate = useCallback((newCsvData) => {
    setCsvData(newCsvData);
    // Esta função é chamada ao editar texto diretamente na thumbnail (ImageStep)
    // e precisa atualizar os dados das páginas também.
    setGeneratedPagesData(prevGeneratedPages => {
        const newGeneratedPages = newCsvData.map((record, index) => {
            const existingPage = prevGeneratedPages.find(img => img.index === index);
            if (existingPage) {
                return { ...existingPage, record: record };
            }
            // Retorna um novo objeto se não houver página existente.
            return {
                index,
                record,
                blob: null,
                url: null,
                filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
                customFieldPositions: null,
                customFieldStyles: null,
                customBrandElements: null,
                customImageFilters: null,
                fontScale: 1,
            };
        });
        return newGeneratedPages;
    });
  }, []);
  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => { setCsvData(prevCsvData => { if (recordIndex < 0 || recordIndex >= prevCsvData.length) { return prevCsvData; } return prevCsvData.map((row, idx) => { if (idx === recordIndex) { return updatedRecord; } return row; }); }); }, [setCsvData]);
  const handleGenerateCampaignContent = async (regenerate = false) => {
    setIsGeneratingCampaign(true);
    setCampaignGenerationFailed(false);
    setGenerationError('');
    setGenerationStatus('Iniciando geração de campanha...');

    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';

      setGenerationStatus('Criando o conteúdo geral da campanha...');
      const normalizedContent = await generateCampaignContent({ problema, solucao, objetivo, tomDeVoz, persona: finalPersona, autor: finalAutor });
      if (!normalizedContent) {
        throw new Error("A geração do conteúdo principal falhou e não retornou dados.");
      }
      setCampaignContent(normalizedContent);

      if (regenerate) {
        toast.success("Conteúdo principal da campanha foi regenerado.");
        return;
      }

      setFollowupPosts([]);

      setGenerationStatus('Gerando resumos...');
      await Promise.all([
        handleGenerateSummary(1800, normalizedContent),
        handleGenerateSummary(130, normalizedContent),
      ]);

      toast.success("Campanha gerada com sucesso!");

    } catch (error) {
      const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
      toast.error(`Ocorreu um erro ao gerar o conteúdo da campanha: ${errorMessage}`);
      setCampaignContent(null);
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
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || autor;
      const imagePrompt = await generateCampaignImagePrompt({ content: finalContent, aspectRatio, autor: finalAutor });
      const imageUrl = await generateCampaignImage({ prompt: imagePrompt, aspectRatio });
      console.log('[HomePage] DIAGNOSTIC: handleGenerateImage succeeded. Setting generatedPageUrl. Value starts with:', String(imageUrl).substring(0, 100));
      setGeneratedPageUrl(imageUrl);
      updateImageAndPalette(imageUrl);
      return true;
    } catch (imageError) {
      toast.error(`Ocorreu um erro ao gerar a imagem da campanha: ${imageError.message}`);
      console.log('[HomePage] DIAGNOSTIC: handleGenerateImage failed. Setting generatedPageUrl to null.');
      setGeneratedPageUrl(null);
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
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || persona;
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || autor;
      const neededQuantity = followupPostsQuantity - followupPosts.length;
      const plan = await generateFollowupPlan({
        content,
        neededQuantity,
        existingPosts: followupPosts,
        persona: finalPersona,
        autor: finalAutor,
      });
      const newPosts = await generateFollowupPosts({ content, plan, persona: finalPersona, autor: finalAutor });
      setFollowupPosts(prevPosts => [...prevPosts, ...newPosts]);
    } catch (error) {
      toast.error(`Ocorreu um erro ao gerar os posts de follow-up: ${error.message}`);
    } finally {
      setIsGeneratingFollowup(false);
    }
  };
  const handleResetCampaign = () => {
    console.log('[HomePage] DIAGNOSTIC: handleResetCampaign called. Setting generatedPageUrl to null.');
    setCampaignContent(null);
    setGeneratedPageUrl(null);
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

      const { newPositions: updatedFieldPositions, newStyles: updatedFieldStyles } = autoArrangeFields({
        csvHeaders: csvHeadersResult,
        fieldPositions: {},
        fieldStyles: {},
        csvData: csvDataResult,
        effectiveImageSize: originalImageSize,
        standardsColors,
      });

      const newGeneratedPagesData = csvDataResult.map((record, index) => ({
        index,
        record,
        blob: null,
        url: null,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        customFieldPositions: null,
        customFieldStyles: null,
        customBrandElements: null,
        customImageFilters: null,
        fontScale: 1,
      }));

      setCsvData(csvDataResult);
      setCsvHeaders(csvHeadersResult);
      setFieldPositions(updatedFieldPositions);
      setFieldStyles(updatedFieldStyles);
      setInitialFieldStyles(updatedFieldStyles);
      setGeneratedPagesData(newGeneratedPagesData);
      setInputMethod('manual');

      // A geração de imagens foi movida para a etapa "Gerar Páginas" a pedido do usuário.
      toast.success('Geração de posts concluída. Prossiga para a próxima etapa para gerar as imagens.');
    } catch (error) {
      toast.error(`Erro ao gerar conteúdo com IA: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleGenerateSinglePage = async (record, index, fontScale = 1) => {
    const imagePrompt = record.prompt_imagem_carrossel;

    let composingElement = backgroundElement;
    let pageUpdateData = {};

    if (imagePrompt && imagePrompt.trim() !== '') {
      setGenerationStatus(`Gerando imagem para o post ${index + 1}...`);
      try {
        const uniqueImageUrl = await generateCampaignImage({ prompt: imagePrompt, aspectRatio });

        const tempBackgroundElement = {
          ...(backgroundElement || {}),
          id: '__background__',
          src: uniqueImageUrl,
        };
        composingElement = tempBackgroundElement;

        pageUpdateData.customBackgroundElement = tempBackgroundElement;

      } catch (error) {
        toast.error(`Falha ao gerar imagem para o post #${index + 1}: ${error.message}`);
      }
    }

    setGenerationStatus(`Gerando página para o post ${index + 1}/${csvData.length}...`);
    try {
      const finalPageData = await composeSingleImage({
        record: record,
        index: index,
        brandElements,
        fieldPositions,
        fieldStyles,
        aspectRatio,
        backgroundElement: composingElement,
        fontScale,
      });

      setGeneratedPagesData(currentPagesData => {
        const newPagesData = [...currentPagesData];
        const existingPageData = newPagesData[index] || {};
        newPagesData[index] = { ...existingPageData, ...finalPageData, ...pageUpdateData };
        return newPagesData;
      });

      toast.success(`Página final para o post #${index + 1} gerada.`);
      return true;
    } catch (error) {
      console.error(`Error during page generation for post ${index + 1}:`, error);
      toast.error(`Falha na geração para o post #${index + 1}: ${error.message}`);
      return false;
    } finally {
      setGenerationStatus('');
    }
  };
  const currentTheme = darkMode ? darkTheme : lightTheme;
  const campaignData = { problema, solucao, objetivo, tomDeVoz, campaignContent, formato, aspectRatio, followupPosts, colors: standardsColors, };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <MainAppBar
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setShowSetupModal={setShowSetupModal}
            setShowCampaignStandardsModal={setShowCampaignStandardsModal}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            isMobile={isMobile}
            onSaveCampaign={() => setShowSaveModal(true)}
            onLoadCampaign={() => setShowLoadModal(true)}
            onShowPersonas={() => handleNavigation(() => setCurrentView('personas'))}
            onShowAutores={() => handleNavigation(() => setCurrentView('autores'))}
            onShowCampaigns={() => handleNavigation(() => setCurrentView('campaigns'))}
            currentView={currentView}
            onPersonaMenuClick={() => setPersonaDrawerOpen(!personaDrawerOpen)}
            onAutorMenuClick={() => setAutorDrawerOpen(!autorDrawerOpen)}
            isDrawerOpen={currentView === 'personas' ? personaDrawerOpen : currentView === 'autores' ? autorDrawerOpen : sidebarOpen}
        />
        {currentView === 'campaigns' && (
          <>
            <Sidebar sidebarOpen={sidebarOpen} darkMode={darkMode} steps={steps} activeStep={activeStep} setActiveStep={setActiveStep} csvData={csvData} backgroundImageSrc={backgroundElement?.src} visibleFields={visibleFields} totalFields={totalFields} styledFields={styledFields} variant={isMobile ? 'temporary' : 'persistent'} onClose={() => setSidebarOpen(false)} onStepClick={handleSidebarStepClick} />
            {!isMobile && <Fab size="small" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'} sx={{ position: 'fixed', top: '50%', left: sidebarOpen ? 320 - 20 : 0, transform: 'translateY(-50%)', zIndex: (theme) => theme.zIndex.drawer + 1, transition: 'left 0.2s ease-in-out', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: 'background.default' } }} >{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}</Fab>}
          </>
        )}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, transition: theme.transitions.create('margin', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }) }} >
          <Toolbar />
            {currentView === 'campaigns' && (
              <>
                {activeStep === 0 && (
                  <MyCampaignsStep
                    onLoadCampaign={handleLoadCampaign}
                    onEditCampaign={handleEditCampaign}
                    onCreateNew={handleCreateNewCampaign}
                  />
                )}
                {activeStep === 1 && (
                  <Container maxWidth="lg">
                    <Campaign
                      steps={steps}
                      activeStep={activeStep}
                      {...campaignData}
                      setProblema={setProblema}
                      setSolucao={setSolucao}
                      objetivo={objetivo}
                      setObjetivo={setObjetivo}
                      tomDeVoz={tomDeVoz}
                      setTomDeVoz={setTomDeVoz}
                      isGeneratingCampaign={isGeneratingCampaign}
                      campaignGenerationFailed={campaignGenerationFailed}
                      generationError={generationError}
                      handleGenerateCampaignContent={handleGenerateCampaignContent}
                      handleResetCampaign={handleResetCampaign}
                      handleExportHtml={() => exportHtml(campaignData)}
                      editingField={editingField}
                      setEditingField={(field) => {
                        setEditingField(field);
                        setIsHtmlField(field === 'conteudoFormatado');
                      }}
                      isGeneratingSummaryMedio={isGeneratingSummaryMedio}
                      handleGenerateSummary={handleGenerateSummary}
                      isGeneratingSummaryPequeno={isGeneratingSummaryPequeno}
                      isGeneratingConteudoFormatado={isGeneratingConteudoFormatado}
                      handleGenerateFormattedContent={handleGenerateFormattedContent}
                      isGeneratingFollowup={isGeneratingFollowup}
                      handleGenerateFollowupPosts={handleGenerateFollowupPosts}
                      generatedPageUrl={generatedPageUrl}
                      isGeneratingImage={isGeneratingImage}
                      handleGenerateImage={handleGenerateImage}
                      setCampaignContent={setCampaignContent}
                      onEditFollowup={handleEditFollowup}
                      followupPostsQuantity={followupPostsQuantity}
                      setFollowupPostsQuantity={setFollowupPostsQuantity}
                      setAspectRatio={setAspectRatio}
                      autorList={autorList}
                      selectedAutorForCampaign={selectedAutorForCampaign}
                      setSelectedAutorForCampaign={setSelectedAutorForCampaign}
                      personaList={personaList}
                      selectedPersonaForCampaign={selectedPersonaForCampaign}
                      setSelectedPersonaForCampaign={setSelectedPersonaForCampaign}
                    />
                  </Container>
                )}
                {activeStep === 2 && (
                  <PostsCurtosStep
                    steps={steps}
                    inputMethod={inputMethod}
                    setInputMethod={setInputMethod}
                    handleDrop={handleDrop}
                    handleDragOver={handleDragOver}
                    fileInputRef={fileInputRef}
                    handleCSVUpload={handleCSVUpload}
                    downloadExampleCsv={downloadExampleCsv}
                    setShowSetupModal={setShowSetupModal}
                    promptNumRecords={promptNumRecords}
                    setPromptNumRecords={setPromptNumRecords}
                    promptText={promptText}
                    setPromptText={setPromptText}
                    handleGenerateIAContent={handleGenerateIAContent}
                    isGenerating={isGenerating}
                    csvData={csvData}
                    csvHeaders={csvHeaders}
                    onDadosAlterados={handleDadosAlterados}
                    darkMode={darkMode}
                    exportCsv={exportCsv}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                  />
                )}
                {activeStep === 3 && (
                  <ImageStep
                    aspectRatio={aspectRatio}
                    steps={steps}
                    isDraggingOverImage={isDraggingOverImage}
                    handleImageDrop={handleImageDrop}
                    handleImageDragOver={handleImageDragOver}
                    handleImageDragEnter={handleImageDragEnter}
                    handleImageDragLeave={handleImageDragLeave}
                    imageInputRef={imageInputRef}
                    handleImageUpload={handleImageUpload}
                    onChangeBackgroundImage={() => setShowBgSelector(true)}
                    csvHeaders={csvHeaders}
                    fieldPositions={fieldPositions}
                    setFieldPositions={setFieldPositions}
                    fieldStyles={fieldStyles}
                    initialFieldStyles={initialFieldStyles}
                    setFieldStyles={setFieldStyles}
                    csvData={csvData}
                    onImageDisplayedSizeChange={setDisplayedImageSize}
                    colorPalette={colorPalette}
                    standardsColors={standardsColors}
                    onCsvDataUpdate={handleCsvRecordContentUpdate}
                    originalImageSize={originalImageSize}
                    brandElements={brandElements}
                    setBrandElements={setBrandElements}
                    backgroundElement={backgroundElement}
                    setBackgroundElement={setBackgroundElement}
                    onZIndexChange={handleZIndexChange}
                    isMobile={isMobile}
                    selectedField={selectedField}
                    setSelectedField={setSelectedField}
                    onDeselectField={() => setSelectedField(null)}
                    onOpenHtmlEditor={(fieldId) => {
                      setEditingField(fieldId);
                    }}
                    currentPreviewIndex={currentPreviewIndex}
                    setCurrentPreviewIndex={setCurrentPreviewIndex}
                    onFontScaleChange={setFontScale}
                    templateFieldStyles={templateFieldStyles}
                    activeStep={activeStep}
                  />
                )}
                {activeStep === 4 && (
                  <PageGeneratorFrontendOnly
                    csvData={csvData}
                    fieldPositions={fieldPositions}
                    fieldStyles={fieldStyles}
                    displayedImageSize={displayedImageSize}
                    csvHeaders={csvHeaders}
                    colorPalette={colorPalette}
                    standardsColors={standardsColors}
                    setGeneratedPagesData={setGeneratedPagesData}
                    initialGeneratedPagesData={generatedPagesData}
                    onThumbnailRecordTextUpdate={handleThumbnailRecordTextUpdate}
                    originalImageSize={originalImageSize}
                    brandElements={brandElements}
                    onBrandElementsChange={setBrandElements}
                    fontScale={fontScale}
                    handleGenerateSinglePage={handleGenerateSinglePage}
                    aspectRatio={aspectRatio}
                    backgroundElement={backgroundElement}
                  />
                )}
                {activeStep === 5 && (
                  <AudioGenerator
                    csvData={csvData}
                    fieldPositions={fieldPositions}
                    onAudiosGenerated={setGeneratedAudioData}
                    initialAudioData={generatedAudioData}
                  />
                )}
                {activeStep === 6 && (
                  <VideoGenerator2
                    generatedPages={generatedPagesData}
                    generatedAudioData={generatedAudioData}
                    onVideoGenerated={(videoData) => setGeneratedVideosData(videoData)}
                  />
                )}
                {activeStep === 7 && (
                  <Publisher
                    settings={settings}
                    campaignContent={campaignContent}
                    generatedPagesData={generatedPagesData}
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
                    currentCampaign={currentCampaign}
                  />
                )}
                {activeStep === 8 && <Monitor currentCampaign={currentCampaign} />}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} ><Button onClick={handleBack} disabled={activeStep === 0} variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Anterior</Button><Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300', transition: 'all 0.3s ease' }} />))}</Box><Button onClick={handleNext} disabled={isGenerating || activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)} variant="contained" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Próximo</Button></Box>
              </>
            )}
            {currentView === 'personas' && <PersonasPage personaDrawerOpen={personaDrawerOpen} setPersonaDrawerOpen={setPersonaDrawerOpen} onNoPersonaSelected={() => setPersonaDrawerOpen(true)} onUpdate={fetchPersonasForCampaign} />}
            {currentView === 'autores' && <AutoresPage autorDrawerOpen={autorDrawerOpen} setAutorDrawerOpen={setAutorDrawerOpen} onNoAutorSelected={() => setAutorDrawerOpen(true)} onUpdate={fetchAutoresForCampaign} />}
        </Box>
      </Box>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onClose={handleDialogClose}
        onConfirmDiscard={handleDialogDiscard}
        onConfirmSave={handleDialogSaveAndNavigate}
      />
      <SetupModal open={showSetupModal} onClose={() => setShowSetupModal(false)} />
      <SaveCampaignModal open={showSaveModal} onClose={() => setShowSaveModal(false)} onSave={handleSaveCampaign} campaignToEdit={currentCampaign} isSaving={isSaving} />
      <LoadCampaignModal open={showLoadModal} onClose={() => setShowLoadModal(false)} onLoad={handleLoadCampaign} onEdit={(campaign) => { setCurrentCampaign(campaign); setShowSaveModal(true); }} />
      <MemorialDescritivoModal open={showMemorialDescritivoModal} onClose={() => setShowMemorialDescritivoModal(false)} campaignData={campaignData} />
      <CampaignStandardsModal open={showCampaignStandardsModal} onClose={() => { setShowCampaignStandardsModal(false); loadCampaignStandards(); }} onGeneratePalette={async (briefing) => { try { const palette = await generateColorPalette(briefing); return palette; } catch (error) { toast.error(error.message || "Ocorreu um erro ao gerar a paleta de cores."); throw error; } }} />
      <BackgroundImageSelector
        open={showBgSelector}
        onClose={() => setShowBgSelector(false)}
        onSelect={handleBackgroundImageUpload}
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

            if (activeStep === 1) {
              return campaignContent ? campaignContent[editingField] || '' : '';
            }

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
      <Toaster richColors theme={darkMode ? 'dark' : 'light'} />
    </ThemeProvider>
  );
}

export default HomePage;
