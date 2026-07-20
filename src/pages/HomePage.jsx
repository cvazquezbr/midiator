import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { useCampaign } from '../context/CampaignContext';
import { loadSettingsFromDb } from '../utils/credentialsManager';
import { getCampaigns, saveCampaign, loadCampaign, updateCampaign } from '../utils/campaignState';
import { checkAuthStatus } from '../utils/auth';
import { getPersonas, savePersona, updatePersona } from '../utils/personaState';
import { getAutores } from '../utils/autorState';
import { getPalettes } from '../utils/paletteState';

import MyCampaignsStep from '../components/MyCampaignsStep';
import SharedCampaignsStep from '../components/SharedCampaignsStep';
import PersonasPage from './PersonasPage';
import AutoresPage from './AutoresPage';
import PalettesPage from './PalettesPage';
import PageSetsPage from './PageSetsPage';
import MainAppBar from '../components/MainAppBar';
import Sidebar from '../components/Sidebar';
import PageGeneratorFrontendOnly from '../components/PageGeneratorFrontendOnly';
import AudioGenerator from '../components/AudioGenerator';
import VideoGenerator2 from '../components/VideoGenerator2';
import PostsCurtosStep from '../components/PostsCurtosStep';
import Publisher from '../components/Publisher';
import Monitor from '../components/Monitor';
import LinkedInEngagement from '../components/engagement/LinkedInEngagement';
import SetupModal from '../components/SetupModal';
import SaveCampaignModal from '../components/SaveCampaignModal';
import ImageGallerySelector from '../components/ImageGallerySelector';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';


import { getGeminiApiKey } from '../utils/geminiCredentials';
import geminiAPI from '../utils/geminiAPI';
import { stripHtml } from '../lib/utils';
import { traverseState } from '../utils/stateTraversal';
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
import { getDimensionsFromAspectRatio, dataURLtoBlob } from '../utils/imageComposer.js';
import { autoArrangeFields } from '../utils/autoArrange.js';
import { createNewImageElement } from '../utils/elementFactory.js';
import PageGenerationService from '../services/PageGenerationService.js';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { setGoogleApiToken, setGoogleApiTokenSetter } from '../utils/googleApi';

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}).join('');

const DEFAULT_IMAGE_SIZE = { width: 720, height: 720 };

