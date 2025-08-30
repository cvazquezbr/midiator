import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Toolbar, Paper, Typography, Button, List, ListItemButton, ListItemText, Drawer, CircularProgress, Alert, IconButton } from '@mui/material';
import Divider from '@mui/material/Divider';
import { Add, ChevronLeft } from '@mui/icons-material';
import { toast } from 'sonner';

// Main App Components
import MainAppBar from '../components/MainAppBar';
import CampaignWorkflow from '../components/CampaignWorkflow'; // Abstracted the campaign steps
import { PersonaWizardContent, emptyPersonaWizardData } from '../components/PersonaWizard';
import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';

// Other imports
import { lightTheme, darkTheme } from '../theme.js';
import { useUserAuth } from '../context/UserAuthContext';
import { useSettings } from '../context/SettingsContext';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';
import { loadSettingsFromDb } from '../utils/credentialsManager';

const drawerWidth = 320;

function HomePage() {
    const { user } = useUserAuth();
    const { settings, updateSetting, saveSettings } = useSettings();

    // Global UI State
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem('darkMode');
        return savedMode ? JSON.parse(savedMode) : false;
    });
    const [currentView, setCurrentView] = useState('campaign'); // 'campaign' or 'personas'
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // State for Persona View
    const [personaList, setPersonaList] = useState([]);
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [personaDrawerOpen, setPersonaDrawerOpen] = useState(!isMobile);
    const [personasLoading, setPersonasLoading] = useState(true);
    const [personasError, setPersonasError] = useState(null);
    const [isSavingPersona, setIsSavingPersona] = useState(false);
    const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
    const [initialWizardStep, setInitialWizardStep] = useState(0);

    // Effect for Dark Mode
    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    // Effect for Persona Drawer visibility on resize
    useEffect(() => {
        setPersonaDrawerOpen(!isMobile);
    }, [isMobile]);

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
        setInitialWizardStep(1);
        if (isMobile) setPersonaDrawerOpen(false);
    };

    const handleNewPersona = () => {
        setSelectedPersona({ name: '', persona_data: { ...emptyPersonaWizardData } });
        setInitialWizardStep(0);
        if (isMobile) setPersonaDrawerOpen(false);
    };

    const handleSavePersona = async (personaData) => {
        const personaToSave = { ...selectedPersona, name: personaData.nome, persona_data: personaData };
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
        } catch (err) {
            toast.error(`Falha ao salvar persona: ${err.message}`);
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
        const prompt = `Descreva uma persona para uma campanha de marketing para ${description}. ...`;
        try {
            const response = await geminiAPI.generateContent(prompt);
            const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
            if (callback) callback(JSON.parse(cleanedResponse));
        } catch (error) {
            toast.error('Ocorreu um erro ao processar a resposta da IA.');
        } finally {
            setIsGeneratingPersona(false);
        }
    };

    const personaDrawerContent = (
        <Box sx={{p: 2, width: drawerWidth}}>
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
                        <ListItemButton key={p.id} selected={selectedPersona?.id === p.id} onClick={() => handleSelectPersona(p)}>
                            <ListItemText primary={p.name} />
                        </ListItemButton>
                    ))}
                </List>
            )}
        </Box>
    );

    const currentTheme = darkMode ? darkTheme : lightTheme;

    return (
        <ThemeProvider theme={currentTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
                <MainAppBar
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    onShowPersonas={() => setCurrentView('personas')}
                    onShowCampaigns={() => setCurrentView('campaign')}
                    // Pass other necessary props...
                />

                {currentView === 'campaign' && (
                    <CampaignWorkflow />
                )}

                {currentView === 'personas' && (
                    <Box sx={{ display: 'flex', width: '100%' }}>
                        <Drawer
                            variant={isMobile ? 'temporary' : 'persistent'}
                            anchor="left"
                            open={personaDrawerOpen}
                            onClose={() => setPersonaDrawerOpen(false)}
                            sx={{
                                width: drawerWidth,
                                flexShrink: 0,
                                '& .MuiDrawer-paper': {
                                    width: drawerWidth,
                                    boxSizing: 'border-box',
                                },
                            }}
                        >
                            <Toolbar /> {/* Spacer for AppBar */}
                            {personaDrawerContent}
                        </Drawer>
                        <Box
                            component="main"
                            sx={{
                                flexGrow: 1,
                                p: 3,
                                transition: theme.transitions.create('margin', {
                                    easing: theme.transitions.easing.sharp,
                                    duration: theme.transitions.duration.leavingScreen,
                                }),
                                marginLeft: `-${drawerWidth}px`,
                                ...((personaDrawerOpen && !isMobile) && {
                                    transition: theme.transitions.create('margin', {
                                        easing: theme.transitions.easing.easeOut,
                                        duration: theme.transitions.duration.enteringScreen,
                                    }),
                                    marginLeft: 0,
                                }),
                            }}
                        >
                            <Toolbar /> {/* Spacer for AppBar */}
                            <Paper elevation={2} sx={{ p: 3 }}>
                                {selectedPersona ? (
                                    <PersonaWizardContent
                                        key={selectedPersona.id || 'new'}
                                        onClose={() => setSelectedPersona(null)}
                                        onSave={handleSavePersona}
                                        onReset={handleNewPersona}
                                        persona={selectedPersona.persona_data}
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
        </ThemeProvider>
    );
}

export default HomePage;
