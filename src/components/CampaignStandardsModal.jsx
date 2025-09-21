import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile.js';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';

import TextEditorDialog from './TextEditorDialog';
import HtmlDisplayField from './HtmlDisplayField';
import { useCampaign } from '../context/CampaignContext';
import { getPalettes } from '../utils/paletteState';

const CampaignStandardsModal = ({ open, onClose }) => {
  const isMobile = useIsMobile();
  const { formato, setFormato, paletteId, setPaletteId } = useCampaign();

  const [editingField, setEditingField] = useState(null);
  const [palettes, setPalettes] = useState([]);
  const [selectedPalette, setSelectedPalette] = useState(paletteId || '');

  useEffect(() => {
    if (open) {
      getPalettes().then(setPalettes).catch(err => toast.error('Failed to fetch palettes.'));
      setSelectedPalette(paletteId || '');
    }
  }, [open, paletteId]);

  const handleSave = () => {
    setPaletteId(selectedPalette);
    // Note: formato is updated directly via its own TextEditorDialog,
    // so we only need to explicitly save the paletteId here.
    toast.success('Padrões de campanha salvos com sucesso!');
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleOpenEditor = (field) => setEditingField(field);
  const handleCloseEditor = () => setEditingField(null);

  const handleSaveEditor = (newContent) => {
    if (editingField === 'formato') setFormato(newContent);
    setEditingField(null);
  };

  const getCurrentContent = () => {
    if (!editingField) return '';
    if (editingField === 'formato') return formato;
    return '';
  };

  const getEditorTitle = () => {
    if (editingField === 'formato') return 'Editar Formato';
    return 'Editar';
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Padrões de Campanha
          <IconButton onClick={handleClose}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Formato
            </Typography>
            <HtmlDisplayField htmlContent={formato} onClick={() => handleOpenEditor('formato')} />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" gutterBottom>
              Cores
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Paleta de Cores da Campanha</InputLabel>
              <Select
                value={selectedPalette}
                onChange={(e) => setSelectedPalette(e.target.value)}
                label="Paleta de Cores da Campanha"
              >
                <MenuItem value="">
                  <em>Nenhuma</em>
                </MenuItem>
                {(palettes || []).map(palette => (
                  <MenuItem key={palette.id} value={palette.id}>
                    {palette.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
      <TextEditorDialog
        open={editingField !== null}
        title={getEditorTitle()}
        content={getCurrentContent()}
        onSave={handleSaveEditor}
        onClose={handleCloseEditor}
        html={true}
      />
    </>
  );
};

export default CampaignStandardsModal;
