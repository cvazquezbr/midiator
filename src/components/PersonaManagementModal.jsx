import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
  useMediaQuery
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
        // Reset state when modal is fully closed
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

  const attemptAction = (action) => {
    if (isDirty) {
      setOnConfirmAction(() => () => {
        action();
        setIsDirty(false); // Action confirmed, form is no longer dirty
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
      setSelectedPersona(savedPersona);
      setIsDirty(false); // After a successful save, the form is no longer dirty
    } catch (err) {
      setError(err.message);
      toast.error(`Falha ao salvar persona: ${err.message}`);
    }
  };

  const handleDelete = async (personaId, personaName) => {
    // This is a destructive action, so it should have its own confirmation
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
    setIsGeneratingPersona(true);
    // ... AI logic ...
    setIsGeneratingPersona(false);
  };

  const handleMainClose = () => {
    attemptAction(onClose);
  };

  const handleConfirm = () => {
    if (onConfirmAction) {
        onConfirmAction();
    }
    setConfirmDialogOpen(false);
    setOnConfirmAction(null);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setOnConfirmAction(null);
  };

  const drawerContent = (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Personas</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={handleNewPersona}>
          Nova
        </Button>
      </Box>
      <Divider />
      {loading && <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{mt: 2}}>{error}</Alert>}
      {!loading && !error && (
        <List sx={{ overflowY: 'auto' }}>
          {personas.map((persona) => (
            <ListItem key={persona.id} disablePadding secondaryAction={
              <IconButton edge="end" onClick={(e) => { e.stopPropagation(); handleDelete(persona.id, persona.name); }}><Delete fontSize="small" /></IconButton>
            }>
              <ListItemButton selected={selectedPersona?.id === persona.id} onClick={() => handleSelectPersona(persona)}>
                <ListItemText primary={persona.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={handleMainClose} fullWidth maxWidth="xl" fullScreen>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
              <IconButton onClick={() => setMobileDrawerOpen(true)} sx={{ mr: 1 }}>
                  <MenuIcon />
              </IconButton>
          )}
          Gerenciador de Personas
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={handleMainClose}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', height: '100%' }}>
          <Drawer
            variant={isMobile ? "temporary" : "permanent"}
            open={isMobile ? mobileDrawerOpen : true}
            onClose={() => setMobileDrawerOpen(false)}
            anchor="left"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', position: 'relative' },
            }}
          >
            {drawerContent}
          </Drawer>
          <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, overflow: 'auto' }}>
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
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Selecione uma persona para editar ou crie uma nova no painel lateral.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
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
