import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Toolbar, Paper, Typography, Button, List, ListItem, Stepper, Step, StepLabel, MobileStepper } from '@mui/material';
import { Settings, Brightness4, Brightness7, Edit, Menu as MenuIcon, Article as ArticleIcon, Logout, AdminPanelSettings, KeyboardArrowLeft, KeyboardArrowRight, Save as SaveIcon, FolderOpen as FolderOpenIcon, CloudUpload as CloudUploadIcon, CloudDownload as CloudDownloadIcon, PlayArrow, Pause, Replay, GraphicEq, Audiotrack as AudioIcon, Movie as MovieIcon, Share as ShareIcon, Image as ImageIcon, TextFields, Palette as PaletteIcon, Check, ChevronRight, Add, CenterFocusStrong, SkipPrevious, ArrowLeft, ArrowRight, SkipNext } from '@mui/icons-material';
import { toast, Toaster } from 'sonner';

// Main App Components
import MainAppBar from './MainAppBar';
import Campaign from './Campaign';
import PostsCurtosStep from './PostsCurtosStep';
import ImageStep from './ImageStep';
import AudioGenerator from './AudioGenerator';
import VideoGenerator from './VideoGenerator2';
import Publisher from './Publisher';
import SetupModal from './SetupModal';
import CampaignStandardsModal from './CampaignStandardsModal';
import MemorialDescritivoModal from './MemorialDescritivoModal';
import PaletteWizard from './PaletteWizard';
import LoadCampaignModal from './LoadCampaignModal';
import SaveCampaignModal from './SaveCampaignModal';
import TextEditorDialog from './TextEditorDialog';

// Other imports
import { lightTheme, darkTheme } from '../theme.js';
import { useUserAuth } from '../context/UserAuthContext';
import { useSettings } from '../context/SettingsContext';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey, saveGeminiApiKey } from '../utils/geminiCredentials';
import { getGoogleCloudTTSCredentials, saveGoogleCloudTTSCredentials } from '../utils/googleCloudTTSCredentials';
import { getWordpressConfig, saveWordpressConfig } from '../utils/wordpressCredentials';
import { loadSettingsFromDb } from '../utils/credentialsManager';
import { saveCampaignPrompt } from '../utils/campaignPrompt.js';
import { saveCampaign, loadCampaign, getCampaigns } from '../utils/campaignState.js';
import { parseCsv, handleDownloadExampleCSV } from '../lib/helpers';
import { generateIAContent, generateCampaignContent, generateCampaignImagePrompt, generateCampaignImage, generateFormattedContent, generateFollowupPosts, exportHtml, generateColorPalette } from '../utils/generationHandlers';

