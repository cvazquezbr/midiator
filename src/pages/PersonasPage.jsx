import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  CircularProgress,
  Alert,
  Box,
  Grid,
  Paper,
  Divider,
  Stack
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import PersonaForm, { emptyPersonaData } from '../components/PersonaForm';
import { toast } from 'sonner';

const PersonasPage = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      setError(null);
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
  };

  const handleNewPersona = () => {
    setSelectedPersona({ name: '', persona_data: { ...emptyPersonaData } });
  };

  const handleFormChange = (newPersonaData) => {
    setSelectedPersona(prev => ({
      ...prev,
      name: newPersonaData.nome,
      persona_data: newPersonaData,
    }));
  };

  const handleSave = async () => {
    if (!selectedPersona?.name) {
      toast.error('O nome da persona é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      let savedPersona;
      if (selectedPersona.id) {
        savedPersona = await updatePersona(selectedPersona.id, selectedPersona.name, selectedPersona.persona_data);
      } else {
        savedPersona = await savePersona(selectedPersona.name, selectedPersona.persona_data);
      }
      await fetchPersonas();
      // After saving, update the selected persona to the one returned from the API
      // This ensures we have the correct ID for new personas and any other server-side updates
      setSelectedPersona(savedPersona);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPersona || !selectedPersona.id) {
        toast.warning("Nenhuma persona selecionada para deletar.");
        return;
    }
    if (window.confirm(`Tem certeza que deseja deletar a persona "${selectedPersona.name}"?`)) {
      try {
        await deletePersona(selectedPersona.id);
        await fetchPersonas();
        setSelectedPersona(null); // Clear the form
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const getSecondaryText = (persona) => {
    if (!persona.persona_data) return '...';
    const { posicaoCargo, segmentoEmpresa } = persona.persona_data;
    const text = [
        ...(posicaoCargo && posicaoCargo.length > 0 ? [posicaoCargo.join(', ')] : []),
        ...(segmentoEmpresa && segmentoEmpresa.length > 0 ? [segmentoEmpresa.join(', ')] : [])
    ];
    if (text.length === 0) return 'Sem detalhes adicionais.';
    const fullText = text.join(' | ');
    return fullText.length > 80 ? fullText.substring(0, 80) + '...' : fullText;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        {/* Left Column: Persona List */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Personas
              </Typography>
              <Button variant="contained" size="small" startIcon={<Add />} onClick={handleNewPersona}>
                Nova
              </Button>
            </Box>
            <Divider />
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
                    <ListItemText
                      primary={persona.name}
                      secondary={getSecondaryText(persona)}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Persona Form */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            {selectedPersona ? (
              <>
                <Typography variant="h6" component="h2" gutterBottom>
                  {selectedPersona.id ? 'Editar Persona' : 'Nova Persona'}
                </Typography>
                <PersonaForm
                  persona={selectedPersona.persona_data}
                  onChange={handleFormChange}
                  isSaving={isSaving}
                />
                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Button onClick={handleSave} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Salvar Persona'}
                    </Button>
                    {selectedPersona.id && (
                        <Button onClick={handleDelete} variant="outlined" color="error" startIcon={<Delete />}>
                            Deletar
                        </Button>
                    )}
                </Stack>
              </>
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
