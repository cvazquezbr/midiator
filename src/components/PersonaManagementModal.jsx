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
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Close, Add, Delete } from '@mui/icons-material';
import { toast } from 'sonner';

import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import { PersonaWizardContent, emptyPersonaWizardData } from './PersonaWizard';
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (open) {
      fetchPersonas();
      // When modal opens, if nothing is selected, clear selection
      // This prevents seeing a "stale" persona when reopening
      if (!selectedPersona) {
          setSelectedPersona(null);
      }
    }
  }, [open]);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPersonas();
      setPersonas(data);
    } catch (err) {
      setError(err.message);
      toast.error("Falha ao carregar personas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = (persona) => {
    setSelectedPersona(persona);
    setInitialWizardStep(1);
  };

  const handleNewPersona = () => {
    setSelectedPersona({ name: '', persona_data: { ...emptyPersonaWizardData } });
    setInitialWizardStep(0);
  };

  const handleSave = async (personaData) => {
    const personaToSave = { ...selectedPersona, name: personaData.nome, persona_data: personaData };
    if (!personaToSave.name) {
      toast.error('O nome da persona é obrigatório.');
      return;
    }
    try {
      let savedPersona;
      if (personaToSave.id) {
        savedPersona = await updatePersona(personaToSave.id, personaToSave.name, personaToSave.persona_data);
      } else {
        savedPersona = await savePersona(personaToSave.name, personaToSave.persona_data);
      }
      await fetchPersonas();
      setSelectedPersona(savedPersona);
      toast.success("Persona salva com sucesso!");
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
        if (selectedPersona?.id === personaId) {
            setSelectedPersona(null);
        }
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
        setIsGeneratingPersona(false);
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

  const handleCloseWizard = () => {
    setSelectedPersona(null); // "Cancel" inside wizard content clears the selection
  }

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
            <ListItem
              key={persona.id}
              disablePadding
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDelete(persona.id, persona.name); }}>
                  <Delete fontSize="small" />
                </IconButton>
              }
            >
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" fullScreen>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Gerenciador de Personas
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', height: '100%' }}>
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? false : true} // On mobile, drawer would be controlled by another state
          anchor="left"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              position: 'relative',
              borderRight: isMobile ? 'none' : '1px solid ' + theme.palette.divider,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto', backgroundColor: theme.palette.background.default }}>
          {selectedPersona ? (
            <PersonaWizardContent
              key={selectedPersona.id || 'new'}
              onClose={handleCloseWizard}
              onSave={handleSave}
              persona={selectedPersona.persona_data}
              onGenerate={handleGeneratePersonaWithAI}
              isGeneratingPersona={isGeneratingPersona}
              initialStep={initialWizardStep}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h6" color="text.secondary">
                Selecione uma persona para editar ou crie uma nova.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PersonaManagementModal;
