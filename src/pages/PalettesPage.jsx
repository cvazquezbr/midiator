import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Paper, Typography, Box, Button, Alert, IconButton, Toolbar, Divider, Drawer, List, ListItem, ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';
import { ChevronLeft, Add, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import isEqual from 'lodash.isequal';

import { getPalettes, savePalette, updatePalette, deletePalette } from '../utils/paletteState';
import PaletteEditModal from '../components/PaletteEditModal';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import PaletteWizard from '../components/PaletteWizard';
import generationHandlers from '../utils/generationHandlers';

const PalettesPage = ({ paletteDrawerOpen, setPaletteDrawerOpen, onNoPaletteSelected, onUpdate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [paletteList, setPaletteList] = useState([]);
  const [selectedPalette, setSelectedPalette] = useState(null);
  const [palettesLoading, setPalettesLoading] = useState(true);
  const [palettesError, setPalettesError] = useState(null);

  const [paletteFormData, setPaletteFormData] = useState(null);
  const [isPaletteDirty, setIsPaletteDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (selectedPalette && paletteFormData) {
        const isDirty = selectedPalette.id && !isEqual(selectedPalette, paletteFormData);
        setIsPaletteDirty(isDirty);
    } else {
        setIsPaletteDirty(false);
    }
  }, [paletteFormData, selectedPalette]);

  useEffect(() => {
      fetchPalettes();
  }, []);

  useEffect(() => {
    if (!selectedPalette && onNoPaletteSelected) {
      onNoPaletteSelected();
    }
  }, [selectedPalette, onNoPaletteSelected]);

  const fetchPalettes = async () => {
      setPalettesLoading(true);
      try {
          const data = await getPalettes();
          setPaletteList(data);
      } catch (err) {
          setPalettesError(err.message);
      } finally {
          setPalettesLoading(false);
      }
  };

  const handleSelectPalette = (p) => {
      setSelectedPalette(p);
      setPaletteFormData(p);
      setIsPaletteDirty(false);
      if (isMobile) setPaletteDrawerOpen(false);
  };

  const handleNewPalette = () => {
      setIsWizardOpen(true);
  };

  const handleUpdatePalette = async () => {
    if (!paletteFormData || !paletteFormData.id) {
        toast.error('Não há dados de paleta para atualizar.');
        return false;
    }
    if (!paletteFormData.name) {
        toast.error('O nome da paleta é obrigatório.');
        return false;
    }
    try {
        const saved = await updatePalette(paletteFormData.id, paletteFormData.name, paletteFormData.colors);
        toast.success("Paleta atualizada com sucesso!");
        await fetchPalettes();
        if (onUpdate) onUpdate();
        setSelectedPalette(saved);
        setPaletteFormData(saved);
        setIsPaletteDirty(false);
        return true;
    } catch (err) {
        toast.error(`Falha ao atualizar paleta: ${err.message}`);
        return false;
    }
  };

  const handleWizardSave = async (paletteToSave) => {
    if (!paletteToSave || !paletteToSave.name || !paletteToSave.colors) {
      toast.error('A paleta precisa de um nome e cores para ser salva.');
      return;
    }
    try {
      await savePalette(paletteToSave.name, paletteToSave.colors);
      toast.success("Nova paleta criada com sucesso!");
      await fetchPalettes();
      if (onUpdate) onUpdate();
      setIsWizardOpen(false);
    } catch (err) {
      toast.error(`Falha ao criar paleta: ${err.message}`);
    }
  };

  const handleGeneratePalette = async (briefing, callback) => {
    setIsGenerating(true);
    try {
      const result = await generationHandlers.generateColorPalette(briefing);
      callback(result);
    } catch (error) {
      toast.error(`Erro ao gerar paleta: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

    const handleNavigation = (targetAction) => {
        if (isPaletteDirty) {
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
        setIsPaletteDirty(false);
        if (navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

    const handleDialogSaveAndNavigate = async () => {
        const success = await handleUpdatePalette();
        setShowUnsavedDialog(false);
        if (success && navigationTarget) {
            navigationTarget();
        }
        setNavigationTarget(null);
    };

  const handleConfirmDelete = async (paletteId) => {
    try {
      await deletePalette(paletteId);
      toast.success('Paleta excluída com sucesso!');
      fetchPalettes(); // Refresh list
      if (onUpdate) onUpdate();
      setSelectedPalette(null); // Deselect if the deleted one was selected
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (palette) => {
    if (window.confirm(`Tem certeza que deseja excluir a paleta "${palette.name}"? Esta ação não pode ser desfeita.`)) {
      handleConfirmDelete(palette.id);
    }
  };

  const paletteDrawerContent = (
    <Box sx={{p: 2, width: 320}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Paletas</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleNewPalette} fullWidth>Nova Paleta com IA</Button>
        <Divider sx={{my: 2}} />
        {palettesLoading && <CircularProgress />}
        {palettesError && <Alert severity="error">{palettesError}</Alert>}
        {!palettesLoading && !palettesError && (
            <List>
                {paletteList.map((p) => (
                  <ListItem
                    key={p.id}
                    disablePadding
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(p)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemButton selected={selectedPalette?.id === p.id} onClick={() => handleNavigation(() => handleSelectPalette(p))}>
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
              open={paletteDrawerOpen}
              onClose={() => handleNavigation(() => setPaletteDrawerOpen(false))}
              sx={{
                  width: 320,
                  flexShrink: 0,
                  '& .MuiDrawer-paper': {
                      width: 320,
                      boxSizing: 'border-box',
                      position: 'absolute',
                  },
              }}
          >
              <Toolbar />
              {paletteDrawerContent}
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
                  ...(!isMobile && paletteDrawerOpen && {
                    transition: theme.transitions.create('margin', {
                        easing: theme.transitions.easing.easeOut,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    marginLeft: 0,
                  }),
              }}
          >
              <Box>
                {selectedPalette ? (
                  isMobile ? (
                    <PaletteEditModal
                      key={selectedPalette.id}
                      open={Boolean(selectedPalette)}
                      onClose={() => handleNavigation(() => setSelectedPalette(null))}
                      onSave={handleUpdatePalette}
                      paletteData={paletteFormData}
                      onPaletteDataChange={setPaletteFormData}
                    />
                  ) : (
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <PaletteEditModal
                        key={selectedPalette.id}
                        open={Boolean(selectedPalette)}
                        onClose={() => handleNavigation(() => setSelectedPalette(null))}
                        onSave={handleUpdatePalette}
                        paletteData={paletteFormData}
                        onPaletteDataChange={setPaletteFormData}
                      />
                    </Paper>
                  )
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                    <Typography variant="h6" color="text.secondary">
                      Selecione uma paleta para editar ou crie uma nova.
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
      <PaletteWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleWizardSave}
        onGenerate={handleGeneratePalette}
        isGenerating={isGenerating}
      />
    </>
  );
};

export default PalettesPage;
