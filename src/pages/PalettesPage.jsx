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
import PaletteEditModal from '../components/PaletteEditModal';
import PaletteWizard from '../components/PaletteWizard';

const PalettesPage = () => {
  const [palettes, setPalettes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState(null);

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

  const handleOpenEditModal = (palette) => {
    setSelectedPalette(palette);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setSelectedPalette(null);
    setIsEditModalOpen(false);
  };

  const handleUpdatePalette = async (editedPalette) => {
    try {
      await updatePalette(editedPalette.id, editedPalette.name, editedPalette.colors);
      toast.success('Palette updated successfully!');
      fetchPalettes(); // Refresh the list
    } catch (err) {
      toast.error(`Failed to update palette: ${err.message}`);
    }
  };

  const handleDeletePalette = async (paletteId) => {
    if (window.confirm('Are you sure you want to delete this palette? This action cannot be undone.')) {
      try {
        await deletePalette(paletteId);
        toast.success('Palette deleted successfully!');
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
    <Paper sx={{ p: 4, margin: 'auto', maxWidth: '800px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          My Palettes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleNewPalette}
        >
          New Palette with AI
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
                <Box>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditModal(palette)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" sx={{ ml: 1 }} onClick={() => handleDeletePalette(palette.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
              disablePadding
            >
              <ListItemButton onClick={() => handleOpenEditModal(palette)}>
                <ListItemText
                  primary={palette.name}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      {(palette.colors || []).map((color, index) => (
                        <Box
                          key={index}
                          component="span"
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: color,
                            borderRadius: '50%',
                            border: '1px solid #ccc',
                          }}
                        />
                      ))}
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {isEditModalOpen && (
        <PaletteEditModal
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSave={handleUpdatePalette}
          paletteData={selectedPalette}
        />
      )}

      <PaletteWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleWizardSave}
      />
    </Paper>
  );
};

export default PalettesPage;
