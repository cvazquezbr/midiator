import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Box, Button, Drawer, Typography, Paper, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ArrowBack, Description, Edit, Image, Audiotrack as AudioIcon, Movie, Publish, ImageSearch as GerarImagensIcon, FormatShapes as PosicionarIcon } from '@mui/icons-material';
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

const drawerWidth = 300;

function CampaignWorkflow({ campaignToEdit, onExitWorkflow, drawerOpen, onToggleDrawer }) {
    const { user } = useUserAuth();
    const { settings } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // All state variables...
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
        if (campaignToEdit && campaignToEdit.campaign_data) {
            const data = campaignToEdit.campaign_data;
            setProblema(data.problema || '');
            setSolucao(data.solucao || '');
            setCampaignContent(data.campaignContent || null);
            setFollowupPosts(data.followupPosts || []);
            setGeneratedImageUrl(data.generatedImageUrl || null);
            setCsvData(data.csvData || []);
            setBackgroundImage(data.backgroundImage || null);
            setGeneratedImagesData(data.generatedImagesData || []);
            setGeneratedAudioData(data.generatedAudioData || []);
            setGeneratedVideosData(data.generatedVideosData || []);
            setCurrentCampaign(campaignToEdit);
            setActiveStep(1);
        }
    }, [campaignToEdit]);

    const handleNext = () => setActiveStep((prev) => (prev < steps.length ? prev + 1 : prev));
    const handleBack = () => setActiveStep((prev) => (prev > 1 ? prev - 1 : prev));
    const handleStepClick = (stepIndex) => setActiveStep(stepIndex + 1);
    const handleReset = () => { if (onExitWorkflow) onExitWorkflow(); };

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
        { label: 'Campanha', description: 'Defina o problema e a solução.', icon: <Description />, component: <Campaign problema={problema} setProblema={setProblema} solucao={solucao} setSolucao={setSolucao} campaignContent={campaignContent} isGeneratingCampaign={isGeneratingCampaign} handleGenerateCampaignContent={handleGenerateCampaignContent} campaignGenerationFailed={campaignGenerationFailed} generationError={generationError} handleResetCampaign={() => setCampaignContent(null)} setEditingField={(field) => setEditingFieldInfo({ fieldId: 'campaign', content: campaignContent[field], fieldName: field })} isGeneratingConteudoFormatado={isGeneratingConteudoFormatado} handleGenerateFormattedContent={handleGenerateFormattedContent} followupPosts={followupPosts} isGeneratingFollowup={isGeneratingFollowup} handleGenerateFollowupPosts={handleGenerateFollowupPosts} followupPostsQuantity={followupPostsQuantity} setFollowupPostsQuantity={setFollowupPostsQuantity} generatedImageUrl={generatedImageUrl} isGeneratingImage={isGeneratingImage} handleGenerateImage={handleGenerateImage} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} setCampaignContent={setCampaignContent} onEditFollowup={(index, content) => setEditingFieldInfo({ fieldId: `followup_${index}`, content, fieldName: 'conteudo' })} /> },
        { label: 'Editar Dados', description: 'Adicione, edite ou remova registros.', icon: <Edit />, component: <PostsCurtosStep csvData={csvData} setCsvData={setCsvData} csvHeaders={csvHeaders} setCsvHeaders={setCsvHeaders} inputMethod={inputMethod} setInputMethod={setInputMethod} promptNumRecords={promptNumRecords} setPromptNumRecords={setPromptNumRecords} promptText={promptText} setPromptText={setPromptText} isGenerating={isGenerating} setIsGenerating={setIsGenerating} /> },
        { label: 'Upload da Imagem', description: 'Carregue a imagem de fundo.', icon: <Image />, component: <ImageStep backgroundImage={backgroundImage} setBackgroundImage={setBackgroundImage} csvHeaders={csvHeaders} fieldPositions={fieldPositions} setFieldPositions={setFieldPositions} fieldStyles={fieldStyles} setFieldStyles={setFieldStyles} initialFieldStyles={initialFieldStyles} setInitialFieldStyles={setInitialFieldStyles} selectedField={selectedField} setSelectedField={setSelectedField} csvData={csvData} onImageDisplayedSizeChange={setImageDisplayedSize} originalImageSize={originalImageSize} setOriginalImageSize={setOriginalImageSize} imageFilters={imageFilters} setImageFilters={setImageFilters} brandElements={brandElements} setBrandElements={setBrandElements} onOpenHtmlEditor={(fieldId) => setEditingFieldInfo({ fieldId, content: csvData[0]?.[fieldId] || '', fieldName: fieldId })} /> },
        { label: 'Posicionar e Formatar', description: 'Ajuste os campos na imagem.', icon: <FormatShapes />, component: <div /> /* Placeholder */ },
        { label: 'Gerar Imagens', description: 'Crie as imagens para os posts.', icon: <GerarImagensIcon />, component: <div /> /* Placeholder */ },
        { label: 'Gerar Áudio', description: 'Gere a narração para os vídeos.', icon: <AudioIcon />, component: <AudioGenerator csvData={csvData} fieldPositions={fieldPositions} onAudiosGenerated={setGeneratedAudioData} initialAudioData={generatedAudioData} /> },
        { label: 'Gerar Vídeo', description: 'Compile as imagens e áudios.', icon: <Movie />, component: <VideoGenerator generatedImagesData={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={setGeneratedVideosData} /> },
        { label: 'Publicar', description: 'Agende ou publique o conteúdo.', icon: <Publish />, component: <Publisher settings={settings} campaignContent={campaignContent} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} followupPosts={followupPosts} isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} selectedImages={selectedImages} setSelectedImages={setSelectedVideos} currentCampaign={currentCampaign} /> },
    ];

    const drawerContent = (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e1e2f', color: 'white' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={onExitWorkflow} sx={{color: 'white', mr: 1}}>
                <ArrowBack />
            </IconButton>
            <Typography variant="h6">Etapas do Processo</Typography>
        </Box>
        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <List sx={{p: 1}}>
            {steps.map((step, index) => {
              const isActive = activeStep === index + 1;
              return (
                <ListItemButton
                  key={step.label}
                  selected={isActive}
                  onClick={() => handleStepClick(index)}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    background: isActive ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : 'transparent',
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
                    },
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? 'white' : 'grey.400', minWidth: 40 }}>{step.icon}</ListItemIcon>
                  <ListItemText
                    primary={step.label}
                    secondary={step.description}
                    primaryTypographyProps={{ fontWeight: 'bold', color: 'white' }}
                    secondaryTypographyProps={{ color: 'grey.400', fontSize: '0.75rem' }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Status do Projeto</Typography>
            {/* Placeholder for status. This needs real data binding. */}
            <Typography variant="caption" display="block">Registros: {csvData.length}</Typography>
            <Typography variant="caption" display="block">Imagem de Fundo: {backgroundImage ? 'Sim' : 'Não'}</Typography>
        </Box>
      </Box>
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
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        borderRight: 'none'
                    },
                }}
            >
                {drawerContent}
            </Drawer>
            <Box component="main" sx={{
                flexGrow: 1,
                p: { xs: 1, sm: 2, md: 3 },
                backgroundColor: '#28283e', // Main content background
                minHeight: '100vh'
            }}>
                <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, backgroundColor: '#1e1e2f', color: 'white' }}>
                    {steps[activeStep - 1].component}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                        <Button onClick={handleBack} sx={{ mr: 2, color: 'white', borderColor: 'white' }} variant="outlined">Anterior</Button>
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
