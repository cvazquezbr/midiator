import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Container, Paper, Typography, Box, Button, Grid, Card, CardContent, Alert, Stepper, Step, StepLabel, StepContent, Chip, IconButton, Tooltip, ToggleButton, ToggleButtonGroup, TextField, Link as MuiLink, Fab, FormControl, InputLabel, Select, Accordion, AccordionSummary, AccordionDetails, Toolbar,
} from '@mui/material';
import {
  CloudUpload, ExpandMore as ExpandMoreIcon, FileUpload, Settings, Image as ImageIcon, Movie, Audiotrack, Palette, ArrowBackIosNew, ArrowForwardIos, MoreVert, Brightness4, Brightness7, Edit, Download as DownloadIcon, CloudQueue, ChevronRight, ChevronLeft, Check, Add, InsertDriveFileOutlined, FormatBold, Visibility, Grid3x3, Campaign as CampaignIcon, AspectRatio, Language, Publish, SaveAlt as SaveAltIcon, FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster, toast } from 'sonner';

import { useUserAuth } from '../context/UserAuthContext';
import { loadSettingsFromDb } from '../utils/credentialsManager';
import { saveCampaign, loadCampaign, updateCampaign } from '../utils/campaignState';
import { saveLinkedinConfig } from '../utils/linkedinCredentials';

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
import SetupModal from '../components/SetupModal';
import CampaignStandardsModal from '../components/CampaignStandardsModal';
import SaveCampaignModal from '../components/SaveCampaignModal';
import LoadCampaignModal from '../components/LoadCampaignModal';

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
  generateCampaignContent, generateCampaignImage, generateFormattedContent, generateFollowupPlan, generateFollowupPosts, generateIAContent, generateColorPalette,
} from '../utils/generationHandlers.js';
import { exportCsv, exportHtml } from '../utils/exportUtils.js';
import { downloadExampleCsv } from '../utils/fileUtils.js';
import { parseIaResponseToCsvData } from '../utils/iaResponseParser.js';
import { parseCsv } from '../utils/csvParser.js';
import { lightTheme, darkTheme } from '../theme.js';
import ColorThief from 'colorthief';

const htmlFields = ['mensagem', 'texto principal', 'descrição', 'conteúdo', 'texto'];

