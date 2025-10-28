import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
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
  const [isLoading, setIsLoading] = useState(false);
  const [clonedCampaign, setClonedCampaign] = useState(null);

  useEffect(() => {
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

      traverseState(campaignCopy, (key, value, owner) => {
        const isUrl = typeof value === 'string' && (value.startsWith('http') || value.startsWith('blob:'));
        if (typeof value === 'string' && value.trim().length > 10 && !isUrl) {
          fields.push({ key, value, owner });
        }
      });
      setTranslatableFields(fields);
    }
  }, [campaign]);

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
    setIsLoading(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: field.value,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate');
      }

      const data = await response.json();
      const { translatedText } = data;
      setTranslatedFields((prev) => ({ ...prev, [index]: translatedText }));

      const newClonedCampaign = JSON.parse(JSON.stringify(clonedCampaign));
      traverseState(newClonedCampaign, (key, value, owner) => {
        if (key === field.key && value === field.value) {
          owner[key] = translatedText;
        }
      });
      setClonedCampaign(newClonedCampaign);
    } catch (error) {
      console.error('Translation error:', error);
      // Handle error state in UI, e.g., show a toast message
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = () => {
    onCloneComplete(clonedCampaign);
    onClose();
  };

  const steps = ['Select Language', 'Translate Fields', 'Review and Clone'];
  const translatedCount = Object.keys(translatedFields).length;
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
              Translate the fields below ({translatedCount} of {totalFields} translated).
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
            <List sx={{ maxHeight: '50vh', overflow: 'auto' }}>
              {translatableFields.map((field, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={field.key}
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {field.value}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      value={translatedFields[index] || ''}
                      onChange={(e) => setTranslatedFields((prev) => ({ ...prev, [index]: e.target.value }))}
                      sx={{ mr: 1 }}
                    />
                    <Button
                      onClick={() => handleTranslateField(field, index)}
                      disabled={isLoading || translatedFields[index]}
                    >
                      {isLoading && <CircularProgress size={24} />}
                      {!isLoading && 'Translate'}
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {activeStep === 2 && (
            <Box>
                <Typography>Review the cloned campaign data below before finalizing.</Typography>
                <TextField
                    multiline
                    fullWidth
                    rows={10}
                    value={JSON.stringify(clonedCampaign, null, 2)}
                    InputProps={{
                        readOnly: true,
                    }}
                    variant="outlined"
                    sx={{ mt: 2 }}
                />
            </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
        <Button onClick={activeStep === steps.length - 1 ? handleClone : handleNext} disabled={activeStep === 0 && !targetLanguage}>
          {activeStep === steps.length - 1 ? 'Clone' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CloneCampaignModal;
