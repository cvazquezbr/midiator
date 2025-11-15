import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Paper,
  Grid,
} from '@mui/material';
import { Add, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';

import { getPalettes, savePalette, updatePalette, deletePalette } from '../utils/paletteState';
import PaletteWizard from '../components/PaletteWizard';

const emptyPalette = { name: '', colors: [], harmony: '', harmony_justification: '' };

const PalettesPage = ({ onUpdate }) => {
  const [palettes, setPalettes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPalette, setSelectedPalette] = useState(null);
  const [paletteFormData, setPaletteFormData] = useState(null);
  const [initialWizardStep, setInitialWizardStep] = useState(0);

  const fetchPalettes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPalettes();
      setPalettes(data);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load palettes: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPalettes();
  }, [fetchPalettes]);

  const handleSelectPalette = (palette) => {
    setSelectedPalette(palette);
    setPaletteFormData(palette);
    setInitialWizardStep(1); // Start wizard on step 2 for editing
  };

  const handleNewPalette = () => {
    setSelectedPalette({ ...emptyPalette, id: null }); // A temporary object to signify creation
    setPaletteFormData({ ...emptyPalette });
    setInitialWizardStep(0); // Start wizard on step 1 for creation
  };

  const handleCloseWizard = () => {
    setSelectedPalette(null);
    setPaletteFormData(null);
  };

  const handleSavePalette = async () => {
    if (!paletteFormData) return;
    try {
      const { name, colors, harmony, harmony_justification } = paletteFormData;
      const isUpdating = selectedPalette && selectedPalette.id;

      const promise = isUpdating
        ? updatePalette(selectedPalette.id, name, colors, harmony, harmony_justification)
        : savePalette(name, colors, harmony, harmony_justification);

      await promise;
      toast.success(`Palette ${isUpdating ? 'updated' : 'saved'} successfully!`);

      if (onUpdate) {
        onUpdate();
      }
      fetchPalettes();
      handleCloseWizard();
    } catch (err) {
      toast.error(`Failed to save palette: ${err.message}`);
    }
  };

  const handleDeletePalette = async (paletteId) => {
    if (window.confirm('Are you sure you want to delete this palette? This action cannot be undone.')) {
      try {
        await deletePalette(paletteId);
        toast.success('Palette deleted successfully!');
        if (selectedPalette?.id === paletteId) {
          handleCloseWizard();
        }
        if (onUpdate) {
          onUpdate();
        }
        fetchPalettes();
      } catch (err) {
        // Error toast is handled in deletePalette
      }
    }
  };

  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              My Palettes
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={handleNewPalette}
            >
              New
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {isLoading && <CircularProgress />}
          {error && <Alert severity="error">{error}</Alert>}

          {!isLoading && !error && (
            <List>
              {(palettes || []).map((palette) => (
                <ListItem
                  key={palette.id}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeletePalette(palette.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                  disablePadding
                >
                  <ListItemButton selected={selectedPalette?.id === palette.id} onClick={() => handleSelectPalette(palette)}>
                    <ListItemText primary={palette.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, height: '100%' }}>
          {selectedPalette ? (
            <PaletteWizard
              key={selectedPalette.id || 'new'}
              open={Boolean(selectedPalette)}
              onClose={handleCloseWizard}
              onSave={handleSavePalette}
              paletteData={paletteFormData}
              onPaletteDataChange={setPaletteFormData}
              initialStep={initialWizardStep}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h6" color="text.secondary">
                Select a palette to edit, or create a new one.
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default PalettesPage;
