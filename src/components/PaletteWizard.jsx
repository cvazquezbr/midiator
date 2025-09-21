import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  TextField,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import PaletteEditor from './PaletteEditor';
import * as generationHandlers from '../utils/generationHandlers';

const steps = [
  'Definir Briefing',
  'Ajustar e Salvar',
];

const briefingOptions = {
    objetivo: ['Branding', 'Site', 'Produto', 'Campanha de Marketing'],
    publicoAlvo: ['Mulheres 30-45 anos', 'Jovens Gamers', 'Executivos C-Level', 'Famílias com Crianças'],
    mensagemPrincipal: ['Confiança', 'Inovação', 'Sustentabilidade', 'Acessibilidade', 'Luxo'],
    atmosfera: ['Calmo e Sereno', 'Energético e Vibrante', 'Premium e Sofisticado', 'Divertido e Descontraído'],
};

const briefingLabels = {
    objetivo: 'Objetivo',
    publicoAlvo: 'Público-alvo',
    mensagemPrincipal: 'Mensagem Principal',
    atmosfera: 'Atmosfera',
};

const PaletteWizard = ({ open, onClose, onSave }) => {
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState(0);
  const [briefing, setBriefing] = useState({});
  const [editablePalette, setEditablePalette] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  useEffect(() => {
    if (open) {
      setBriefing({
        objetivo: '',
        publicoAlvo: '',
        mensagemPrincipal: '',
        atmosfera: '',
        details: '',
      });
      setEditablePalette(null);
      setGenerationError(null);
      setActiveStep(0);
    }
  }, [open]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    const fullBriefing = `
- Objetivo: ${briefing.objetivo}
- Público-alvo: ${briefing.publicoAlvo}
- Mensagem principal: ${briefing.mensagemPrincipal}
- Atmosfera desejada: ${briefing.atmosfera}
- Detalhes adicionais: ${briefing.details || 'Nenhum.'}
    `;
    try {
      const generatedData = await generationHandlers.generateColorPalette(fullBriefing.trim());
      setEditablePalette({
        name: generatedData.palette_name || 'Nova Paleta Gerada',
        colors: generatedData.palette_colors || [],
      });
    } catch (error) {
      setGenerationError(error.message || 'Ocorreu um erro desconhecido durante a geração.');
      setEditablePalette(null);
    } finally {
      setIsGenerating(false);
      setActiveStep(1);
    }
  };

  const handleSave = () => {
    onSave(editablePalette);
    onClose();
  };

  const handleBack = () => {
    setGenerationError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setBriefing(prev => ({ ...prev, [name]: value }));
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Descreva a paleta que você precisa e a IA irá gerar uma sugestão para você ajustar.
            </Typography>
            <Grid container spacing={2}>
              {Object.keys(briefingOptions).map(key => (
                <Grid item xs={12} sm={6} key={key}>
                  <FormControl fullWidth>
                    <InputLabel>{briefingLabels[key]}</InputLabel>
                    <Select name={key} value={briefing[key] || ''} label={briefingLabels[key]} onChange={handleChange}>
                      {briefingOptions[key].map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
            <TextField
              name="details"
              label="Detalhes Adicionais"
              multiline
              rows={4}
              value={briefing.details || ''}
              onChange={handleChange}
              fullWidth
              placeholder="Ex: 'Evitar tons de vermelho', 'Incluir um dourado metálico', etc."
              margin="normal"
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            {generationError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>Falha na Geração:</strong> {generationError}
              </Alert>
            )}
            {editablePalette ? (
              <PaletteEditor
                paletteData={editablePalette}
                onPaletteDataChange={setEditablePalette}
              />
            ) : (
              !generationError && <Typography>A paleta gerada será exibida aqui para edição.</Typography>
            )}
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  const isNextDisabled = () => {
    if (activeStep === 0) {
      return isGenerating || !briefing.objetivo || !briefing.publicoAlvo || !briefing.mensagemPrincipal || !briefing.atmosfera;
    }
    if (activeStep === 1) {
      return !editablePalette || !editablePalette.name?.trim() || editablePalette.colors?.length === 0;
    }
    return false;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>Assistente de Paleta de Cores</DialogTitle>
      <DialogContent sx={{ minHeight: '50vh' }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        {isGenerating && activeStep === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Gerando paleta...</Typography>
          </Box>
        ) : getStepContent(activeStep)}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="secondary">Cancelar</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={isGenerating}>Voltar</Button>
        )}
        {activeStep === 0 && (
          <Button onClick={handleGenerate} variant="contained" disabled={isNextDisabled()}>Gerar Paleta</Button>
        )}
        {activeStep === 1 && (
          <Button onClick={handleSave} variant="contained" disabled={isNextDisabled()}>Salvar Paleta</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaletteWizard;
