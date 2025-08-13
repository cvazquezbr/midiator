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
  CircularProgress,
  Alert,
  MenuItem,
} from '@mui/material';
import RichTextEditor from './RichTextEditor';

const steps = [
  'Início Rápido com IA',
  'Revisão Detalhada',
];

const TIPO_ORGANIZACAO_OPTIONS = ['Braço de tecnologia', 'Agência de marketing', 'Consultoria', 'Startup', 'Empresa de Software (SaaS)', 'E-commerce', 'Outro'];

const AutorWizard = ({ open, onClose, onSave, onGenerate, isGeneratingAutor, autor }) => {
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState(0);
  const [autorData, setAutorData] = useState(autor || {});

  useEffect(() => {
    if (open) {
      setAutorData(autor || {
        descricaoGeral: '',
        dominioReferencia: '',
        siteExclusao: '',
        identidade: '',
        descricao: '',
        tipo: '',
        objetivoEstrategico: '',
        objetivoEngajamento: '',
      });
      setActiveStep(0); // Reset to first step when modal opens
    }
  }, [open, autor]);

  const handleNext = () => {
    if (activeStep === 0) { // Step "Início Rápido com IA"
      onGenerate(
        autorData.descricaoGeral,
        autorData.dominioReferencia,
        autorData.siteExclusao,
        (generatedAutor) => {
          setAutorData(prev => ({ ...prev, ...generatedAutor }));
          setActiveStep(1);
        }
      );
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSave = () => {
    onSave(autorData);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setAutorData(prev => ({ ...prev, [name]: value }));
  };

  const handleRichTextChange = (name, value) => {
    setAutorData(prev => ({ ...prev, [name]: value }));
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Descreva o Autor para começar</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Forneça uma breve descrição do perfil do autor (a empresa ou marca). A IA irá usar essa informação para preencher os campos detalhados.
            </Alert>
            <TextField
              name="descricaoGeral"
              label="Descrição Geral do Autor"
              multiline
              rows={6}
              fullWidth
              value={autorData.descricaoGeral || ''}
              onChange={handleChange}
              placeholder="Ex: 'Uma empresa de consultoria de marketing digital focada em startups de tecnologia, que busca se posicionar como líder de pensamento em SEO e marketing de conteúdo.'"
              disabled={isGeneratingAutor}
              sx={{ mb: 2 }}
            />
            <TextField
              name="dominioReferencia"
              label="Domínio de Referência (Opcional)"
              fullWidth
              value={autorData.dominioReferencia || ''}
              onChange={handleChange}
              placeholder="Ex: 'empresa.com.br'"
              helperText="A IA usará este site como fonte de informação para entender o tom e o negócio."
              disabled={isGeneratingAutor}
              sx={{ mb: 2 }}
            />
            <TextField
              name="siteExclusao"
              label="Site para Excluir da Busca (Opcional)"
              fullWidth
              value={autorData.siteExclusao || ''}
              onChange={handleChange}
              placeholder="Ex: 'concorrente.com.br'"
              helperText="A IA evitará este site em sua busca por informações."
              disabled={isGeneratingAutor}
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Revisão e Detalhamento do Autor</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              A IA preencheu os campos abaixo com base na sua descrição. Revise e ajuste se necessário.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Identidade do Autor"
                  name="identidade"
                  value={autorData.identidade || ''}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Descrição da Empresa</Typography>
                <RichTextEditor
                    value={autorData.descricao || ''}
                    onChange={(value) => handleRichTextChange('descricao', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Tipo de Organização"
                  name="tipo"
                  value={autorData.tipo || ''}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                >
                    {TIPO_ORGANIZACAO_OPTIONS.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Objetivo Estratégico</Typography>
                <RichTextEditor
                    value={autorData.objetivoEstrategico || ''}
                    onChange={(value) => handleRichTextChange('objetivoEstrategico', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Objetivo de Engajamento</Typography>
                <RichTextEditor
                    value={autorData.objetivoEngajamento || ''}
                    onChange={(value) => handleRichTextChange('objetivoEngajamento', value)}
                />
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  const isNextDisabled = () => {
    if (activeStep === 0 && !(autorData.descricaoGeral || '').trim()) {
      return true;
    }
    if (activeStep === 1 && !(autorData.identidade || '').trim()) {
      return true;
    }
    return isGeneratingAutor;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>
        Assistente de Criação de Autor
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
        {getStepContent(activeStep)}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="secondary">Salvar e Sair</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button onClick={handleBack} disabled={activeStep === 0}>
          Voltar
        </Button>
        <Button
            onClick={handleNext}
            variant="contained"
            disabled={isNextDisabled()}
        >
          {isGeneratingAutor && activeStep === 0 && <CircularProgress size={24} />}
          {!isGeneratingAutor && (activeStep === 0 ? 'Gerar com IA' : 'Finalizar e Salvar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutorWizard;
