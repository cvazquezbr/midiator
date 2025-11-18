import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Paper, Typography, Box, Button, Alert, IconButton, Toolbar, Divider, Drawer, List, ListItem, ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';
import { ChevronLeft, Add, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import isEqual from 'lodash.isequal';

import { getAutores, saveAutor, updateAutor, deleteAutor } from '../utils/autorState';
import AutorWizard, { emptyAutorWizardData } from '../components/AutorWizard';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import { getGeminiApiKey } from '../utils/geminiCredentials';
import geminiAPI from '../utils/geminiAPI';
import { useSettings } from '../context/SettingsContext';

const AutoresPage = ({ autorDrawerOpen, setAutorDrawerOpen, onNoAutorSelected, onUpdate, startInCreateMode, onAutorCreated, onCreationCancelled }) => {
  const { settings } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const [autorList, setAutorList] = useState([]);
  const [selectedAutor, setSelectedAutor] = useState(null);
  const [autoresLoading, setAutoresLoading] = useState(true);
  const [autoresError, setAutoresError] = useState(null);
  const [isGeneratingAutor, setIsGeneratingAutor] = useState(false);
  const [initialWizardStep, setInitialWizardStep] = useState(0);

  const [autorFormData, setAutorFormData] = useState(null);
  const [isAutorDirty, setIsAutorDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  useEffect(() => {
    if (selectedAutor && autorFormData) {
        const isDirty = !isEqual(selectedAutor.autor_data, autorFormData);
        setIsAutorDirty(isDirty);
    } else {
        setIsAutorDirty(false);
    }
  }, [autorFormData, selectedAutor]);

  useEffect(() => {
      fetchAutores();
  }, []);

  useEffect(() => {
    if (!selectedAutor && onNoAutorSelected) {
      onNoAutorSelected();
    }
  }, [selectedAutor, onNoAutorSelected]);

  useEffect(() => {
    if (startInCreateMode) {
      handleNewAutor();
    }
  }, [startInCreateMode]);

  const fetchAutores = async () => {
      setAutoresLoading(true);
      try {
          const data = await getAutores();
          setAutorList(data);
      } catch (err) {
          setAutoresError(err.message);
      } finally {
          setAutoresLoading(false);
      }
  };

  const handleSelectAutor = (p) => {
      setSelectedAutor(p);
      setAutorFormData(p.autor_data);
      setIsAutorDirty(false);
      setInitialWizardStep(1);
      if (isMobile) setAutorDrawerOpen(false);
  };

  const handleNewAutor = () => {
      const newEmptyAutor = { name: '', autor_data: { ...emptyAutorWizardData } };
      setSelectedAutor(newEmptyAutor);
      setAutorFormData(newEmptyAutor.autor_data);
      setIsAutorDirty(false);
      setInitialWizardStep(0);
      if (isMobile) setAutorDrawerOpen(false);
  };

  const handleSaveAutor = async () => {
    if (!autorFormData) {
        toast.error('Não há dados de autor para salvar.');
        return false;
    }
    const autorToSave = { ...selectedAutor, name: autorFormData.identidade, autor_data: autorFormData };
    if (!autorToSave.name) {
        toast.error('O nome do autor é obrigatório.');
        return false;
    }
    try {
        const isNewAutor = !autorToSave.id;
        const saved = autorToSave.id
            ? await updateAutor(autorToSave.id, autorToSave.name, autorToSave.autor_data)
            : await saveAutor(autorToSave.name, autorToSave.autor_data);

        toast.success("Autor salvo com sucesso!");

        if (isNewAutor && onAutorCreated) {
            onAutorCreated(saved);
            return true;
        }

        await fetchAutores();
        if (onUpdate) onUpdate();
        setSelectedAutor(saved);
        setAutorFormData(saved.autor_data);
        setIsAutorDirty(false);
        return true; // Indicate success
    } catch (err) {
        toast.error(`Falha ao salvar autor: ${err.message}`);
        return false; // Indicate failure
    }
  };

    const handleGenerateAutorWithAI = async (descricaoGeral, dominioReferencia, siteExclusao, callback) => {
        if (!geminiAPI.isInitialized) {
            const apiKey = getGeminiApiKey();
            if (!apiKey) {
                toast.error('Chave de API do Gemini não configurada.');
                return;
            }
            geminiAPI.initialize(apiKey);
        }
        setIsGeneratingAutor(true);
        const prompt = `
Atue como um especialista em branding. Sua tarefa é extrair e estruturar a identidade de uma marca (o autor) para garantir uma comunicação de marketing consistente. Com base na descrição fornecida, preencha o objeto JSON abaixo.
**Descrição do Autor:** ${descricaoGeral}
**Instruções Adicionais:**
${dominioReferencia ? `- Use o site \`${dominioReferencia}\` como principal fonte de referência.` : ''}
${siteExclusao ? `- NÃO use o site \`${siteExclusao}\` como referência.` : ''}
**Campos para preencher (use exatamente estes nomes de chave):**
- identidade: (string)
- descricao: (string em HTML)
- tipo: (string)
- tipoOrganizacaoOutro: (string)
- objetivoEstrategico: (string em HTML)
- objetivoEngajamento: (string em HTML)
Retorne apenas um único objeto JSON.`;
        let cleanedResponse = '';
        try {
            const response = await geminiAPI.generateContent(prompt, settings.gemini_model, 'Gerar Biografia de Autor');
            const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const generatedAutor = JSON.parse(cleanedResponse);
            if (callback) callback(generatedAutor);
        } catch (error) {
            console.error("Erro ao gerar autor com IA:", error);
            toast.error('Ocorreu um erro ao processar a resposta da IA.');
        } finally {
            setIsGeneratingAutor(false);
        }
    };

    const handleNavigation = (targetAction) => {
        if (isAutorDirty) {
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
        setIsAutorDirty(false);
        if (navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

    const handleDialogSaveAndNavigate = async () => {
        const success = await handleSaveAutor();
        setShowUnsavedDialog(false);
        if (success && navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

  const handleConfirmDelete = async (autorId) => {
    try {
      await deleteAutor(autorId);
      toast.success('Autor excluído com sucesso!');
      fetchAutores(); // Refresh list
      if (onUpdate) onUpdate();
      setSelectedAutor(null); // Deselect if the deleted one was selected
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (autor) => {
    if (window.confirm(`Tem certeza que deseja excluir o autor "${autor.name}"? Esta ação não pode ser desfeita.`)) {
      handleConfirmDelete(autor.id);
    }
  };

  const autorDrawerContent = (
    <Box sx={{p: 2, width: 320}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Autores</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleNewAutor} fullWidth>Novo Autor</Button>
        <Divider sx={{my: 2}} />
        {autoresLoading && <CircularProgress />}
        {autoresError && <Alert severity="error">{autoresError}</Alert>}
        {!autoresLoading && !autoresError && (
            <List>
                {autorList.map((p) => (
                  <ListItem
                    key={p.id}
                    disablePadding
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(p)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemButton selected={selectedAutor?.id === p.id} onClick={() => handleNavigation(() => handleSelectAutor(p))}>
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
              open={autorDrawerOpen}
              onClose={() => handleNavigation(() => setAutorDrawerOpen(false))}
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
              {autorDrawerContent}
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
                  ...(!isMobile && autorDrawerOpen && {
                    transition: theme.transitions.create('margin', {
                        easing: theme.transitions.easing.easeOut,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    marginLeft: 0,
                  }),
              }}
          >
              <Box>
                {selectedAutor ? (
                  isMobile ? (
                    <AutorWizard
                      key={selectedAutor.id || 'new'}
                      open={Boolean(selectedAutor)}
                      onClose={() => handleNavigation(() => {
                        if (startInCreateMode && onCreationCancelled) {
                          onCreationCancelled();
                        }
                        setSelectedAutor(null);
                      })}
                      onSave={handleSaveAutor}
                      onReset={handleNewAutor}
                      autorData={autorFormData}
                      onAutorDataChange={setAutorFormData}
                      onGenerate={handleGenerateAutorWithAI}
                      isGeneratingAutor={isGeneratingAutor}
                      initialStep={initialWizardStep}
                    />
                  ) : (
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <AutorWizard
                        key={selectedAutor.id || 'new'}
                        open={Boolean(selectedAutor)}
                        onClose={() => handleNavigation(() => {
                          if (startInCreateMode && onCreationCancelled) {
                            onCreationCancelled();
                          }
                          setSelectedAutor(null);
                        })}
                        onSave={handleSaveAutor}
                        onReset={handleNewAutor}
                        autorData={autorFormData}
                        onAutorDataChange={setAutorFormData}
                        onGenerate={handleGenerateAutorWithAI}
                        isGeneratingAutor={isGeneratingAutor}
                        initialStep={initialWizardStep}
                      />
                    </Paper>
                  )
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                    <Typography variant="h6" color="text.secondary">
                      Selecione um autor para editar ou crie um novo.
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

export default AutoresPage;
