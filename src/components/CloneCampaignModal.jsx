import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stepper, Step, StepLabel, Box,
  CircularProgress, Typography, List, ListItem, ListItemIcon, ListItemText, Checkbox, Select,
  MenuItem, FormControl, InputLabel, Tooltip, TextField
} from '@mui/material';
import { CheckCircle, HourglassEmpty, Error as ErrorIcon, Translate as TranslateIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { traverseState, getObjectValue, setObjectValue } from '../utils/stateTraversal';
import fetchWithAuth from '../utils/fetchWithAuth';

// Mapeamento de idiomas e seus nomes nativos
const languages = {
  'pt': 'Português',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'ja': '日本語',
  'ko': '한국어',
  'ru': 'Русский',
  'zh': '中文',
};

// Lista de chaves a serem ignoradas durante a extração de campos de texto
const keysToIgnore = new Set(['id', 'updated_at', 'created_at', 'user_id', 'autor_id', 'persona_id', 'palette_id', 'campaign_id', 'index', 'type', 'url', 'blob', 'filename', 'prompt_imagem_carrossel', 'objectFit', 'zIndex', 'backgroundColor', 'fontFamily', 'textAlign', 'textTransform', 'textShadow', 'fontStyle', 'fontWeight', 'textDecoration', 'opacity', 'visible', 'locked', 'name']);

// Função para extrair campos de texto do estado da campanha
const extractTextFields = (campaignState) => {
  const fields = new Map();
  traverseState(campaignState, (key, value, owner, path) => {
    if (keysToIgnore.has(key)) return;
    if (typeof value === 'string' && value.trim() !== '' && isNaN(value)) {
      if (!fields.has(path)) {
        fields.set(path, value);
      }
    }
  });
  return Array.from(fields, ([path, value]) => ({ path, originalText: value, translatedText: '', status: 'pending' }));
};

const CloneCampaignModal = ({ open, onClose, campaign, onCloneComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [fieldsToTranslate, setFieldsToTranslate] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  // Extrai os campos de texto quando a campanha muda
  useEffect(() => {
    if (campaign?.campaign_data) {
      const extracted = extractTextFields(campaign.campaign_data);
      setFieldsToTranslate(extracted);
    }
  }, [campaign]);

  // Lógica para avançar para a próxima etapa
  const handleNext = () => {
    if (activeStep === 0 && !targetLanguage) {
      toast.error('Por favor, selecione um idioma de destino.');
      return;
    }
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleResetAndClose = () => {
    setActiveStep(0);
    setTargetLanguage('');
    setIsTranslating(false);
    setError(null);
    onClose();
  };

  // Efeito para iniciar a tradução automática
  useEffect(() => {
    if (activeStep === 1 && !isTranslating) {
      const translateAllFields = async () => {
        setIsTranslating(true);
        setError(null);

        for (let i = 0; i < fieldsToTranslate.length; i++) {
          const field = fieldsToTranslate[i];

          // Atualiza o status para "traduzindo"
          setFieldsToTranslate(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'translating' } : f));

          try {
            const res = await fetchWithAuth('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: field.originalText, targetLanguage }),
            });

            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || `Erro de tradução: ${res.statusText}`);
            }

            const data = await res.json();

            // Atualiza com o texto traduzido e status de sucesso
            setFieldsToTranslate(prev => prev.map((f, idx) => idx === i ? { ...f, translatedText: data.translatedText, status: 'done' } : f));
          } catch (err) {
            // Atualiza com o status de erro e a mensagem
            const errorMessage = err.message || 'Falha na tradução';
            setFieldsToTranslate(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: errorMessage } : f));
            setError(`Falha ao traduzir o campo: ${field.path}. ${errorMessage}`);
            // Pausa a tradução em caso de erro para não sobrecarregar a API
            break;
          }
        }
        setIsTranslating(false);
      };
      translateAllFields();
    }
  }, [activeStep, isTranslating, fieldsToTranslate, targetLanguage]);

  // Função para finalizar o processo de clonagem
  const handleFinish = () => {
    if (fieldsToTranslate.some(f => f.status === 'error')) {
      toast.error('Corrija ou remova os campos com erro antes de continuar.');
      return;
    }

    const clonedCampaignData = JSON.parse(JSON.stringify(campaign.campaign_data));

    // Atualiza o estado da campanha com os textos traduzidos
    fieldsToTranslate.forEach(field => {
      setObjectValue(clonedCampaignData, field.path, field.translatedText);
    });

    // Remove ativos de áudio e vídeo
    if (clonedCampaignData.generatedAudioData) clonedCampaignData.generatedAudioData = [];
    if (clonedCampaignData.generatedVideos) clonedCampaignData.generatedVideos = [];


    const clonedCampaign = {
      ...campaign,
      id: null, // ID será gerado no backend ao salvar
      name: `${campaign.name} (Clone - ${targetLanguage.toUpperCase()})`,
      campaign_data: clonedCampaignData,
    };

    onCloneComplete(clonedCampaign);
    handleResetAndClose();
  };

  const handleFieldChange = (index, newText) => {
    setFieldsToTranslate(prev => prev.map((f, idx) => idx === index ? { ...f, translatedText: newText, status: f.status === 'error' ? 'pending' : f.status, error: null } : f));
  };

  const anyErrors = useMemo(() => fieldsToTranslate.some(f => f.status === 'error'), [fieldsToTranslate]);

  return (
    <Dialog open={open} onClose={handleResetAndClose} fullWidth maxWidth="md">
      <DialogTitle>Clonar Campanha: "{campaign?.name}"</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep}>
          <Step><StepLabel>Selecionar Idioma</StepLabel></Step>
          <Step><StepLabel>Revisar Traduções</StepLabel></Step>
        </Stepper>

        <Box mt={3}>
          {activeStep === 0 && (
            <FormControl fullWidth>
              <InputLabel id="target-language-label">Idioma de Destino</InputLabel>
              <Select
                labelId="target-language-label"
                value={targetLanguage}
                label="Idioma de Destino"
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                {Object.entries(languages).map(([code, name]) => (
                  <MenuItem key={code} value={code}>{name}</MenuItem>
                ))}
              </Select>
              <Typography variant="body2" color="text.secondary" mt={2}>
                Selecione o idioma para o qual deseja traduzir esta campanha.
              </Typography>
            </FormControl>
          )}

          {activeStep === 1 && (
            <Box>
                <Typography variant="h6">Progresso da Tradução</Typography>
                {error && <Typography color="error">{error}</Typography>}
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {fieldsToTranslate.map((field, index) => (
                    <ListItem key={index} divider>
                    <ListItemIcon>
                        {field.status === 'pending' && <HourglassEmpty />}
                        {field.status === 'translating' && <CircularProgress size={24} />}
                        {field.status === 'done' && <CheckCircle color="success" />}
                        {field.status === 'error' && (
                        <Tooltip title={field.error || 'Erro desconhecido'}>
                            <ErrorIcon color="error" />
                        </Tooltip>
                        )}
                    </ListItemIcon>
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                         <TextField
                            label={`Original (${field.path})`}
                            multiline
                            fullWidth
                            value={field.originalText}
                            InputProps={{ readOnly: true }}
                            variant="outlined"
                            size="small"
                        />
                        <TextField
                            label="Tradução"
                            multiline
                            fullWidth
                            value={field.translatedText}
                            onChange={(e) => handleFieldChange(index, e.target.value)}
                            error={field.status === 'error'}
                            helperText={field.status === 'error' ? field.error : ''}
                            variant="outlined"
                            size="small"
                        />
                    </Box>
                    </ListItem>
                ))}
                </List>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleResetAndClose}>Cancelar</Button>
        {activeStep > 0 && <Button onClick={handleBack}>Voltar</Button>}
        {activeStep < 1 ? (
          <Button onClick={handleNext} variant="contained" disabled={!targetLanguage}>Próximo</Button>
        ) : (
          <Button onClick={handleFinish} variant="contained" disabled={isTranslating || anyErrors}>
            {isTranslating ? 'Traduzindo...' : 'Concluir'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CloneCampaignModal;