function CampaignWorkflow() {
    const { user } = useUserAuth();
    const { settings, updateSetting, saveSettings } = useSettings();

    // Global UI State
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem('darkMode');
        return savedMode ? JSON.parse(savedMode) : false;
    });
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Campaign state
    const [activeStep, setActiveStep] = useState(1);
    const [problema, setProblema] = useState('');
    const [solucao, setSolucao] = useState('');
    const [campaignContent, setCampaignContent] = useState(null);
    const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
    const [campaignGenerationFailed, setCampaignGenerationFailed] = useState(false);
    const [generationError, setGenerationError] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [followupPosts, setFollowupPosts] = useState([]);
    const [followupPostsQuantity, setFollowupPostsQuantity] = useState(3);
    const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
    const [isGeneratingConteudoFormatado, setIsGeneratingConteudoFormatado] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Posts Curtos State
    const [csvData, setCsvData] = useState([]);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [inputMethod, setInputMethod] = useState('ia');
    const [promptNumRecords, setPromptNumRecords] = useState(5);
    const [promptText, setPromptText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Image Step State
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [fieldPositions, setFieldPositions] = useState({});
    const [fieldStyles, setFieldStyles] = useState({});
    const [initialFieldStyles, setInitialFieldStyles] = useState({});
    const [selectedField, setSelectedField] = useState(null);
    const [generatedImagesData, setGeneratedImagesData] = useState([]);
    const [imageDisplayedSize, setImageDisplayedSize] = useState({ width: 0, height: 0 });
    const [originalImageSize, setOriginalImageSize] = useState(null);
    const [imageFilters, setImageFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 });
    const [brandElements, setBrandElements] = useState([]);

    // Audio Step State
    const [generatedAudioData, setGeneratedAudioData] = useState([]);

    // Video Step State
    const [generatedVideosData, setGeneratedVideosData] = useState([]);

    // Publisher Step State
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(new Date());
    const [weeklySchedule, setWeeklySchedule] = useState({});
    const [selectedImages, setSelectedImages] = useState({});
    const [selectedVideos, setSelectedVideos] = useState({});

    // Modals and other UI state
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showStandardsModal, setShowStandardsModal] = useState(false);
    const [showMemorialModal, setShowMemorialModal] = useState(false);
    const [showPaletteWizard, setShowPaletteWizard] = useState(false);
    const [showLoadCampaignModal, setShowLoadCampaignModal] = useState(false);
    const [showSaveCampaignModal, setShowSaveCampaignModal] = useState(false);
    const [currentCampaign, setCurrentCampaign] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [htmlEditorOpen, setHtmlEditorOpen] = useState(false);
    const [editingFieldInfo, setEditingFieldInfo] = useState({ fieldId: null, content: '' });

    const fileInputRef = useRef(null);

    // Handlers
    const handleNext = () => setActiveStep((prevActiveStep) => prevActiveStep + 1);
    const handleBack = () => setActiveStep((prevActiveStep) => prevActiveStep - 1);
    const handleReset = () => {
        setActiveStep(1);
        setProblema('');
        setSolucao('');
        setCampaignContent(null);
        setCsvData([]);
        setCsvHeaders([]);
        setBackgroundImage(null);
        setFieldPositions({});
        setFieldStyles({});
        setGeneratedImagesData([]);
        setGeneratedAudioData([]);
        setGeneratedVideosData([]);
        setCurrentCampaign(null);
        toast.info("Campanha resetada.");
    };

    const handleGenerateCampaignContent = async (regenerate = false) => {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error("Por favor, configure sua chave da API Gemini nas configurações.");
            setShowSetupModal(true);
            return;
        }

        setIsGeneratingCampaign(true);
        setCampaignGenerationFailed(false);
        setGenerationError('');

        try {
            const content = await generateCampaignContent(apiKey, problema, solucao, (prompt) => geminiAPI.generateContent(prompt, "Geração de Conteúdo de Campanha"));
            setCampaignContent(content);
            toast.success("Conteúdo da campanha gerado com sucesso!");
        } catch (error) {
            console.error("Erro ao gerar conteúdo da campanha:", error);
            setCampaignGenerationFailed(true);
            setGenerationError(error.message);
            toast.error(`Falha ao gerar conteúdo: ${error.message}`);
        } finally {
            setIsGeneratingCampaign(false);
        }
    };

    const handleGenerateImage = async (content) => {
        setIsGeneratingImage(true);
        try {
            // Step 1: Generate the prompt for the image
            const prompt = await generateCampaignImagePrompt({ content, aspectRatio });
            // Step 2: Generate the image itself using the prompt
            const imageUrl = await generateCampaignImage({ prompt, aspectRatio });
            setGeneratedImageUrl(imageUrl);
            toast.success("Imagem gerada com sucesso!");
        } catch (error) {
            console.error("Erro ao gerar imagem:", error);
            toast.error(`Falha ao gerar imagem: ${error.message}`);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleGenerateFormattedContent = async () => {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error("Por favor, configure sua chave da API Gemini.");
            return;
        }
        setIsGeneratingConteudoFormatado(true);
        try {
            const formatted = await generateFormattedContent(apiKey, campaignContent, (prompt) => geminiAPI.generateContent(prompt, "Formatação de Conteúdo para HTML"));
            setCampaignContent(prev => ({ ...prev, conteudoFormatado: formatted }));
            toast.success("Conteúdo formatado gerado.");
        } catch (error) {
            toast.error(`Falha ao gerar conteúdo formatado: ${error.message}`);
        } finally {
            setIsGeneratingConteudoFormatado(false);
        }
    };

    const handleGenerateFollowupPosts = async () => {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error("Por favor, configure sua chave da API Gemini.");
            return;
        }
        setIsGeneratingFollowup(true);
        try {
            const posts = await generateFollowupPosts(apiKey, campaignContent, followupPostsQuantity, (prompt) => geminiAPI.generateContent(prompt, "Geração de Posts de Follow-up"));
            setFollowupPosts(posts);
            toast.success(`${posts.length} posts de follow-up gerados.`);
        } catch (error) {
            toast.error(`Falha ao gerar posts de follow-up: ${error.message}`);
        } finally {
            setIsGeneratingFollowup(false);
        }
    };

    // Effect for Dark Mode
    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    // Effect to load settings from DB on mount
    useEffect(() => {
        const loadAllSettings = async () => {
            if (user) {
                const loaded = await loadSettingsFromDb();
                if (loaded) {
                    // This will trigger the useSettings context to update,
                    // which in turn will provide the settings to all consumers.
                    // No need to set local state here.
                }
            }
        };
        loadAllSettings();
    }, [user]); // Depend on user, so it runs after login

    const steps = [
        { label: 'Campanha', description: 'Defina o problema e a solução.', component: <Campaign problema={problema} setProblema={setProblema} solucao={solucao} setSolucao={setSolucao} campaignContent={campaignContent} isGeneratingCampaign={isGeneratingCampaign} handleGenerateCampaignContent={handleGenerateCampaignContent} campaignGenerationFailed={campaignGenerationFailed} generationError={generationError} handleResetCampaign={() => setCampaignContent(null)} setEditingField={(field) => setEditingFieldInfo({ fieldId: 'campaign', content: campaignContent[field], fieldName: field })} isGeneratingConteudoFormatado={isGeneratingConteudoFormatado} handleGenerateFormattedContent={handleGenerateFormattedContent} followupPosts={followupPosts} isGeneratingFollowup={isGeneratingFollowup} handleGenerateFollowupPosts={handleGenerateFollowupPosts} followupPostsQuantity={followupPostsQuantity} setFollowupPostsQuantity={setFollowupPostsQuantity} generatedImageUrl={generatedImageUrl} isGeneratingImage={isGeneratingImage} handleGenerateImage={handleGenerateImage} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} setCampaignContent={setCampaignContent} onEditFollowup={(index, content) => setEditingFieldInfo({ fieldId: `followup_${index}`, content, fieldName: 'conteudo' })} /> },
        { label: 'Posts Curtos', description: 'Gere ou carregue o conteúdo dos posts.', component: <PostsCurtosStep csvData={csvData} setCsvData={setCsvData} csvHeaders={csvHeaders} setCsvHeaders={setCsvHeaders} inputMethod={inputMethod} setInputMethod={setInputMethod} promptNumRecords={promptNumRecords} setPromptNumRecords={setPromptNumRecords} promptText={promptText} setPromptText={setPromptText} isGenerating={isGenerating} setIsGenerating={setIsGenerating} fileInputRef={fileInputRef} /> },
        { label: 'Imagem e Formatação', description: 'Posicione os campos na imagem.', component: <ImageStep backgroundImage={backgroundImage} setBackgroundImage={setBackgroundImage} csvHeaders={csvHeaders} fieldPositions={fieldPositions} setFieldPositions={setFieldPositions} fieldStyles={fieldStyles} setFieldStyles={setFieldStyles} initialFieldStyles={initialFieldStyles} setInitialFieldStyles={setInitialFieldStyles} selectedField={selectedField} setSelectedField={setSelectedField} csvData={csvData} onImageDisplayedSizeChange={setImageDisplayedSize} originalImageSize={originalImageSize} setOriginalImageSize={setOriginalImageSize} imageFilters={imageFilters} setImageFilters={setImageFilters} brandElements={brandElements} setBrandElements={setBrandElements} onOpenHtmlEditor={(fieldId) => setEditingFieldInfo({ fieldId, content: csvData[0]?.[fieldId] || '', fieldName: fieldId })} /> },
        { label: 'Áudio', description: 'Gere a narração para os posts.', component: <AudioGenerator csvData={csvData} fieldPositions={fieldPositions} onAudiosGenerated={setGeneratedAudioData} initialAudioData={generatedAudioData} /> },
        { label: 'Vídeo', description: 'Crie o vídeo final da campanha.', component: <VideoGenerator generatedImagesData={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={setGeneratedVideosData} /> },
        { label: 'Publicar', description: 'Agende ou publique o conteúdo.', component: <Publisher settings={settings} campaignContent={campaignContent} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} followupPosts={followupPosts} isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} selectedImages={selectedImages} setSelectedImages={setSelectedVideos} currentCampaign={currentCampaign} /> },
    ];

    return (
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            <>
                <Stepper activeStep={activeStep - 1} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((step) => (
                        <Step key={step.label}>
                            <StepLabel>{step.label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
                {steps[activeStep - 1].component}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button disabled={activeStep === 1} onClick={handleBack}>Voltar</Button>
                    <Button variant="contained" onClick={handleNext} disabled={activeStep === steps.length}>
                        {activeStep === steps.length ? 'Finalizado' : 'Próximo'}
                    </Button>
                </Box>
            </>
        </Box>
    );
}

export default CampaignWorkflow;
