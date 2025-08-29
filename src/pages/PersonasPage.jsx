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
  TextField,
  DialogActions,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import { useAuth } from '../context/UserAuthContext';

const PersonaManager = () => {
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
    setCurrentPersona(persona ? { ...persona } : { name: '', persona_data: { description: '' } });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPersona(null);
  };

  const handleSave = async () => {
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
    if (window.confirm('Are you sure you want to delete this persona?')) {
      try {
        await deletePersona(id);
        await fetchPersonas();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setCurrentPersona((prev) => ({ ...prev, name: value }));
    } else {
        setCurrentPersona((prev) => ({
            ...prev,
            persona_data: { ...prev.persona_data, [name]: value },
        }));
    }
  };

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
              <ListItemText primary={persona.name} secondary={persona.persona_data?.description?.substring(0, 100) + '...'} />
            </ListItem>
          ))}
        </List>
      )}

      {isModalOpen && (
        <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
          <DialogTitle>{currentPersona?.id ? 'Editar Persona' : 'Nova Persona'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Nome da Persona"
              type="text"
              fullWidth
              variant="outlined"
              value={currentPersona?.name || ''}
              onChange={handleFieldChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="description"
              label="Descrição da Persona"
              type="text"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={currentPersona?.persona_data?.description || ''}
              onChange={handleFieldChange}
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

export default PersonaManager;
