import React, { useState, useEffect, useCallback } from 'react';
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
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  TextField,
  LinearProgress,
  Grid,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import { CheckCircle, HourglassEmpty, Error as ErrorIcon } from '@mui/icons-material';
import { getTranslatableFields } from '../utils/campaignUtils'; // Import the new utility
import { traverseState } from '../utils/stateTraversal';

const LANGUAGES = [
    { code: 'en', name: 'Inglês' },
    { code: 'es', name: 'Espanhol' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
];

const CloneCampaignModal = ({ open, onClose, campaign, onCloneComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [translatableFields, setTranslatableFields] = useState([]);
  const [translatedFields, setTranslatedFields] = useState({});
  const [translationStatus, setTranslationStatus] = useState({});
  const [translationErrors, setTranslationErrors] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [clonedCampaign, setClonedCampaign] = useState(null);

  const resetState = useCallback(() => {
    setActiveStep(0);
    setTargetLanguage('');
    setTranslatableFields([]);
    setTranslatedFields({});
    setTranslationStatus({});
    setTranslationErrors({});
    setIsTranslating(false);
    setClonedCampaign(null);
  }, []);

  useEffect(() => {
    if (open && campaign) {
      // Use the new utility to extract fields and get the processed campaign object
      const { fields, processedCampaign } = getTranslatableFields(campaign);

      // Discard audio and video assets from the processed campaign
      traverseState(processedCampaign, (key, value, owner) => {
        if (value && typeof value === 'object' && (value.type === 'audio' || value.type === 'video')) {
          owner[key] = null;
        }
      });

      setClonedCampaign(processedCampaign);
      setTranslatableFields(fields);
      setTranslationStatus(fields.reduce((acc, _, index) => ({ ...acc, [index]: 'pending' }), {}));
    } else {
      resetState();
    }
  }, [campaign, open, resetState]);


  useEffect(() => {
    const translateAllFields = async () => {
      if (activeStep === 1 && translatableFields.length > 0 && !isTranslating) {
        const pendingTranslations = translatableFields.some((_, i) => translationStatus[i] === 'pending');
        if (!pendingTranslations) return;

        setIsTranslating(true);
        for (let i = 0; i < translatableFields.length; i++) {
          if (translationStatus[i] === 'pending') {
            await handleTranslateField(translatableFields[i], i);
          }
        }
        setIsTranslating(false);
      }
    };
    translateAllFields();
  }, [activeStep, translatableFields, translationStatus, isTranslating]);


  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleLanguageChange = (event) => {
    setTargetLanguage(event.target.value);
  };

  const handleTranslateField = async (field, index) => {
    setTranslationStatus(prev => ({ ...prev, [index]: 'translating' }));
    setTranslationErrors(prev => ({ ...prev, [index]: null }));

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: field.value, targetLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to translate and could not parse error response.' }));
        throw new Error(errorData.error || 'Failed to translate');
      }

      const data = await response.json();
      const { translatedText } = data;

      setTranslatedFields(prev => ({ ...prev, [index]: translatedText }));

      // Since the `owner` object is a reference to a part of the `clonedCampaign` state,
      // mutating it here will correctly update the nested structure.
      field.owner[field.key] = translatedText;

      // Trigger a re-render by creating a new shallow copy of the top-level campaign state.
      setClonedCampaign(prev => ({ ...prev }));

      setTranslationStatus(prev => ({ ...prev, [index]: 'done' }));
    } catch (error) {
      console.error('Translation error:', error);
      let userFriendlyError = error.message;
      if (error.message.includes('GEMINI_API_KEY is not set')) {
        userFriendlyError = 'O serviço de tradução não está configurado corretamente. Por favor, contate o administrador.';
      }
      setTranslationErrors(prev => ({ ...prev, [index]: userFriendlyError }));
      setTranslationStatus(prev => ({ ...prev, [index]: 'error' }));
    }
  };

  const handleManualTextChange = (index, newText) => {
    const field = translatableFields[index];
    setTranslatedFields(prev => ({ ...prev, [index]: newText }));

    field.owner[field.key] = newText;
    setClonedCampaign(prev => ({ ...prev }));
  };

  const handleClone = () => {
    // No need to deep clone again, as clonedCampaign is already a separate, processed object.
    const finalCampaign = { ...clonedCampaign };
    delete finalCampaign.id;
    finalCampaign.name = `${finalCampaign.name} (Copy)`;
    onCloneComplete(finalCampaign);
    onClose();
  };

  const steps = ['Select Language', 'Translate Fields', 'Review and Clone'];
  const translatedCount = Object.values(translationStatus).filter(s => s === 'done' || s === 'error').length;
  const totalFields = translatableFields.length;
  const progress = totalFields > 0 ? (translatedCount / totalFields) * 100 : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Clone Campaign: {campaign?.name}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {activeStep === 0 && (
          <Box>
            <Typography>Select the target language for the new campaign.</Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="language-select-label">Target Language</InputLabel>
              <Select
                labelId="language-select-label"
                value={targetLanguage}
                label="Target Language"
                onChange={handleLanguageChange}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {activeStep === 1 && (
          <Box>
            <Typography sx={{ mb: 2 }}>
              Aguarde enquanto traduzimos os campos. Você pode editar as traduções a qualquer momento.
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
            <List sx={{ maxHeight: '50vh', overflow: 'auto' }}>
              {translatableFields.map((field, index) => {
                const status = translationStatus[index];
                return (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={field.key}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                            {field.value}
                          </Typography>
                          <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            value={translatedFields[index] || ''}
                            onChange={(e) => handleManualTextChange(index, e.target.value)}
                            sx={{ mt: 1 }}
                            placeholder={status === 'translating' ? 'Traduzindo...' : ''}
                            disabled={status === 'translating'}
                          />
                        </Box>
                      }
                    />
                     <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                      {status === 'pending' && <Chip icon={<HourglassEmpty />} label="Aguardando" size="small" />}
                      {status === 'translating' && <CircularProgress size={24} />}
                      {status === 'done' && <Chip icon={<CheckCircle />} label="Concluído" size="small" color="success" />}
                      {status === 'error' && (
                        <Tooltip title={translationErrors[index] || 'Erro desconhecido'} arrow>
                          <Chip icon={<ErrorIcon />} label="Erro" size="small" color="error" />
                        </Tooltip>
                      )}
                    </Box>
                  </ListItem>
                )
              })}
            </List>
          </Box>
        )}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Resumo da Clonagem</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1"><strong>Campanha Original:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">{campaign?.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1"><strong>Idioma de Destino:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">{LANGUAGES.find(l => l.code === targetLanguage)?.name}</Typography>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="body1"><strong>Campos para Tradução:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">{translatedCount} de {totalFields} traduzidos</Typography>
                </Grid>
                <Grid item xs={12}>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Ao clicar em "Clonar", uma nova campanha será criada como uma cópia e carregada no editor. Imagens serão mantidas, mas arquivos de áudio e vídeo serão descartados. A nova campanha não será salva até que você a salve manualmente.
                    </Alert>
                </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
        <Button
          onClick={activeStep === steps.length - 1 ? handleClone : handleNext}
          disabled={(activeStep === 0 && !targetLanguage) || (activeStep === 1 && isTranslating)}
        >
          {activeStep === 1 && isTranslating ? 'Traduzindo...' : (activeStep === steps.length - 1 ? 'Clone' : 'Next')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CloneCampaignModal;
