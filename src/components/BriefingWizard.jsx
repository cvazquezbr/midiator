import React from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, Stepper, Step, StepLabel
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';

const BriefingWizard = ({ open, onClose, onSave, briefingData, onBriefingDataChange, initialStep = 0 }) => {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Assistente de Criação de Briefing</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2, minHeight: 400 }}>
          <Typography>Briefing Wizard is rendering.</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={onClose} color="secondary">Cancelar</Button>
          <Box>
            <Button disabled={true} startIcon={<ArrowBack />}>Anterior</Button>
            <Button endIcon={<ArrowForward />} sx={{ ml: 1 }}>Próximo</Button>
            <Button variant="contained" color="primary" sx={{ ml: 2 }}>Salvar Briefing</Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default BriefingWizard;

// Also exporting the empty data to avoid breaking imports elsewhere
export const emptyBriefingWizardData = {
  name: '',
  motivacao: '',
  productUrl: '',
  produtoServico: '',
  descricao: '',
  tom_de_voz: [],
  faca: [],
  nao_faca: [],
  saudacao: '',
  entregas: [{}],
  inspiracoes: [{}],
};