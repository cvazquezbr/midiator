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
import PersonasPage from './PersonasPage';
import AutoresPage from './AutoresPage';
import PalettesPage from './PalettesPage';
import MainAppBar from '../components/MainAppBar';
import Sidebar from '../components/Sidebar';
import PageGeneratorFrontendOnly from '../components/PageGeneratorFrontendOnly';
import AudioGenerator from '../components/AudioGenerator';
import VideoGenerator2 from '../components/VideoGenerator2';
import PostsCurtosStep from '../components/PostsCurtosStep';
import Publisher from '../components/Publisher';
import Monitor from '../components/Monitor';
import SetupModal from '../components/SetupModal';
import SaveCampaignModal from '../components/SaveCampaignModal';
import ImageGallerySelector from '../components/ImageGallerySelector';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';


import { getGeminiApiKey } from '../utils/geminiCredentials';
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
import { getDimensionsFromAspectRatio, dataURLtoBlob } from '../utils/imageComposer.js';
import { autoArrangeFields } from '../utils/autoArrange.js';
import { createNewImageElement } from '../utils/elementFactory.js';
import PageGenerationService from '../services/PageGenerationService.js';

import { setGoogleApiToken, setGoogleApiTokenSetter } from '../utils/googleApi';

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}).join('');

const DEFAULT_IMAGE_SIZE = { width: 720, height: 720 };

