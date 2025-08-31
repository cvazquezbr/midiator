import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Toolbar, Paper, Typography, Button, List, ListItem, ListItemText, Drawer, CircularProgress, Alert, IconButton, ListItemButton } from '@mui/material';
import Divider from '@mui/material/Divider';
import { Add, ChevronLeft, Edit } from '@mui/icons-material';
import { toast } from 'sonner';

// Main App Components
import MainAppBar from '../components/MainAppBar';
import CampaignWorkflow from '../components/CampaignWorkflow';
import { PersonaWizardContent, emptyPersonaWizardData } from '../components/PersonaWizard';
import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import { getCampaigns } from '../utils/campaignState';

// Other imports
import { lightTheme, darkTheme } from '../theme.js';
import { useUserAuth } from '../context/UserAuthContext';

const drawerWidth = 320;
const campaignDrawerWidth = 300;

function HomePage() {
    const { user } = useUserAuth();

    // Global UI State
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem('darkMode');
        return savedMode ? JSON.parse(savedMode) : false;
    });
    const [currentView, setCurrentView] = useState('campaign');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // State for Persona View
    const [personaList, setPersonaList] = useState([]);
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [personaDrawerOpen, setPersonaDrawerOpen] = useState(!isMobile);
    const [personasLoading, setPersonasLoading] = useState(true);
    const [personasError, setPersonasError] = useState(null);

    // State for Campaign View
    const [campaigns, setCampaigns] = useState([]);
    const [campaignsLoading, setCampaignsLoading] = useState(true);
    const [campaignsError, setCampaignsError] = useState(null);
    const [campaignToEdit, setCampaignToEdit] = useState(null);
    const [showWorkflow, setShowWorkflow] = useState(false);
    const [campaignDrawerOpen, setCampaignDrawerOpen] = useState(!isMobile);

    // Effects
    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    useEffect(() => {
        setPersonaDrawerOpen(!isMobile);
        setCampaignDrawerOpen(!isMobile);
    }, [isMobile]);

    useEffect(() => {
        if (currentView === 'personas') {
            fetchPersonas();
        } else if (currentView === 'campaign') {
            fetchCampaigns();
        }
    }, [currentView]);

    // Fetching Functions
    const fetchPersonas = async () => { /* ... */ };
    const fetchCampaigns = async () => { /* ... */ };

    // Handlers
    const handleNewCampaign = () => {
        setCampaignToEdit(null);
        setShowWorkflow(true);
    };

    const handleEditCampaign = (campaign) => {
        setCampaignToEdit(campaign);
        setShowWorkflow(true);
    };

    const handleSelectPersona = (p) => { /* ... */ };
    const handleNewPersona = () => { /* ... */ };

    const personaDrawerContent = ( /* ... */ );

    const currentTheme = darkMode ? darkTheme : lightTheme;

    return (
        <ThemeProvider theme={currentTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
                <MainAppBar
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    onShowPersonas={() => setCurrentView('personas')}
                    onShowCampaigns={() => { setCurrentView('campaign'); setShowWorkflow(false); }}
                    isMobile={isMobile}
                    currentView={currentView}
                    onTogglePersonaDrawer={() => setPersonaDrawerOpen(!personaDrawerOpen)}
                    onToggleCampaignDrawer={() => setCampaignDrawerOpen(!campaignDrawerOpen)}
                />

                {currentView === 'campaign' && (
                    showWorkflow ? (
                        <CampaignWorkflow
                            campaignToEdit={campaignToEdit}
                            onExitWorkflow={() => {
                                setShowWorkflow(false);
                                fetchCampaigns();
                            }}
                            drawerOpen={campaignDrawerOpen}
                            onToggleDrawer={() => setCampaignDrawerOpen(!campaignDrawerOpen)}
                        />
                    ) : (
                        <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
                            <Toolbar />
                            <Paper sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h5">Minhas Campanhas</Typography>
                                    <Button variant="contained" startIcon={<Add />} onClick={handleNewCampaign}>
                                        Criar Nova Campanha
                                    </Button>
                                </Box>
                                {campaignsLoading && <CircularProgress />}
                                {campaignsError && <Alert severity="error">{campaignsError}</Alert>}
                                {!campaignsLoading && !campaignsError && (
                                    <List>
                                        {campaigns.map((campaign) => (
                                            <ListItem key={campaign.id} secondaryAction={ <IconButton edge="end" onClick={() => handleEditCampaign(campaign)}><Edit /></IconButton> }>
                                                <ListItemText primary={campaign.name || 'Campanha Sem Nome'} secondary={`Criada em: ${new Date(campaign.created_at).toLocaleDateString()}`} />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                        </Box>
                    )
                )}

                {currentView === 'personas' && (
                    /* ... persona view JSX ... */
                )}
            </Box>
        </ThemeProvider>
    );
}

export default HomePage;
