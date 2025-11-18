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
  IconButton,
} from '@mui/material';
import { CheckCircle, HourglassEmpty, Error as ErrorIcon, Edit as EditIcon } from '@mui/icons-material';
import { getTranslatableFields } from '../utils/campaignUtils'; // Import the new utility
import { traverseState } from '../utils/stateTraversal';
import RevisaoTextoModal from './RevisaoTextoModal'; // Import the new modal
import { useSettings } from '../context/SettingsContext';
import geminiAPI from '../utils/geminiAPI';

const LANGUAGES = [
    { code: 'en', name: 'Inglês' },
    { code: 'es', name: 'Espanhol' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
];

const CloneCampaignModal = ({ open, onClose, campaign, onCloneComplete }) => {
  const { settings } = useSettings();
  const [activeStep, setActiveStep] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [translatableFields, setTranslatableFields] = useState([]);
  const [translatedFields, setTranslatedFields] = useState({});
  const [translationStatus, setTranslationStatus] = useState({});
  const [translationErrors, setTranslationErrors] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [clonedCampaign, setClonedCampaign] = useState(null);
  const [retryNoticeVisible, setRetryNoticeVisible] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedFieldForReview, setSelectedFieldForReview] = useState(null);

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

  const handleTranslateField = useCallback(async (field, index) => {
    setTranslationStatus(prev => ({ ...prev, [index]: 'translating' }));
    setTranslationErrors(prev => ({ ...prev, [index]: null }));

    try {
      const isArray = Array.isArray(field.value);
      let prompt;
      if (isArray) {
        const jsonText = JSON.stringify(field.value);
        prompt = `Translate each string in the following JSON array to ${targetLanguage}. Return ONLY a valid JSON array string with the translated strings in the same order. Do not include any other text or formatting. Input: ${jsonText}`;
      } else {
        prompt = `Translate the following text to ${targetLanguage}, preserving markdown formatting: "${field.value}"`;
      }

      const translatedText = await geminiAPI.generateContent(prompt, settings.gemini_model, 'Campaign Translation');

      let result = translatedText;
      if (isArray) {
        // The API returns a string representation of a JSON array, so we need to parse it.
        try {
          result = JSON.parse(translatedText);
        } catch (e) {
          console.error("Failed to parse translated array:", translatedText);
          throw new Error("A tradução retornou um formato de array inválido.");
        }
      }

      setTranslatedFields(prev => ({ ...prev, [index]: result }));
      field.owner[field.key] = result;
      setClonedCampaign(prev => ({ ...prev }));
      setTranslationStatus(prev => ({ ...prev, [index]: 'done' }));
      return true; // Indicate success
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationErrors(prev => ({ ...prev, [index]: error.message }));
      setTranslationStatus(prev => ({ ...prev, [index]: 'error' }));
      return false; // Indicate failure
    }
  }, [targetLanguage, settings.gemini_model]);

  const processTranslationBatch = useCallback(async (fieldIndices, delay) => {
    const failedIndices = [];
    for (const index of fieldIndices) {
      if (translationStatus[index] === 'pending' || translationStatus[index] === 'error') {
        const field = translatableFields[index];
        const success = await handleTranslateField(field, index);
        if (!success) {
            failedIndices.push(index);
        }
      }
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return failedIndices;
  }, [translatableFields, translationStatus, handleTranslateField]);

  useEffect(() => {
    const startTranslationProcess = async () => {
        if (activeStep === 1 && !isTranslating) {
            const initialPendingIndices = translatableFields
                .map((_, i) => i)
                .filter(i => translationStatus[i] === 'pending');

            if (initialPendingIndices.length === 0) return;

            setIsTranslating(true);
            setRetryNoticeVisible(false);

            // First pass
            const failedAfterFirstPass = await processTranslationBatch(initialPendingIndices, 500);

            // Bounce mechanism: retry failed translations with a longer delay
            if (failedAfterFirstPass.length > 0) {
                setRetryNoticeVisible(true);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retrying
                setRetryNoticeVisible(false);

                await processTranslationBatch(failedAfterFirstPass, 2000);
            }

            setIsTranslating(false);
        }
    };

    startTranslationProcess();
}, [activeStep, isTranslating, processTranslationBatch]);


  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleLanguageChange = (event) => {
    setTargetLanguage(event.target.value);
  };

  const handleManualTextChange = (index, newText) => {
    const field = translatableFields[index];
    const isArray = Array.isArray(field.value);

    if (isArray) {
        const newArray = newText.split(',').map(s => s.trim());
        setTranslatedFields(prev => ({ ...prev, [index]: newArray }));
        field.owner[field.key] = newArray;
    } else {
        setTranslatedFields(prev => ({ ...prev, [index]: newText }));
        field.owner[field.key] = newText;
    }

    setClonedCampaign(prev => ({ ...prev }));
  };

  const openReviewModal = (index) => {
    setSelectedFieldForReview({
      index,
      originalText: translatableFields[index].value,
      translatedText: translatedFields[index] !== undefined ? translatedFields[index] : '',
    });
    setReviewModalOpen(true);
  };

  const handleSaveReview = (newText) => {
    if (selectedFieldForReview) {
      handleManualTextChange(selectedFieldForReview.index, newText);
    }
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
      <DialogTitle>Traduzir Campanha: {campaign?.name}</DialogTitle>
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
            {retryNoticeVisible && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Algumas traduções falharam. Tentando novamente com uma latência maior...
              </Alert>
            )}
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
                            {Array.isArray(field.value) ? field.value.join(', ') : field.value}
                          </Typography>
                          <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            value={
                                translatedFields[index] !== undefined
                                    ? (Array.isArray(translatedFields[index]) ? translatedFields[index].join(', ') : translatedFields[index])
                                    : ''
                            }
                            sx={{ mt: 1 }}
                            placeholder={status === 'translating' ? 'Traduzindo...' : 'Clique para editar'}
                            disabled
                            InputProps={{
                                endAdornment: (
                                  <IconButton onClick={() => openReviewModal(index)} size="small" disabled={status === 'translating'} aria-label="edit">
                                    <EditIcon />
                                  </IconButton>
                                ),
                              }}
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
      {selectedFieldForReview && (
        <RevisaoTextoModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          originalText={selectedFieldForReview.originalText}
          translatedText={selectedFieldForReview.translatedText}
          onSave={handleSaveReview}
        />
      )}
    </Dialog>
  );
};

export default CloneCampaignModal;
