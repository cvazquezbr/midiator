import React, { useState, useEffect } from 'react';
import {
  Button,
  List,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Box,
  Drawer,
  Paper,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
  Toolbar
} from '@mui/material';
import { Add, ChevronLeft } from '@mui/icons-material';
import { toast } from 'sonner';

import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import { PersonaWizardContent, emptyPersonaWizardData } from '../components/PersonaWizard';
import MainAppBar from '../components/MainAppBar'; // Import the MainAppBar
import { useSettings } from '../context/SettingsContext';

const drawerWidth = 320;

const PersonasPage = () => {
  const { settings } = useSettings(); // Using settings from context
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [initialWizardStep, setInitialWizardStep] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  // This state is just for the App Bar, it doesn't do anything here
  const [darkMode, setDarkMode] = useState(false);


  useEffect(() => {
    fetchPersonas();
  }, []);

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const data = await getPersonas();
      setPersonas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = (persona) => {
    setSelectedPersona(persona);
    setInitialWizardStep(1);
    if (isMobile) setDrawerOpen(false);
  };

  const handleNewPersona = () => {
    setSelectedPersona({ name: '', persona_data: { ...emptyPersonaWizardData } });
    setInitialWizardStep(0);
    if (isMobile) setDrawerOpen(false);
  };

  const handleSave = async (personaData) => {
    const personaToSave = { ...selectedPersona, name: personaData.nome, persona_data: personaData };
    if (!personaToSave.name) {
      toast.error('O nome da persona é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      const savedPersona = personaToSave.id
        ? await updatePersona(personaToSave.id, personaToSave.name, personaToSave.persona_data)
        : await savePersona(personaToSave.name, personaToSave.persona_data);

      toast.success("Persona salva com sucesso!");
      await fetchPersonas();
      setSelectedPersona(savedPersona);
    } catch (err) {
      setError(err.message);
      toast.error(`Falha ao salvar persona: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePersonaWithAI = async (description, callback) => { /* ... */ };

  const drawerContent = (
      <Box sx={{p: 2, width: drawerWidth}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Personas</Typography>
            {!isMobile && (
                <IconButton onClick={() => setDrawerOpen(false)}>
                    <ChevronLeft />
                </IconButton>
            )}
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleNewPersona} fullWidth>
            Nova Persona
        </Button>
        <Divider sx={{my: 2}} />
        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <List>
            {personas.map((persona) => (
              <ListItemButton key={persona.id} selected={selectedPersona?.id === persona.id} onClick={() => handleSelectPersona(persona)}>
                <ListItemText primary={persona.name} />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <MainAppBar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onMenuClick={() => setDrawerOpen(!drawerOpen)}
        isMobile={isMobile}
      />
      <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
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
          {drawerContent}
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
              ...((drawerOpen && !isMobile) && {
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
                  onSave={handleSave}
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
  );
};

export default PersonasPage;
