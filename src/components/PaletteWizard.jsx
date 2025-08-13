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
  Paper,
} from '@mui/material';
import PaletteReport from './PaletteReport';

const steps = [
  'Definir Briefing',
  'Analisar Resultado',
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

const PaletteWizard = ({ open, onClose, onSave, onGenerate, isGenerating }) => {
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState(0);
  const [briefing, setBriefing] = useState({});
  const [generatedPalette, setGeneratedPalette] = useState(null);

  useEffect(() => {
    if (open) {
      setBriefing({
        objetivo: '',
        publicoAlvo: '',
        mensagemPrincipal: '',
        atmosfera: '',
        details: '',
      });
      setGeneratedPalette(null);
      setActiveStep(0);
    }
  }, [open]);

  const handleNext = () => {
    if (activeStep === 0) {
      const fullBriefing = `
- Objetivo: ${briefing.objetivo}
- Público-alvo: ${briefing.publicoAlvo}
- Mensagem principal: ${briefing.mensagemPrincipal}
- Atmosfera desejada: ${briefing.atmosfera}
- Detalhes adicionais: ${briefing.details}
      `;
      onGenerate(fullBriefing.trim(), (palette) => {
        setGeneratedPalette(palette);
        setActiveStep(1);
      });
    } else {
      onSave(generatedPalette.palette.map(p => p.hex));
      onClose();
    }
  };

  const handleBack = () => {
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
            <Typography variant="h6" gutterBottom>Gerar Paleta com IA</Typography>
            <Grid container spacing={2}>
              {Object.keys(briefingOptions).map(key => (
                <Grid item xs={12} sm={6} key={key}>
                  <FormControl fullWidth>
                    <InputLabel>{briefingLabels[key]}</InputLabel>
                    <Select
                      name={key}
                      value={briefing[key] || ''}
                      label={briefingLabels[key]}
                      onChange={handleChange}
                    >
                      {briefingOptions[key].map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
            <TextField
              name="details"
              label="Detalhes Adicionais do Briefing"
              multiline
              rows={4}
              value={briefing.details}
              onChange={handleChange}
              fullWidth
              placeholder="INCLUINDO:
- Quaisquer cores proibidas ou obrigatórias"
              margin="normal"
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Resultado da Geração</Typography>
            {generatedPalette ? (
              <PaletteReport paletteData={generatedPalette} briefing={briefing} />
            ) : (
              <Typography>A paleta gerada será exibida aqui.</Typography>
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
          return !generatedPalette;
      }
      return false;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>
        Assistente de Geração de Paleta de Cores
        <Typography variant="body2">Passo {activeStep + 1} de {steps.length}</Typography>
      </DialogTitle>
      <DialogContent sx={{ minHeight: '50vh' }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {isGenerating && activeStep === 0 ? (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                <CircularProgress />
                <Typography sx={{ml: 2}}>Gerando paleta...</Typography>
            </Box>
        ) : getStepContent(activeStep)}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button onClick={handleBack} disabled={activeStep === 0 || isGenerating}>
          Voltar
        </Button>
        <Button
            onClick={handleNext}
            variant="contained"
            disabled={isNextDisabled()}
        >
          {activeStep === 0 ? 'Gerar Paleta' : 'Salvar Paleta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaletteWizard;
