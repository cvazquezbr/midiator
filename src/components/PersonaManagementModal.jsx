import React, { useState, useEffect } from 'react';
import {
  Modal,
  Paper,
  IconButton,
  Drawer,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Close, Add, Delete, Menu as MenuIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import { PersonaWizardContent, emptyPersonaWizardData } from './PersonaWizard';
import ConfirmationDialog from './ConfirmationDialog';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

const drawerWidth = 340;

const PersonaManagementModal = ({ open, onClose }) => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [initialWizardStep, setInitialWizardStep] = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (open) {
      fetchPersonas();
    } else {
      setSelectedPersona(null);
      setIsDirty(false);
    }
  }, [open]);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const data = await getPersonas();
      setPersonas(data);
    } catch (err) {
      setError(err.message);
      toast.error("Falha ao carregar personas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (personaData) => {
    const personaToSave = { ...selectedPersona, name: personaData.nome, persona_data: personaData };
    if (!personaToSave.name) {
      toast.error('O nome da persona é obrigatório.');
      return;
    }
    try {
      const savedPersona = personaToSave.id
        ? await updatePersona(personaToSave.id, personaToSave.name, personaToSave.persona_data)
        : await savePersona(personaToSave.name, personaToSave.persona_data);

      toast.success("Persona salva com sucesso!");
      await fetchPersonas();
      // After saving, update the selected persona to the one returned from the API
      // This ensures we have the correct ID for new personas and any other server-side updates
      setSelectedPersona(savedPersona);
      setIsDirty(false);
    } catch (err) {
      setError(err.message);
      toast.error(`Falha ao salvar persona: ${err.message}`);
    }
  };

  const handleDelete = async (personaId, personaName) => {
    if (window.confirm(`Tem certeza que deseja deletar a persona "${personaName}"?`)) {
      try {
        await deletePersona(personaId);
        await fetchPersonas();
        if (selectedPersona?.id === personaId) setSelectedPersona(null);
        toast.success(`Persona "${personaName}" deletada.`);
      } catch (err) {
        setError(err.message);
        toast.error(`Falha ao deletar persona: ${err.message}`);
      }
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
    const prompt = `Descriver uma persona para uma campanha de marketing para ${description}. Preencha os campos do objeto JSON...`;
    try {
      const response = await geminiAPI.generateContent(prompt);
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedPersona = JSON.parse(cleanedResponse);
      if (callback) callback(generatedPersona);
    } catch (error) {
      console.error("Erro ao gerar persona com IA:", error);
      toast.error('Ocorreu um erro ao processar a resposta da IA.');
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const attemptAction = (action) => {
    if (isDirty) {
      setOnConfirmAction(() => () => {
        action();
        setIsDirty(false);
      });
      setConfirmDialogOpen(true);
    } else {
      action();
    }
  };

  const handleSelectPersona = (persona) => {
    attemptAction(() => {
      setSelectedPersona(persona);
      setInitialWizardStep(1);
      if (isMobile) setMobileDrawerOpen(false);
    });
  };

  const handleNewPersona = () => {
    attemptAction(() => {
      setSelectedPersona({ name: '', persona_data: { ...emptyPersonaWizardData } });
      setInitialWizardStep(0);
      if (isMobile) setMobileDrawerOpen(false);
    });
  };

  const handleMainClose = () => attemptAction(onClose);
  const handleConfirm = () => {
    if (onConfirmAction) onConfirmAction();
    setConfirmDialogOpen(false);
    setOnConfirmAction(null);
  };
  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setOnConfirmAction(null);
  };

  const drawerContent = (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <Typography variant="h6">Personas</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={handleNewPersona}>Nova</Button>
      </Box>
      <Divider />
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {!loading && !error && (
        <List sx={{ overflowY: 'auto' }}>
          {personas.map((p) => (
            <ListItem key={p.id} disablePadding secondaryAction={
              <IconButton edge="end" onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}><Delete fontSize="small" /></IconButton>
            }>
              <ListItemButton selected={selectedPersona?.id === p.id} onClick={() => handleSelectPersona(p)}>
                <ListItemText primary={p.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <>
      <Modal open={open} onClose={handleMainClose} closeAfterTransition>
        <Paper sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          bgcolor: 'background.paper'
        }}>
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
              {isMobile && (
                <IconButton color="inherit" edge="start" sx={{ mr: 2 }} onClick={() => setMobileDrawerOpen(true)}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                Gerenciador de Personas
              </Typography>
              <IconButton color="inherit" onClick={handleMainClose}>
                <Close />
              </IconButton>
            </Toolbar>
          </AppBar>
          <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
            <Drawer
              variant={isMobile ? "temporary" : "permanent"}
              open={isMobile ? mobileDrawerOpen : true}
              onClose={() => setMobileDrawerOpen(false)}
              anchor="left"
              sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                  position: isMobile ? 'fixed' : 'relative',
                  height: '100%'
                },
              }}
            >
              {drawerContent}
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
              {selectedPersona ? (
                <PersonaWizardContent
                  key={selectedPersona.id || 'new'}
                  onClose={() => attemptAction(() => setSelectedPersona(null))}
                  onSave={handleSave}
                  onReset={() => attemptAction(handleNewPersona)}
                  onDirtyChange={setIsDirty}
                  persona={selectedPersona.persona_data}
                  onGenerate={handleGeneratePersonaWithAI}
                  isGeneratingPersona={isGeneratingPersona}
                  initialStep={initialWizardStep}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h6" color="text.secondary">Selecione ou crie uma persona.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      </Modal>
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirm}
        title="Descartar Alterações?"
        message="Você tem alterações não salvas. Tem certeza de que deseja descartá-las?"
      />
    </>
  );
};

export default PersonaManagementModal;
