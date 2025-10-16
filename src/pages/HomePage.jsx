// Re-submitting the fix for the persona saving bug.
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
import { drawAndComposeImage, getDimensionsFromAspectRatio } from '../utils/imageComposer.js';
import { autoArrangeFields } from '../utils/autoArrange.js';
import PageGenerationService from '../services/PageGenerationService.js';

import { setGoogleApiToken, setGoogleApiTokenSetter, findFolderByName, createFolder, uploadFile } from '../utils/googleApi';

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}).join('');

import { createNewImageElement } from '../utils/elementFactory.js';

const DEFAULT_IMAGE_SIZE = { width: 720, height: 720 };

const dataURLtoBlob = (dataurl) => {
  if (!dataurl) return null;
  const arr = dataurl.split(',');
  if (arr.length < 2) return null;
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) return null;
  const mime = mimeMatch[1];
  const bstr = atob(arr[1].split(';base64,').pop());
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
};

function HomePage() {
  const { user, googleAccessToken, setGoogleAccessToken } = useUserAuth();
  const { settings, updateSetting, saveSettings } = useSettings();
  const {
    setCampaignState,
    addPendingAsset,
    addPendingAssetMap,
    removePendingAsset,
    applyLoadedCampaign,
    defaultPageTemplate,
    ...campaignState
  } = useCampaign();

  const {
    csvData,
    csvHeaders,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    selectedField,
    currentCampaign,
    generatedPagesData,
    generatedVideos,
    aspectRatio,
    pendingAssets,
    paletteId,
    customPalette,
    imageColorPalette,
  } = campaignState;

  // Component State
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
  const [generatedPageUrl, setGeneratedPageUrl] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingSummaryMedio, setIsGeneratingSummaryMedio] = useState(false);
  const [isGeneratingSummaryPequeno, setIsGeneratingSummaryPequeno] = useState(false);
  const [isGeneratingConteudoFormatado, setIsGeneratingConteudoFormatado] = useState(false);
  const [followupPosts, setFollowupPosts] = useState([]);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [followupPostsQuantity, setFollowupPostsQuantity] = useState(10);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedImages, setSelectedImages] = useState({});
  const [selectedVideos, setSelectedVideos] = useState({});
  const [inputMethod, setInputMethod] = useState('ia');
  const [promptNumRecords, setPromptNumRecords] = useState(10);
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(true);
  const [initialFieldStyles, setInitialFieldStyles] = useState({});
  const [templateFieldStyles, setTemplateFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [generatedAudioData, setGeneratedAudioData] = useState([]);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [initialSetupTab, setInitialSetupTab] = useState(0);
  const [showMemorialDescritivoModal, setShowMemorialDescritivoModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageGalleryTargetIndex, setImageGalleryTargetIndex] = useState(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [fontScale, setFontScale] = useState(1);

  const [selectedPersonaForCampaign, setSelectedPersonaForCampaign] = useState('');
  const [selectedAutorForCampaign, setSelectedAutorForCampaign] = useState('');
  const [startAutoresInCreate, setStartAutoresInCreate] = useState(false);
  const [startPersonasInCreate, setStartPersonasInCreate] = useState(false);

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

  const handleRequestNewAutor = () => {
    setStartAutoresInCreate(true);
    setCurrentView('autores');
  };

  const handleRequestNewPersona = () => {
    setStartPersonasInCreate(true);
    setCurrentView('personas');
  };

  const handleCreationDone = (view) => {
    if (view === 'autores') {
      setStartAutoresInCreate(false);
    } else if (view === 'personas') {
      setStartPersonasInCreate(false);
    }
    setCurrentView('campaigns');
  };

  const handleAutorCreated = (newAutor) => {
    fetchAutoresForCampaign();
    if (newAutor && newAutor.id) {
      setSelectedAutorForCampaign(newAutor.id);
    }
    setStartAutoresInCreate(false);
    setCurrentView('campaigns');
  };

  const handlePersonaCreated = (newPersona) => {
    fetchPersonasForCampaign();
    if (newPersona && newPersona.id) {
      setSelectedPersonaForCampaign(newPersona.id);
    }
    setStartPersonasInCreate(false);
    setCurrentView('campaigns');
  };


  const handleSaveCampaign = async (name) => {
    console.log(`[HomePage] Attempting to save campaign: "${name}"`);

    const campaignDataToSave = {
      activeStep,
      problema,
      solucao,
      objetivo,
      tomDeVoz,
      campaignContent,
      aspectRatio,
      promptText,
      followupPosts,
      followupPostsQuantity,
      fieldPositions,
      fieldStyles,
      templateFieldStyles,
      brandElements,
      pageTemplate,
      generatedPageUrl,
      generatedPagesData,
      generatedAudioData,
      generatedVideos,
      csvData,
      csvHeaders,
      customPalette,
    };

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

    const sanitizeMediaArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(item => {
        const sanitizedItem = { ...item };
        delete sanitizedItem.blob;
        delete sanitizedItem.file;
        delete sanitizedItem.thumbnailBlob;
        return sanitizedItem;
      });
    };

    const sanitizedCampaignData = {
      ...campaignDataToSave,
      generatedPagesData: sanitizeMediaArray(campaignDataToSave.generatedPagesData),
      brandElements: sanitizeMediaArray(campaignDataToSave.brandElements),
      generatedAudioData: sanitizeMediaArray(campaignDataToSave.generatedAudioData),
      generatedVideos: sanitizeMediaArray(campaignDataToSave.generatedVideos),
      pageTemplate: {
        ...campaignDataToSave.pageTemplate,
        images: sanitizeMediaArray(campaignDataToSave.pageTemplate.images),
      },
    };

    setIsSaving(true);
    setUploadProgress({ current: 0, total: 0 });
    try {
      let result;
      if (currentCampaign) {
        console.log(`[HomePage] Updating existing campaign, ID: ${currentCampaign.id}`);
        result = await updateCampaign(currentCampaign.id, name, sanitizedCampaignData, pendingAssets, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign, paletteId);
        toast.success(`Campaign "${name}" updated.`);
      } else {
        console.log(`[HomePage] Saving new campaign.`);
        result = await saveCampaign(name, sanitizedCampaignData, pendingAssets, setUploadProgress, user.uuid, selectedAutorForCampaign, selectedPersonaForCampaign, paletteId);
        toast.success(`Campaign "${name}" saved.`);
      }

      // After a successful save, the 'result' contains the fully re-hydrated campaign data
      // and the new pendingAssets map. We must apply this new state to the context.
      const { campaign: rehydratedCampaign, pendingAssets: newPendingAssets } = result;

      if (rehydratedCampaign && rehydratedCampaign.campaign_data) {
        console.log("[HomePage] Save successful. Synchronizing component state with re-hydrated data.");

        // 1. Update the context with the new map of pending assets
        setPendingAssets(newPendingAssets || {});

        // 2. Update the rest of the UI state using the hydrated campaign data
        applyAppState(rehydratedCampaign.campaign_data);

        // 3. Update the top-level currentCampaign object to keep it in sync
        setCurrentCampaign(rehydratedCampaign);

      } else {
        console.warn("[HomePage] Save operation did not return a re-hydrated state to synchronize.");
        setPendingAssets({}); // Clear pending assets as a fallback
      }

      console.log("[HomePage] Save/Update operation completed successfully.");
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

  const fetchPalettesForCampaign = useCallback(() => {
    return getPalettes()
      .then(setPalettes)
      .catch(err => {
        console.error("Failed to fetch palettes for campaign step:", err);
        toast.error('Could not load palettes for campaign dropdown.');
      });
  }, []);

  useEffect(() => {
    // Fetch personas, autores, and palettes for the campaign step dropdown
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
    console.log('[HomePage] pageTemplate state changed:', pageTemplate);
    // When the last image is removed, reset the originalImageSize.
    if (!pageTemplate.images || pageTemplate.images.length === 0) {
      setOriginalImageSize(DEFAULT_IMAGE_SIZE);
    }
  }, [pageTemplate]);

  const extractColorPalette = useCallback((url, setter) => {
    let finalUrl = url;
    if (url && url.includes('blob.vercel-storage.com')) {
      finalUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    const img = new Image();
    if (!finalUrl.startsWith('/api/')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 5);
        setter(palette ? palette.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2])) : []);
      } catch (e) {
        console.error("Error extracting palette from image:", e);
        setter([]);
      }
    };
    img.onerror = () => {
      console.error("Failed to load image for color extraction, clearing swatches.");
      setter([]);
    }
    img.src = finalUrl;
    if (img.complete) {
      img.onload();
    }
  }, []);

  // Effect to extract color palette from the primary image
  useEffect(() => {
    const firstImage = pageTemplate?.images?.[0];
    if (firstImage?.src) {
      extractColorPalette(firstImage.src, setImageColorPalette);
    } else {
      // If there's no image, ensure the image palette is empty.
      // The fallback to the campaign palette will be handled by the UI components.
      setImageColorPalette([]);
    }
  }, [pageTemplate?.images?.[0]?.src, extractColorPalette, setImageColorPalette]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const newSize = getDimensionsFromAspectRatio(aspectRatio) || DEFAULT_IMAGE_SIZE;
    setOriginalImageSize(newSize);
  }, [aspectRatio]);

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
            setInitialSetupTab(4);
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

  useEffect(() => {
    const processVideos = async () => {
      const videosToProcess = generatedVideos.filter(v => v.url && !v.duration);
      if (videosToProcess.length === 0) return;

      const promises = videosToProcess.map(videoData => {
        return new Promise((resolve) => {
          const videoElement = document.createElement('video');
          videoElement.preload = 'metadata';

          videoElement.onloadedmetadata = () => {
            resolve({
              ...videoData,
              duration: videoElement.duration
            });
          };

          videoElement.onerror = (e) => {
            console.error('Error loading video metadata for', videoData.url, e);
            // Resolve with original data so we don't lose the video
            resolve(videoData);
          };

          videoElement.src = videoData.url;
        });
      });

      const processedVideos = await Promise.all(promises);

      setCampaignState(prev => {
        const newCurrentVideos = [...prev.generatedVideos];
        processedVideos.forEach(processedVideo => {
          const index = newCurrentVideos.findIndex(v => v.url === processedVideo.url);
          if (index !== -1) {
            newCurrentVideos[index] = processedVideo;
          }
        });
        return { ...prev, generatedVideos: newCurrentVideos };
      });
    };

    processVideos();
  }, [generatedVideos, setCampaignState]);

  // Processes audio files that are loaded or generated to calculate their duration,
  // which is needed for video generation. Disables the UI while processing.
  useEffect(() => {
    const processAudios = async () => {
      const audiosToProcess = generatedAudioData.filter(a => a && a.url && !a.duration);
      if (audiosToProcess.length === 0) {
        setIsProcessingAudio(false);
        return;
      }

      setIsProcessingAudio(true);
      toast.info(`Processando ${audiosToProcess.length} áudio(s) para calcular a duração...`);

      const promises = audiosToProcess.map(audioData => {
        return new Promise((resolve) => {
          const audioElement = document.createElement('audio');
          audioElement.preload = 'metadata';

          audioElement.onloadedmetadata = () => {
            resolve({ ...audioData, duration: audioElement.duration });
          };

          audioElement.onerror = (e) => {
            console.error('Error loading audio metadata for', audioData.url, e);
            resolve(audioData); // Resolve with original data on error
          };

          // Use the blob from pendingAssets if available, otherwise use the URL
          const blob = pendingAssets[audioData.url];
          let tempUrl = null;
          try {
            if (blob) {
              tempUrl = URL.createObjectURL(blob);
              audioElement.src = tempUrl;
            } else {
              audioElement.src = audioData.url;
            }
          } finally {
            // Ensure the temporary URL is revoked after the metadata is loaded or an error occurs.
            if (tempUrl) {
              audioElement.addEventListener('loadedmetadata', () => URL.revokeObjectURL(tempUrl), { once: true });
              audioElement.addEventListener('error', () => URL.revokeObjectURL(tempUrl), { once: true });
            }
          }
        });
      });

      try {
        const processedAudios = await Promise.all(promises);

        const updatedAudios = campaignState.generatedAudioData.map(originalAudio => {
          const processed = processedAudios.find(p => p.url === originalAudio.url);
          return processed || originalAudio;
        });

        setCampaignState(prev => ({ ...prev, generatedAudioData: updatedAudios }));
        toast.success("Durações de áudio calculadas com sucesso!");
      } catch (error) {
        toast.error("Ocorreu um erro ao processar os áudios.");
        console.error("Audio processing failed:", error);
      } finally {
        setIsProcessingAudio(false);
      }
    };

    processAudios();
  }, [generatedAudioData]);

  const steps = [ { label: 'Minhas Campanhas', description: 'Gerencie suas campanhas existentes ou crie uma nova.', icon: FolderOpenIcon }, { label: 'Campanha', description: 'Criar o material de referência para a campanha.', icon: CampaignIcon }, { label: 'Posts Curtos', description: 'Gere, carregue ou edite os posts para redes sociais.', icon: InsertDriveFileOutlined }, { label: 'Modelo de Página', description: 'Carregue a imagem de fundo, posicione os campos e configure a formatação.', icon: ImageIcon }, { label: 'Edição de Páginas', description: 'Gere as páginas finais.', icon: FormatBold }, { label: 'Gerar Áudio', description: 'Crie a narração para os slides.', icon: Audiotrack }, { label: 'Gerar Vídeo', description: 'Crie um vídeo a partir das imagens geradas.', icon: Movie }, { label: 'Publicar', description: 'Publique o conteúdo no WordPress.', icon: Publish }, { label: 'Monitorar', description: 'Acompanhe as estatísticas de suas publicações.', icon: BarChart } ];
  const handleCreateNewCampaign = () => {
    setCampaignState(prev => ({
      ...initialCampaignState,
      // Preserve settings that shouldn't be reset
      pendingAssets: prev.pendingAssets,
    }));
    setOriginalImageSize(DEFAULT_IMAGE_SIZE);
    setActiveStep(1);
  };

  const handleEditCampaign = async (campaign) => {
    toast.info(`Carregando "${campaign.name}" para edição...`);
    try {
      await checkAuthStatus();
    } catch (error) {
      toast.error(error.message);
      return;
    }

    setIsLoading(true);
    try {
      const completeState = await loadCampaign(campaign.id);

      // The context will handle setting all of its state.
      applyLoadedCampaign(completeState);

      // Now, set the state that is local to HomePage.
      const { campaignData: state, autorId, personaId } = completeState;
      setSelectedAutorForCampaign(autorId);
      setSelectedPersonaForCampaign(personaId);
      setActiveStep(3);

      const firstImageSrc = state.pageTemplate?.images?.[0]?.src;
      if (firstImageSrc) {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
              setOriginalImageSize({ width: img.width, height: img.height });
              extractColorPalette(firstImageSrc, setImageColorPalette);
          };
          img.onerror = () => {
              setOriginalImageSize(DEFAULT_IMAGE_SIZE);
              setImageColorPalette([]);
          };
          const blob = completeState.pendingAssets[firstImageSrc];
          if (blob) {
            img.src = URL.createObjectURL(blob);
          } else {
            img.src = firstImageSrc;
          }
      } else {
          setOriginalImageSize(getDimensionsFromAspectRatio(state.aspectRatio) || DEFAULT_IMAGE_SIZE);
      }

      setProblema(state.problema ?? '');
      setSolucao(state.solucao ?? '');
      setObjetivo(state.objetivo ?? '');
      setTomDeVoz(state.tomDeVoz ?? '');
      setCampaignContent(state.campaignContent ?? null);
      setFollowupPosts(state.followupPosts ?? []);
      setFollowupPostsQuantity(state.followupPostsQuantity ?? 10);
      setPromptText(state.promptText ?? '');

      toast.success(`Campanha "${completeState.campaign.name}" carregada com sucesso!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  const parseCsvFile = async (file) => {
    if (!file) return;
    try {
      const { data: newCsvData, headers: newHeaders } = await parseCsv(file);
      if (newCsvData && newCsvData.length > 0) {
        const { newPositions, newStyles } = autoArrangeFields({
          csvHeaders: newHeaders,
          fieldPositions: {},
          fieldStyles: {},
          csvData: newCsvData,
          effectiveImageSize: originalImageSize,
        });

        setCampaignState(prev => ({
          ...prev,
          csvData: newCsvData,
          csvHeaders: newHeaders,
          fieldPositions: newPositions,
          fieldStyles: newStyles,
        }));
        setInitialFieldStyles(newStyles); // This is local HomePage state
        setInputMethod('manual'); // This is local HomePage state
      }
    } catch (error) {
      toast.error(error.message || 'Ocorreu um erro desconhecido ao processar o arquivo CSV.');
    }
  };
  const handleCSVUpload = (event) => { const file = event.target.files[0]; parseCsvFile(file); };
  const handleDrop = (event) => { event.preventDefault(); event.stopPropagation(); const file = event.dataTransfer.files[0]; parseCsvFile(file); };
  const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };

  const handleOpenImageGallery = (index = null) => {
    console.log(`[HomePage] Opening image gallery for index: ${index}`);
    setImageGalleryTargetIndex(index);
    setShowImageGallery(true);
  };

  const handleCloseImageGallery = () => {
    setShowImageGallery(false);
    setImageGalleryTargetIndex(null);
  };

  const addNewImageToCanvas = useCallback((imageUrl) => {
    console.log(`[HomePage] addNewImageToCanvas called. Target index: ${imageGalleryTargetIndex}`);
    const newImage = createNewImageElement(imageUrl);

    setCampaignState(prev => {
      const newState = { ...prev, selectedField: newImage.id };

      if (typeof imageGalleryTargetIndex === 'number') {
        const pageIndex = imageGalleryTargetIndex;
        if (pageIndex < 0 || pageIndex >= prev.generatedPagesData.length) {
          console.error("Invalid page index for custom template update:", pageIndex);
          toast.error(`Falha ao adicionar imagem: índice de página inválido (${pageIndex}).`);
          return prev;
        }

        const newGeneratedPagesData = prev.generatedPagesData.map((page, index) => {
          if (index !== pageIndex) return page;

          const baseTemplate = page.customPageTemplate || JSON.parse(JSON.stringify(prev.pageTemplate));
          const newCustomTemplate = {
            ...baseTemplate,
            images: [...(baseTemplate.images || []), newImage],
          };
          return { ...page, customPageTemplate: newCustomTemplate };
        });

        toast.success(`Imagem adicionada à página ${imageGalleryTargetIndex + 1}.`);
        return { ...newState, generatedPagesData: newGeneratedPagesData };

      } else {
        const newPageTemplate = {
          ...prev.pageTemplate,
          images: [...(prev.pageTemplate.images || []), newImage],
        };
        console.log('[HomePage] Image added to global page template.');
        toast.success('Imagem adicionada ao modelo.');
        return { ...newState, pageTemplate: newPageTemplate };
      }
    });

    // The color palette logic can remain global as it's a UI hint.
    extractColorPalette(imageUrl, (palette) => setCampaignState(prev => ({ ...prev, imageColorPalette: palette })));
  }, [imageGalleryTargetIndex, setCampaignState, extractColorPalette]);

  const parseImageFile = (file) => {
    if (!file) return;
    handleImageSelected(file);
  };
  const handleImageUpload = (event) => { const file = event.target.files[0]; parseImageFile(file); };
  const handleImageDrop = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); const file = event.dataTransfer.files[0]; parseImageFile(file); };
  const handleImageDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
  const handleImageDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(true); };
  const handleImageDragLeave = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); };

  const handleForegroundImageUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const tempUrl = addPendingAsset(file);
    if (tempUrl) {
      addNewImageToCanvas(tempUrl);
    } else {
      toast.error("Não foi possível criar uma URL local para a imagem carregada.");
    }
  }, [addNewImageToCanvas, addPendingAsset]);

  const handleImageSelected = useCallback((file) => {
    if (!file) {
      toast.warning("Nenhum arquivo de imagem foi selecionado.");
      return;
    }

    // The file object from the gallery or local upload is used directly.
    const managedUrl = addPendingAsset(file);

    if (managedUrl) {
      // addNewImageToCanvas correctly appends the new image to the template
      // or to the specific page being edited.
      addNewImageToCanvas(managedUrl);
    } else {
      toast.error("Houve um erro ao registrar a imagem como um ativo pendente.");
    }
  }, [addPendingAsset, addNewImageToCanvas]);

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
      case 5:
        if (generatedPagesData.length === 0 || !generatedPagesData.every(img => img.blob || img.url)) {
          toast.error("Por favor, gere todas as páginas na etapa 4 antes de prosseguir.");
          return false;
        }
        return true;
      case 6: // From Audio to Video
        if (generatedAudioData.length === 0 && csvData.length > 0) {
          toast.error("Por favor, gere os áudios na etapa 5 antes de prosseguir.");
          return false;
        }
        if (generatedAudioData.some(audio => !audio.duration || audio.duration <= 0)) {
          toast.error("Aguarde o cálculo da duração de todos os áudios antes de prosseguir.");
          return false;
        }
        return true;
      default: return true;
    }
  };
  const getFieldStats = () => { const visibleFields = Object.values(fieldPositions).filter(pos => pos.visible).length; const totalFields = csvHeaders.length; const styledFields = Object.keys(fieldStyles).length; return { visibleFields, totalFields, styledFields }; };
  const { visibleFields, totalFields, styledFields } = getFieldStats();
  const handleZIndexChange = (elementId, action) => {
    if (!elementId) return;
    setCampaignState(prev => {
      let allElements = [
        ...Object.entries(prev.fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, isBrand: false })),
        ...prev.brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, isBrand: true })),
      ];
      allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      const currentIndex = allElements.findIndex(el => el.id === elementId);
      if (currentIndex === -1) return prev;

      const [currentElement] = allElements.splice(currentIndex, 1);
      switch (action) {
        case 'front': allElements.push(currentElement); break;
        case 'back': allElements.unshift(currentElement); break;
        case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement); break;
        case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement); break;
        default: allElements.splice(currentIndex, 0, currentElement); return prev;
      }

      const newPositions = { ...prev.fieldPositions };
      const newBrandElements = [...prev.brandElements];
      allElements.forEach((el, index) => {
        el.zIndex = index;
        if (el.isBrand) {
          const brandEl = newBrandElements.find(b => b.id === el.id);
          if (brandEl) brandEl.zIndex = index;
        } else {
          if (newPositions[el.id]) newPositions[el.id].zIndex = index;
        }
      });
      return { ...prev, fieldPositions: newPositions, brandElements: newBrandElements };
    });
  };
  const handleSidebarStepClick = (index) => {
    handleNavigation(() => {
      setActiveStep(index);
      if (isMobile) {
        setSidebarOpen(false);
      }
    });
  };
  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    setCampaignState(prev => {
      const newState = { ...prev, csvData: novosRegistros };
      if (JSON.stringify(novasColunas) !== JSON.stringify(prev.csvHeaders)) {
        newState.csvHeaders = novasColunas;
      }
      newState.generatedPagesData = novosRegistros.map((record, index) => {
        const existingPage = prev.generatedPagesData.find(img => img.index === index);
        if (existingPage) return { ...existingPage, record: record };
        return {
          index, record, blob: null, url: null,
          filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
          customFieldPositions: null, customFieldStyles: null,
          customBrandElements: null, customImageFilters: null, fontScale: 1,
        };
      });
      return newState;
    });
  }, [setCampaignState]);
  const handleCsvRecordContentUpdate = useCallback((newCsvData) => {
    setCampaignState(prev => ({
      ...prev,
      csvData: newCsvData,
      generatedPagesData: newCsvData.map((record, index) => {
        const existingPage = prev.generatedPagesData.find(img => img.index === index);
        if (existingPage) return { ...existingPage, record: record };
        return {
          index, record, blob: null, url: null,
          filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
          customFieldPositions: null, customFieldStyles: null,
          customBrandElements: null, customImageFilters: null, fontScale: 1,
        };
      }),
    }));
  }, [setCampaignState]);
  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => {
    setCampaignState(prev => {
      if (recordIndex < 0 || recordIndex >= prev.csvData.length) return prev;
      const newCsvData = prev.csvData.map((row, idx) => (idx === recordIndex ? updatedRecord : row));
      return { ...prev, csvData: newCsvData };
    });
  }, [setCampaignState]);

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
      setCampaignState(prev => ({ ...prev, campaignContent: normalizedContent }));
      const { titulo, conteudo, cta } = normalizedContent;
      setPromptText(`${titulo || ''}\n\n${conteudo || ''}\n\n${cta || ''}`);

      if (regenerate) {
        toast.success("Conteúdo principal da campanha foi regenerado.");
        return;
      }

      setCampaignState(prev => ({ ...prev, followupPosts: [] }));

      setGenerationStatus('Gerando resumos...');
      await Promise.all([
        handleGenerateSummary(1800, normalizedContent),
        handleGenerateSummary(130, normalizedContent),
      ]);

      toast.success("Campanha gerada com sucesso!");

    } catch (error) {
      const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
      toast.error(`Ocorreu um erro ao gerar o conteúdo da campanha: ${errorMessage}`);
      setCampaignState(prev => ({ ...prev, campaignContent: null }));
      setCampaignGenerationFailed(true);
      setGenerationError(errorMessage);
    } finally {
      setIsGeneratingCampaign(false);
      setGenerationStatus('');
    }
  };
  const handleGenerateImage = useCallback(async (content, palette = null) => {
    const finalContent = content || campaignContentRef.current;
    if (!finalContent) {
      toast.error("Por favor, gere o conteúdo do texto primeiro.");
      return false;
    }
    setIsGeneratingImage(true);
    try {
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const imagePrompt = await generateCampaignImagePrompt({ content: finalContent, aspectRatio, autor: finalAutor, palette });

      const base64Data = await generateCampaignImage({ prompt: imagePrompt, aspectRatio, colors: palette?.colors || [] });
      const blob = dataURLtoBlob(base64Data);
      if (!blob) throw new Error("Failed to convert generated image data to a Blob.");

      const tempUrl = addPendingAsset(blob);
      if (!tempUrl) throw new Error("Failed to create a managed URL for the generated image.");

      setGeneratedPageUrl(tempUrl); // This is local state, can remain
      addNewImageToCanvas(tempUrl);
      return true;

    } catch (imageError) {
      const errorMessage = imageError.message || 'An unknown error occurred.';
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('service unavailable')) {
        toast.error('Serviço indisponível (503)', { description: 'O serviço de geração de imagem está sobrecarregado. Por favor, tente novamente em alguns minutos.' });
      } else {
        toast.error('Erro na Geração da Imagem', { description: `Ocorreu um erro ao gerar a imagem da campanha: ${errorMessage}` });
      }
      setGeneratedPageUrl(null); // This is local state, can remain
      return false;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [aspectRatio, addNewImageToCanvas, addPendingAsset, autorList, selectedAutorForCampaign]);

  const handleGenerateSummary = async (targetLength, content = campaignState.campaignContent) => { if (!content?.conteudo) { alert("Por favor, gere o conteúdo principal primeiro."); return; } const setLoading = targetLength === 1800 ? setIsGeneratingSummaryMedio : setIsGeneratingSummaryPequeno; setLoading(true); if (!geminiAPI.isInitialized) { const apiKey = getGeminiApiKey(); if (!apiKey) { alert('Por favor, configure sua chave de API Gemini primeiro.'); setLoading(false); return; } geminiAPI.initialize(apiKey); } try { const summaryPrompt = `Resuma o seguinte texto para ter no máximo ${targetLength} caracteres, mantendo a essência e o tom: "${stripHtml(content.conteudo)}"`; const summary = await geminiAPI.generateContent(summaryPrompt); const fieldName = targetLength === 1800 ? 'conteudoMedio' : 'conteudoPequeno'; setCampaignState(prev => ({ ...prev, campaignContent: { ...prev.campaignContent, [fieldName]: summary } })); } catch (error) { alert(`Ocorreu um erro ao gerar o resumo. Verifique o console.`); } finally { setLoading(false); } };
  const handleGenerateFormattedContent = async (content = campaignState.campaignContent) => { if (!content?.conteudo) { toast.error("Por favor, gere o conteúdo principal primeiro."); return; } setIsGeneratingConteudoFormatado(true); try { const finalContent = await generateFormattedContent({ content }); setCampaignState(prev => ({ ...prev, campaignContent: { ...prev.campaignContent, conteudoFormatado: finalContent } })); } catch (error) { toast.error(`Ocorreu um erro ao gerar o conteúdo formatado: ${error.message}`); } finally { setIsGeneratingConteudoFormatado(false); } };

  const handleGenerateFollowupPosts = async (content = campaignState.campaignContent) => {
    if (!content?.conteudo) {
      toast.error("Por favor, gere o conteúdo principal primeiro.");
      return;
    }
    if (campaignState.followupPosts.length >= followupPostsQuantity) {
      toast.info('A quantidade de posts desejada já foi atingida ou superada.');
      return;
    }
    setIsGeneratingFollowup(true);
    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign);
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const neededQuantity = followupPostsQuantity - campaignState.followupPosts.length;
      const plan = await generateFollowupPlan({ content, neededQuantity, existingPosts: campaignState.followupPosts, persona: finalPersona, autor: finalAutor });
      const newPosts = await generateFollowupPosts({ content, plan, persona: finalPersona, autor: finalAutor });
      setCampaignState(prev => ({ ...prev, followupPosts: [...prev.followupPosts, ...newPosts] }));
    } catch (error) {
      toast.error(`Ocorreu um erro ao gerar os posts de follow-up: ${error.message}`);
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const handleResetCampaign = () => {
    setCampaignState(prev => ({ ...prev, campaignContent: null, followupPosts: [] }));
    setGeneratedPageUrl(null); // Local state
    setFollowupPostsQuantity(10); // Local state
  };

  const handleEditFollowup = (index, content) => { setEditingFollowup({ index, content }); };

  const handleSaveFollowup = (newContent) => {
    if (editingFollowup === null) return;
    setCampaignState(prev => {
      const updatedPosts = prev.followupPosts.map((post, index) => {
        if (index === editingFollowup.index) return { ...post, conteudo: newContent };
        return post;
      });
      return { ...prev, followupPosts: updatedPosts };
    });
    setEditingFollowup(null);
  };

  const handleGenerateIAContent = async () => {
    setIsGenerating(true);
    setGenerationStatus('Gerando texto para os posts...');
    try {
      const iaResponseText = await generateIAContent({ promptText, promptNumRecords });
      const parsedResult = parseIaResponseToCsvData(iaResponseText);
      if (!parsedResult || !parsedResult.data || !parsedResult.data.length > 0) {
        toast.error('Não foi possível processar a resposta da IA para o formato de tabela.'); return;
      }
      const { data: csvDataResult, headers: csvHeadersResult } = parsedResult;
      const { newPositions, newStyles } = autoArrangeFields({ csvHeaders: csvHeadersResult, fieldPositions: {}, fieldStyles: {}, csvData: csvDataResult, effectiveImageSize: originalImageSize });
      const newGeneratedPagesData = csvDataResult.map((record, index) => ({ index, record, blob: null, url: null, filename: `midiator_${String(index + 1).padStart(3, '0')}.png`, customFieldPositions: null, customFieldStyles: null, customBrandElements: null, customImageFilters: null, fontScale: 1 }));

      setCampaignState(prev => ({
        ...prev,
        csvData: csvDataResult,
        csvHeaders: csvHeadersResult,
        fieldPositions: newPositions,
        fieldStyles: newStyles,
        generatedPagesData: newGeneratedPagesData,
      }));
      setInitialFieldStyles(newStyles);
      setInputMethod('manual');
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
    let pageUpdateData = {};

    let effectivePageTemplate = campaignState.pageTemplate;
    const pageData = campaignState.generatedPagesData.find(p => p.index === index);
    if (pageData?.customPageTemplate) {
      effectivePageTemplate = pageData.customPageTemplate;
    }

    if (imagePrompt && imagePrompt.trim() !== '') {
      setGenerationStatus(`Gerando imagem para o post ${index + 1}...`);
      try {
        let sourceStyle = { x: 0, y: 0, width: 100, height: 100, zIndex: -1, objectFit: 'cover' };
        const firstImage = effectivePageTemplate.images?.[0];
        if (firstImage) {
          const { id, src, ...style } = firstImage;
          sourceStyle = style;
        }
        const oldImage = (effectivePageTemplate.images || [])[0];
        const base64Data = await generateCampaignImage({ prompt: imagePrompt, aspectRatio, colors: memorialColors });
        if (!base64Data) throw new Error("A IA não conseguiu gerar a imagem.");
        if (oldImage && oldImage.src && oldImage.src.startsWith('blob:')) removePendingAsset(oldImage.src);

        const newImage = { ...createNewImageElement(base64Data), ...sourceStyle, visible: true };
        const pageImages = effectivePageTemplate.images || [];
        const finalImages = pageImages.length > 0 ? [newImage, ...pageImages.slice(1)] : [newImage];

        const tempPageTemplate = { ...effectivePageTemplate, images: finalImages };
        effectivePageTemplate = tempPageTemplate;
        pageUpdateData.customPageTemplate = tempPageTemplate;
      } catch (error) {
        const errorMessage = error.message || 'An unknown error occurred.';
        if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('service unavailable')) {
          toast.error(`Serviço indisponível (Post #${index + 1})`, { description: 'O serviço de geração de imagem está sobrecarregado. Por favor, tente gerar esta imagem novamente em alguns minutos.' });
        } else {
          toast.error(`Falha na Imagem (Post #${index + 1})`, { description: `Não foi possível gerar a imagem: ${errorMessage}` });
        }
      }
    }

    setGenerationStatus(`Gerando página para o post ${index + 1}/${csvData.length}...`);
    try {
      const finalPageData = await PageGenerationService.generatePageImage({
        record, index,
        campaignContext: {
          brandElements: pageData?.customBrandElements || campaignState.brandElements,
          fieldPositions: pageData?.customFieldPositions || campaignState.fieldPositions,
          fieldStyles: pageData?.customFieldStyles || campaignState.fieldStyles,
          aspectRatio, pageTemplate: effectivePageTemplate, fontScale,
        }
      });

      const { blob } = finalPageData;
      const tempUrl = addPendingAsset(blob);
      if (!tempUrl) throw new Error("Failed to create managed URL for final page image.");

      setCampaignState(prev => {
        const newPagesData = [...prev.generatedPagesData];
        const existingPageData = newPagesData[index] || {};
        const newPageDataObject = { ...existingPageData, ...finalPageData, ...pageUpdateData, url: tempUrl, dataUrl: null };
        delete newPageDataObject.blob;
        newPagesData[index] = newPageDataObject;
        return { ...prev, generatedPagesData: newPagesData };
      });

      toast.success(`Página final para o post #${index + 1} gerada.`);
      return true;
    } catch (error) {
      console.error(`Error during page generation for post ${index + 1}:`, error);
      toast.error(error.message);
      return false;
    } finally {
      setGenerationStatus('');
    }
  };
  const currentTheme = darkMode ? darkTheme : lightTheme;

  const memorialColors = useMemo(() => {
    if (paletteId && paletteId !== 'custom') {
      const selectedPalette = palettes.find(p => p.id === paletteId);
      return selectedPalette ? selectedPalette.colors : [];
    }
    if (customPalette) {
      return customPalette.colors;
    }
    return [];
  }, [paletteId, customPalette, palettes]);

  const campaignData = {
    problema,
    solucao,
    objetivo,
    tomDeVoz,
    campaignContent,
    aspectRatio,
    followupPosts,
    colors: memorialColors,
    generatedPagesData,
    persona: personaList.find(p => p.id === selectedPersonaForCampaign),
    autor: autorList.find(a => a.id === selectedAutorForCampaign),
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <MainAppBar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          setShowSetupModal={setShowSetupModal}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
          onSaveCampaign={() => setShowSaveModal(true)}
          onShowPersonas={() => handleNavigation(() => setCurrentView('personas'))}
          onShowAutores={() => handleNavigation(() => setCurrentView('autores'))}
          onShowPalettes={() => handleNavigation(() => setCurrentView('palettes'))}
          onShowCampaigns={() => handleNavigation(() => setCurrentView('campaigns'))}
          currentView={currentView}
          onPersonaMenuClick={() => setPersonaDrawerOpen(!personaDrawerOpen)}
          onAutorMenuClick={() => setAutorDrawerOpen(!autorDrawerOpen)}
          onPaletteMenuClick={() => setPaletteDrawerOpen(!paletteDrawerOpen)}
          isDrawerOpen={
            currentView === 'personas' ? personaDrawerOpen :
              currentView === 'autores' ? autorDrawerOpen :
                currentView === 'palettes' ? paletteDrawerOpen :
                    sidebarOpen
          }
          onShowMemorial={() => setShowMemorialDescritivoModal(true)}
          isCampaignOpen={currentCampaign !== null}
        />
        {currentView === 'campaigns' && (
          <>
            <Sidebar sidebarOpen={sidebarOpen} darkMode={darkMode} steps={steps} activeStep={activeStep} setActiveStep={setActiveStep} csvData={csvData} backgroundImageSrc={pageTemplate.images[0]?.src} visibleFields={visibleFields} totalFields={totalFields} styledFields={styledFields} variant={isMobile ? 'temporary' : 'persistent'} onClose={() => setSidebarOpen(false)} onStepClick={handleSidebarStepClick} />
            {!isMobile && <Fab size="small" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'} sx={{ position: 'fixed', top: '50%', left: sidebarOpen ? 320 - 20 : 0, transform: 'translateY(-50%)', zIndex: (theme) => theme.zIndex.drawer + 1, transition: 'left 0.2s ease-in-out', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: 'background.default' } }} >{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}</Fab>}
          </>
        )}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, transition: theme.transitions.create('margin', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }) }} >
          <Toolbar />
          {currentView === 'campaigns' && (
            <>
              {activeStep === 0 && (
                <MyCampaignsStep
                  onEditCampaign={handleEditCampaign}
                  onCreateNew={handleCreateNewCampaign}
                  autorList={autorList}
                  personaList={personaList}
                />
              )}
              {activeStep === 1 && (
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
                  palettes={palettes}
                  onRequestNewAutor={handleRequestNewAutor}
                  onRequestNewPersona={handleRequestNewPersona}
                />
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
                  sidebarOpen={sidebarOpen}
                />
              )}
              {activeStep === 3 && (
                <ImageStep
                  steps={steps}
                  isDraggingOverImage={isDraggingOverImage}
                  handleImageDrop={handleImageDrop}
                  handleImageDragOver={handleImageDragOver}
                  handleImageDragEnter={handleImageDragEnter}
                  handleImageDragLeave={handleImageDragLeave}
                  imageInputRef={imageInputRef}
                  handleImageUpload={handleForegroundImageUpload} // Use new handler for foreground
                  onOpenImageGallery={handleOpenImageGallery}
                  initialFieldStyles={initialFieldStyles}
                  onImageDisplayedSizeChange={setDisplayedImageSize}
                  colorPalette={memorialColors}
                  onCsvDataUpdate={handleCsvRecordContentUpdate}
                  originalImageSize={originalImageSize}
                  onZIndexChange={handleZIndexChange}
                  isMobile={isMobile}
                  onDeselectField={() => setSelectedField(null)}
                  onOpenHtmlEditor={(fieldId) => {
                    setEditingField(fieldId);
                  }}
                  currentPreviewIndex={currentPreviewIndex}
                  setCurrentPreviewIndex={setCurrentPreviewIndex}
                  onFontScaleChange={setFontScale}
                  templateFieldStyles={templateFieldStyles}
                  activeStep={activeStep}
                  addPendingAsset={addPendingAsset}
                />
              )}
              {activeStep === 4 && (
                <PageGeneratorFrontendOnly
                  displayedImageSize={displayedImageSize}
                  colorPalette={memorialColors}
                  initialGeneratedPagesData={generatedPagesData}
                  onThumbnailRecordTextUpdate={handleThumbnailRecordTextUpdate}
                  originalImageSize={originalImageSize}
                  onBrandElementsChange={setBrandElements}
                  fontScale={fontScale}
                  handleGenerateSinglePage={handleGenerateSinglePage}
                  aspectRatio={aspectRatio}
                  generatedPagesData={generatedPagesData}
                  handleImageUpload={handleImageUpload}
                  onOpenImageGallery={handleOpenImageGallery}
                  pendingAssets={pendingAssets}
                  addPendingAsset={addPendingAsset}
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
                  generatedVideos={generatedVideos}
                  pendingAssets={pendingAssets}
                  onVideoGenerated={(newVideoAssets) => {
                    // newVideoAssets is an array of video asset objects
                    setGeneratedVideos(prev => [...prev, ...newVideoAssets]);

                    const newAssetMap = {};
                    newVideoAssets.forEach(asset => {
                      // Add main video blob
                      if (asset.blob && asset.url) {
                        newAssetMap[asset.url] = asset.blob;
                      }
                      // Add thumbnail blob if it exists
                      if (asset.thumbnailBlob && asset.thumbnailUrl) {
                        newAssetMap[asset.thumbnailUrl] = asset.thumbnailBlob;
                      }
                    });
                    addPendingAssetMap(newAssetMap);
                  }}
                  onUpdateVideos={setGeneratedVideos}
                  onNewAsset={(blob) => addPendingAsset(blob)}
                />
              )}
              {activeStep === 7 && (
                <Publisher
                  settings={settings}
                  campaignContent={campaignContent}
                  generatedPagesData={generatedPagesData}
                  generatedVideosData={generatedVideos}
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
                  pendingAssets={pendingAssets}
                  setPendingAssets={setPendingAssets}
                />
              )}
              {activeStep === 8 && <Monitor currentCampaign={currentCampaign} />}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} >
                <Button onClick={handleBack} disabled={activeStep === 0} variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Anterior</Button>
                <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300', transition: 'all 0.3s ease' }} />))}</Box>
                <Tooltip title={
                  activeStep === 5 && isProcessingAudio
                    ? "Processando durações de áudio, por favor aguarde..."
                    : activeStep === 5 && generatedAudioData.some(a => !a.duration || a.duration <= 0)
                      ? "Aguardando o cálculo da duração de todos os áudios antes de prosseguir."
                      : ""
                }>
                  <span>
                    <Button
                      onClick={handleNext}
                      disabled={
                        isGenerating ||
                        activeStep === steps.length - 1 ||
                        !canProceedToStep(activeStep + 1) ||
                        (activeStep === 5 && isProcessingAudio)
                      }
                      variant="contained"
                      sx={{ borderRadius: 2, px: 3, py: 1.5 }}
                    >
                      Próximo
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </>
          )}
          {currentView === 'personas' && <PersonasPage personaDrawerOpen={personaDrawerOpen} setPersonaDrawerOpen={setPersonaDrawerOpen} onNoPersonaSelected={() => setPersonaDrawerOpen(true)} onUpdate={fetchPersonasForCampaign} startInCreateMode={startPersonasInCreate} onPersonaCreated={handlePersonaCreated} onCreationCancelled={() => handleCreationDone('personas')} />}
          {currentView === 'autores' && <AutoresPage autorDrawerOpen={autorDrawerOpen} setAutorDrawerOpen={setAutorDrawerOpen} onNoAutorSelected={() => setAutorDrawerOpen(true)} onUpdate={fetchAutoresForCampaign} startInCreateMode={startAutoresInCreate} onAutorCreated={handleAutorCreated} onCreationCancelled={() => handleCreationDone('autores')} />}
          {currentView === 'palettes' && <PalettesPage paletteDrawerOpen={paletteDrawerOpen} setPaletteDrawerOpen={setPaletteDrawerOpen} onNoPaletteSelected={() => setPaletteDrawerOpen(true)} />}
        </Box>
      </Box>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onClose={handleDialogClose}
        onConfirmDiscard={handleDialogDiscard}
        onConfirmSave={handleDialogSaveAndNavigate}
      />
      <SetupModal open={showSetupModal} onClose={() => setShowSetupModal(false)} initialTab={initialSetupTab} />
      <SaveCampaignModal open={showSaveModal} onClose={() => setShowSaveModal(false)} onSave={handleSaveCampaign} campaignToEdit={currentCampaign} isSaving={isSaving} />
      <MemorialDescritivoModal open={showMemorialDescritivoModal} onClose={() => setShowMemorialDescritivoModal(false)} campaignData={campaignData} />
      <ImageGallerySelector
        open={showImageGallery}
        onClose={handleCloseImageGallery}
        onSelect={handleImageSelected}
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