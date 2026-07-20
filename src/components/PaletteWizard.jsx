import React, { useState, useEffect, useRef } from 'react';
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
  Divider,
} from '@mui/material';
import { UploadFile as UploadFileIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import ColorThief from 'colorthief';
import PaletteEditor from './PaletteEditor';
import PalettePreview from './PalettePreview';
import * as generationHandlers from '../utils/generationHandlers';
import { useSettings } from '../context/SettingsContext';

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
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState(initialStep);
  const [briefing, setBriefing] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const imageInputRef = useRef(null);

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
      const generatedData = await generationHandlers.generateColorPalette(fullBriefing.trim(), {
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });

      // The AI is returning a long descriptive text in the `harmony` field instead of a single word.
      // We need to handle this to prevent creating a palette name that is too long for the database.
      const harmonyText = generatedData.harmony || '';
      // Try to extract a known harmony type from the beginning of the text.
      const harmonyMatch = harmonyText.match(/^(Análoga|Complementar|Triádica|Tetrádica|Monocromática|Decomposta)/i);
      const harmonyName = harmonyMatch ? harmonyMatch[0] : 'Gerada por IA';

      // Transform the AI response into the format expected by the frontend UI.
      const transformedData = {
        name: `Paleta ${harmonyName}`, // Creates a short, safe name like "Paleta Triádica".
        colors: generatedData.palette || [], // Keep the full color objects
        harmony: generatedData.harmony || harmonyName,
        harmony_justification: generatedData.harmony_justification || '',
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

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsExtracting(true);
    setGenerationError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const colorThief = new ColorThief();
          // Extract 5 colors from the image
          const palette = colorThief.getPalette(img, 5);

          // Format the extracted colors into the required data structure
          const newColors = palette.map((rgb, index) => ({
            hex: `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`,
            name: `Cor Extraída ${index + 1}`,
            role: 'Extraída',
            justification: 'Cor extraída de imagem de referência.',
          }));

          setPaletteData({
            name: 'Paleta da Imagem',
            colors: newColors,
            harmony: 'Extraída de Imagem',
            harmony_justification: 'As cores foram extraídas diretamente de uma imagem de referência fornecida pelo usuário.',
          });

          toast.success('Cores extraídas com sucesso!');
          setActiveStep(1); // Move to the next step to show the editor
        } catch (error) {
          console.error("Erro ao extrair paleta da imagem:", error);
          toast.error('Não foi possível extrair as cores. Tente outra imagem.');
          setGenerationError('Falha ao processar a imagem.');
        } finally {
          setIsExtracting(false);
        }
      };
      img.onerror = () => {
        toast.error('O arquivo selecionado não é uma imagem válida.');
        setIsExtracting(false);
      };
      img.src = e.target.result;
    };

    reader.onerror = () => {
      toast.error('Falha ao ler o arquivo.');
      setIsExtracting(false);
    };

    reader.readAsDataURL(file);
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

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
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

            <Divider sx={{ my: 3 }}>
              <Typography variant="overline">OU</Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <input
                type="file"
                hidden
                accept="image/*"
                ref={imageInputRef}
                onChange={handleImageUpload}
                disabled={isExtracting || isGenerating}
              />
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => imageInputRef.current.click()}
                disabled={isExtracting || isGenerating}
              >
                Extrair de Imagem
              </Button>
              {isExtracting && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                  <Typography sx={{ ml: 1 }} variant="body2">Extraindo cores...</Typography>
                </Box>
              )}
            </Box>
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
            {!paletteData && !generationError && (
              <Typography>A paleta gerada e sua pré-visualização serão exibidas aqui para edição.</Typography>
            )}
            {paletteData && (
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <PaletteEditor
                    paletteData={paletteData}
                    onPaletteDataChange={setPaletteData}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PalettePreview paletteData={paletteData} />
                </Grid>
              </Grid>
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
          <Button onClick={handleBack} disabled={isGenerating || isExtracting}>Voltar</Button>
        )}
        {activeStep === 0 && (
          <>
            {paletteData && paletteData.colors?.length > 0 && (
              <Button onClick={handleNext}>
                Ajustar Paleta Atual
              </Button>
            )}
            <Button onClick={handleGenerate} variant="contained" disabled={isNextDisabled() || isExtracting}>
              Gerar Nova Paleta
            </Button>
          </>
        )}
        {activeStep === 1 && (
          <Button onClick={handleSave} variant="contained" disabled={isSaveDisabled()}>
            Salvar Paleta
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaletteWizard;
