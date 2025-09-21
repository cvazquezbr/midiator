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

const PaletteWizard = ({
  open,
  onClose,
  onSave,
  paletteData: controlledPaletteData, // Renamed to indicate it's a prop
  onPaletteDataChange,
  initialStep = 0
}) => {
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState(initialStep);
  const [briefing, setBriefing] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // --- Internal State for Uncontrolled Mode ---
  const [internalPaletteData, setInternalPaletteData] = useState(null);

  // --- Determine if the component is controlled ---
  // A component is controlled if `paletteData` is not undefined.
  const isControlled = controlledPaletteData !== undefined;

  // Use the controlled data if available, otherwise use internal state.
  const paletteData = isControlled ? controlledPaletteData : internalPaletteData;

  // The function to update the state depends on whether it's controlled or not.
  const setPaletteData = (data) => {
    if (isControlled) {
      // In controlled mode, we must call the prop function.
      // We also check if it exists to prevent crashes.
      if (typeof onPaletteDataChange === 'function') {
        onPaletteDataChange(data);
      }
    } else {
      // In uncontrolled mode, we set our own internal state.
      setInternalPaletteData(data);
    }
  };


  useEffect(() => {
    if (open) {
      setActiveStep(initialStep);
      setGenerationError(null);

      if (initialStep === 0) {
        setBriefing({});
        // Clear internal data when starting a new creation in uncontrolled mode
        if (!isControlled) {
          setInternalPaletteData(null);
        }
      } else {
        // If we are editing (initialStep is 1) in uncontrolled mode,
        // we might need to initialize internal state from a source,
        // but the current implementation doesn't support that.
        // The parent must control it for editing.
      }
    }
  }, [open, initialStep, isControlled]);


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

      // The AI is returning a long descriptive text in the `harmony` field instead of a single word.
      // We need to handle this to prevent creating a palette name that is too long for the database.
      const harmonyText = generatedData.harmony || '';
      // Try to extract a known harmony type from the beginning of the text.
      const harmonyMatch = harmonyText.match(/^(Análoga|Complementar|Triádica|Tetrádica|Monocromática|Decomposta)/i);
      const harmonyName = harmonyMatch ? harmonyMatch[0] : 'Gerada por IA';

      // Transform the AI response into the format expected by the frontend UI.
      const transformedData = {
        name: `Paleta ${harmonyName}`, // Creates a short, safe name like "Paleta Triádica".
        colors: generatedData.palette ? generatedData.palette.map(c => c.hex) : [],
      };

      // Handle cases where the AI might return a valid JSON structure but with no colors.
      if (transformedData.colors.length === 0) {
        console.warn("A IA retornou uma paleta vazia ou em formato inesperado.", generatedData);
        throw new Error("A IA não retornou cores no formato esperado.");
      }

      setPaletteData(transformedData);

    } catch (error) {
      setGenerationError(error.message || 'Ocorreu um erro desconhecido durante a geração.');
      setPaletteData(null); // Clear data on error
    } finally {
      setIsGenerating(false);
      setActiveStep(1);
    }
  };

  const handleSave = () => {
    // onSave should receive the current palette data, regardless of mode.
    onSave(paletteData);
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
            {paletteData ? (
              <PaletteEditor
                paletteData={paletteData}
                onPaletteDataChange={setPaletteData} // Always use our unified setter
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
    return false;
  };

  const isSaveDisabled = () => {
    if (activeStep === 1) {
      return !paletteData || !paletteData.name?.trim() || paletteData.colors?.length === 0;
    }
    return true;
  }

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
          <Button onClick={handleSave} variant="contained" disabled={isSaveDisabled()}>Salvar Paleta</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaletteWizard;
