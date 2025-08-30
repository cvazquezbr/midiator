import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { toast } from 'sonner';

import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import PersonaWizard from '../components/PersonaWizard';
import { emptyPersonaWizardData } from '../components/PersonaWizard';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

const PersonasPage = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPersona, setCurrentPersona] = useState(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [initialWizardStep, setInitialWizardStep] = useState(0);

  useEffect(() => {
    fetchPersonas();
  }, []);

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

  const handleOpenModal = (persona = null) => {
    console.log("DEBUG: [PersonasPage] handleOpenModal called.");
    if (persona) {
      console.log("DEBUG: [PersonasPage] Editing existing persona. Data:", persona);
      setCurrentPersona({ ...persona });
      setInitialWizardStep(1);
    } else {
      console.log("DEBUG: [PersonasPage] Creating new persona.");
      setCurrentPersona({ name: '', persona_data: { ...emptyPersonaWizardData } });
      setInitialWizardStep(0);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPersona(null);
  };

  const handleSave = async (personaData) => {
    const personaToSave = { ...currentPersona, name: personaData.nome, persona_data: personaData };
    if (!personaToSave.name) {
      toast.error('O nome da persona é obrigatório.');
      return;
    }
    try {
      if (personaToSave.id) {
        await updatePersona(personaToSave.id, personaToSave.name, personaToSave.persona_data);
      } else {
        await savePersona(personaToSave.name, personaToSave.persona_data);
      }
      await fetchPersonas();
      handleCloseModal();
      toast.success("Persona salva com sucesso!");
    } catch (err) {
      setError(err.message);
      toast.error(`Falha ao salvar persona: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta persona?')) {
      try {
        await deletePersona(id);
        await fetchPersonas();
      } catch (err) {
        setError(err.message);
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
    const prompt = `Descriver uma persona para uma campanha de marketing para ${description}. ...`;
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

  const getSecondaryText = (persona) => {
    if (!persona.persona_data) return '...';
    const { posicaoCargo, segmentoEmpresa } = persona.persona_data;
    const text = [...(posicaoCargo || []), ...(segmentoEmpresa || [])];
    return text.join(' | ');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Personas</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenModal()}>Nova Persona</Button>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <List>
          {personas.map((persona) => (
            <ListItem
              key={persona.id}
              secondaryAction={
                <>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenModal(persona)}><Edit /></IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(persona.id)}><Delete /></IconButton>
                </>
              }
            >
              <ListItemText primary={persona.name} secondary={getSecondaryText(persona)} />
            </ListItem>
          ))}
        </List>
      )}

      {isModalOpen && (() => {
        console.log("DEBUG: [PersonasPage] Rendering PersonaWizard with props:", {
            persona: currentPersona?.persona_data,
            initialStep: initialWizardStep,
        });
        return (
            <PersonaWizard
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                persona={currentPersona?.persona_data}
                onGenerate={handleGeneratePersonaWithAI}
                isGeneratingPersona={isGeneratingPersona}
                initialStep={initialWizardStep}
                onReset={() => {
                    console.log("DEBUG: [PersonasPage] onReset called.");
                    setCurrentPersona({ name: '', persona_data: { ...emptyPersonaWizardData } });
                    setInitialWizardStep(0);
                }}
            />
        );
      })()}
    </Container>
  );
};

export default PersonasPage;
