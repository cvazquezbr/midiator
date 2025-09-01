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
import isEqual from 'lodash.isequal';


import { useUserAuth } from '../context/UserAuthContext';
import { useSettings } from '../context/SettingsContext';
import { loadSettingsFromDb } from '../utils/credentialsManager';
import { getCampaigns, saveCampaign, loadCampaign, updateCampaign } from '../utils/campaignState';
import { checkAuthStatus } from '../utils/auth';
import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';

import MyCampaignsStep from '../components/MyCampaignsStep';
import { PersonaWizardContent, emptyPersonaWizardData } from '../components/PersonaWizard';
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

function HomePage() {
  const { user, googleAccessToken, setGoogleAccessToken } = useUserAuth();
  const { settings, updateSetting, saveSettings } = useSettings();

  // Component State
  const [currentView, setCurrentView] = useState('campaigns');
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
  const [initialFieldStyles, setInitialFieldStyles] = useState({});
  const [templateFieldStyles, setTemplateFieldStyles] = useState({});
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

  // State for Persona View
  const [personaList, setPersonaList] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [personaDrawerOpen, setPersonaDrawerOpen] = useState(!isMobile);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasError, setPersonasError] = useState(null);
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [initialWizardStep, setInitialWizardStep] = useState(0);
  const [selectedPersonaForCampaign, setSelectedPersonaForCampaign] = useState('');

  // State for unsaved changes guard
  const [personaFormData, setPersonaFormData] = useState(null);
  const [isPersonaDirty, setIsPersonaDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);


  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Use a ref to hold the latest campaignContent to avoid stale state in callbacks.
  const campaignContentRef = useRef(campaignContent);
  campaignContentRef.current = campaignContent;

  // Effect for unsaved changes in Persona form
  useEffect(() => {
    if (selectedPersona && personaFormData) {
        const isDirty = !isEqual(selectedPersona.persona_data, personaFormData);
        setIsPersonaDirty(isDirty);
    } else {
        setIsPersonaDirty(false);
    }
  }, [personaFormData, selectedPersona]);


  // Effect for Persona Drawer visibility on resize
  useEffect(() => {
      if (currentView === 'personas') {
        setPersonaDrawerOpen(!isMobile);
      }
  }, [isMobile, currentView]);

  // Effect to load personas when the view is opened
  useEffect(() => {
      if (currentView === 'personas') {
          fetchPersonas();
      }
  }, [currentView]);

  const fetchPersonas = async () => {
      setPersonasLoading(true);
      try {
          const data = await getPersonas();
          setPersonaList(data);
      } catch (err) {
          setPersonasError(err.message);
      } finally {
          setPersonasLoading(false);
      }
  };

  const handleSelectPersona = (p) => {
      setSelectedPersona(p);
      setPersonaFormData(p.persona_data);
      setIsPersonaDirty(false);
      setInitialWizardStep(1);
      if (isMobile) setPersonaDrawerOpen(false);
  };

  const handleNewPersona = () => {
      const newEmptyPersona = { name: '', persona_data: { ...emptyPersonaWizardData } };
      setSelectedPersona(newEmptyPersona);
      setPersonaFormData(newEmptyPersona.persona_data);
      setIsPersonaDirty(false);
      setInitialWizardStep(0);
      if (isMobile) setPersonaDrawerOpen(false);
  };

  const handleSavePersona = async () => {
    if (!personaFormData) {
        toast.error('Não há dados de persona para salvar.');
        return;
    }
    const personaToSave = { ...selectedPersona, name: personaFormData.nome, persona_data: personaFormData };
    if (!personaToSave.name) {
        toast.error('O nome da persona é obrigatório.');
        return;
    }
    setIsSavingPersona(true);
    try {
        const saved = personaToSave.id
            ? await updatePersona(personaToSave.id, personaToSave.name, personaToSave.persona_data)
            : await savePersona(personaToSave.name, personaToSave.persona_data);
        toast.success("Persona salva com sucesso!");
        await fetchPersonas();
        setSelectedPersona(saved);
        setPersonaFormData(saved.persona_data);
        setIsPersonaDirty(false);
        return true; // Indicate success
    } catch (err) {
        toast.error(`Falha ao salvar persona: ${err.message}`);
        return false; // Indicate failure
    } finally {
        setIsSavingPersona(false);
    }
  };

    const handleGeneratePersonaWithAI = async (description, callback) => {
        if (!geminiAPI.isInitialized) {
            const apiKey = getGeminiApiKey();
            if (!apiKey) {
                toast.error('Chave de API do Gemini não configurada.');
                return;
            }
            geminiAPI.initialize(apiKey);
        }
        setIsGeneratingPersona(true);
        const prompt = `Crie um objeto JSON para uma persona de marketing detalhada com base na seguinte descrição: '${description}'. O JSON deve ter as seguintes chaves: 'nome' (string), 'posicaoCargo' (array de strings), 'segmentoEmpresa' (array de strings), 'responsabilidadesChave' (array de strings), 'doresEstrategicos' (array de strings), 'doresOperacionais' (array de strings), 'doresPessoas' (array de strings), 'doresRegulatorios' (array de strings), 'gatilhosCompra' (array de strings), 'barreirasAdocao' (array de strings), 'mentalidadeValores' (string), e 'contextoCultural' (string).`;
        let cleanedResponse = '';
        try {
            const response = await geminiAPI.generateContent(prompt);
            cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
            if (callback) callback(JSON.parse(cleanedResponse));
        } catch (error) {
            console.error("Error generating or parsing persona from AI:", error);
            console.error("AI Response Text:", cleanedResponse); // Log the raw text
            toast.error('Ocorreu um erro ao processar a resposta da IA. Verifique o console para detalhes.');
        } finally {
            setIsGeneratingPersona(false);
        }
    };

    // --- Navigation Guard Logic ---
    const handleNavigation = (targetAction) => {
        if (isPersonaDirty) {
            setNavigationTarget(() => targetAction);
            setShowUnsavedDialog(true);
        } else {
            targetAction();
        }
    };

    const handleDialogClose = () => {
        setShowUnsavedDialog(false);
        setNavigationTarget(null);
    };

    const handleDialogDiscard = () => {
        setShowUnsavedDialog(false);
        setIsPersonaDirty(false);
        if (navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

    const handleDialogSaveAndNavigate = async () => {
        const success = await handleSavePersona();
        setShowUnsavedDialog(false);
        if (success && navigationTarget) {
            navigationTarget();
        }
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
      templateFieldStyles,
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
      console.log("Loaded campaign data from DB:", loadedCampaign);
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
  }, []);

  const steps = [ { label: 'Minhas Campanhas', description: 'Gerencie suas campanhas existentes ou crie uma nova.', icon: FolderOpenIcon }, { label: 'Campanha', description: 'Criar o material de referência para a campanha.', icon: CampaignIcon }, { label: 'Posts Curtos', description: 'Gere, carregue ou edite os posts para redes sociais.', icon: InsertDriveFileOutlined }, { label: 'Imagem e Formatação', description: 'Carregue a imagem de fundo, posicione os campos e configure a formatação.', icon: ImageIcon }, { label: 'Gerar Imagens', description: 'Gere as imagens finais.', icon: FormatBold }, { label: 'Gerar Áudio', description: 'Crie a narração para os slides.', icon: Audiotrack }, { label: 'Gerar Vídeo', description: 'Crie um vídeo a partir das imagens geradas.', icon: Movie }, { label: 'Publicar', description: 'Publique o conteúdo no WordPress.', icon: Publish }, { label: 'Monitorar', description: 'Acompanhe as estatísticas de suas publicações.', icon: BarChart } ];
  const handleCreateNewCampaign = () => {
    applyAppState({});
    setCurrentCampaign(null);
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
  }, []);
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
      case 4: return backgroundImage !== null;
      case 5: if (generatedImagesData.length === 0 || !generatedImagesData.every(img => img.blob)) { toast.error("Por favor, gere todas as imagens na etapa 4 antes de prosseguir."); return false; } return true;
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
    setCsvHeaders(novasColunas);

    const updatedFieldPositions = {};
    const updatedFieldStyles = {};
    const defaultStylesBase = {
      fontFamily: 'Inter', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
      textDecoration: 'none', color: darkMode ? '#FFFFFF' : '#000000', textStroke: false,
      strokeColor: darkMode ? '#000000' : '#FFFFFF', strokeWidth: 2, textShadow: false,
      shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
      textAlign: 'left', verticalAlign: 'top',
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
    setInitialFieldStyles(updatedFieldStyles);

    setGeneratedImagesData(prevGeneratedImages => {
        const newGeneratedImages = novosRegistros.map((record, index) => {
            const existingImage = prevGeneratedImages.find(img => img.index === index);

            if (existingImage) {
                return {
                    ...existingImage,
                    record: record,
                };
            }

            return {
                index,
                record,
                blob: null,
                url: null,
                filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
                backgroundImage: backgroundImage,
                customFieldPositions: null,
                customFieldStyles: null,
                customBrandElements: null,
                customImageFilters: null,
                fontScale: 1,
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
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || persona;

      setGenerationStatus('Criando o conteúdo geral da campanha...');
      const normalizedContent = await generateCampaignContent({ problema, solucao, persona: finalPersona });
      if (!normalizedContent) {
        throw new Error("A geração do conteúdo principal falhou e não retornou dados.");
      }
      setCampaignContent(normalizedContent);

      if (regenerate) {
        toast.success("Conteúdo principal da campanha foi regenerado.");
        return;
      }

      setFollowupPosts([]);

      setGenerationStatus('Gerando a imagem de referência da campanha...');
      const imageSuccess = await handleGenerateImage(normalizedContent);
      if (!imageSuccess) {
        setCampaignGenerationFailed(true);
        setGenerationError("A geração de texto foi bem-sucedida, mas a criação da imagem falhou. Você pode tentar gerar a imagem novamente.");
        toast.warning("Geração de imagem falhou, mas o texto está pronto.");
      }

      setGenerationStatus('Gerando resumos e conteúdo formatado...');
      await Promise.all([
        handleGenerateSummary(1800, normalizedContent),
        handleGenerateSummary(130, normalizedContent),
        handleGenerateFormattedContent(normalizedContent),
      ]);

      if (followupPostsQuantity > 0) {
        setGenerationStatus('Planejando os posts de follow-up...');
        const plan = await generateFollowupPlan({
          content: normalizedContent,
          neededQuantity: followupPostsQuantity,
          existingPosts: [],
        });

        const newPosts = [];
        for (let i = 0; i < plan.length; i++) {
          const postPlan = plan[i];
          setGenerationStatus(`Gerando post de follow-up ${i + 1}/${plan.length}...`);
          const generatedPost = await generateFollowupPosts({ content: normalizedContent, plan: [postPlan] });
          if (generatedPost && generatedPost.length > 0) {
            newPosts.push(...generatedPost);
            setFollowupPosts([...newPosts]);
          }
        }
      }

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

      const newGeneratedImagesData = csvDataResult.map((record, index) => ({
        index,
        record,
        blob: null,
        url: null,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        backgroundImage: backgroundImage,
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
      setGeneratedImagesData(newGeneratedImagesData);
      setInputMethod('manual');

      if (generateImagesAutomatically) {
        toast.info('Geração de posts concluída. Iniciando geração automática de imagens...');
        let firstImageSet = false;
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

              const finalImageData = await composeSingleImage({
                record: record,
                index: i,
                itemBackgroundImage: stableDataUrl,
                imageFilters,
                brandElements,
                fieldPositions: updatedFieldPositions,
                fieldStyles: updatedFieldStyles,
              });

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

  const personaDrawerContent = (
    <Box sx={{p: 2, width: 320}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Personas</Typography>
            {!isMobile && <IconButton onClick={() => setPersonaDrawerOpen(false)}><ChevronLeft /></IconButton>}
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleNewPersona} fullWidth>Nova Persona</Button>
        <Divider sx={{my: 2}} />
        {personasLoading && <CircularProgress />}
        {personasError && <Alert severity="error">{personasError}</Alert>}
        {!personasLoading && !personasError && (
            <List>
                {personaList.map((p) => (
                    <ListItemButton key={p.id} selected={selectedPersona?.id === p.id} onClick={() => handleNavigation(() => handleSelectPersona(p))}>
                        <ListItemText primary={p.name} />
                    </ListItemButton>
                ))}
            </List>
        )}
    </Box>
  );

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <MainAppBar
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setShowSetupModal={setShowSetupModal}
            setShowCampaignStandardsModal={setShowCampaignStandardsModal}
            setShowMemorialDescritivoModal={setShowMemorialDescritivoModal}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            isMobile={isMobile}
            onSaveCampaign={() => setShowSaveModal(true)}
            onLoadCampaign={() => setShowLoadModal(true)}
            onShowPersonas={() => handleNavigation(() => setCurrentView('personas'))}
            onShowCampaigns={() => handleNavigation(() => setCurrentView('campaigns'))}
            currentView={currentView}
            onPersonaMenuClick={() => setPersonaDrawerOpen(!personaDrawerOpen)}
        />
        <Sidebar sidebarOpen={sidebarOpen} darkMode={darkMode} steps={steps} activeStep={activeStep} setActiveStep={setActiveStep} csvData={csvData} backgroundImage={backgroundImage} visibleFields={visibleFields} totalFields={totalFields} styledFields={styledFields} variant={isMobile ? 'temporary' : 'persistent'} onClose={() => setSidebarOpen(false)} onStepClick={handleSidebarStepClick} />
        {currentView === 'campaigns' && !isMobile && <Fab size="small" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'} sx={{ position: 'fixed', top: '50%', left: sidebarOpen ? 320 - 20 : 0, transform: 'translateY(-50%)', zIndex: (theme) => theme.zIndex.drawer + 1, transition: 'left 0.2s ease-in-out', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: 'background.default' } }} >{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}</Fab>}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, transition: theme.transitions.create('margin', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }) }} >
          <Toolbar />
            {currentView === 'campaigns' && (
              <>
                <div hidden={activeStep !== 0}>
                  <MyCampaignsStep
                    onLoadCampaign={handleLoadCampaign}
                    onEditCampaign={handleEditCampaign}
                    onCreateNew={handleCreateNewCampaign}
                  />
                </div>
                <div hidden={activeStep !== 1}><Container maxWidth="lg"><Campaign
                  steps={steps}
                  activeStep={activeStep}
                  {...campaignData}
                  setProblema={setProblema}
                  setSolucao={setSolucao}
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
                  generatedImageUrl={generatedImageUrl}
                  isGeneratingImage={isGeneratingImage}
                  handleGenerateImage={handleGenerateImage}
                  setCampaignContent={setCampaignContent}
                  onEditFollowup={handleEditFollowup}
                  followupPostsQuantity={followupPostsQuantity}
                  setFollowupPostsQuantity={setFollowupPostsQuantity}
                  setAspectRatio={setAspectRatio}
                  personaList={personaList}
                  selectedPersonaForCampaign={selectedPersonaForCampaign}
                  setSelectedPersonaForCampaign={setSelectedPersonaForCampaign}
                /></Container></div>
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
                    initialFieldStyles={initialFieldStyles}
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
                    }}
                    currentPreviewIndex={currentPreviewIndex}
                    setCurrentPreviewIndex={setCurrentPreviewIndex}
                    onFontScaleChange={setFontScale}
                    templateFieldStyles={templateFieldStyles}
                    activeStep={activeStep}
                  />
                </div>
                <div hidden={activeStep !== 4}><ImageGeneratorFrontendOnly csvData={csvData} backgroundImage={backgroundImage} fieldPositions={fieldPositions} fieldStyles={fieldStyles} displayedImageSize={displayedImageSize} csvHeaders={csvHeaders} colorPalette={colorPalette} standardsColors={standardsColors} setGeneratedImagesData={setGeneratedImagesData} initialGeneratedImagesData={generatedImagesData} onThumbnailRecordTextUpdate={handleThumbnailRecordTextUpdate} originalImageSize={originalImageSize} imageFilters={imageFilters} brandElements={brandElements} onBrandElementsChange={setBrandElements} fontScale={fontScale} /></div>
                <div hidden={activeStep !== 5}><AudioGenerator csvData={csvData} fieldPositions={fieldPositions} onAudiosGenerated={setGeneratedAudioData} initialAudioData={generatedAudioData} /></div>
                <div hidden={activeStep !== 6}><VideoGenerator2 generatedImages={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={(videoData) => setGeneratedVideosData(videoData)} /></div>
                <div hidden={activeStep !== 7}><Publisher settings={settings} campaignContent={campaignContent} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} followupPosts={followupPosts} isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile} selectedImages={selectedImages} setSelectedImages={setSelectedImages} selectedVideos={selectedVideos} setSelectedVideos={setSelectedVideos} currentCampaign={currentCampaign} /></div>
                <div hidden={activeStep !== 8}><Monitor currentCampaign={currentCampaign} /></div>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} ><Button onClick={handleBack} disabled={activeStep === 0} variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Anterior</Button><Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300', transition: 'all 0.3s ease' }} />))}</Box><Button onClick={handleNext} disabled={isGenerating || activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)} variant="contained" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Próximo</Button></Box>
              </>
            )}
            {currentView === 'personas' && (
              <Box sx={{ display: 'flex', width: '100%' }}>
                  <Drawer
                      variant="temporary"
                      anchor="left"
                      open={personaDrawerOpen}
                      onClose={() => handleNavigation(() => setPersonaDrawerOpen(false))}
                      sx={{
                          width: 320,
                          flexShrink: 0,
                          '& .MuiDrawer-paper': {
                              width: 320,
                              boxSizing: 'border-box',
                          },
                      }}
                  >
                      <Toolbar />
                      {personaDrawerContent}
                  </Drawer>
                  <Box
                      component="main"
                      sx={{
                          flexGrow: 1,
                          p: 3,
                      }}
                  >
                      <Toolbar />
                      <Paper elevation={2} sx={{ p: 3 }}>
                          {selectedPersona ? (
                              <PersonaWizardContent
                                  key={selectedPersona.id || 'new'}
                                  onClose={() => handleNavigation(() => setSelectedPersona(null))}
                                  onSave={handleSavePersona}
                                  onReset={handleNewPersona}
                                  personaData={personaFormData}
                                  onPersonaDataChange={setPersonaFormData}
                                  onGenerate={handleGeneratePersonaWithAI}
                                  isGeneratingPersona={isGeneratingPersona}
                                  initialStep={initialWizardStep}
                              />
                          ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                                  <Typography variant="h6" color="text.secondary">
                                      Selecione uma persona para editar ou crie uma nova.
                                  </Typography>
                              </Box>
                          )}
                      </Paper>
                  </Box>
              </Box>
            )}
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
    </ThemeProvider>
  );
}

export default HomePage;
