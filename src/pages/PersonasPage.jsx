import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Paper, Typography, Box, Button, Alert, IconButton, Toolbar, Divider, Drawer, List, ListItem, ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';
import { ChevronLeft, Add, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import isEqual from 'lodash.isequal';

import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import PersonaWizard, { emptyPersonaWizardData } from '../components/PersonaWizard';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import { getGeminiApiKey } from '../utils/geminiCredentials';
import geminiAPI from '../utils/geminiAPI';
import { useSettings } from '../context/SettingsContext';

/**
 * @component PersonasPage
 * @description This component encapsulates the entire "Persona Management" feature.
 * It is responsible for fetching, displaying, creating, editing, and saving personas.
 * It also manages the layout, including the persona list drawer and the main content area
 * where the `PersonaWizard` is displayed. The component is self-contained and handles
 * all its state and API interactions.
 */
const PersonasPage = ({ personaDrawerOpen, setPersonaDrawerOpen, onNoPersonaSelected, onUpdate, startInCreateMode, onPersonaCreated, onCreationCancelled, onPersonaSelected }) => {
  const { settings } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for Persona View
  const [personaList, setPersonaList] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasError, setPersonasError] = useState(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [initialWizardStep, setInitialWizardStep] = useState(0);

  // State for unsaved changes guard
  const [personaFormData, setPersonaFormData] = useState(null);
  const [isPersonaDirty, setIsPersonaDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  // Effect for unsaved changes in Persona form
  useEffect(() => {
    if (selectedPersona && personaFormData) {
        const isDirty = !isEqual(selectedPersona.persona_data, personaFormData);
        setIsPersonaDirty(isDirty);
    } else {
        setIsPersonaDirty(false);
    }
  }, [personaFormData, selectedPersona]);

  // Effect to load personas when the component mounts
  useEffect(() => {
      fetchPersonas();
  }, []);

  // Effect to automatically open the drawer if no persona is selected
  useEffect(() => {
    if (!selectedPersona && onNoPersonaSelected) {
      onNoPersonaSelected();
    }
  }, [selectedPersona, onNoPersonaSelected]);

  useEffect(() => {
    if (startInCreateMode) {
      handleNewPersona();
    }
  }, [startInCreateMode]);

  /**
   * Fetches the list of personas from the API and updates the state.
   */
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

  /**
   * Handles the selection of a persona from the list.
   * @param {object} p - The selected persona object.
   */
  const handleSelectPersona = (p) => {
      if (onPersonaSelected) {
        onPersonaSelected(p);
      } else {
        setSelectedPersona(p);
        setPersonaFormData(p.persona_data);
        setIsPersonaDirty(false);
        setInitialWizardStep(1);
        if (isMobile) setPersonaDrawerOpen(false);
      }
  };

  /**
   * Handles the creation of a new, empty persona.
   */
  const handleNewPersona = () => {
      const newEmptyPersona = { name: '', persona_data: { ...emptyPersonaWizardData } };
      setSelectedPersona(newEmptyPersona);
      setPersonaFormData(newEmptyPersona.persona_data);
      setIsPersonaDirty(false);
      setInitialWizardStep(0);
      if (isMobile) setPersonaDrawerOpen(false);
  };

  /**
   * Saves the current persona data (either creating a new persona or updating an existing one).
   * @returns {Promise<boolean>} - A promise that resolves to true on success, false on failure.
   */
  const handleSavePersona = async () => {
    if (!personaFormData) {
        toast.error('Não há dados de persona para salvar.');
        return false;
    }
    const personaToSave = { ...selectedPersona, name: personaFormData.nome, persona_data: personaFormData };
    if (!personaToSave.name) {
        toast.error('O nome da persona é obrigatório.');
        return false;
    }
    try {
        const isNewPersona = !personaToSave.id;
        const saved = personaToSave.id
            ? await updatePersona(personaToSave.id, personaToSave.name, personaToSave.persona_data)
            : await savePersona(personaToSave.name, personaToSave.persona_data);

        toast.success("Persona salva com sucesso!");

        if (isNewPersona && onPersonaCreated) {
            onPersonaCreated(saved);
            return true;
        }

        await fetchPersonas();
        if (onUpdate) onUpdate();
        setSelectedPersona(saved);
        setPersonaFormData(saved.persona_data);
        setIsPersonaDirty(false);
        return true; // Indicate success
    } catch (err) {
        toast.error(`Falha ao salvar persona: ${err.message}`);
        return false; // Indicate failure
    }
  };

  /**
   * Calls a generative AI to create persona data based on a user-provided description.
   * @param {string} description - The description of the persona.
   * @param {function} callback - A callback to be invoked with the generated persona data.
   */
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
        const prompt = `Crie um objeto JSON para uma persona de marketing detalhada com base na seguinte descrição: '${description}'. O JSON deve ter as seguintes chaves: 'nome' (string), 'posicaoCargo' (array de strings), 'segmentoEmpresa' (array de strings), 'responsabilidadesChave' (array de strings), 'doresEstrategicos' (array de strings), 'doresOperacionais' (array de strings), 'doresPessoas' (array de strings), 'doresRegulatorios' (array de strings), 'gatilhosCompra' (array de strings), 'barreirasAdocao' (array de strings), 'mentalidadeValores' (string), e 'contextoCultural' (string).`;
        let cleanedResponse = '';
        try {
            const response = await geminiAPI.generateContent(prompt, settings.gemini_model, 'Gerar Descrição de Persona');
            cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
            if (callback) callback(JSON.parse(cleanedResponse));
        } catch (error) {
            console.error("Error generating or parsing persona from AI:", error);
            console.error("AI Response Text:", cleanedResponse); // Log the raw text
            toast.error('Ocorreu um erro ao processar a resposta da IA. Verifique o console para detalhes.');
        } finally {
            setIsGeneratingPersona(false);
        }
    };

    // --- Navigation Guard Logic ---
    /**
     * A simple navigation guard. If the persona form has unsaved changes (`isPersonaDirty`),
     * it shows a confirmation dialog before proceeding with the navigation action.
     * Otherwise, it executes the action immediately.
     * @param {function} targetAction - The function to execute if navigation is confirmed.
     */
    const handleNavigation = (targetAction) => {
        if (isPersonaDirty) {
            setNavigationTarget(() => targetAction);
            setShowUnsavedDialog(true);
        } else {
            targetAction();
        }
    };

    const handleDialogClose = () => {
        setShowUnsavedDialog(false);
        setNavigationTarget(null);
    };

    const handleDialogDiscard = () => {
        setShowUnsavedDialog(false);
        setIsPersonaDirty(false);
        if (navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

    const handleDialogSaveAndNavigate = async () => {
        const success = await handleSavePersona();
        setShowUnsavedDialog(false);
        if (success && navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

  const handleConfirmDelete = async (personaId) => {
    try {
      await deletePersona(personaId);
      toast.success('Persona excluída com sucesso!');
      fetchPersonas(); // Refresh list
      if (onUpdate) onUpdate();
      setSelectedPersona(null); // Deselect if the deleted one was selected
    } catch (error) {
      // Error toast is handled inside deletePersona, but you could add more here if needed
      console.error(error);
    }
  };

  const handleDeleteClick = (persona) => {
    // Stop propagation to prevent the ListItemButton's onClick from firing
    // event.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir a persona "${persona.name}"? Esta ação não pode ser desfeita.`)) {
      handleConfirmDelete(persona.id);
    }
  };

  const personaDrawerContent = (
    <Box sx={{p: 2, width: 320}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Personas</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleNewPersona} fullWidth>Nova Persona</Button>
        <Divider sx={{my: 2}} />
        {personasLoading && <CircularProgress />}
        {personasError && <Alert severity="error">{personasError}</Alert>}
        {!personasLoading && !personasError && (
            <List>
                {personaList.map((p) => (
                  <ListItem
                    key={p.id}
                    disablePadding
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(p)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemButton selected={selectedPersona?.id === p.id} onClick={() => handleNavigation(() => handleSelectPersona(p))}>
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
      <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
          <Drawer
              variant={isMobile ? 'temporary' : 'persistent'}
              anchor="left"
              open={personaDrawerOpen}
              onClose={() => handleNavigation(() => setPersonaDrawerOpen(false))}
              sx={{
                  width: 320,
                  flexShrink: 0,
                  '& .MuiDrawer-paper': {
                      width: 320,
                      boxSizing: 'border-box',
                      position: 'absolute', // Position relative to the parent Box
                  },
              }}
          >
              <Toolbar />
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
                  marginLeft: !isMobile ? `-${320}px` : 0,
                  ...(!isMobile && personaDrawerOpen && {
                    transition: theme.transitions.create('margin', {
                        easing: theme.transitions.easing.easeOut,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    marginLeft: 0,
                  }),
              }}
          >
              <Box>
                {selectedPersona ? (
                  isMobile ? (
                    <PersonaWizard
                      key={selectedPersona.id || 'new'}
                      open={Boolean(selectedPersona)}
                      onClose={() => handleNavigation(() => {
                        if (startInCreateMode && onCreationCancelled) {
                          onCreationCancelled();
                        }
                        setSelectedPersona(null);
                      })}
                      onSave={handleSavePersona}
                      onReset={handleNewPersona}
                      personaData={personaFormData}
                      onPersonaDataChange={setPersonaFormData}
                      onGenerate={handleGeneratePersonaWithAI}
                      isGeneratingPersona={isGeneratingPersona}
                      initialStep={initialWizardStep}
                    />
                  ) : (
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <PersonaWizard
                        key={selectedPersona.id || 'new'}
                        open={Boolean(selectedPersona)}
                        onClose={() => handleNavigation(() => {
                            if (startInCreateMode && onCreationCancelled) {
                                onCreationCancelled();
                            }
                            setSelectedPersona(null);
                        })}
                        onSave={handleSavePersona}
                        onReset={handleNewPersona}
                        personaData={personaFormData}
                        onPersonaDataChange={setPersonaFormData}
                        onGenerate={handleGeneratePersonaWithAI}
                        isGeneratingPersona={isGeneratingPersona}
                        initialStep={initialWizardStep}
                      />
                    </Paper>
                  )
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                    <Typography variant="h6" color="text.secondary">
                      Selecione uma persona para editar ou crie uma nova.
                    </Typography>
                  </Box>
                )}
              </Box>
          </Box>
      </Box>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onClose={handleDialogClose}
        onConfirmDiscard={handleDialogDiscard}
        onConfirmSave={handleDialogSaveAndNavigate}
      />
    </>
  );
};

export default PersonasPage;
