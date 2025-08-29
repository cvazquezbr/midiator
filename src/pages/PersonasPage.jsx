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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import PersonaForm, { emptyPersonaData } from '../components/PersonaForm';

const PersonasPage = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPersona, setCurrentPersona] = useState(null);
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

  const handleOpenModal = (persona = null) => {
    if (persona) {
      setCurrentPersona({ ...persona });
    } else {
      // For a new persona, we create the structure the DB expects,
      // with the actual detailed data inside `persona_data`.
      setCurrentPersona({ name: '', persona_data: { ...emptyPersonaData } });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPersona(null);
  };

  const handlePersonaFormChange = (newPersonaData) => {
    setCurrentPersona(prev => ({
        ...prev,
        // The name of the persona record is synced with the 'nome' field in the data
        name: newPersonaData.nome,
        persona_data: newPersonaData,
    }));
  };

  const handleSave = async () => {
    if (!currentPersona?.name) {
      alert('O nome da persona é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      if (currentPersona.id) {
        await updatePersona(currentPersona.id, currentPersona.name, currentPersona.persona_data);
      } else {
        await savePersona(currentPersona.name, currentPersona.persona_data);
      }
      await fetchPersonas();
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
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

  const getSecondaryText = (persona) => {
    if (!persona.persona_data) return '...';
    const { posicaoCargo, segmentoEmpresa } = persona.persona_data;
    let text = [];
    if (posicaoCargo && posicaoCargo.length > 0) {
      text.push(posicaoCargo.join(', '));
    }
    if (segmentoEmpresa && segmentoEmpresa.length > 0) {
      text.push(segmentoEmpresa.join(', '));
    }
    if (text.length === 0) return 'Sem detalhes adicionais.';

    const fullText = text.join(' | ');
    return fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Personas
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenModal()}>
          Nova Persona
        </Button>
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
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenModal(persona)}>
                    <Edit />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(persona.id)}>
                    <Delete />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={persona.name}
                secondary={getSecondaryText(persona)}
              />
            </ListItem>
          ))}
        </List>
      )}

      {isModalOpen && (
        <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="md">
          <DialogTitle>{currentPersona?.id ? 'Editar Persona' : 'Nova Persona'}</DialogTitle>
          <DialogContent>
            <PersonaForm
              persona={currentPersona?.persona_data}
              onChange={handlePersonaFormChange}
              isSaving={isSaving}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancelar</Button>
            <Button onClick={handleSave} variant="contained" disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : 'Salvar'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default PersonasPage;
