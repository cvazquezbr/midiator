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
} from '@mui/material';
import { CheckCircle, HourglassEmpty, Error as ErrorIcon } from '@mui/icons-material';
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [clonedCampaign, setClonedCampaign] = useState(null);

  const resetState = useCallback(() => {
    setActiveStep(0);
    setTargetLanguage('');
    setTranslatableFields([]);
    setTranslatedFields({});
    setTranslationStatus({});
    setIsTranslating(false);
    setClonedCampaign(null);
  }, []);

  useEffect(() => {
    if (open) {
      if (campaign) {
        const campaignCopy = JSON.parse(JSON.stringify(campaign));

        // Discard audio and video assets
        traverseState(campaignCopy, (key, value, owner) => {
          if (value && typeof value === 'object') {
            if (value.type === 'audio' || value.type === 'video') {
              owner[key] = null;
            }
          }
        });

        setClonedCampaign(campaignCopy);

        const fields = [];
        // Remove 'name' from ignoreKeys and include it for translation
        const ignoreKeys = new Set(['id', 'created_at', 'updated_at', 'user_id', 'paletteId', 'aspectRatio', 'page_id', 'campaign_id', 'original_url']);

        traverseState(campaignCopy, (key, value, owner) => {
          const isUrl = typeof value === 'string' && (value.startsWith('http') || value.startsWith('blob:'));
          // Reduce length check to include shorter fields like titles and short posts
          if (typeof value === 'string' && value.trim().length > 1 && !isUrl && !ignoreKeys.has(key)) {
            fields.push({ key, value, owner });
          }
        });
        setTranslatableFields(fields);
        setTranslationStatus(fields.reduce((acc, _, index) => ({ ...acc, [index]: 'pending' }), {}));
      }
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
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: field.value, targetLanguage }),
      });
      if (!response.ok) throw new Error('Failed to translate');
      const data = await response.json();
      const { translatedText } = data;

      setTranslatedFields(prev => ({ ...prev, [index]: translatedText }));

      // Mutate the owner object directly. It's safe because clonedCampaign is a deep copy.
      field.owner[field.key] = translatedText;
      // Trigger a re-render by creating a shallow copy of the campaign state.
      setClonedCampaign(prev => ({ ...prev }));

      setTranslationStatus(prev => ({ ...prev, [index]: 'done' }));
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationStatus(prev => ({ ...prev, [index]: 'error' }));
    }
  };

  const handleManualTextChange = (index, newText) => {
    const field = translatableFields[index];
    setTranslatedFields(prev => ({ ...prev, [index]: newText }));

    // Mutate the owner object directly and trigger a re-render.
    field.owner[field.key] = newText;
    setClonedCampaign(prev => ({ ...prev }));
  };

  const handleClone = () => {
    const finalCampaign = JSON.parse(JSON.stringify(clonedCampaign));
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
                      {status === 'error' && <Chip icon={<ErrorIcon />} label="Erro" size="small" color="error" />}
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