function HomePage() {
  const { user } = useUserAuth();

  // Component State
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
  const [colorPalette, setColorPalette] = useState([]);
  const [standardsColors, setStandardsColors] = useState([]);
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
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]);
  const [generatedAudioData, setGeneratedAudioData] = useState([]);
  const [generatedVideosData, setGeneratedVideosData] = useState([]);
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [imageFilters, setImageFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 });
  const [brandElements, setBrandElements] = useState([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showCampaignStandardsModal, setShowCampaignStandardsModal] = useState(false);
  const [showMemorialDescritivoModal, setShowMemorialDescritivoModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const getAppState = () => ({ activeStep, darkMode, sidebarOpen, csvData, csvHeaders, backgroundImage, colorPalette, standardsColors, problema, solucao, campaignContent, persona, autor, instrucoes, formato, aspectRatio, generatedImageUrl, conteudoMedio, conteudoPequeno, followupPosts, followupPostsQuantity, isScheduled, scheduleDate, weeklySchedule, selectedProfile, selectedImages, selectedVideos, inputMethod, promptNumRecords, promptText, fieldPositions, fieldStyles, displayedImageSize, originalImageSize, generatedImagesData, generatedAudioData, generatedVideosData, imageFilters, brandElements, currentPreviewIndex });
  const applyAppState = (state) => {
    if (!state) return;
    setActiveStep(state.activeStep ?? 0);
    setDarkMode(state.darkMode ?? false);
    setSidebarOpen(state.sidebarOpen ?? !isMobile);
    setCsvData(state.csvData ?? []);
    setCsvHeaders(state.csvHeaders ?? []);
    setBackgroundImage(state.backgroundImage ?? null);
    setColorPalette(state.colorPalette ?? []);
    setStandardsColors(state.standardsColors ?? []);
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
    setFollowupPosts(state.followupPosts ?? []);
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
    setFieldStyles(state.fieldStyles ?? {});
    setDisplayedImageSize(state.displayedImageSize ?? { width: 0, height: 0 });
    setOriginalImageSize(state.originalImageSize ?? { width: 0, height: 0 });
    setGeneratedImagesData(state.generatedImagesData ?? []);
    setGeneratedAudioData(state.generatedAudioData ?? []);
    setGeneratedVideosData(state.generatedVideosData ?? []);
    setImageFilters(state.imageFilters ?? { brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 });
    setBrandElements(state.brandElements ?? []);
    setCurrentPreviewIndex(state.currentPreviewIndex ?? 0);
  };

  const handleSaveCampaign = async (name) => {
    const appState = getAppState();
    setIsLoading(true);
    try {
      if (currentCampaign) {
        const updated = await updateCampaign(currentCampaign.id, name, appState);
        toast.success(`Campaign "${name}" updated.`);
        setCurrentCampaign(updated);
      } else {
        const newCampaign = await saveCampaign(name, appState);
        toast.success(`Campaign "${name}" saved.`);
        setCurrentCampaign(newCampaign);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadCampaign = async (id) => {
    setIsLoading(true);
    try {
      const loadedState = await loadCampaign(id);
      applyAppState(loadedState);
      setCurrentCampaign({ id, name: loadedState.campaignContent?.titulo || 'Untitled' });
      toast.success(`Campaign loaded successfully!`);
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
    const loadSettings = async () => {
      try {
        await loadSettingsFromDb();
        const apiKey = getGeminiApiKey();
        if (apiKey) geminiAPI.initialize(apiKey);
        toast.info("Your cloud settings have been loaded.");
      } catch (error) {
        toast.error(`Could not load your settings: ${error.message}`);
      }
    };
    if (user) loadSettings();
  }, [user]);

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
        // Clean the URL
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
            saveLinkedinConfig({
              accessToken: data.access_token,
              expiry: Date.now() + data.expires_in * 1000,
            });
            toast.success('Conexão com o LinkedIn estabelecida com sucesso!');
            // Optionally, trigger a refresh of the settings view
            setShowSetupModal(true);
          } else {
            throw new Error(data.error || 'Falha na troca de token do LinkedIn.');
          }
        } catch (error) {
          toast.dismiss();
          toast.error(`Erro ao conectar com o LinkedIn: ${error.message}`);
        }
      }
    };

    handleLinkedInRedirect();
  }, []);

  const steps = [ { label: 'Campanha', description: 'Criar o material de referência para a campanha.', icon: CampaignIcon }, { label: 'Posts Curtos', description: 'Gere, carregue ou edite os posts para redes sociais.', icon: InsertDriveFileOutlined }, { label: 'Imagem e Formatação', description: 'Carregue a imagem de fundo, posicione os campos e configure a formatação.', icon: ImageIcon }, { label: 'Gerar Imagens', description: 'Gere as imagens finais.', icon: FormatBold }, { label: 'Gerar Áudio', description: 'Crie a narração para os slides.', icon: Audiotrack }, { label: 'Gerar Vídeo', description: 'Crie um vídeo a partir das imagens geradas.', icon: Movie }, { label: 'Publicar', description: 'Publique o conteúdo no WordPress.', icon: Publish } ];
  const parseCsvFile = async (file) => { if (!file) return; try { const { data: newCsvData, headers: newHeaders } = await parseCsv(file); if (newCsvData && newCsvData.length > 0) { setCsvData(newCsvData); setCsvHeaders(newHeaders); const updatedFieldPositions = {}; const updatedFieldStyles = {}; const defaultStylesBase = { fontFamily: 'Inter', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000000', textStroke: false, strokeColor: '#ffffff', strokeWidth: 2, textShadow: false, shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2, textAlign: 'left', verticalAlign: 'top' }; newHeaders.forEach((header, index) => { updatedFieldPositions[header] = fieldPositions[header] || { x: 10 + (index % 5) * 18, y: 10 + Math.floor(index / 5) * 12, width: 15, height: 10, visible: true }; if (fieldStyles[header]) { updatedFieldStyles[header] = fieldStyles[header]; } else { if (index === 0) { updatedFieldStyles[header] = { ...defaultStylesBase, fontFamily: 'Anton', fontSize: 72 }; } else { updatedFieldStyles[header] = { ...defaultStylesBase }; } } }); setFieldPositions(updatedFieldPositions); setFieldStyles(updatedFieldStyles); } } catch (error) { toast.error(error.message || 'Ocorreu um erro desconhecido ao processar o arquivo CSV.'); } };
  const handleCSVUpload = (event) => { const file = event.target.files[0]; parseCsvFile(file); };
  const handleDrop = (event) => { event.preventDefault(); event.stopPropagation(); const file = event.dataTransfer.files[0]; parseCsvFile(file); };
  const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
  const updateImageAndPalette = (imageUrl) => { setBackgroundImage(imageUrl); const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { setOriginalImageSize({ width: img.width, height: img.height }); try { const colorThief = new ColorThief(); const palette = colorThief.getPalette(img, 5); setColorPalette(palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`)); } catch (error) { console.error("Error extracting color palette:", error); setColorPalette([]); } }; img.onerror = (err) => { console.error("Error loading image to extract colors:", err); setBackgroundImage(null); setColorPalette([]); }; img.src = imageUrl; };
  const parseImageFile = (file) => { if (file) { const reader = new FileReader(); reader.onload = (e) => { const imageUrl = e.target.result; updateImageAndPalette(imageUrl); const imageStepIndex = steps.findIndex(step => step.label === 'Imagem e Formatação'); if (imageStepIndex !== -1) { setActiveStep(imageStepIndex); } }; reader.readAsDataURL(file); } };
  const handleImageUpload = (event) => { const file = event.target.files[0]; parseImageFile(file); };
  const handleImageDrop = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); const file = event.dataTransfer.files[0]; parseImageFile(file); };
  const handleImageDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
  const handleImageDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(true); };
  const handleImageDragLeave = (event) => { event.preventDefault(); event.stopPropagation(); setIsDraggingOverImage(false); };
  const handleNext = () => { setActiveStep((prevActiveStep) => prevActiveStep + 1); };
  const handleBack = () => { setActiveStep((prevActiveStep) => prevActiveStep - 1); };
  const canProceedToStep = () => { switch (activeStep) { case 0: return campaignContent !== null; case 1: return csvData.length > 0; case 2: return backgroundImage !== null; default: return true; } };
  const getFieldStats = () => { const visibleFields = Object.values(fieldPositions).filter(pos => pos.visible).length; const totalFields = csvHeaders.length; const styledFields = Object.keys(fieldStyles).length; return { visibleFields, totalFields, styledFields }; };
  const { visibleFields, totalFields, styledFields } = getFieldStats();
  const handleZIndexChange = (elementId, action) => { if (!elementId) return; let allElements = [ ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, isBrand: false })), ...brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, isBrand: true })), ]; allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)); const currentIndex = allElements.findIndex(el => el.id === elementId); if (currentIndex === -1) return; const [currentElement] = allElements.splice(currentIndex, 1); switch (action) { case 'front': allElements.push(currentElement); break; case 'back': allElements.unshift(currentElement); break; case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement); break; case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement); break; default: allElements.splice(currentIndex, 0, currentElement); return; } const newPositions = { ...fieldPositions }; const newBrandElements = [...brandElements]; allElements.forEach((el, index) => { el.zIndex = index; if (el.isBrand) { const brandEl = newBrandElements.find(b => b.id === el.id); if (brandEl) brandEl.zIndex = index; } else { if (newPositions[el.id]) { newPositions[el.id].zIndex = index; } } }); setFieldPositions(newPositions); setBrandElements(newBrandElements); };
  const handleSidebarStepClick = (index) => { setActiveStep(index); if (isMobile) { setSidebarOpen(false); } };
  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => { setCsvData(novosRegistros); setCsvHeaders(novasColunas); const updatedFieldPositions = {}; const updatedFieldStyles = {}; const defaultStylesBase = { fontFamily: 'Inter', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: darkMode ? '#FFFFFF' : '#000000', textStroke: false, strokeColor: darkMode ? '#000000' : '#FFFFFF', strokeWidth: 2, textShadow: false, shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2, textAlign: 'left', verticalAlign: 'top' }; novasColunas.forEach((header, index) => { updatedFieldPositions[header] = fieldPositions[header] || { x: 10 + (index % 5) * 18, y: 10 + Math.floor(index / 5) * 12, width: 15, height: 10, visible: true }; updatedFieldStyles[header] = fieldStyles[header] || { ...defaultStylesBase }; }); setFieldPositions(updatedFieldPositions); setFieldStyles(updatedFieldStyles); setGeneratedImagesData(prevGeneratedImages => { if (prevGeneratedImages.length !== novosRegistros.length) { const rebuiltGeneratedImages = novosRegistros.map((record, index) => ({ index, record, blob: null, url: null, filename: `midiator_${String(index + 1).padStart(3, '0')}.png`, backgroundImage: backgroundImage, })); return rebuiltGeneratedImages; } else { const updatedGeneratedImages = prevGeneratedImages.map((oldImage, index) => ({ ...oldImage, record: novosRegistros[index], index: index, })); return updatedGeneratedImages; } }); }, [darkMode, fieldPositions, fieldStyles, setCsvData, setCsvHeaders, setFieldPositions, setFieldStyles, backgroundImage]);
  const handleCsvRecordContentUpdate = useCallback((newCsvData) => { setCsvData(newCsvData); }, [setCsvData]);
  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => { setCsvData(prevCsvData => { if (recordIndex < 0 || recordIndex >= prevCsvData.length) { return prevCsvData; } return prevCsvData.map((row, idx) => { if (idx === recordIndex) { return updatedRecord; } return row; }); }); }, [setCsvData]);
  const handleGenerateCampaignContent = async (regenerate = false) => { setIsGeneratingCampaign(true); setCampaignGenerationFailed(false); setGenerationError(''); setTimeout(async () => { try { const normalizedContent = await generateCampaignContent({ problema, solucao }); setCampaignContent(normalizedContent); if (!regenerate) { setConteudoMedio(''); setConteudoPequeno(''); setConteudoFormatado(''); setGeneratedImageUrl(null); const [imageSuccess] = await Promise.all([ handleGenerateImage(normalizedContent), handleGenerateSummary(1800, normalizedContent), handleGenerateSummary(130, normalizedContent), handleGenerateFormattedContent(normalizedContent), handleGenerateFollowupPosts(normalizedContent), ]); if (!imageSuccess) { setCampaignGenerationFailed(true); setGenerationError("A geração de texto foi bem-sucedida, mas a criação da imagem falhou. Você pode tentar gerar a imagem novamente."); } } } catch (error) { const errorMessage = error.message || 'Ocorreu um erro desconhecido.'; toast.error(`Ocorreu um erro ao gerar o conteúdo da campanha: ${errorMessage}`); setCampaignContent(null); setCampaignGenerationFailed(true); setGenerationError(errorMessage); } finally { setIsGeneratingCampaign(false); } }, 0); };
  const handleGenerateImage = async (content = campaignContent) => { if (!content) { toast.error("Por favor, gere o conteúdo do texto primeiro."); return false; } setIsGeneratingImage(true); try { const imageUrl = await generateCampaignImage({ content, aspectRatio }); setGeneratedImageUrl(imageUrl); updateImageAndPalette(imageUrl); return true; } catch (imageError) { toast.error(`Ocorreu um erro ao gerar a imagem da campanha: ${imageError.message}`); setGeneratedImageUrl(null); return false; } finally { setIsGeneratingImage(false); } };
  const handleGenerateSummary = async (targetLength, content = campaignContent) => { if (!content?.conteudo) { alert("Por favor, gere o conteúdo principal primeiro."); return; } const setLoading = targetLength === 1800 ? setIsGeneratingSummaryMedio : setIsGeneratingSummaryPequeno; setLoading(true); if (!geminiAPI.isInitialized) { const apiKey = getGeminiApiKey(); if (!apiKey) { alert('Por favor, configure sua chave de API Gemini primeiro.'); setLoading(false); return; } geminiAPI.initialize(apiKey); } try { const summaryPrompt = `Resuma o seguinte texto para ter no máximo ${targetLength} caracteres, mantendo a essência e o tom: "${stripHtml(content.conteudo)}"`; const summary = await geminiAPI.generateContent(summaryPrompt); if (targetLength === 1800) { setConteudoMedio(summary); } else { setConteudoPequeno(summary); } } catch (error) { alert(`Ocorreu um erro ao gerar o resumo. Verifique o console.`); } finally { setLoading(false); } };
  const handleGenerateFormattedContent = async (content = campaignContent) => { if (!content?.conteudo) { toast.error("Por favor, gere o conteúdo principal primeiro."); return; } setIsGeneratingConteudoFormatado(true); try { const finalContent = await generateFormattedContent({ content }); setConteudoFormatado(finalContent); } catch (error) { toast.error(`Ocorreu um erro ao gerar o conteúdo formatado: ${error.message}`); } finally { setIsGeneratingConteudoFormatado(false); } };
  const handleGenerateFollowupPosts = async (content = campaignContent) => { if (!content?.conteudo) { toast.error("Por favor, gere o conteúdo principal primeiro."); return; } setIsGeneratingFollowup(true); try { const plan = await generateFollowupPlan({ content, followupPostsQuantity }); const posts = await generateFollowupPosts({ content, plan }); setFollowupPosts(posts); } catch (error) { toast.error(`Ocorreu um erro ao gerar os posts de follow-up: ${error.message}`); } finally { setIsGeneratingFollowup(false); } };
  const handleResetCampaign = () => { setCampaignContent(null); setGeneratedImageUrl(null); setConteudoMedio(''); setConteudoPequeno(''); setConteudoFormatado(''); setFollowupPosts([]); setFollowupPostsQuantity(5); };
  const handleEditFollowup = (index, content) => { setEditingFollowup({ index, content }); };
  const handleSaveFollowup = (newContent) => { if (editingFollowup === null) return; const updatedPosts = followupPosts.map((post, index) => { if (index === editingFollowup.index) { return { ...post, conteudo: newContent }; } return post; }); setFollowupPosts(updatedPosts); setEditingFollowup(null); };
  const handleGenerateIAContent = async () => { setIsGenerating(true); try { const iaResponseText = await generateIAContent({ promptText, promptNumRecords }); const parsedResult = parseIaResponseToCsvData(iaResponseText); if (parsedResult && parsedResult.data && parsedResult.data.length > 0) { setCsvData(parsedResult.data); setCsvHeaders(parsedResult.headers); const updatedFieldPositions = {}; const updatedFieldStyles = {}; const defaultStylesBase = { fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: darkMode ? '#FFFFFF' : '#000000', textStroke: false, strokeColor: darkMode ? '#000000' : '#FFFFFF', strokeWidth: 2, textShadow: false, shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2, textAlign: 'left', verticalAlign: 'top' }; parsedResult.headers.forEach((header, index) => { updatedFieldPositions[header] = { x: 10 + (index % 5) * 18, y: 10 + Math.floor(index / 5) * 12, width: 15, height: 10, visible: true }; updatedFieldStyles[header] = { ...defaultStylesBase }; }); setFieldPositions(updatedFieldPositions); setFieldStyles(updatedFieldStyles); } else { toast.error('Não foi possível processar a resposta da IA para o formato de tabela.'); } } catch (error) { toast.error(`Erro ao gerar conteúdo com IA: ${error.message}`); } finally { setIsGenerating(false); } };
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
          <div hidden={activeStep !== 0}><Container maxWidth="lg"><Campaign steps={steps} {...campaignData} setProblema={setProblema} setSolucao={setSolucao} isGeneratingCampaign={isGeneratingCampaign} handleGenerateCampaignContent={handleGenerateCampaignContent} handleResetCampaign={handleResetCampaign} handleExportHtml={() => exportHtml(campaignData)} editingField={editingField} setEditingField={setEditingField} conteudoMedio={conteudoMedio} setConteudoMedio={setConteudoMedio} isGeneratingSummaryMedio={isGeneratingSummaryMedio} handleGenerateSummary={handleGenerateSummary} conteudoPequeno={conteudoPequeno} setConteudoPequeno={setConteudoPequeno} isGeneratingSummaryPequeno={isGeneratingSummaryPequeno} conteudoFormatado={conteudoFormatado} isGeneratingConteudoFormatado={isGeneratingConteudoFormatado} handleGenerateFormattedContent={handleGenerateFormattedContent} isGeneratingFollowup={isGeneratingFollowup} handleGenerateFollowupPosts={handleGenerateFollowupPosts} generatedImageUrl={generatedImageUrl} isGeneratingImage={isGeneratingImage} handleGenerateImage={handleGenerateImage} setCampaignContent={setCampaignContent} onEditFollowup={handleEditFollowup} followupPostsQuantity={followupPostsQuantity} setFollowupPostsQuantity={setFollowupPostsQuantity} /></Container></div>
          <div hidden={activeStep !== 1}><PostsCurtosStep steps={steps} inputMethod={inputMethod} setInputMethod={setInputMethod} handleDrop={handleDrop} handleDragOver={handleDragOver} fileInputRef={fileInputRef} handleCSVUpload={handleCSVUpload} downloadExampleCsv={downloadExampleCsv} getGeminiApiKey={getGeminiApiKey} setShowSetupModal={setShowSetupModal} promptNumRecords={promptNumRecords} setPromptNumRecords={setPromptNumRecords} promptText={promptText} setPromptText={setPromptText} handleGenerateIAContent={handleGenerateIAContent} isGenerating={isGenerating} csvData={csvData} csvHeaders={csvHeaders} onDadosAlterados={handleDadosAlterados} darkMode={darkMode} exportCsv={exportCsv} /></div>
          <div hidden={activeStep !== 2}>
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
              setBackgroundImage={setBackgroundImage}
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
              currentPreviewIndex={currentPreviewIndex}
              setCurrentPreviewIndex={setCurrentPreviewIndex}
              onOpenEditor={(fieldId) => {
                setEditingField(fieldId);
              }}
              isHtmlField={(fieldName) => {
                if (!fieldName) return false;
                return fieldName && htmlFields.some(field => String(fieldName).toLowerCase().includes(field.toLowerCase()))
              }}
            />
          </div>
          <div hidden={activeStep !== 3}><ImageGeneratorFrontendOnly csvData={csvData} backgroundImage={backgroundImage} fieldPositions={fieldPositions} fieldStyles={fieldStyles} displayedImageSize={displayedImageSize} csvHeaders={csvHeaders} colorPalette={colorPalette} setGeneratedImagesData={setGeneratedImagesData} initialGeneratedImagesData={generatedImagesData} onThumbnailRecordTextUpdate={handleThumbnailRecordTextUpdate} originalImageSize={originalImageSize} imageFilters={imageFilters} brandElements={brandElements} onBrandElementsChange={setBrandElements} /></div>
          <div hidden={activeStep !== 4}><AudioGenerator csvData={csvData} fieldPositions={fieldPositions} onAudiosGenerated={setGeneratedAudioData} initialAudioData={generatedAudioData} /></div>
          <div hidden={activeStep !== 5}><VideoGenerator2 generatedImages={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={(videoData) => setGeneratedVideosData(videoData)} /></div>
          <div hidden={activeStep !== 6}><Publisher campaignContent={campaignContent} conteudoFormatado={conteudoFormatado} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} followupPosts={followupPosts} isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile} selectedImages={selectedImages} setSelectedImages={setSelectedImages} selectedVideos={selectedVideos} setSelectedVideos={setSelectedVideos} /></div>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} ><Button onClick={handleBack} disabled={activeStep === 0} variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Anterior</Button><Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300', transition: 'all 0.3s ease' }} />))}</Box><Button onClick={handleNext} disabled={activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)} variant="contained" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Próximo</Button></Box>
        </Box>
      </Box>
      <SetupModal open={showSetupModal} onClose={() => setShowSetupModal(false)} />
      <SaveCampaignModal open={showSaveModal} onClose={() => setShowSaveModal(false)} onSave={handleSaveCampaign} campaignToEdit={currentCampaign} />
      <LoadCampaignModal open={showLoadModal} onClose={() => setShowLoadModal(false)} onLoad={handleLoadCampaign} onEdit={(campaign) => { setCurrentCampaign(campaign); setShowSaveModal(true); }} />
      <MemorialDescritivoModal open={showMemorialDescritivoModal} onClose={() => setShowMemorialDescritivoModal(false)} campaignData={campaignData} />
      <CampaignStandardsModal open={showCampaignStandardsModal} onClose={() => { setShowCampaignStandardsModal(false); loadCampaignStandards(); }} onShowMemorial={() => setShowMemorialDescritivoModal(true)} onGeneratePalette={async (briefing) => { try { const palette = await generateColorPalette(briefing); return palette; } catch (error) { toast.error(error.message || "Ocorreu um erro ao gerar a paleta de cores."); throw error; } }} />
      <LoadingDialog open={isGeneratingCampaign || isSaving || isLoading} title={ isSaving ? "Salvando configuração..." : isLoading ? "Carregando configuração..." : "Gerando conteúdo..." } description={ isSaving ? "Aguarde um momento, estamos empacotando tudo para você." : isLoading ? "Estamos desempacotando sua configuração. Quase pronto!" : "A IA está pensando e escrevendo. Isso pode levar alguns segundos." } />
      <TextEditorDialog
        open={editingField !== null || editingFollowup !== null}
        title={
          editingFollowup !== null
            ? `Editar Post de Follow-up ${editingFollowup.index + 1}`
            : `Editar Campo: "${editingField}"`
        }
        isHtml={
          editingFollowup !== null ||
          (editingField && htmlFields.some(field => String(editingField).toLowerCase().includes(field)))
        }
        content={
          editingFollowup !== null
            ? editingFollowup.content
            : editingField && csvHeaders.includes(editingField) && csvData[currentPreviewIndex]
              ? csvData[currentPreviewIndex][editingField] || ''
              : editingField === 'conteudoFormatado'
                ? conteudoFormatado
                : editingField === 'conteudoMedio'
                  ? conteudoMedio
                  : editingField === 'conteudoPequeno'
                    ? conteudoPequeno
                    : editingField && campaignContent
                      ? campaignContent[editingField] || ''
                      : ''
        }
        onSave={
          editingFollowup !== null
            ? handleSaveFollowup
            : editingField && csvHeaders.includes(editingField)
              ? (newContent) => {
                  const updatedCsvData = csvData.map((row, index) => {
                    if (index === currentPreviewIndex) {
                      return { ...row, [editingField]: newContent };
                    }
                    return row;
                  });
                  setCsvData(updatedCsvData);
                }
              : (newContent) => {
                  if (editingField === 'conteudoFormatado') {
                    setConteudoFormatado(newContent);
                  } else if (editingField === 'conteudoMedio') {
                    setConteudoMedio(newContent);
                  } else if (editingField === 'conteudoPequeno') {
                    setConteudoPequeno(newContent);
                  } else if (editingField) {
                    setCampaignContent({ ...campaignContent, [editingField]: newContent });
                  }
                }
        }
        onClose={() => {
          setEditingField(null);
          setEditingFollowup(null);
        }}
      />
    </ThemeProvider>
  );
}

export default HomePage;
