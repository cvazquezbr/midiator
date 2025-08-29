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
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { toast } from 'sonner';

import { getPersonas, savePersona, updatePersona, deletePersona } from '../utils/personaState';
import PersonaWizard from '../components/PersonaWizard';
import { emptyPersonaData } from '../components/PersonaForm'; // This file is deleted, so I need to define emptyPersonaData here.
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

// The PersonaForm component was deleted, so I'm redefining the empty persona structure here.
const newEmptyPersonaData = {
    nome: '',
    posicaoCargo: [],
    segmentoEmpresa: [],
    responsabilidadesChave: [],
    doresEstrategicos: [],
    doresOperacionais: [],
    doresPessoas: [],
    doresRegulatorios: [],
    gatilhosCompra: [],
    barreirasAdocao: [],
    mentalidadeValores: '',
    contextoCultural: '',
    description: '', // For the initial AI prompt
};


const PersonasPage = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPersona, setCurrentPersona] = useState(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);

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
        // If we are editing, the full persona object is set.
        // The wizard will receive persona.persona_data.
        setCurrentPersona({ ...persona });
    } else {
        // For a new persona, we set the structure the DB expects.
        setCurrentPersona({ name: '', persona_data: { ...newEmptyPersonaData } });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPersona(null);
  };

  const handleSave = async (personaData) => {
    // The wizard returns the complete persona_data object.
    const personaToSave = {
        ...currentPersona,
        name: personaData.nome,
        persona_data: personaData,
    };

    if (!personaToSave.name) {
      toast.error('O nome da persona é obrigatório.');
      return;
    }

    // The wizard has its own save button, so we don't need a separate isSaving state here.
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
    const prompt = `
Descriver uma persona para uma campanha de marketing para ${description}.
Preencha os campos do objeto JSON abaixo. Use exatamente os nomes de chave em camelCase fornecidos.
- nome: (string)
- posicaoCargo: (array de strings)
- segmentoEmpresa: (array de strings)
- responsabilidadesChave: (array de strings)
- doresEstrategicos: (array de strings)
- doresOperacionais: (array de strings)
- doresPessoas: (array de strings)
- doresRegulatorios: (array de strings)
- gatilhosCompra: (array de strings)
- barreirasAdocao: (array de strings)
- mentalidadeValores: (string)
- contextoCultural: (string)
Para o caso de não conseguir gerar conteúdo para algum campo, use um array vazio [] ou uma string vazia "".
Retorne apenas um único objeto JSON com estas chaves, sem texto adicional, markdown, ou qualquer outra formatação.`;

    try {
      const response = await geminiAPI.generateContent(prompt);
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedPersona = JSON.parse(cleanedResponse);
      if (callback) {
        callback(generatedPersona);
      }
    } catch (error) {
      console.error("Erro ao gerar ou processar persona com IA:", error);
      toast.error('Ocorreu um erro ao processar a resposta da IA.');
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const getSecondaryText = (persona) => {
    if (!persona.persona_data) return '...';
    const { posicaoCargo, segmentoEmpresa } = persona.persona_data;
    let text = [];
    if (posicaoCargo && posicaoCargo.length > 0) text.push(posicaoCargo.join(', '));
    if (segmentoEmpresa && segmentoEmpresa.length > 0) text.push(segmentoEmpresa.join(', '));
    if (text.length === 0) return 'Sem detalhes adicionais.';
    const fullText = text.join(' | ');
    return fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText;
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
              <ListItemText
                primary={persona.name}
                secondary={getSecondaryText(persona)}
              />
            </ListItem>
          ))}
        </List>
      )}

      {isModalOpen && (
        <PersonaWizard
            open={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSave}
            persona={currentPersona?.persona_data}
            onGenerate={handleGeneratePersonaWithAI}
            isGeneratingPersona={isGeneratingPersona}
        />
      )}
    </Container>
  );
};

export default PersonasPage;
