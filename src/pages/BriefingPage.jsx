import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Paper, Typography, Box, Button, Alert, IconButton, Toolbar, Divider, Drawer, List, ListItem, ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';
import { Add, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import isEqual from 'lodash.isequal';

import { getBriefings, saveBriefing, updateBriefing, deleteBriefing } from '../utils/briefingState';
import BriefingWizard, { emptyBriefingWizardData } from '../components/BriefingWizard';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
const BriefingPage = ({ briefingDrawerOpen, setBriefingDrawerOpen, onNoBriefingSelected, onUpdate, startInCreateMode, onBriefingCreated, onCreationCancelled }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [briefingList, setBriefingList] = useState([]);
  const [selectedBriefing, setSelectedBriefing] = useState(null);
  const [briefingsLoading, setBriefingsLoading] = useState(true);
  const [briefingsError, setBriefingsError] = useState(null);
  const [initialWizardStep, setInitialWizardStep] = useState(0);

  const [briefingFormData, setBriefingFormData] = useState(null);
  const [isBriefingDirty, setIsBriefingDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  useEffect(() => {
    if (selectedBriefing && briefingFormData) {
      const isDirty = !isEqual(selectedBriefing.briefing_data, briefingFormData);
      setIsBriefingDirty(isDirty);
    } else {
      setIsBriefingDirty(false);
    }
  }, [briefingFormData, selectedBriefing]);

  useEffect(() => {
    fetchBriefings();
  }, []);

  useEffect(() => {
    if (!selectedBriefing && onNoBriefingSelected) {
      onNoBriefingSelected();
    }
  }, [selectedBriefing, onNoBriefingSelected]);

  useEffect(() => {
    if (startInCreateMode) {
      handleNewBriefing();
    }
  }, [startInCreateMode]);

  const fetchBriefings = async () => {
    setBriefingsLoading(true);
    try {
      const data = await getBriefings();
      setBriefingList(data);
    } catch (err) {
      setBriefingsError(err.message);
    } finally {
      setBriefingsLoading(false);
    }
  };

  const handleSelectBriefing = (p) => {
    setSelectedBriefing(p);
    setBriefingFormData(p.briefing_data);
    setIsBriefingDirty(false);
    setInitialWizardStep(1);
    if (isMobile) setBriefingDrawerOpen(false);
  };

  const handleNewBriefing = () => {
    const newEmptyBriefing = { name: '', briefing_data: { ...emptyBriefingWizardData, type: 'wizard' } };
    setSelectedBriefing(newEmptyBriefing);
    setBriefingFormData(newEmptyBriefing.briefing_data);
    setIsBriefingDirty(false);
    setInitialWizardStep(0);
    if (isMobile) setBriefingDrawerOpen(false);
  };

  const handleSaveBriefing = async () => {
    if (!briefingFormData) {
      toast.error('Não há dados de briefing para salvar.');
      return false;
    }
    const briefingToSave = { ...selectedBriefing, name: briefingFormData.name || 'Novo Briefing', briefing_data: briefingFormData };
    if (!briefingToSave.name) {
      toast.error('O nome do briefing é obrigatório.');
      return false;
    }
    try {
      const isNewBriefing = !briefingToSave.id;
      const saved = briefingToSave.id
        ? await updateBriefing(briefingToSave.id, briefingToSave.name, briefingToSave.briefing_data)
        : await saveBriefing(briefingToSave.name, briefingToSave.briefing_data);

      toast.success("Briefing salvo com sucesso!");

      if (isNewBriefing && onBriefingCreated) {
        onBriefingCreated(saved);
        return true;
      }

      await fetchBriefings();
      if (onUpdate) onUpdate();
      setSelectedBriefing(saved);
      setBriefingFormData(saved.briefing_data);
      setIsBriefingDirty(false);
      return true; // Indicate success
    } catch (err) {
      toast.error(`Falha ao salvar briefing: ${err.message}`);
      return false; // Indicate failure
    }
  };

  const handleNavigation = (targetAction) => {
    if (isBriefingDirty) {
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
    setIsBriefingDirty(false);
    if (navigationTarget) {
      navigationTarget();
    }
    setNavigationTarget(null);
  };

  const handleDialogSaveAndNavigate = async () => {
    const success = await handleSaveBriefing();
    setShowUnsavedDialog(false);
    if (success && navigationTarget) {
      navigationTarget();
    }
    setNavigationTarget(null);
  };

  const handleConfirmDelete = async (briefingId) => {
    try {
      await deleteBriefing(briefingId);
      toast.success('Briefing excluído com sucesso!');
      fetchBriefings(); // Refresh list
      if (onUpdate) onUpdate();
      setSelectedBriefing(null); // Deselect if the deleted one was selected
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (briefing) => {
    if (window.confirm(`Tem certeza que deseja excluir o briefing "${briefing.name}"? Esta ação não pode ser desfeita.`)) {
      handleConfirmDelete(briefing.id);
    }
  };

  const briefingDrawerContent = (
    <Box sx={{ p: 2, width: 320 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Briefings</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button variant="contained" startIcon={<Add />} onClick={handleNewBriefing} fullWidth>Novo Briefing</Button>
      </Box>
      <Divider sx={{ my: 2 }} />
      {briefingsLoading && <CircularProgress />}
      {briefingsError && <Alert severity="error">{briefingsError}</Alert>}
      {!briefingsLoading && !briefingsError && (
        <List>
          {briefingList.map((p) => (
            <ListItem
              key={p.id}
              disablePadding
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(p)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemButton
                selected={selectedBriefing?.id === p.id}
                onClick={() => handleNavigation(() => handleSelectBriefing(p))}
              >
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
          open={briefingDrawerOpen}
          onClose={() => handleNavigation(() => setBriefingDrawerOpen(false))}
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
          {briefingDrawerContent}
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
            ...(!isMobile && briefingDrawerOpen && {
              transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
              marginLeft: 0,
            }),
          }}
        >
          <Box>
            {selectedBriefing ? (
              <Paper elevation={2} sx={{ p: 3 }}>
                <BriefingWizard
                  key={selectedBriefing.id || 'new'}
                  open={Boolean(selectedBriefing)}
                  onClose={() => handleNavigation(() => {
                    if (startInCreateMode && onCreationCancelled) {
                      onCreationCancelled();
                    }
                    setSelectedBriefing(null);
                  })}
                  onSave={handleSaveBriefing}
                  briefingData={briefingFormData}
                  onBriefingDataChange={setBriefingFormData}
                  initialStep={initialWizardStep}
                />
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                <Typography variant="h6" color="text.secondary">
                  Selecione um briefing para editar ou crie um novo.
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

export default BriefingPage;