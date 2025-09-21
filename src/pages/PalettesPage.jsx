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
} from '@mui/material';
import { Add, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';

import { getPalettes, savePalette, updatePalette, deletePalette } from '../utils/paletteState';
import PaletteWizard from '../components/PaletteWizard';
import PaletteEditor from '../components/PaletteEditor';

const PalettesPage = () => {
  const [palettes, setPalettes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState(null);
  const [editedPaletteData, setEditedPaletteData] = useState(null);

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
    setEditedPaletteData(palette); // Copy to editable state
  };

  const handleCancelEdit = () => {
    setSelectedPalette(null);
    setEditedPaletteData(null);
  };

  const handleUpdatePalette = async () => {
    if (!editedPaletteData) return;
    try {
      await updatePalette(editedPaletteData.id, editedPaletteData.name, editedPaletteData.colors);
      toast.success('Palette updated successfully!');
      fetchPalettes(); // Refresh the list
      handleCancelEdit(); // Exit editing mode
    } catch (err) {
      toast.error(`Failed to update palette: ${err.message}`);
    }
  };

  const handleDeletePalette = async (paletteId) => {
    if (window.confirm('Are you sure you want to delete this palette? This action cannot be undone.')) {
      try {
        await deletePalette(paletteId);
        toast.success('Palette deleted successfully!');
        if (selectedPalette?.id === paletteId) {
          handleCancelEdit();
        }
        fetchPalettes(); // Refresh the list
      } catch (err) {
        // The error toast is already handled in the deletePalette function
      }
    }
  };

  const handleNewPalette = () => {
    setIsWizardOpen(true);
  };

  const handleWizardSave = async (newPalette) => {
    try {
      await savePalette(newPalette.name, newPalette.colors);
      toast.success('New palette created successfully!');
      fetchPalettes(); // Refresh the list
    } catch (err) {
      toast.error(`Failed to create palette: ${err.message}`);
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
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Editing: {selectedPalette.name}</Typography>
              <PaletteEditor
                paletteData={editedPaletteData}
                onPaletteDataChange={setEditedPaletteData}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={handleCancelEdit}>Cancel</Button>
                <Button onClick={handleUpdatePalette} variant="contained">Save Changes</Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h6" color="text.secondary">
                Select a palette to edit, or create a new one.
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      <PaletteWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleWizardSave}
      />
    </Grid>
  );
};

export default PalettesPage;
