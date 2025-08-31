import React, { useState, useEffect } from 'react';
import { Box, Paper, Button, Stepper, Step, StepLabel, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { toast } from 'sonner';

import Campaign from './Campaign';
import PostsCurtosStep from './PostsCurtosStep';
import ImageStep from './ImageStep';
import AudioGenerator from './AudioGenerator';
import VideoGenerator from './VideoGenerator2';
import Publisher from './Publisher';

import { useUserAuth } from '../context/UserAuthContext';
import { useSettings } from '../context/SettingsContext';
import { generateCampaignContent, generateCampaignImagePrompt, generateCampaignImage } from '../utils/generationHandlers';

function CampaignWorkflow({ campaignToEdit, onExitWorkflow }) {
    const { user } = useUserAuth();
    const { settings } = useSettings();

    const [activeStep, setActiveStep] = useState(1);
    const [problema, setProblema] = useState('');
    const [solucao, setSolucao] = useState('');
    const [campaignContent, setCampaignContent] = useState({ hashtags: [] });
    const [generatedImagesData, setGeneratedImagesData] = useState([]);
    const [generatedAudioData, setGeneratedAudioData] = useState([]);
    const [generatedVideosData, setGeneratedVideosData] = useState([]);
    const [currentCampaign, setCurrentCampaign] = useState(null);

    useEffect(() => {
        if (campaignToEdit && campaignToEdit.campaign_data) {
            const data = campaignToEdit.campaign_data;
            setProblema(data.problema || '');
            setSolucao(data.solucao || '');
            setCampaignContent(data.campaignContent || { hashtags: [] });
            setGeneratedImagesData(data.generatedImagesData || []);
            setGeneratedAudioData(data.generatedAudioData || []);
            setGeneratedVideosData(data.generatedVideosData || []);
            setCurrentCampaign(campaignToEdit);
            setActiveStep(1);
        } else {
            // Reset state if creating a new campaign
            setProblema('');
            setSolucao('');
            setCampaignContent({ hashtags: [] });
            setGeneratedImagesData([]);
            setGeneratedAudioData([]);
            setGeneratedVideosData([]);
            setCurrentCampaign(null);
            setActiveStep(1);
        }
    }, [campaignToEdit]);

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    const steps = [
        { label: 'Campanha', component: <Campaign problema={problema} setProblema={setProblema} solucao={solucao} setSolucao={setSolucao} campaignContent={campaignContent} handleGenerateCampaignContent={async () => setCampaignContent(await generateCampaignContent({ problema, solucao }))} /> },
        { label: 'Posts Curtos', component: <PostsCurtosStep /> },
        { label: 'Imagem', component: <ImageStep /> },
        { label: 'Áudio', component: <AudioGenerator onAudiosGenerated={setGeneratedAudioData} /> },
        { label: 'Vídeo', component: <VideoGenerator generatedImagesData={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={setGeneratedVideosData} /> },
        { label: 'Publicar', component: <Publisher campaignContent={campaignContent} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} /> },
    ];

    return (
        <Paper sx={{ p: 3, position: 'relative' }}>
            <IconButton onClick={onExitWorkflow} sx={{ position: 'absolute', top: 8, left: 8 }}>
                <ArrowBack />
            </IconButton>
            <Stepper activeStep={activeStep - 1} alternativeLabel sx={{ mb: 4, mt: 4 }}>
                {steps.map((step) => (
                    <Step key={step.label}>
                        <StepLabel>{step.label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {steps[activeStep - 1] && steps[activeStep - 1].component}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button disabled={activeStep === 1} onClick={handleBack} sx={{ mr: 1 }}>
                    Voltar
                </Button>
                <Button variant="contained" onClick={handleNext} disabled={activeStep >= steps.length}>
                    {activeStep >= steps.length ? 'Finalizado' : 'Próximo'}
                </Button>
            </Box>
        </Paper>
    );
}

export default CampaignWorkflow;
