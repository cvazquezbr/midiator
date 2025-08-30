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

  const fetchPersonas = async () => { /* ... */ };
  const handleSave = async (personaData) => { /* ... */ };
  const handleDelete = async (personaId, personaName) => { /* ... */ };
  const handleGeneratePersonaWithAI = async (description, callback) => { /* ... */ };

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
      <Modal open={open} onClose={handleMainClose}>
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
                // When temporary on mobile, it needs a higher z-index to appear over the modal
                zIndex: isMobile ? theme.zIndex.modal + 1 : 'auto',
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                  // When permanent on desktop, it needs to be part of the layout
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