function HomePage() {
  const { user, loading, googleAccessToken, setGoogleAccessToken } = useUserAuth();
  const { settings, updateSetting, saveSettings } = useSettings();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const {
    campaignState,
    setCampaignState,
    applyLoadedCampaign,
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    defaultPageTemplate,
  } = useCampaign();

  // Destructure state from the unified campaignState object
  const {
    csvData, fieldPositions, fieldStyles, brandElements,
    pageTemplate, selectedField, currentCampaign, generatedPagesData,
    generatedVideos, aspectRatio, pendingAssets, paletteId, customPalette,
    imageColorPalette, selectedPersonaForCampaign, selectedAutorForCampaign,
  } = campaignState;

  // Local UI State - not part of the campaign data model
  const csvHeaders = useMemo(() => {
    if (csvData && csvData.length > 0 && csvData[0]) {
      return Object.keys(csvData[0]);
    }
    return [];
  }, [csvData]);

  const [palettes, setPalettes] = useState([]);
  const [personaList, setPersonaList] = useState([]);
  const [autorList, setAutorList] = useState([]);
  const [currentView, setCurrentView] = useState('campaigns');
  const [campaignsView, setCampaignsView] = useState('my-campaigns');
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
  const [paletteDrawerOpen, setPaletteDrawerOpen] = useState(!isMobile);
  const [pageSetDrawerOpen, setPageSetDrawerOpen] = useState(!isMobile);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [campaignGenerationFailed, setCampaignGenerationFailed] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [isHtmlField, setIsHtmlField] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingSummaryMedio, setIsGeneratingSummaryMedio] = useState(false);
  const [isGeneratingSummaryPequeno, setIsGeneratingSummaryPequeno] = useState(false);
  const [isGeneratingConteudoFormatado, setIsGeneratingConteudoFormatado] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [inputMethod, setInputMethod] = useState('ia');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Manages the main loading dialog
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(true);
  const [originalImageSize, setOriginalImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [initialSetupTab, setInitialSetupTab] = useState(0);
  const [showMemorialDescritivoModal, setShowMemorialDescritivoModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [engagementDrawerOpen, setEngagementDrawerOpen] = useState(!isMobile);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageGalleryTargetIndex, setImageGalleryTargetIndex] = useState(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const [startAutoresInCreate, setStartAutoresInCreate] = useState(false);
  const [startPersonasInCreate, setStartPersonasInCreate] = useState(false);

  // State for unsaved changes guard
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const campaignContentRef = useRef(campaignState.campaignContent);
  campaignContentRef.current = campaignState.campaignContent;

  const handleAssetUploaded = (tempUrl, permanentUrl) => {
    console.log(`[HomePage] Asset uploaded. Replacing ${tempUrl} with ${permanentUrl}`);

    setCampaignState(currentState => {
      // Create a shallow copy. This is enough for React to trigger a re-render.
      const newState = { ...currentState };

      // Now, directly mutate the nested properties within this new shallow copy.
      // This is safe because we are not mutating the original `currentState` object.
      // This approach avoids deep cloning (`structuredClone`), which was causing issues
      // by breaking object references that other parts of the app (like PageEditor) relied on.
      traverseState(newState, (key, value, owner) => {
        if (value === tempUrl) {
          // Directly mutate the property on the owner object within our shallow copy.
          owner[key] = permanentUrl;
        }
      });

      // Return the mutated shallow copy.
      return newState;
    });

    // This can be done outside the state update.
    removePendingAsset(tempUrl);
  };

  const handleNavigation = (targetAction) => targetAction();
  const handleDialogClose = () => { setShowUnsavedDialog(false); setNavigationTarget(null); };
  const handleDialogDiscard = () => { setShowUnsavedDialog(false); if (navigationTarget) navigationTarget(); setNavigationTarget(null); };
  const handleDialogSaveAndNavigate = async () => { setShowUnsavedDialog(false); setNavigationTarget(null); };

  const handleSetPendingAssets = useCallback((newAssets) => {
    setCampaignState(prev => ({ ...prev, pendingAssets: { ...prev.pendingAssets, ...newAssets } }));
  }, [setCampaignState]);

  const handleRequestNewAutor = () => { setStartAutoresInCreate(true); setCurrentView('autores'); };
  const handleRequestNewPersona = () => { setStartPersonasInCreate(true); setCurrentView('personas'); };
  const handleCreationDone = (view) => { if (view === 'autores') setStartAutoresInCreate(false); else if (view === 'personas') setStartPersonasInCreate(false); setCurrentView('campaigns'); };
  const handleAutorCreated = (newAutor) => { fetchAutoresForCampaign(); if (newAutor?.id) setCampaignState(prev => ({ ...prev, selectedAutorForCampaign: newAutor.id })); setStartAutoresInCreate(false); setCurrentView('campaigns'); };
  const handlePersonaCreated = (newPersona) => { fetchPersonasForCampaign(); if (newPersona?.id) setCampaignState(prev => ({ ...prev, selectedPersonaForCampaign: newPersona.id })); setStartPersonasInCreate(false); setCurrentView('campaigns'); };
  const handlePersonaSelected = (persona) => { setCampaignState(prev => ({ ...prev, selectedPersonaForCampaign: persona.id })); };

  // This effect synchronizes the UI state after a campaign is loaded into the context
  useEffect(() => {
    // This effect should ONLY run when a new campaign is loaded, which is signaled
    // by the `currentCampaign` object changing. It should not run on every
    // minor `campaignState` update (like adding an image), as that would
    // incorrectly revert the UI state.
    if (!currentCampaign) {
      setIsLoading(false);
      return;
    }
    setActiveStep(campaignState.activeStep ?? 0);
    setInputMethod(campaignState.inputMethod ?? 'ia');
    const firstImageSrc = campaignState.pageTemplate?.images?.[0]?.src;
    if (firstImageSrc) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => setOriginalImageSize({ width: img.width, height: img.height });
      img.onerror = () => setOriginalImageSize(DEFAULT_IMAGE_SIZE);
      img.src = firstImageSrc;
    } else {
      setOriginalImageSize(DEFAULT_IMAGE_SIZE);
    }
    setIsLoading(false);
  }, [currentCampaign]);

  const handleSaveCampaign = async (name) => {
    const campaignDataToSave = { ...campaignState, activeStep };
    try {
      await checkAuthStatus();
    } catch (error) {
      toast.error(error.message || "Could not verify your session.");
      return;
    }
    if (!user?.uuid) {
      toast.error("Your session appears to be invalid. Please try logging out and logging back in.");
      return;
    }

    setIsSaving(true);
    setUploadProgress({ current: 0, total: 0 });
    try {
      let result;
      if (currentCampaign) {
        result = await updateCampaign(currentCampaign.id, name, campaignDataToSave, pendingAssets, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign, paletteId);
        toast.success(`Campaign "${name}" updated.`);
      } else {
        result = await saveCampaign(name, campaignDataToSave, pendingAssets, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign, paletteId);
        toast.success(`Campaign "${name}" saved.`);
      }
      applyLoadedCampaign({
        ...result.campaign,
        pendingAssets: result.pendingAssets || {},
      }, palettes);
    } catch (err) {
      console.error("[HomePage] Error during save/update campaign:", err);
      toast.error(err.message || 'An unknown error occurred while saving the campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const apiKey = getGeminiApiKey();
    if (apiKey) geminiAPI.initialize(apiKey);
  }, []);

  const fetchPersonasForCampaign = useCallback(() => getPersonas().then(setPersonaList).catch(err => toast.error('Could not load personas.')), []);
  const fetchAutoresForCampaign = useCallback(() => getAutores().then(setAutorList).catch(err => toast.error('Could not load autores.')), []);
  const fetchPalettesForCampaign = useCallback(() => getPalettes().then(setPalettes).catch(err => toast.error('Could not load palettes.')), []);

  useEffect(() => {
    if (!loading && user) {
      fetchPersonasForCampaign();
      fetchAutoresForCampaign();
      fetchPalettesForCampaign();
    }
  }, [loading, user, fetchPersonasForCampaign, fetchAutoresForCampaign, fetchPalettesForCampaign]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) {
        setActiveStep(null);
        setIsFetchingCampaigns(false);
        return;
      }

      // If a specific campaign ID is in the URL, load it directly
      if (campaignId) {
        setIsLoading(true); // Show the main loader
        setIsFetchingCampaigns(false); // Don't show "Carregando campanhas..."
        try {
          const loadedCampaign = await loadCampaign(campaignId);
          applyLoadedCampaign({
            ...loadedCampaign,
            campaign_data: loadedCampaign.campaign_data || {},
            pendingAssets: loadedCampaign.pendingAssets || {},
          }, palettes);
          // Redirect to the general campaigns view but with the campaign loaded
          navigate('/', { replace: true });
        } catch (error) {
          toast.error(`Falha ao carregar a campanha compartilhada: ${error.message}`);
          navigate('/'); // Redirect to home on failure
        } finally {
          setIsLoading(false);
        }
      } else {
        // Otherwise, load the list of user's campaigns
        setIsFetchingCampaigns(true);
        try {
          const existingCampaigns = await getCampaigns();
          setActiveStep(existingCampaigns?.length > 0 ? 0 : 1);
        } catch (error) {
          toast.error("Não foi possível carregar as campanhas.");
          setActiveStep(1);
        } finally {
          setIsFetchingCampaigns(false);
        }
      }
    };

    loadInitialData();
  }, [user, campaignId, applyLoadedCampaign, navigate]);


  useEffect(() => {
    if (googleAccessToken) {
      setGoogleApiToken(googleAccessToken);
      setGoogleApiTokenSetter(setGoogleAccessToken);
    }
  }, [googleAccessToken, setGoogleAccessToken]);


  useEffect(() => {
    const checkLinkedInRedirect = () => {
      const isLinkedInRedirect = sessionStorage.getItem('linkedin_oauth_inprogress');
      if (isLinkedInRedirect) {
        sessionStorage.removeItem('linkedin_oauth_inprogress');
        setShowSetupModal(true);
        setInitialSetupTab(4); // LinkedIn is the 5th tab (index 4)
      }
    };
    checkLinkedInRedirect();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.classList.toggle('dark-mode-active', darkMode);
  }, [darkMode]);

  const extractColorPalette = useCallback((url, setter) => {
    if (!url) { setter([]); return; }
    let finalUrl = url.includes('blob.vercel-storage.com') ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;
    const img = new Image();
    if (!finalUrl.startsWith('/api/')) img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        setter(colorThief.getPalette(img, 5)?.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2])) || []);
      } catch (e) { setter([]); }
    };
    img.onerror = () => setter([]);
    img.src = finalUrl;
    if (img.complete) img.onload();
  }, []);

  useEffect(() => {
    extractColorPalette(pageTemplate?.images?.[0]?.src, (p) => setCampaignState(prev => ({ ...prev, imageColorPalette: p })));
  }, [pageTemplate?.images?.[0]?.src, extractColorPalette, setCampaignState]);

  // Sincroniza as cores da campanha com base na paleta selecionada (ou customizada)
  useEffect(() => {
    let campaignColors = [];
    if (customPalette?.colors && customPalette.colors.length > 0) {
      campaignColors = customPalette.colors;
    } else if (paletteId && palettes && palettes.length > 0) {
      const selectedPalette = palettes.find(p => p.id === paletteId);
      if (selectedPalette) {
        campaignColors = selectedPalette.colors;
      }
    }

    // Só atualiza se as cores realmente mudaram para evitar loops de renderização
    if (JSON.stringify(campaignColors) !== JSON.stringify(campaignState.colors)) {
      setCampaignState(prev => ({ ...prev, colors: campaignColors }));
    }
  }, [paletteId, customPalette, palettes, campaignState.colors, setCampaignState]);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);
  useEffect(() => { setOriginalImageSize(getDimensionsFromAspectRatio(aspectRatio) || DEFAULT_IMAGE_SIZE); }, [aspectRatio]);

  useEffect(() => {
    const processMedia = async (mediaArray, onUpdate) => {
      const itemsToProcess = (mediaArray || []).filter(item => item.url && !item.duration);
      if (itemsToProcess.length === 0) return;
      const promises = itemsToProcess.map(itemData => new Promise(resolve => {
        const mediaElement = document.createElement(itemData.type === 'video' ? 'video' : 'audio');
        mediaElement.preload = 'metadata';
        mediaElement.onloadedmetadata = () => resolve({ ...itemData, duration: mediaElement.duration });
        mediaElement.onerror = () => resolve(itemData);
        mediaElement.src = itemData.url;
      }));
      const processedItems = await Promise.all(promises);
      onUpdate(currentItems => {
        const newItems = [...(currentItems || [])];
        processedItems.forEach(processed => {
          const index = newItems.findIndex(v => v.url === processed.url);
          if (index !== -1) newItems[index] = processed;
        });
        return newItems;
      });
    };
    processMedia(generatedVideos, (updater) => setCampaignState(prev => ({ ...prev, generatedVideos: updater(prev.generatedVideos) })));
  }, [generatedVideos, setCampaignState]);

  const steps = [ { label: 'Minhas Campanhas', description: 'Gerencie suas campanhas existentes ou crie uma nova.', icon: FolderOpenIcon }, { label: 'Campanha', description: 'Criar o material de referência para a campanha.', icon: CampaignIcon }, { label: 'Posts Curtos', description: 'Gere, carregue ou edite os posts para redes sociais.', icon: InsertDriveFileOutlined }, { label: 'Modelo de Página', description: 'Carregue a imagem de fundo, posicione os campos e configure a formatação.', icon: ImageIcon }, { label: 'Edição de Páginas', description: 'Gere as páginas finais.', icon: FormatBold }, { label: 'Gerar Áudio', description: 'Crie a narração para os slides.', icon: Audiotrack }, { label: 'Gerar Vídeo', description: 'Crie um vídeo a partir das imagens geradas.', icon: Movie }, { label: 'Publicar', description: 'Publique o conteúdo no WordPress.', icon: Publish } ];

  const handleCreateNewCampaign = () => {
    applyLoadedCampaign({}, palettes);
    setActiveStep(1);
  };

  const handleEditCampaign = async (campaign) => {
    toast.info(`Carregando "${campaign.name}"...`);
    setIsLoading(true);
    try {
        await checkAuthStatus();
        const loadedCampaign = await loadCampaign(campaign.id);

        // A `campaign_data` pode não existir em campanhas antigas, então garanta que seja um objeto
        const campaign_data = loadedCampaign.campaign_data || {};

        // Determine o paletteId a partir dos dados carregados
        const dbPaletteId = loadedCampaign.palette_id;
        const hasCustomPalette = campaign_data.customPalette?.colors?.length > 0;
        let finalPaletteId = null;
        if (dbPaletteId) {
            finalPaletteId = dbPaletteId;
        } else if (hasCustomPalette) {
            finalPaletteId = 'custom';
        }

        // Crie o objeto `campaign_data` final com todas as informações consolidadas
        const finalCampaignData = {
            ...campaign_data,
            paletteId: finalPaletteId,
        };

        // Crie o objeto de nível superior esperado por `applyLoadedCampaign`
        const campaignToApply = {
            id: loadedCampaign.id,
            name: loadedCampaign.name,
            campaign_data: finalCampaignData,
            pendingAssets: loadedCampaign.pendingAssets, // Pass the pending assets
            autor_id: loadedCampaign.autor_id,
            persona_id: loadedCampaign.persona_id,
        };

        // **MIGRATION**: Ensure all records have a stable ID for editing.
        // This handles campaigns saved before the ID logic was implemented.
        if (finalCampaignData.csvData && finalCampaignData.csvData.some(record => !record.id)) {
          finalCampaignData.csvData = finalCampaignData.csvData.map(record => ({
            ...record,
            id: record.id || uuidv4(),
          }));
        }

        applyLoadedCampaign(campaignToApply, palettes);

        // If the loaded campaign has CSV data, set the input method to manual
        // so the user sees the data grid immediately.
        if (finalCampaignData.csvData && finalCampaignData.csvData.length > 0) {
            setInputMethod('manual');
        } else {
            setInputMethod('ia'); // Default to IA if no data
        }

        toast.success(`Campanha "${loadedCampaign.name}" carregada com sucesso!`);
        setActiveStep(2); // Go to "Posts Curtos" step
    } catch (err) {
        toast.error(`Falha ao carregar campanha: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
};

  const handleLoadClonedCampaign = (clonedCampaign) => {
    toast.info(`Carregando "${clonedCampaign.name}" como uma nova campanha...`);
    setIsLoading(true);

    try {
      // The cloned campaign is not in the database yet, so there's no ID.
      // We directly apply its state to the editor.
      const campaignToApply = {
        // No ID or Name, as it's not saved yet. The name is in campaign_data.
        campaign_data: clonedCampaign.campaign_data || {},
        pendingAssets: clonedCampaign.pendingAssets || {},
      };

      applyLoadedCampaign(campaignToApply, palettes);

      // If the cloned campaign has CSV data, set the input method to manual.
      if (clonedCampaign.campaign_data?.csvData?.length > 0) {
        setInputMethod('manual');
      } else {
        setInputMethod('ia'); // Default to IA if no data
      }

      toast.success(`Campanha clonada carregada. Salve para criar a nova campanha.`);
      setActiveStep(2); // Go to "Posts Curtos" step to review/edit
    } catch (err) {
      toast.error(`Falha ao carregar campanha clonada: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const parseCsvFile = async (file) => {
    if (!file) return;
    try {
      const { data: newCsvData, headers: newHeaders } = await parseCsv(file);

      if (newCsvData?.length > 0) {
        const dataWithIds = newCsvData.map(record => ({ ...record, id: uuidv4() }));
        const { newPositions, newStyles } = autoArrangeFields({
          csvHeaders: newHeaders, fieldPositions: {}, fieldStyles: {}, csvData: dataWithIds, effectiveImageSize: originalImageSize,
        });

        // Ensure dependent data arrays are also initialized
        const newGeneratedPagesData = dataWithIds.map((record, index) => ({
          index,
          record,
          blob: null,
          url: null,
          filename: `midiator_${String(index + 1).padStart(3, '0')}.png`
        }));

        setCampaignState(prev => ({
          ...prev,
          csvData: dataWithIds,
          csvHeaders: newHeaders,
          fieldPositions: newPositions,
          fieldStyles: newStyles,
          initialFieldStyles: newStyles,
          generatedPagesData: newGeneratedPagesData,
        }));
        setInputMethod('manual');
      }
    } catch (error) {
      toast.error(error.message || 'Ocorreu um erro ao processar o arquivo CSV.');
    }
  };
  const handleCSVUpload = (event) => parseCsvFile(event.target.files[0]);
  const handleDrop = (event) => { event.preventDefault(); event.stopPropagation(); parseCsvFile(event.dataTransfer.files[0]); };
  const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };

  const handleOpenImageGallery = (index = null) => { setImageGalleryTargetIndex(index); setShowImageGallery(true); };
  const handleCloseImageGallery = () => { setShowImageGallery(false); setImageGalleryTargetIndex(null); };

  const addNewImageToCanvas = useCallback((imageUrl) => {
    const newImage = { ...createNewImageElement(imageUrl), zIndex: -1 };
    setCampaignState(prev => ({ ...prev, selectedField: newImage.id }));
    if (typeof imageGalleryTargetIndex === 'number') {
      setCampaignState(prev => {
        const newPages = prev.generatedPagesData.map((page, index) => {
          if (index !== imageGalleryTargetIndex) return page;
          const baseTemplate = page.customPageTemplate || JSON.parse(JSON.stringify(prev.pageTemplate));
          const newCustomTemplate = { ...baseTemplate, images: [...(baseTemplate.images || []), newImage] };
          return { ...page, customPageTemplate: newCustomTemplate };
        });
        return { generatedPagesData: newPages };
      });
      toast.success(`Imagem adicionada à página ${imageGalleryTargetIndex + 1}.`);
    } else {
      setCampaignState(prev => ({ pageTemplate: { ...prev.pageTemplate, images: [...(prev.pageTemplate.images || []), newImage] } }));
      toast.success('Imagem adicionada ao modelo.');
    }
    extractColorPalette(imageUrl, p => setCampaignState({ imageColorPalette: p }));
  }, [imageGalleryTargetIndex, setCampaignState, extractColorPalette]);

  const handleImageSelected = useCallback((file) => {
    if (!file) return;
    const managedUrl = addPendingAsset(file);
    if (managedUrl) addNewImageToCanvas(managedUrl);
    else toast.error("Houve um erro ao registrar a imagem.");
  }, [addPendingAsset, addNewImageToCanvas]);

  const handleForegroundImageUpload = useCallback((event) => handleImageSelected(event.target.files[0]), [handleImageSelected]);
  const handleImageDragOver = (event) => event.preventDefault();
  const handleImageDragEnter = (event) => event.preventDefault();
  const handleImageDragLeave = (event) => event.preventDefault();
  const handleNext = () => { if (activeStep === 3) setCampaignState(prev => ({ ...prev, templateFieldStyles: fieldStyles })); setActiveStep(p => p + 1); };
  const handleBack = () => setActiveStep(p => p - 1);
  const canProceedToStep = (step) => {
    switch (step) {
      case 1: return true;
      case 2: return campaignState.campaignContent !== null;
      case 3: return csvData.length > 0;
      case 4: return true;
      case 5: if (generatedPagesData.length === 0 || !generatedPagesData.every(img => img.url)) { toast.error("Gere todas as páginas antes de prosseguir."); return false; } return true;
      case 6:
        if (csvData.length > 0 && !csvData.every(record => record?.audio?.url)) {
          toast.error("Gere o áudio para todos os slides antes de prosseguir.");
          return false;
        }
        if (csvData.length > 0 && csvData.some(record => record?.audio?.url && !record.audio.duration)) {
          toast.error("Aguarde o cálculo da duração de todos os áudios.");
          return false;
        }
        return true;
      default: return true;
    }
  };
  const { visibleFields, totalFields, styledFields } = useMemo(() => ({
    visibleFields: Object.values(fieldPositions).filter(pos => pos.visible).length,
    totalFields: csvHeaders.length,
    styledFields: Object.keys(fieldStyles).length
  }), [fieldPositions, csvHeaders, fieldStyles]);

  const handleZIndexChange = (elementId, action) => {
    if (!elementId) return;
    let allElements = [ ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, isBrand: false })), ...brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, isBrand: true })), ];
    allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const currentIndex = allElements.findIndex(el => el.id === elementId);
    if (currentIndex === -1) return;
    const [currentElement] = allElements.splice(currentIndex, 1);
    switch (action) {
      case 'front': allElements.push(currentElement); break;
      case 'back': allElements.unshift(currentElement); break;
      case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement); break;
      case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement); break;
      default: allElements.splice(currentIndex, 0, currentElement); return;
    }
    const newPositions = { ...fieldPositions };
    const newBrandElements = [...brandElements];
    allElements.forEach((el, index) => {
      el.zIndex = index;
      if (el.isBrand) { const brandEl = newBrandElements.find(b => b.id === el.id); if (brandEl) brandEl.zIndex = index; }
      else { if (newPositions[el.id]) newPositions[el.id].zIndex = index; }
    });
    setCampaignState(prev => ({ ...prev, fieldPositions: newPositions, brandElements: newBrandElements }));
  };

  const handleSidebarStepClick = (index) => { if (isMobile) setSidebarOpen(false); setActiveStep(index); };

  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    setCampaignState(prev => {
      // 1. Encontre os áudios que existem ANTES da atualização.
      const oldAudioUrls = (prev.csvData || [])
        .map(r => r.audioUrl)
        .filter(url => url && url.startsWith('blob:'));

      const sanitizedRegistros = novosRegistros.map((record, index) => ({
        ...(record || {}),
        Título: (record || {}).Título || `Página ${index + 1}`,
      }));

      // Sincroniza os dados das páginas geradas com os posts curtos (fonte da verdade).
      // Usa o ID do registro para garantir que os ativos existentes (imagens) não sejam perdidos.
      const newGeneratedPagesData = sanitizedRegistros.map((record, index) => {
        // Encontra a página existente correspondente pelo ID do registro, não pelo índice.
        const existingPage = (prev.generatedPagesData || []).find(p => p.record?.id === record.id);

        if (existingPage) {
          // Se a página já existe, atualiza o 'record' com os novos dados do post,
          // mas preserva a URL da imagem e outros metadados.
          return {
            ...existingPage,
            record: record, // Atualiza os dados do post
            index: index,   // Atualiza o índice em caso de reordenação
          };
        } else {
          // Se for um novo post, cria um novo objeto de página.
          return {
            index,
            record,
            url: null,
            blob: null,
            filename: `midiator_${String(index + 1).padStart(3, '0')}.png`
          };
        }
      });

      // A lógica de sincronização de áudio foi removida e substituída por uma lógica de merge.
      // Ao editar os posts, mesclamos o registro antigo (que tem os dados do áudio) com o novo.
      const mergedCsvData = sanitizedRegistros.map(newRecord => {
        const oldRecord = (prev.csvData || []).find(r => r.id === newRecord.id);
        return { ...(oldRecord || {}), ...newRecord };
      });

      const updates = {
        csvData: mergedCsvData,
        generatedPagesData: newGeneratedPagesData,
        // Preserva outros dados de mídia
        generatedVideos: prev.generatedVideos || [],
      };

      if (JSON.stringify(novasColunas) !== JSON.stringify(prev.csvHeaders)) {
        updates.csvHeaders = novasColunas;
      }

      // 3. Compare as listas de URLs de áudio e limpe os órfãos.
      const newAudioUrls = new Set(
        mergedCsvData
          .map(r => r.audioUrl)
          .filter(url => url && url.startsWith('blob:'))
      );

      oldAudioUrls.forEach(oldUrl => {
        if (!newAudioUrls.has(oldUrl)) {
          console.log(`[handleDadosAlterados] Limpando blob de áudio órfão: ${oldUrl}`);
          removePendingAsset(oldUrl);
        }
      });

      return { ...prev, ...updates };
    });
  }, [setCampaignState, removePendingAsset]);

  const handleCsvRecordContentUpdate = useCallback((newCsvData) => {
    setCampaignState(prev => {
      const sanitizedCsvData = newCsvData.map((record, index) => ({
        ...(record || {}),
        Título: (record || {}).Título || `Página ${index + 1}`,
      }));

      const synchronizedPages = sanitizedCsvData.map((record, index) => {
        const existingPage = (prev.generatedPagesData || []).find(p => p.index === index) || {};
        return { ...existingPage, index, record };
      });

      const updates = {
        csvData: sanitizedCsvData,
        generatedPagesData: synchronizedPages,
        // Preserve media data
        generatedVideos: prev.generatedVideos || [],
      };

      return { ...prev, ...updates };
    });
  }, [setCampaignState]);

  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => {
    setCampaignState(prev => ({
      ...prev,
      csvData: prev.csvData.map((row, idx) => idx === recordIndex ? updatedRecord : row)
    }));
  }, [setCampaignState]);

  const handleGenerateCampaignContent = async (regenerate = false) => {
    setIsGeneratingCampaign(true); setCampaignGenerationFailed(false); setGenerationError(''); setGenerationStatus('Iniciando...');
    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';
      const content = await generateCampaignContent({
        problema: campaignState.problema,
        solucao: campaignState.solucao,
        objetivo: campaignState.objetivo,
        tomDeVoz: campaignState.tomDeVoz,
        persona: finalPersona,
        autor: finalAutor,
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });
      setCampaignState(prev => ({ ...prev, campaignContent: content, promptText: `${content.titulo || ''}\n\n${content.conteudo || ''}\n\n${content.cta || ''}` }));
      if (regenerate) { toast.success("Conteúdo principal regenerado."); return; }
      setCampaignState(prev => ({ ...prev, followupPosts: [] }));
      await Promise.all([ handleGenerateSummary(1800, content), handleGenerateSummary(130, content) ]);
      toast.success("Campanha gerada com sucesso!");
    } catch (error) {
      toast.error(`Erro ao gerar conteúdo: ${error.message}`);
      setCampaignState(prev => ({ ...prev, campaignContent: null })); setCampaignGenerationFailed(true); setGenerationError(error.message);
    } finally {
      setIsGeneratingCampaign(false); setGenerationStatus('');
    }
  };

  const handleGenerateImage = useCallback(async (content, palette = null) => {
    const finalContent = content || campaignContentRef.current;
    if (!finalContent) { toast.error("Gere o conteúdo do texto primeiro."); return false; }

    // Captura as URLs antigas antes de gerar a nova
    const oldPageUrls = campaignState.pageUrls || [];

    setIsGeneratingImage(true);
    try {
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const imagePrompt = await generateCampaignImagePrompt({
        content: finalContent,
        aspectRatio,
        autor: finalAutor,
        palette,
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });
      const base64Data = await generateCampaignImage({
        prompt: imagePrompt,
        aspectRatio,
        colors: palette?.colors || [],
        model: settings.gemini_image_model,
        apiKey: settings.gemini_api_key
      });
      const imageBlob = dataURLtoBlob(`data:image/png;base64,${base64Data}`);
      const managedUrl = addPendingAsset(imageBlob);
      if (!managedUrl) throw new Error("Falha ao criar URL para a imagem gerada.");

      // Substitui o array pageUrls em vez de adicionar a ele
      setCampaignState(prev => ({
        ...prev,
        generatedPageUrl: managedUrl,
        pageUrls: [managedUrl]
      }));
      addNewImageToCanvas(managedUrl);

      // Limpa as URLs antigas
      oldPageUrls.forEach(url => {
        if (url !== managedUrl) {
          removePendingAsset(url);
        }
      });

      return true;
    } catch (imageError) {
      toast.error(`Erro na geração da imagem: ${imageError.message}`);
      setCampaignState(prev => ({ ...prev, generatedPageUrl: null }));
      return false;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [aspectRatio, addNewImageToCanvas, addPendingAsset, autorList, selectedAutorForCampaign, setCampaignState, campaignState.pageUrls, removePendingAsset]);

  const handleGenerateSummary = async (targetLength, content) => {
    // The source of truth for the main content is the 'content' param if provided,
    // otherwise it's what's currently in the state.
    const sourceContent = content || campaignState.campaignContent;

    if (!sourceContent || !sourceContent.conteudo) {
      toast.error("Conteúdo principal não encontrado para gerar resumo.");
      return; // Exit early if there's nothing to summarize
    }

    const setLoading = targetLength === 1800 ? setIsGeneratingSummaryMedio : setIsGeneratingSummaryPequeno;
    setLoading(true);
    try {
      const summaryPrompt = `Resuma o seguinte texto para ter no máximo ${targetLength} caracteres, mantendo a essência e o tom: "${stripHtml(sourceContent.conteudo)}"`;
      const summary = await geminiAPI.generateContent(summaryPrompt, settings.gemini_model, 'Gerar Resumo');
      const fieldName = targetLength === 1800 ? 'conteudoMedio' : 'conteudoPequeno';

      // Use a functional update on setCampaignState to prevent race conditions.
      // This ensures that parallel calls don't overwrite each other's results.
      setCampaignState(currentState => ({
        ...currentState,
        campaignContent: {
          ...currentState.campaignContent, // Preserve all existing fields in campaignContent
          [fieldName]: summary, // Add or update the specific summary field
        },
      }));
    } catch (error) {
      toast.error(`Erro ao gerar resumo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFormattedContent = async (content = campaignState.campaignContent) => {
    if (!content?.conteudo) { toast.error("Gere o conteúdo principal primeiro."); return; }
    setIsGeneratingConteudoFormatado(true);
    try {
      const finalContent = await generateFormattedContent({
        content,
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });
      setCampaignState(prev => ({ ...prev, campaignContent: { ...prev.campaignContent, conteudoFormatado: finalContent } }));
    } catch (error) {
      toast.error(`Erro ao formatar conteúdo: ${error.message}`);
    } finally {
      setIsGeneratingConteudoFormatado(false);
    }
  };

  const handleGenerateFollowupPosts = async (content = campaignState.campaignContent) => {
    if (!content?.conteudo) { toast.error("Gere o conteúdo principal primeiro."); return; }
    const { followupPosts, followupPostsQuantity } = campaignState;
    if (followupPosts.length >= followupPostsQuantity) { toast.info('Quantidade de posts desejada já atingida.'); return; }
    setCampaignState(prev => ({ ...prev, isGeneratingFollowup: true }));
    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign);
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const neededQuantity = followupPostsQuantity - followupPosts.length;
      const plan = await generateFollowupPlan({
        content,
        neededQuantity,
        existingPosts: followupPosts,
        persona: finalPersona,
        autor: finalAutor,
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });
      const newPosts = await generateFollowupPosts({
        content,
        plan,
        persona: finalPersona,
        autor: finalAutor,
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });
      setCampaignState(prev => ({ ...prev, followupPosts: [...followupPosts, ...newPosts] }));
    } catch (error) {
      toast.error(`Erro ao gerar posts de follow-up: ${error.message}`);
    } finally {
      setCampaignState(prev => ({ ...prev, isGeneratingFollowup: false }));
    }
  };

  const handleResetCampaign = () => setCampaignState(prev => ({ ...prev, campaignContent: null, generatedPageUrl: null, followupPosts: [], followupPostsQuantity: 10 }));
  const handleEditFollowup = (index, content) => setEditingFollowup({ index, content });
  const handleSaveFollowup = (newContent) => {
    if (editingFollowup === null) return;
    setCampaignState(prev => ({ ...prev,
      followupPosts: campaignState.followupPosts.map((post, index) => index === editingFollowup.index ? { ...post, conteudo: newContent } : post)
    }));
    setEditingFollowup(null);
  };

  const handleGenerateIAContent = async () => {
    setIsGenerating(true); setGenerationStatus('Gerando posts...');
    try {
      const { promptText, promptNumRecords } = campaignState;
      const iaResponseText = await generateIAContent({
        promptText,
        promptNumRecords,
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });
      const parsedResult = parseIaResponseToCsvData(iaResponseText);
      if (!parsedResult?.data?.length) {
        toast.error('Não foi possível processar a resposta da IA.');
        return;
      }

      const { data: csvDataResult, headers: csvHeadersResult } = parsedResult;

      // 1. Sanitize the AI-generated records and add stable IDs
      const sanitizedCsvData = csvDataResult.map((record, index) => ({
        ...record,
        id: uuidv4(),
        Título: record.Título || `Página ${index + 1}`,
      }));

      const { newPositions, newStyles } = autoArrangeFields({
        csvHeaders: csvHeadersResult,
        fieldPositions: {},
        fieldStyles: {},
        csvData: sanitizedCsvData,
        effectiveImageSize: originalImageSize
      });

      // 2. Synchronize generatedPagesData with the sanitized data.
      const newGeneratedPagesData = sanitizedCsvData.map((record, index) => ({
        index,
        record,
        blob: null,
        url: null,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`
      }));


      setCampaignState(prev => {
        const updates = {
          csvData: sanitizedCsvData,
          csvHeaders: csvHeadersResult,
          fieldPositions: newPositions,
          fieldStyles: newStyles,
          initialFieldStyles: newStyles,
          generatedPagesData: newGeneratedPagesData,
          // Preserve media data
          generatedVideos: prev.generatedVideos || [],
        };
        return { ...prev, ...updates };
      });

      setInputMethod('manual');
      toast.success('Geração de posts concluída.');
    } catch (error) {
      toast.error(`Erro ao gerar conteúdo com IA: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleGenerateSinglePage = async (record, index, fontScale = 1) => {
    const imagePrompt = record.prompt_imagem_carrossel;
    let pageUpdateData = {};
    const pageData = generatedPagesData.find(p => p.index === index);
    let effectivePageTemplate = pageData?.customPageTemplate || pageTemplate;
    const memorialColors = palettes.find(p => p.id === paletteId)?.colors || customPalette?.colors || [];

    // This is the key change: We create a new state object that will be passed to the
    // page generation service. This ensures the service has the *absolute latest* data,
    // including the newly generated image, preventing a race condition where the page is
    // rendered with the new data but before the new image is available in the main state.
    let updatedCampaignStateForGeneration = { ...campaignState };

    if (imagePrompt?.trim()) {
      setGenerationStatus(`Gerando imagem para o post ${index + 1}...`);
      try {
        const sourceStyle = effectivePageTemplate.images?.[0] ? (({ id, src, ...style }) => style)(effectivePageTemplate.images[0]) : { x: 0, y: 0, width: 100, height: 100, zIndex: -1, objectFit: 'cover' };
        const oldImage = (effectivePageTemplate.images || [])[0];

        const base64Data = await generateCampaignImage({
          prompt: imagePrompt,
          aspectRatio,
          colors: memorialColors,
          model: settings.gemini_image_model,
          apiKey: settings.gemini_api_key
        });
        if (!base64Data) throw new Error("A IA não conseguiu gerar a imagem.");

        const imageBlob = dataURLtoBlob(`data:image/png;base64,${base64Data}`);
        const managedImageUrl = addPendingAsset(imageBlob);
        if (!managedImageUrl) throw new Error("Falha ao registrar a imagem gerada.");

        const newImage = { ...createNewImageElement(managedImageUrl), ...sourceStyle, visible: true };
        const finalImages = (effectivePageTemplate.images?.length > 0) ? [newImage, ...effectivePageTemplate.images.slice(1)] : [newImage];

        // Update the template that will be used for this specific page generation
        effectivePageTemplate = { ...effectivePageTemplate, images: finalImages };
        pageUpdateData.customPageTemplate = effectivePageTemplate;

        // If there was an old image, remove it from the main state *after* the new one has been added.
        if (oldImage?.src) {
          removePendingAsset(oldImage.src);
        }

        // CRITICAL: Update the state snapshot for the generation service
        updatedCampaignStateForGeneration = {
            ...updatedCampaignStateForGeneration,
            pageTemplate: effectivePageTemplate,
        };

      } catch (error) {
        toast.error(`Falha na Imagem (Post #${index + 1}): ${error.message}`);
        // Do not proceed if image generation fails
        setGenerationStatus('');
        return false;
      }
    }

    setGenerationStatus(`Gerando página para o post ${index + 1}/${csvData.length}...`);
    try {
        // Use the updated, consistent state snapshot for page generation
        const finalPageData = await PageGenerationService.generatePageImage({
            record,
            index,
            campaignContext: updatedCampaignStateForGeneration, // Use the updated state
            pageData: { ...(pageData || {}), customPageTemplate: effectivePageTemplate, fontScale },
        });

      const tempUrl = addPendingAsset(finalPageData.blob);
      if (!tempUrl) throw new Error("Falha ao criar URL para a página final.");

      // Now, update the actual component state with the final result
      setCampaignState(prev => {
        const newPagesData = prev.generatedPagesData.map(p => {
          if (p.index !== index) {
            return p;
          }
          // Merge the previous state with the new data to ensure nothing is lost.
          const finalPageUpdate = {
            ...(p || {}),
            ...finalPageData,
            customPageTemplate: effectivePageTemplate, // Directly use the updated template
            url: tempUrl,
            dataUrl: null,
            blob: undefined,
          };
          return finalPageUpdate;
        });
        return { generatedPagesData: newPagesData };
      });

      toast.success(`Página #${index + 1} gerada.`);
      return true;
    } catch (error) {
      toast.error(`Erro na geração da página ${index + 1}: ${error.message}`);
      return false;
    } finally {
      setGenerationStatus('');
    }
  };

  const currentTheme = darkMode ? darkTheme : lightTheme;
  const memorialColors = useMemo(() => palettes.find(p => p.id === paletteId)?.colors || customPalette?.colors || [], [paletteId, customPalette, palettes]);
  const memorialCampaignData = { ...campaignState, colors: memorialColors, persona: personaList.find(p => p.id === selectedPersonaForCampaign), autor: autorList.find(a => a.id === selectedAutorForCampaign) };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <MainAppBar
          {...{
            darkMode,
            setDarkMode,
            setShowSetupModal,
            onMenuClick: () => setSidebarOpen(!sidebarOpen),
            isMobile,
            onSaveCampaign: () => setShowSaveModal(true),
            onShowPersonas: () => handleNavigation(() => setCurrentView('personas')),
            onShowAutores: () => handleNavigation(() => setCurrentView('autores')),
            onShowPalettes: () => handleNavigation(() => setCurrentView('palettes')),
            onShowPageSets: () => handleNavigation(() => setCurrentView('pagesets')),
            onShowCampaigns: () => handleNavigation(() => { setCurrentView('campaigns'); setCampaignsView('my-campaigns'); }),
            onShowSharedCampaigns: () => { setCurrentView('campaigns'); setCampaignsView('shared-campaigns'); },
            onShowMonitor: () => handleNavigation(() => setCurrentView('monitor')),
            onShowEngagement: () => handleNavigation(() => setCurrentView('engagement')),
            campaignsView,
            currentView,
            onPersonaMenuClick: () => setPersonaDrawerOpen(!personaDrawerOpen),
            onAutorMenuClick: () => setAutorDrawerOpen(!autorDrawerOpen),
            onPaletteMenuClick: () => setPaletteDrawerOpen(!paletteDrawerOpen),
            onPageSetMenuClick: () => setPageSetDrawerOpen(!pageSetDrawerOpen),
            isDrawerOpen: currentView === 'personas' ? personaDrawerOpen : currentView === 'autores' ? autorDrawerOpen : currentView === 'palettes' ? paletteDrawerOpen : currentView === 'pagesets' ? pageSetDrawerOpen : sidebarOpen,
            onShowMemorial: () => setShowMemorialDescritivoModal(true),
            isCampaignOpen: currentCampaign !== null
          }}
          sx={{
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            ...(!isMobile && sidebarOpen && {
              width: `calc(100% - ${320}px)`,
              marginLeft: `${320}px`,
            }),
          }}
        />
        {currentView === 'campaigns' && (
          <>
            <Sidebar {...{ sidebarOpen, darkMode, steps, activeStep, csvData, backgroundImageSrc: pageTemplate?.images?.[0]?.src, visibleFields, totalFields, styledFields, variant: isMobile ? 'temporary' : 'persistent', onClose: () => setSidebarOpen(false), onStepClick: handleSidebarStepClick }} />
            {!isMobile && <Fab size="small" onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ position: 'fixed', top: '50%', left: sidebarOpen ? 320 - 20 : 0, transform: 'translateY(-50%)', zIndex: (theme) => theme.zIndex.drawer + 1, transition: 'left 0.2s ease-in-out' }} >{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}</Fab>}
          </>
        )}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1, sm: 2, md: 3 },
          }}
        >
          <Toolbar />
          {currentView === 'campaigns' && (
            <>
              {activeStep === 0 && campaignsView === 'my-campaigns' && <MyCampaignsStep {...{ onEditCampaign: handleEditCampaign, onCreateNew: handleCreateNewCampaign, onCloneComplete: handleLoadClonedCampaign, autorList, personaList }} />}
              {activeStep === 0 && campaignsView === 'shared-campaigns' && <SharedCampaignsStep {...{ onEditCampaign: handleEditCampaign }} />}
              {activeStep === 1 && <Campaign {...{ steps, activeStep, ...campaignState, setCampaignState, isGeneratingCampaign, campaignGenerationFailed, generationError, handleGenerateCampaignContent, handleResetCampaign, handleExportHtml: () => exportHtml(memorialCampaignData), editingField, setEditingField: (field) => { setEditingField(field); setIsHtmlField(field === 'conteudoFormatado'); }, isGeneratingSummaryMedio, handleGenerateSummary, isGeneratingSummaryPequeno, isGeneratingConteudoFormatado, handleGenerateFormattedContent, isGeneratingFollowup: campaignState.isGeneratingFollowup, handleGenerateFollowupPosts, isGeneratingImage, handleGenerateImage, onEditFollowup: handleEditFollowup, palettes, autorList, selectedAutorForCampaign, personaList, selectedPersonaForCampaign, onRequestNewAutor: handleRequestNewAutor, onRequestNewPersona: handleRequestNewPersona, paletteId: campaignState.paletteId, customPalette: campaignState.customPalette }} />}
              {activeStep === 2 && <PostsCurtosStep {...{ steps, inputMethod, setInputMethod, handleDrop, handleDragOver, fileInputRef, handleCSVUpload, downloadExampleCsv, setShowSetupModal, promptNumRecords: campaignState.promptNumRecords, setPromptNumRecords: (v) => setCampaignState({ promptNumRecords: v }), promptText: campaignState.promptText, setPromptText: (v) => setCampaignState({ promptText: v }), handleGenerateIAContent, isGenerating, csvData, csvHeaders, onDadosAlterados: handleDadosAlterados, darkMode, exportCsv: () => exportCsv(csvData, csvHeaders), aspectRatio, setAspectRatio: (v) => setCampaignState({ aspectRatio: v }), sidebarOpen }} />}
              {activeStep === 3 && <ImageStep {...{ steps, isLoading, isDraggingOverImage: false, handleImageDrop: (e) => handleImageSelected(e.dataTransfer.files[0]), handleImageDragOver, handleImageDragEnter: () => {}, handleImageDragLeave: () => {}, imageInputRef, handleImageUpload: handleForegroundImageUpload, onOpenImageGallery: handleOpenImageGallery, initialFieldStyles: campaignState.initialFieldStyles, onImageDisplayedSizeChange: () => {}, onCsvDataUpdate: handleCsvRecordContentUpdate, originalImageSize, onZIndexChange: handleZIndexChange, isMobile, onDeselectField: () => setCampaignState({ selectedField: null }), onOpenHtmlEditor: (fieldId) => setEditingField(fieldId), currentPreviewIndex, setCurrentPreviewIndex, onFontScaleChange: (v) => setCampaignState({ fontScale: v }), templateFieldStyles: campaignState.templateFieldStyles, activeStep, addPendingAsset }} />}
              {activeStep === 4 &&
                <PageGeneratorFrontendOnly
                  {...{
                    originalImageSize,
                    fontScale: campaignState.fontScale,
                    handleGenerateSinglePage,
                    aspectRatio,
                    onOpenImageGallery: handleOpenImageGallery,
                    palettes,
                  }}
                />
              }
              {activeStep === 5 && <AudioGenerator fieldPositions={fieldPositions} />}
              {activeStep === 6 && <VideoGenerator2 generatedPages={generatedPagesData} />}
              {activeStep === 7 && (
                <Publisher
                  settings={settings}
                  campaignContent={campaignState.campaignContent}
                  generatedPagesData={generatedPagesData}
                  generatedVideos={generatedVideos}
                  followupPosts={campaignState.followupPosts}
                  onUpdateScheduledPosts={(posts) => setCampaignState(prev => ({ ...prev, followupPosts: posts }))}
                  currentCampaign={currentCampaign}
                  pendingAssets={pendingAssets}
                  setPendingAssets={handleSetPendingAssets}
                  onAssetUploaded={handleAssetUploaded}
                />
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} >
                <Button onClick={handleBack} disabled={activeStep === 0} variant="outlined">Anterior</Button>
                <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300' }} />))}</Box>
                <Tooltip title={isProcessingAudio ? "Processando áudios..." : ""}><Box component="span"><Button onClick={handleNext} disabled={isGenerating || activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1) || isProcessingAudio} variant="contained">Próximo</Button></Box></Tooltip>
              </Box>
            </>
          )}
          {currentView === 'personas' && <PersonasPage {...{ personaDrawerOpen, setPersonaDrawerOpen, onNoPersonaSelected: () => setPersonaDrawerOpen(true), onUpdate: fetchPersonasForCampaign, startInCreateMode: startPersonasInCreate, onPersonaCreated: handlePersonaCreated, onCreationCancelled: () => handleCreationDone('personas') }} />}
          {currentView === 'autores' && <AutoresPage {...{ autorDrawerOpen, setAutorDrawerOpen, onNoAutorSelected: () => setAutorDrawerOpen(true), onUpdate: fetchAutoresForCampaign, startInCreateMode: startAutoresInCreate, onAutorCreated: handleAutorCreated, onCreationCancelled: () => handleCreationDone('autores') }} />}
          {currentView === 'palettes' && <PalettesPage {...{ paletteDrawerOpen, setPaletteDrawerOpen, onNoPaletteSelected: () => setPaletteDrawerOpen(true), onUpdate: fetchPalettesForCampaign }} />}
          {currentView === 'pagesets' && <PageSetsPage {...{ drawerOpen: pageSetDrawerOpen, setDrawerOpen: setPageSetDrawerOpen, onSwitchView: setCurrentView, onNoPageSetSelected: () => setPageSetDrawerOpen(true), onCreationCancelled: () => handleCreationDone('pagesets') }} />}
          {currentView === 'monitor' && <Monitor {...{ currentCampaign }} />}
          {currentView === 'engagement' && <LinkedInEngagement />}
        </Box>
      </Box>
      <UnsavedChangesDialog {...{ open: showUnsavedDialog, onClose: handleDialogClose, onConfirmDiscard: handleDialogDiscard, onConfirmSave: handleDialogSaveAndNavigate }} />
      <SetupModal {...{ open: showSetupModal, onClose: () => setShowSetupModal(false), initialTab: initialSetupTab }} />
      <SaveCampaignModal {...{ open: showSaveModal, onClose: () => setShowSaveModal(false), onSave: handleSaveCampaign, campaignToEdit: currentCampaign, isSaving }} />
      <MemorialDescritivoModal {...{ open: showMemorialDescritivoModal, onClose: () => setShowMemorialDescritivoModal(false), campaignData: memorialCampaignData }} />
      <ImageGallerySelector {...{ open: showImageGallery, onClose: handleCloseImageGallery, onSelect: handleImageSelected, onLocalUpload: handleImageSelected }} />
      <LoadingDialog {...{ open: isGeneratingCampaign || isSaving || isLoading || isGenerating || isFetchingCampaigns, title: isFetchingCampaigns ? "Carregando campanhas..." : generationStatus || (isSaving ? `Salvando... (${uploadProgress.current}/${uploadProgress.total})` : isLoading ? "Carregando..." : "Gerando..."), progress: isSaving ? (uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0) : null }} />
      <TextEditorDialog {...{ open: editingField !== null || editingFollowup !== null, html: isHtmlField, title: `Editar ${editingFollowup ? `Follow-up ${editingFollowup.index + 1}` : editingField}`, content: editingFollowup ? editingFollowup.content : (activeStep === 1 ? campaignState.campaignContent?.[editingField] : (activeStep === 3 ? csvData[currentPreviewIndex]?.[editingField] : '')), onSave: (newContent) => { if (editingFollowup) handleSaveFollowup(newContent); else if (editingField) { if (activeStep === 1) setCampaignState({ campaignContent: { ...campaignState.campaignContent, [editingField]: newContent } }); else if (activeStep === 3) handleCsvRecordContentUpdate(csvData.map((row, i) => i === currentPreviewIndex ? { ...row, [editingField]: newContent } : row)); } setEditingField(null); setEditingFollowup(null); setIsHtmlField(false); }, onClose: () => { setEditingField(null); setEditingFollowup(null); setIsHtmlField(false); } }} />
      <Toaster richColors theme={darkMode ? 'dark' : 'light'} />
    </ThemeProvider>
  );
}

export default HomePage;
