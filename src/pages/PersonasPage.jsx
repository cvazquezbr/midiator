import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  List,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Stack,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { toast } from 'sonner';

import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import { PersonaWizardContent, emptyPersonaWizardData } from '../components/PersonaWizard';
import PageHeader from '../components/PageHeader';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

const PersonasPage = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleDelete = async () => {
    if (!selectedPersona || !selectedPersona.id) return;
    if (window.confirm(`Tem certeza que deseja deletar a persona "${selectedPersona.name}"?`)) {
      try {
        await deletePersona(selectedPersona.id);
        await fetchPersonas();
        setSelectedPersona(null);
        toast.success('Persona deletada com sucesso.');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleGeneratePersonaWithAI = async (description, callback) => {
    // AI Generation logic here
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <PageHeader title="Personas">
        <Button variant="contained" startIcon={<Add />} onClick={handleNewPersona}>
          Nova Persona
        </Button>
      </PageHeader>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && (
              <List>
                {personas.map((persona) => (
                  <ListItemButton
                    key={persona.id}
                    selected={selectedPersona?.id === persona.id}
                    onClick={() => handleSelectPersona(persona)}
                  >
                    <ListItemText primary={persona.name} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">
                  Selecione uma persona para editar ou crie uma nova.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PersonasPage;