function HomePage() {
  const { user, googleAccessToken, setGoogleAccessToken } = useUserAuth();
  const { settings, updateSetting, saveSettings } = useSettings();
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
    csvData, csvHeaders, fieldPositions, fieldStyles, brandElements,
    pageTemplate, selectedField, currentCampaign, generatedPagesData,
    generatedVideos, aspectRatio, pendingAssets, paletteId, customPalette,
    imageColorPalette,
  } = campaignState;

  // Local UI State - not part of the campaign data model
  const [palettes, setPalettes] = useState([]);
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
  const [paletteDrawerOpen, setPaletteDrawerOpen] = useState(!isMobile);
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
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageGalleryTargetIndex, setImageGalleryTargetIndex] = useState(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Local state for campaign-specific settings that don't belong in the main data model
  const [selectedPersonaForCampaign, setSelectedPersonaForCampaign] = useState('');
  const [selectedAutorForCampaign, setSelectedAutorForCampaign] = useState('');
  const [startAutoresInCreate, setStartAutoresInCreate] = useState(false);
  const [startPersonasInCreate, setStartPersonasInCreate] = useState(false);

  // State for unsaved changes guard
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const campaignContentRef = useRef(campaignState.campaignContent);
  campaignContentRef.current = campaignState.campaignContent;

  const handleNavigation = (targetAction) => targetAction();
  const handleDialogClose = () => { setShowUnsavedDialog(false); setNavigationTarget(null); };
  const handleDialogDiscard = () => { setShowUnsavedDialog(false); if (navigationTarget) navigationTarget(); setNavigationTarget(null); };
  const handleDialogSaveAndNavigate = async () => { setShowUnsavedDialog(false); setNavigationTarget(null); };
  const handleRequestNewAutor = () => { setStartAutoresInCreate(true); setCurrentView('autores'); };
  const handleRequestNewPersona = () => { setStartPersonasInCreate(true); setCurrentView('personas'); };
  const handleCreationDone = (view) => { if (view === 'autores') setStartAutoresInCreate(false); else if (view === 'personas') setStartPersonasInCreate(false); setCurrentView('campaigns'); };
  const handleAutorCreated = (newAutor) => { fetchAutoresForCampaign(); if (newAutor?.id) setSelectedAutorForCampaign(newAutor.id); setStartAutoresInCreate(false); setCurrentView('campaigns'); };
  const handlePersonaCreated = (newPersona) => { fetchPersonasForCampaign(); if (newPersona?.id) setSelectedPersonaForCampaign(newPersona.id); setStartPersonasInCreate(false); setCurrentView('campaigns'); };

  // This effect synchronizes the UI state after a campaign is loaded into the context
  useEffect(() => {
    if (!currentCampaign || !campaignState) {
      setIsLoading(false);
      return;
    }
    console.log("Syncing HomePage UI with loaded campaign data:", campaignState);
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
    console.log("HomePage UI sync complete. isLoading set to false.");
  }, [currentCampaign, campaignState]);

  const handleSaveCampaign = async (name) => {
    console.log(`[HomePage] Attempting to save campaign: "${name}"`);
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
        console.log(`[HomePage] Updating existing campaign, ID: ${currentCampaign.id}`);
        result = await updateCampaign(currentCampaign.id, name, campaignDataToSave, pendingAssets, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign, paletteId);
        toast.success(`Campaign "${name}" updated.`);
      } else {
        console.log(`[HomePage] Saving new campaign.`);
        result = await saveCampaign(name, campaignDataToSave, pendingAssets, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign, paletteId);
        toast.success(`Campaign "${name}" saved.`);
      }
      applyLoadedCampaign({
        ...result.campaign,
        pendingAssets: result.pendingAssets || {},
      });
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
    if (user) {
      fetchPersonasForCampaign();
      fetchAutoresForCampaign();
      fetchPalettesForCampaign();
    }
  }, [user, fetchPersonasForCampaign, fetchAutoresForCampaign, fetchPalettesForCampaign]);

  useEffect(() => {
    const checkCampaignsAndSetInitialStep = async () => {
      try {
        const existingCampaigns = await getCampaigns();
        setActiveStep(existingCampaigns?.length > 0 ? 0 : 1);
      } catch (error) {
        toast.error("Could not check for existing campaigns.");
        setActiveStep(1);
      } finally {
        setIsFetchingCampaigns(false);
      }
    };
    if (user) checkCampaignsAndSetInitialStep();
    else { setActiveStep(null); setIsFetchingCampaigns(false); }
  }, [user]);


  useEffect(() => {
    if (googleAccessToken) {
      setGoogleApiToken(googleAccessToken);
      setGoogleApiTokenSetter(setGoogleAccessToken);
    }
  }, [googleAccessToken, setGoogleAccessToken]);

  useEffect(() => {
    if (user) {
      loadSettingsFromDb().catch(err => toast.error(`Could not load settings: ${err.message}`));
    }
  }, [user?.uuid]);

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
    extractColorPalette(pageTemplate?.images?.[0]?.src, (p) => setCampaignState({ imageColorPalette: p }));
  }, [pageTemplate?.images?.[0]?.src, extractColorPalette, setCampaignState]);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);
  useEffect(() => { setOriginalImageSize(getDimensionsFromAspectRatio(aspectRatio) || DEFAULT_IMAGE_SIZE); }, [aspectRatio]);

  useEffect(() => {
    const processMedia = async (mediaArray, onUpdate) => {
      const itemsToProcess = mediaArray.filter(item => item.url && !item.duration);
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
        const newItems = [...currentItems];
        processedItems.forEach(processed => {
          const index = newItems.findIndex(v => v.url === processed.url);
          if (index !== -1) newItems[index] = processed;
        });
        return newItems;
      });
    };
    processMedia(generatedVideos, (updater) => setCampaignState({ generatedVideos: updater(campaignState.generatedVideos) }));
    processMedia(campaignState.generatedAudioData || [], (updater) => setCampaignState({ generatedAudioData: updater(campaignState.generatedAudioData) }));
  }, [generatedVideos, campaignState.generatedAudioData, setCampaignState]);

  const steps = [ { label: 'Minhas Campanhas', description: 'Gerencie suas campanhas existentes ou crie uma nova.', icon: FolderOpenIcon }, { label: 'Campanha', description: 'Criar o material de referência para a campanha.', icon: CampaignIcon }, { label: 'Posts Curtos', description: 'Gere, carregue ou edite os posts para redes sociais.', icon: InsertDriveFileOutlined }, { label: 'Modelo de Página', description: 'Carregue a imagem de fundo, posicione os campos e configure a formatação.', icon: ImageIcon }, { label: 'Edição de Páginas', description: 'Gere as páginas finais.', icon: FormatBold }, { label: 'Gerar Áudio', description: 'Crie a narração para os slides.', icon: Audiotrack }, { label: 'Gerar Vídeo', description: 'Crie um vídeo a partir das imagens geradas.', icon: Movie }, { label: 'Publicar', description: 'Publique o conteúdo no WordPress.', icon: Publish }, { label: 'Monitorar', description: 'Acompanhe as estatísticas de suas publicações.', icon: BarChart } ];

  const handleCreateNewCampaign = () => {
    applyLoadedCampaign({});
    setActiveStep(1);
  };

  const handleEditCampaign = async (campaign) => {
    toast.info(`Carregando "${campaign.name}"...`);
    setIsLoading(true);
    try {
      await checkAuthStatus();
      const loadedCampaign = await loadCampaign(campaign.id);
      applyLoadedCampaign({
        ...loadedCampaign,
        currentCampaign: { id: loadedCampaign.id, name: loadedCampaign.name },
      });
      setSelectedAutorForCampaign(loadedCampaign.autor_id || '');
      setSelectedPersonaForCampaign(loadedCampaign.persona_id || '');
      const dbPaletteId = loadedCampaign.palette_id;
      const hasCustomPalette = loadedCampaign.campaign_data?.customPalette?.colors?.length > 0;
      if (dbPaletteId) setCampaignState({ paletteId: dbPaletteId });
      else if (hasCustomPalette) setCampaignState({ paletteId: 'custom' });
      else setCampaignState({ paletteId: null });
      toast.success(`Campanha "${loadedCampaign.name}" carregada com sucesso!`);
      setActiveStep(3);
    } catch (err) {
      toast.error(`Falha ao carregar campanha: ${err.message}`);
      setIsLoading(false);
    }
  };

  const parseCsvFile = async (file) => {
    if (!file) return;
    try {
      const { data: newCsvData, headers: newHeaders } = await parseCsv(file);
      if (newCsvData?.length > 0) {
        const { newPositions, newStyles } = autoArrangeFields({
          csvHeaders: newHeaders, fieldPositions: {}, fieldStyles: {}, csvData: newCsvData, effectiveImageSize: originalImageSize,
        });
        setCampaignState({
          csvData: newCsvData, csvHeaders: newHeaders, fieldPositions: newPositions, fieldStyles: newStyles, initialFieldStyles: newStyles,
        });
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
    setCampaignState({ selectedField: newImage.id });
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
  const handleNext = () => { if (activeStep === 3) setCampaignState({ templateFieldStyles: fieldStyles }); setActiveStep(p => p + 1); };
  const handleBack = () => setActiveStep(p => p - 1);
  const canProceedToStep = (step) => {
    switch (step) {
      case 1: return true;
      case 2: return campaignState.campaignContent !== null;
      case 3: return csvData.length > 0;
      case 4: return true;
      case 5: if (generatedPagesData.length === 0 || !generatedPagesData.every(img => img.url)) { toast.error("Gere todas as páginas antes de prosseguir."); return false; } return true;
      case 6: if (campaignState.generatedAudioData?.length === 0 && csvData.length > 0) { toast.error("Gere os áudios antes de prosseguir."); return false; } if (campaignState.generatedAudioData?.some(a => !a.duration)) { toast.error("Aguarde o cálculo da duração de todos os áudios."); return false; } return true;
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
    setCampaignState({ fieldPositions: newPositions, brandElements: newBrandElements });
  };

  const handleSidebarStepClick = (index) => { if (isMobile) setSidebarOpen(false); setActiveStep(index); };

  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    setCampaignState(prev => {
      const updates = { csvData: novosRegistros };
      if (JSON.stringify(novasColunas) !== JSON.stringify(prev.csvHeaders)) {
        updates.csvHeaders = novasColunas;
      }
      updates.generatedPagesData = novosRegistros.map((record, index) => {
        const existingPage = prev.generatedPagesData.find(img => img.index === index) || {};
        return { ...existingPage, index, record, url: null, blob: null };
      });
      return updates;
    });
  }, [setCampaignState]);

  const handleCsvRecordContentUpdate = useCallback((newCsvData) => {
    setCampaignState(prev => ({
      csvData: newCsvData,
      generatedPagesData: newCsvData.map((record, index) => {
        const existingPage = prev.generatedPagesData.find(img => img.index === index) || {};
        return { ...existingPage, index, record };
      })
    }));
  }, [setCampaignState]);

  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => {
    setCampaignState(prev => ({
      csvData: prev.csvData.map((row, idx) => idx === recordIndex ? updatedRecord : row)
    }));
  }, [setCampaignState]);

  const handleGenerateCampaignContent = async (regenerate = false) => {
    setIsGeneratingCampaign(true); setCampaignGenerationFailed(false); setGenerationError(''); setGenerationStatus('Iniciando...');
    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';
      const content = await generateCampaignContent({ problema: campaignState.problema, solucao: campaignState.solucao, objetivo: campaignState.objetivo, tomDeVoz: campaignState.tomDeVoz, persona: finalPersona, autor: finalAutor });
      setCampaignState({ campaignContent: content, promptText: `${content.titulo || ''}\n\n${content.conteudo || ''}\n\n${content.cta || ''}` });
      if (regenerate) { toast.success("Conteúdo principal regenerado."); return; }
      setCampaignState({ followupPosts: [] });
      await Promise.all([ handleGenerateSummary(1800, content), handleGenerateSummary(130, content) ]);
      toast.success("Campanha gerada com sucesso!");
    } catch (error) {
      toast.error(`Erro ao gerar conteúdo: ${error.message}`);
      setCampaignState({ campaignContent: null }); setCampaignGenerationFailed(true); setGenerationError(error.message);
    } finally {
      setIsGeneratingCampaign(false); setGenerationStatus('');
    }
  };

  const handleGenerateImage = useCallback(async (content, palette = null) => {
    const finalContent = content || campaignContentRef.current;
    if (!finalContent) { toast.error("Gere o conteúdo do texto primeiro."); return false; }
    setIsGeneratingImage(true);
    try {
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const imagePrompt = await generateCampaignImagePrompt({ content: finalContent, aspectRatio, autor: finalAutor, palette });
      const base64Data = await generateCampaignImage({ prompt: imagePrompt, aspectRatio, colors: palette?.colors || [] });
      const tempUrl = addPendingAsset(dataURLtoBlob(base64Data));
      if (!tempUrl) throw new Error("Falha ao criar URL para a imagem gerada.");
      setCampaignState({ generatedPageUrl: tempUrl });
      addNewImageToCanvas(tempUrl);
      return true;
    } catch (imageError) {
      toast.error(`Erro na geração da imagem: ${imageError.message}`);
      setCampaignState({ generatedPageUrl: null });
      return false;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [aspectRatio, addNewImageToCanvas, addPendingAsset, autorList, selectedAutorForCampaign, setCampaignState]);

  const handleGenerateSummary = async (targetLength, content) => {
    const setLoading = targetLength === 1800 ? setIsGeneratingSummaryMedio : setIsGeneratingSummaryPequeno;
    setLoading(true);
    try {
      const summaryPrompt = `Resuma o seguinte texto para ter no máximo ${targetLength} caracteres, mantendo a essência e o tom: "${stripHtml(content.conteudo)}"`;
      const summary = await geminiAPI.generateContent(summaryPrompt);
      const fieldName = targetLength === 1800 ? 'conteudoMedio' : 'conteudoPequeno';
      setCampaignState({ campaignContent: { ...content, [fieldName]: summary } });
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
      const finalContent = await generateFormattedContent({ content });
      setCampaignState({ campaignContent: { ...content, conteudoFormatado: finalContent } });
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
    setCampaignState({ isGeneratingFollowup: true });
    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign);
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const neededQuantity = followupPostsQuantity - followupPosts.length;
      const plan = await generateFollowupPlan({ content, neededQuantity, existingPosts: followupPosts, persona: finalPersona, autor: finalAutor });
      const newPosts = await generateFollowupPosts({ content, plan, persona: finalPersona, autor: finalAutor });
      setCampaignState({ followupPosts: [...followupPosts, ...newPosts] });
    } catch (error) {
      toast.error(`Erro ao gerar posts de follow-up: ${error.message}`);
    } finally {
      setCampaignState({ isGeneratingFollowup: false });
    }
  };

  const handleResetCampaign = () => setCampaignState({ campaignContent: null, generatedPageUrl: null, followupPosts: [], followupPostsQuantity: 10 });
  const handleEditFollowup = (index, content) => setEditingFollowup({ index, content });
  const handleSaveFollowup = (newContent) => {
    if (editingFollowup === null) return;
    setCampaignState({
      followupPosts: campaignState.followupPosts.map((post, index) => index === editingFollowup.index ? { ...post, conteudo: newContent } : post)
    });
    setEditingFollowup(null);
  };

  const handleGenerateIAContent = async () => {
    setIsGenerating(true); setGenerationStatus('Gerando posts...');
    try {
      const { promptText, promptNumRecords } = campaignState;
      const iaResponseText = await generateIAContent({ promptText, promptNumRecords });
      const parsedResult = parseIaResponseToCsvData(iaResponseText);
      if (!parsedResult?.data?.length) { toast.error('Não foi possível processar a resposta da IA.'); return; }
      const { data: csvDataResult, headers: csvHeadersResult } = parsedResult;
      const { newPositions, newStyles } = autoArrangeFields({ csvHeaders: csvHeadersResult, fieldPositions: {}, fieldStyles: {}, csvData: csvDataResult, effectiveImageSize: originalImageSize });
      const newGeneratedPagesData = csvDataResult.map((record, index) => ({ index, record, blob: null, url: null, filename: `midiator_${String(index + 1).padStart(3, '0')}.png` }));
      setCampaignState({ csvData: csvDataResult, csvHeaders: csvHeadersResult, fieldPositions: newPositions, fieldStyles: newStyles, initialFieldStyles: newStyles, generatedPagesData: newGeneratedPagesData });
      setInputMethod('manual');
      toast.success('Geração de posts concluída.');
    } catch (error) {
      toast.error(`Erro ao gerar conteúdo com IA: ${error.message}`);
    } finally {
      setIsGenerating(false); setGenerationStatus('');
    }
  };

  const handleGenerateSinglePage = async (record, index, fontScale = 1) => {
    const imagePrompt = record.prompt_imagem_carrossel;
    let pageUpdateData = {};
    const pageData = generatedPagesData.find(p => p.index === index);
    let effectivePageTemplate = pageData?.customPageTemplate || pageTemplate;
    if (imagePrompt?.trim()) {
      setGenerationStatus(`Gerando imagem para o post ${index + 1}...`);
      try {
        const sourceStyle = effectivePageTemplate.images?.[0] ? (({ id, src, ...style }) => style)(effectivePageTemplate.images[0]) : { x: 0, y: 0, width: 100, height: 100, zIndex: -1, objectFit: 'cover' };
        const oldImage = (effectivePageTemplate.images || [])[0];
        const base64Data = await generateCampaignImage({ prompt: imagePrompt, aspectRatio, colors: memorialColors });
        if (!base64Data) throw new Error("A IA não conseguiu gerar a imagem.");
        if (oldImage?.src?.startsWith('blob:')) removePendingAsset(oldImage.src);

        // Convert base64 to a managed blob URL
        const imageBlob = dataURLtoBlob(base64Data);
        const managedImageUrl = addPendingAsset(imageBlob);
        if (!managedImageUrl) throw new Error("Falha ao registrar a imagem gerada.");

        const newImage = { ...createNewImageElement(managedImageUrl), ...sourceStyle, visible: true };
        const finalImages = (effectivePageTemplate.images?.length > 0) ? [newImage, ...effectivePageTemplate.images.slice(1)] : [newImage];
        effectivePageTemplate = { ...effectivePageTemplate, images: finalImages };
        pageUpdateData.customPageTemplate = effectivePageTemplate;
      } catch (error) {
        toast.error(`Falha na Imagem (Post #${index + 1}): ${error.message}`);
      }
    }
    setGenerationStatus(`Gerando página para o post ${index + 1}/${csvData.length}...`);
    try {
      const finalPageData = await PageGenerationService.generatePageImage({
        record,
        index,
        campaignContext: campaignState,
        pageData: { ...(pageData || {}), customPageTemplate: effectivePageTemplate, fontScale },
      });
      const tempUrl = addPendingAsset(finalPageData.blob);
      if (!tempUrl) throw new Error("Falha ao criar URL para a página final.");

      // Correctly update the specific page data within the generatedPagesData array
      setCampaignState(prev => {
        const newPagesData = prev.generatedPagesData.map(p => {
          if (p.index === index) {
            // Merge existing data, new data from generation, and any other updates
            return {
              ...(p || {}),
              ...finalPageData,
              ...pageUpdateData,
              url: tempUrl,
              dataUrl: null, // Clear any old data URLs
              blob: undefined // Don't store the blob in the state
            };
          }
          return p;
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
        <MainAppBar {...{ darkMode, setDarkMode, setShowSetupModal, onMenuClick: () => setSidebarOpen(!sidebarOpen), isMobile, onSaveCampaign: () => setShowSaveModal(true), onShowPersonas: () => handleNavigation(() => setCurrentView('personas')), onShowAutores: () => handleNavigation(() => setCurrentView('autores')), onShowPalettes: () => handleNavigation(() => setCurrentView('palettes')), onShowCampaigns: () => handleNavigation(() => setCurrentView('campaigns')), currentView, onPersonaMenuClick: () => setPersonaDrawerOpen(!personaDrawerOpen), onAutorMenuClick: () => setAutorDrawerOpen(!autorDrawerOpen), onPaletteMenuClick: () => setPaletteDrawerOpen(!paletteDrawerOpen), isDrawerOpen: currentView === 'personas' ? personaDrawerOpen : currentView === 'autores' ? autorDrawerOpen : currentView === 'palettes' ? paletteDrawerOpen : sidebarOpen, onShowMemorial: () => setShowMemorialDescritivoModal(true), isCampaignOpen: currentCampaign !== null }} />
        {currentView === 'campaigns' && (
          <>
            <Sidebar {...{ sidebarOpen, darkMode, steps, activeStep, csvData, backgroundImageSrc: pageTemplate?.images?.[0]?.src, visibleFields, totalFields, styledFields, variant: isMobile ? 'temporary' : 'persistent', onClose: () => setSidebarOpen(false), onStepClick: handleSidebarStepClick }} />
            {!isMobile && <Fab size="small" onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ position: 'fixed', top: '50%', left: sidebarOpen ? 320 - 20 : 0, transform: 'translateY(-50%)', zIndex: (theme) => theme.zIndex.drawer + 1, transition: 'left 0.2s ease-in-out' }} >{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}</Fab>}
          </>
        )}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, transition: theme.transitions.create('margin', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }) }} >
          <Toolbar />
          {currentView === 'campaigns' && (
            <>
              {activeStep === 0 && <MyCampaignsStep {...{ onEditCampaign: handleEditCampaign, onCreateNew: handleCreateNewCampaign, autorList, personaList }} />}
              {activeStep === 1 && <Campaign {...{ steps, activeStep, ...campaignState, setCampaignState, isGeneratingCampaign, campaignGenerationFailed, generationError, handleGenerateCampaignContent, handleResetCampaign, handleExportHtml: () => exportHtml(memorialCampaignData), editingField, setEditingField: (field) => { setEditingField(field); setIsHtmlField(field === 'conteudoFormatado'); }, isGeneratingSummaryMedio, handleGenerateSummary, isGeneratingSummaryPequeno, isGeneratingConteudoFormatado, handleGenerateFormattedContent, isGeneratingFollowup: campaignState.isGeneratingFollowup, handleGenerateFollowupPosts, isGeneratingImage, handleGenerateImage, onEditFollowup: handleEditFollowup, palettes, selectedAutorForCampaign, setSelectedAutorForCampaign, selectedPersonaForCampaign, setSelectedPersonaForCampaign, onRequestNewAutor: handleRequestNewAutor, onRequestNewPersona: handleRequestNewPersona }} />}
              {activeStep === 2 && <PostsCurtosStep {...{ steps, inputMethod, setInputMethod, handleDrop, handleDragOver, fileInputRef, handleCSVUpload, downloadExampleCsv, setShowSetupModal, promptNumRecords: campaignState.promptNumRecords, setPromptNumRecords: (v) => setCampaignState({ promptNumRecords: v }), promptText: campaignState.promptText, setPromptText: (v) => setCampaignState({ promptText: v }), handleGenerateIAContent, isGenerating, csvData, csvHeaders, onDadosAlterados: handleDadosAlterados, darkMode, exportCsv: () => exportCsv(csvData, csvHeaders), aspectRatio, setAspectRatio: (v) => setCampaignState({ aspectRatio: v }), sidebarOpen }} />}
              {activeStep === 3 && <ImageStep {...{ steps, isDraggingOverImage: false, handleImageDrop: (e) => handleImageSelected(e.dataTransfer.files[0]), handleImageDragOver, handleImageDragEnter: () => {}, handleImageDragLeave: () => {}, imageInputRef, handleImageUpload: handleForegroundImageUpload, onOpenImageGallery: handleOpenImageGallery, initialFieldStyles: campaignState.initialFieldStyles, onImageDisplayedSizeChange: () => {}, onCsvDataUpdate: handleCsvRecordContentUpdate, originalImageSize, onZIndexChange: handleZIndexChange, isMobile, onDeselectField: () => setCampaignState({ selectedField: null }), onOpenHtmlEditor: (fieldId) => setEditingField(fieldId), currentPreviewIndex, setCurrentPreviewIndex, onFontScaleChange: (v) => setCampaignState({ fontScale: v }), templateFieldStyles: campaignState.templateFieldStyles, activeStep, addPendingAsset }} />}
              {activeStep === 4 && <PageGeneratorFrontendOnly {...{ originalImageSize, fontScale: campaignState.fontScale, handleGenerateSinglePage, aspectRatio, onOpenImageGallery: handleOpenImageGallery }} />}
              {activeStep === 5 && <AudioGenerator onAudiosGenerated={(audios) => setCampaignState({ generatedAudioData: audios })} initialAudioData={campaignState.generatedAudioData} />}
              {activeStep === 6 && <VideoGenerator2 onVideoGenerated={(assets) => { setCampaignState(p => ({ generatedVideos: [...p.generatedVideos, ...assets] })); addPendingAssetMap(Object.fromEntries(assets.flatMap(a => [[a.url, a.blob], [a.thumbnailUrl, a.thumbnailBlob]]).filter(e => e[0]))); }} onUpdateVideos={(videos) => setCampaignState({ generatedVideos: videos })} onNewAsset={addPendingAsset} />}
              {activeStep === 7 && <Publisher {...{ settings, ...campaignState, onUpdateScheduledPosts: (posts) => setCampaignState({ followupPosts: posts }) }} />}
              {activeStep === 8 && <Monitor {...{ currentCampaign }} />}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} >
                <Button onClick={handleBack} disabled={activeStep === 0} variant="outlined">Anterior</Button>
                <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300' }} />))}</Box>
                <Tooltip title={isProcessingAudio ? "Processando áudios..." : ""}><Box component="span"><Button onClick={handleNext} disabled={isGenerating || activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1) || isProcessingAudio} variant="contained">Próximo</Button></Box></Tooltip>
              </Box>
            </>
          )}
          {currentView === 'personas' && <PersonasPage {...{ personaDrawerOpen, setPersonaDrawerOpen, onNoPersonaSelected: () => setPersonaDrawerOpen(true), onUpdate: fetchPersonasForCampaign, startInCreateMode: startPersonasInCreate, onPersonaCreated: handlePersonaCreated, onCreationCancelled: () => handleCreationDone('personas') }} />}
          {currentView === 'autores' && <AutoresPage {...{ autorDrawerOpen, setAutorDrawerOpen, onNoAutorSelected: () => setAutorDrawerOpen(true), onUpdate: fetchAutoresForCampaign, startInCreateMode: startAutoresInCreate, onAutorCreated: handleAutorCreated, onCreationCancelled: () => handleCreationDone('autores') }} />}
          {currentView === 'palettes' && <PalettesPage {...{ paletteDrawerOpen, setPaletteDrawerOpen, onNoPaletteSelected: () => setPaletteDrawerOpen(true) }} />}
        </Box>
      </Box>
      <UnsavedChangesDialog {...{ open: showUnsavedDialog, onClose: handleDialogClose, onConfirmDiscard: handleDialogDiscard, onConfirmSave: handleDialogSaveAndNavigate }} />
      <SetupModal {...{ open: showSetupModal, onClose: () => setShowSetupModal(false), initialTab: initialSetupTab }} />
      <SaveCampaignModal {...{ open: showSaveModal, onClose: () => setShowSaveModal(false), onSave: handleSaveCampaign, campaignToEdit: currentCampaign, isSaving }} />
      <MemorialDescritivoModal {...{ open: showMemorialDescritivoModal, onClose: () => setShowMemorialDescritivoModal(false), campaignData: memorialCampaignData }} />
      <ImageGallerySelector {...{ open: showImageGallery, onClose: handleCloseImageGallery, onSelect: handleImageSelected, onLocalUpload: (e) => handleImageSelected(e.target.files[0]) }} />
      <LoadingDialog {...{ open: isGeneratingCampaign || isSaving || isLoading || isGenerating || isFetchingCampaigns, title: isFetchingCampaigns ? "Carregando campanhas..." : generationStatus || (isSaving ? `Salvando... (${uploadProgress.current}/${uploadProgress.total})` : isLoading ? "Carregando..." : "Gerando..."), progress: isSaving ? (uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0) : null }} />
      <TextEditorDialog {...{ open: editingField !== null || editingFollowup !== null, html: isHtmlField, title: `Editar ${editingFollowup ? `Follow-up ${editingFollowup.index + 1}` : editingField}`, content: editingFollowup ? editingFollowup.content : (activeStep === 1 ? campaignState.campaignContent?.[editingField] : (activeStep === 3 ? csvData[currentPreviewIndex]?.[editingField] : '')), onSave: (newContent) => { if (editingFollowup) handleSaveFollowup(newContent); else if (editingField) { if (activeStep === 1) setCampaignState({ campaignContent: { ...campaignState.campaignContent, [editingField]: newContent } }); else if (activeStep === 3) handleCsvRecordContentUpdate(csvData.map((row, i) => i === currentPreviewIndex ? { ...row, [editingField]: newContent } : row)); } setEditingField(null); setEditingFollowup(null); setIsHtmlField(false); }, onClose: () => { setEditingField(null); setEditingFollowup(null); setIsHtmlField(false); } }} />
      <Toaster richColors theme={darkMode ? 'dark' : 'light'} />
    </ThemeProvider>
  );
}

export default HomePage;