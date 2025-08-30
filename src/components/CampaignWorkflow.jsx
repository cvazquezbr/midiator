import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Box, Button, Stepper, Step, StepLabel, Drawer, Typography, StepConnector, Paper, IconButton } from '@mui/material';
import { Check, ArrowBack } from '@mui/icons-material';
import { toast } from 'sonner';

// Child Step Components
import Campaign from './Campaign';
import PostsCurtosStep from './PostsCurtosStep';
import ImageStep from './ImageStep';
import AudioGenerator from './AudioGenerator';
import VideoGenerator from './VideoGenerator2';
import Publisher from './Publisher';

// Other imports
import { useUserAuth } from '../context/UserAuthContext';
import { useSettings } from '../context/SettingsContext';
import { generateCampaignContent, generateCampaignImagePrompt, generateCampaignImage, generateFormattedContent, generateFollowupPosts, generateFollowupPlan } from '../utils/generationHandlers';

const drawerWidth = 280;

function CampaignWorkflow({ campaignToEdit, onExitWorkflow, drawerOpen, onToggleDrawer }) {
    const { user } = useUserAuth();
    const { settings } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Campaign state and other states...
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
    const [csvData, setCsvData] = useState([]);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [inputMethod, setInputMethod] = useState('ia');
    const [promptNumRecords, setPromptNumRecords] = useState(5);
    const [promptText, setPromptText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
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
    const [generatedAudioData, setGeneratedAudioData] = useState([]);
    const [generatedVideosData, setGeneratedVideosData] = useState([]);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(new Date());
    const [weeklySchedule, setWeeklySchedule] = useState({});
    const [selectedImages, setSelectedImages] = useState({});
    const [selectedVideos, setSelectedVideos] = useState({});
    const [currentCampaign, setCurrentCampaign] = useState(null);
    const [editingFieldInfo, setEditingFieldInfo] = useState({ fieldId: null, content: '' });

    useEffect(() => {
        if (campaignToEdit) {
            setProblema(campaignToEdit.problema || '');
            setSolucao(campaignToEdit.solucao || '');
            setCampaignContent(campaignToEdit.campaign_content || null);
            setCurrentCampaign(campaignToEdit);
            setActiveStep(1);
        }
    }, [campaignToEdit]);

    // Handlers
    const handleNext = () => setActiveStep((prev) => (prev < steps.length ? prev + 1 : prev));
    const handleBack = () => setActiveStep((prev) => (prev > 1 ? prev - 1 : prev));
    const handleStepClick = (stepIndex) => setActiveStep(stepIndex + 1);

    const handleReset = () => {
        if (onExitWorkflow) onExitWorkflow();
    };

    const handleGenerateCampaignContent = async () => {
        setIsGeneratingCampaign(true);
        setCampaignGenerationFailed(false);
        setGenerationError('');
        try {
            const content = await generateCampaignContent({ problema, solucao });
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
            const prompt = await generateCampaignImagePrompt({ content, aspectRatio });
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
        setIsGeneratingConteudoFormatado(true);
        try {
            const formatted = await generateFormattedContent({ content: campaignContent });
            setCampaignContent(prev => ({ ...prev, conteudoFormatado: formatted }));
            toast.success("Conteúdo formatado gerado.");
        } catch (error) {
            toast.error(`Falha ao gerar conteúdo formatado: ${error.message}`);
        } finally {
            setIsGeneratingConteudoFormatado(false);
        }
    };

    const handleGenerateFollowupPosts = async () => {
        setIsGeneratingFollowup(true);
        try {
            const plan = await generateFollowupPlan({ content: campaignContent, neededQuantity: followupPostsQuantity });
            const posts = await generateFollowupPosts({ content: campaignContent, plan });
            setFollowupPosts(posts);
            toast.success(`${posts.length} posts de follow-up gerados.`);
        } catch (error) {
            toast.error(`Falha ao gerar posts de follow-up: ${error.message}`);
        } finally {
            setIsGeneratingFollowup(false);
        }
    };

    const steps = [
        { label: 'Campanha', component: <Campaign problema={problema} setProblema={setProblema} solucao={solucao} setSolucao={setSolucao} campaignContent={campaignContent} isGeneratingCampaign={isGeneratingCampaign} handleGenerateCampaignContent={handleGenerateCampaignContent} campaignGenerationFailed={campaignGenerationFailed} generationError={generationError} handleResetCampaign={() => setCampaignContent(null)} setEditingField={(field) => setEditingFieldInfo({ fieldId: 'campaign', content: campaignContent[field], fieldName: field })} isGeneratingConteudoFormatado={isGeneratingConteudoFormatado} handleGenerateFormattedContent={handleGenerateFormattedContent} followupPosts={followupPosts} isGeneratingFollowup={isGeneratingFollowup} handleGenerateFollowupPosts={handleGenerateFollowupPosts} followupPostsQuantity={followupPostsQuantity} setFollowupPostsQuantity={setFollowupPostsQuantity} generatedImageUrl={generatedImageUrl} isGeneratingImage={isGeneratingImage} handleGenerateImage={handleGenerateImage} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} setCampaignContent={setCampaignContent} onEditFollowup={(index, content) => setEditingFieldInfo({ fieldId: `followup_${index}`, content, fieldName: 'conteudo' })} /> },
        { label: 'Posts Curtos', component: <PostsCurtosStep csvData={csvData} setCsvData={setCsvData} csvHeaders={csvHeaders} setCsvHeaders={setCsvHeaders} inputMethod={inputMethod} setInputMethod={setInputMethod} promptNumRecords={promptNumRecords} setPromptNumRecords={setPromptNumRecords} promptText={promptText} setPromptText={setPromptText} isGenerating={isGenerating} setIsGenerating={setIsGenerating} /> },
        { label: 'Imagem e Formatação', component: <ImageStep backgroundImage={backgroundImage} setBackgroundImage={setBackgroundImage} csvHeaders={csvHeaders} fieldPositions={fieldPositions} setFieldPositions={setFieldPositions} fieldStyles={fieldStyles} setFieldStyles={setFieldStyles} initialFieldStyles={initialFieldStyles} setInitialFieldStyles={setInitialFieldStyles} selectedField={selectedField} setSelectedField={setSelectedField} csvData={csvData} onImageDisplayedSizeChange={setImageDisplayedSize} originalImageSize={originalImageSize} setOriginalImageSize={setOriginalImageSize} imageFilters={imageFilters} setImageFilters={setImageFilters} brandElements={brandElements} setBrandElements={setBrandElements} onOpenHtmlEditor={(fieldId) => setEditingFieldInfo({ fieldId, content: csvData[0]?.[fieldId] || '', fieldName: fieldId })} /> },
        { label: 'Áudio', component: <AudioGenerator csvData={csvData} fieldPositions={fieldPositions} onAudiosGenerated={setGeneratedAudioData} initialAudioData={generatedAudioData} /> },
        { label: 'Vídeo', component: <VideoGenerator generatedImagesData={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={setGeneratedVideosData} /> },
        { label: 'Publicar', component: <Publisher settings={settings} campaignContent={campaignContent} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} followupPosts={followupPosts} isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} selectedImages={selectedImages} setSelectedImages={setSelectedVideos} currentCampaign={currentCampaign} /> },
    ];

    const drawerContent = (
        <div>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Etapas</Typography>
                <IconButton onClick={onExitWorkflow}>
                    <ArrowBack />
                </IconButton>
            </Box>
            <Stepper activeStep={activeStep - 1} orientation="vertical" connector={<StepConnector sx={{ ml: 1.5 }} />}>
                {steps.map((step, index) => (
                    <Step key={step.label} completed={activeStep > index + 1}>
                        <StepLabel
                            onClick={() => handleStepClick(index)}
                            sx={{ cursor: 'pointer', p: 1 }}
                            StepIconComponent={(props) => {
                                const { active, completed, icon } = props;
                                return (
                                    <Box sx={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        backgroundColor: active ? 'primary.main' : (completed ? 'success.main' : 'grey.400'),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                        mr: 1
                                    }}>
                                        {completed ? <Check /> : icon}
                                    </Box>
                                );
                            }}
                        >
                            {step.label}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
        </div>
    );

    return (
        <Box sx={{ display: 'flex', width: '100%' }}>
            <Drawer
                variant={isMobile ? 'temporary' : 'persistent'}
                open={drawerOpen}
                onClose={onToggleDrawer}
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                {drawerContent}
            </Drawer>
            <Box component="main" sx={{
                flexGrow: 1,
                p: { xs: 1, sm: 2, md: 3 },
                transition: theme.transitions.create('margin', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                marginLeft: !isMobile ? `-${drawerWidth}px` : 0,
                ...(!isMobile && drawerOpen && {
                    transition: theme.transitions.create('margin', {
                        easing: theme.transitions.easing.easeOut,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    marginLeft: 0,
                }),
            }}>
                <Paper sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                    {steps[activeStep - 1].component}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                        <Button disabled={activeStep === 1} onClick={handleBack}>Voltar</Button>
                        <Button variant="contained" onClick={handleNext} disabled={activeStep >= steps.length}>
                            {activeStep >= steps.length ? 'Finalizado' : 'Próximo'}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}

export default CampaignWorkflow;
