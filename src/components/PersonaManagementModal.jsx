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
import ConfirmationDialog from './ConfirmationDialog'; // Import new component
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

  // State for dirty check and confirmation
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => { if (open) fetchPersonas(); }, [open]);

  const fetchPersonas = async () => { /* ... */ };

  const attemptAction = (action) => {
    if (isDirty) {
      setOnConfirmAction(() => action);
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

  const handleSave = async (personaData) => { /* ... */ };
  const handleDelete = async (personaId, personaName) => { /* ... */ };
  const handleGeneratePersonaWithAI = async (description, callback) => { /* ... */ };

  const handleCloseWizard = (isFormDirty) => {
    if (isFormDirty) {
        setOnConfirmAction(() => () => setSelectedPersona(null));
        setConfirmDialogOpen(true);
    } else {
        setSelectedPersona(null);
    }
  };

  const handleWizardReset = (isFormDirty) => {
    if (isFormDirty) {
        setOnConfirmAction(() => () => handleNewPersona());
        setConfirmDialogOpen(true);
    } else {
        handleNewPersona();
    }
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
    <Box>
      {/* ... drawer content ... */}
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={() => attemptAction(onClose)} fullWidth maxWidth="xl" fullScreen>
        {/* ... DialogTitle and Drawer ... */}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
          {selectedPersona ? (
            <PersonaWizardContent
              key={selectedPersona.id || 'new'}
              onClose={handleCloseWizard}
              onSave={handleSave}
              onReset={handleWizardReset}
              onDirtyChange={setIsDirty}
              persona={selectedPersona.persona_data}
              onGenerate={handleGeneratePersonaWithAI}
              isGeneratingPersona={isGeneratingPersona}
              initialStep={initialWizardStep}
            />
          ) : (
            <Box>
              <Typography>Selecione uma persona para editar ou crie uma nova.</Typography>
            </Box>
          )}
        </Box>
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
