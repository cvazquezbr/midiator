import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { useSwipeable } from 'react-swipeable';
import {
  Dialog, DialogTitle, DialogContent, Button, LinearProgress, Box, TextField, Typography, Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress, Tooltip, IconButton,
} from '@mui/material';
import { ArrowBack, ArrowForward, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import TextEditor from './TextEditor';

// Constants
export const TIPO_ORGANIZACAO_OPTIONS = ['Braço de tecnologia', 'Agência de marketing', 'Consultoria', 'Startup', 'Empresa de Software (SaaS)', 'E-commerce', 'Outro'];
export const emptyAutorWizardData = {
    descricaoGeral: '',
    dominioReferencia: '',
    siteExclusao: '',
    identidade: '',
    descricao: '',
    tipo: '',
    tipoOrganizacaoOutro: '',
    objetivoEstrategico: '',
    objetivoEngajamento: '',
};

const steps = ['Início Rápido com IA', 'Revisão Detalhada'];

/**
 * @component AutorWizardContent
 * @description The core UI of the autor creation/editing wizard.
 */
export const AutorWizardContent = ({ onSave, onClose, onGenerate, isGeneratingAutor, autorData, onAutorDataChange, initialStep = 0 }) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const isMobile = useIsMobile();

  const handleNext = () => setActiveStep((prevActiveStep) => prevActiveStep < steps.length - 1 ? prevActiveStep + 1 : prevActiveStep);
  const handleBack = () => setActiveStep((prevActiveStep) => prevActiveStep > 0 ? prevActiveStep - 1 : prevActiveStep);
  const isNextDisabled = () => (activeStep === 1 && !(autorData.identidade || '').trim());

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => !isNextDisabled() && handleNext(),
    onSwipedRight: handleBack,
    preventDefaultTouchmoveEvent: true,
    trackMouse: isMobile,
  });

  useEffect(() => {
    setActiveStep(initialStep || 0);
  }, [initialStep]);

  if (!autorData) {
    return <CircularProgress />;
  }

  // Generic change handlers that propagate updates to the parent component.
  const handleChange = (event) => onAutorDataChange(prev => ({ ...prev, [event.target.name]: event.target.value }));
  const handleRichTextChange = (name, value) => onAutorDataChange(prev => ({ ...prev, [name]: value }));

  /**
   * Handles the AI generation click.
   */
  const handleGenerateClick = () => {
    const hasExistingData = autorData && autorData.identidade;
    const proceed = () => {
        onGenerate(autorData.descricaoGeral, autorData.dominioReferencia, autorData.siteExclusao, (generatedAutor) => {
            onAutorDataChange(prev => ({ ...prev, ...generatedAutor }));
            setActiveStep(1);
        });
    };

    if (hasExistingData) {
        if (window.confirm("Gerar um novo autor com IA irá sobrescrever os dados atuais. Deseja continuar?")) {
            proceed();
        }
    } else {
        proceed();
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0: return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TextField name="descricaoGeral" label="Descrição do Autor" multiline rows={6} fullWidth value={autorData.descricaoGeral || ''} onChange={handleChange} placeholder="Ex: 'Uma empresa de consultoria...'" disabled={isGeneratingAutor} />
                <Tooltip title="Gerar autor com IA">
                    <IconButton onClick={handleGenerateClick} disabled={isGeneratingAutor || !autorData.descricaoGeral?.trim()} color="primary">
                        {isGeneratingAutor ? <CircularProgress size={24} /> : <AutoAwesomeIcon />}
                    </IconButton>
                </Tooltip>
            </Box>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField
                      name="dominioReferencia"
                      label="Domínio de Referência (Opcional)"
                      fullWidth
                      value={autorData.dominioReferencia || ''}
                      onChange={handleChange}
                      placeholder="Ex: 'empresa.com.br'"
                      helperText="A IA usará este site como fonte de informação."
                      disabled={isGeneratingAutor}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                      name="siteExclusao"
                      label="Site para Excluir da Busca (Opcional)"
                      fullWidth
                      value={autorData.siteExclusao || ''}
                      onChange={handleChange}
                      placeholder="Ex: 'concorrente.com.br'"
                      helperText="A IA evitará este site em sua busca."
                      disabled={isGeneratingAutor}
                    />
                </Grid>
            </Grid>
        </Box>
      );
      case 1: return <Box><Typography variant="h6" gutterBottom>Revisão e Detalhamento</Typography><Grid container spacing={3}><Grid item xs={12}><TextField label="Nome do Autor" name="identidade" value={autorData.identidade || ''} onChange={handleChange} fullWidth required /></Grid><Grid item xs={12}><Typography variant="subtitle1" gutterBottom>Descrição da Empresa</Typography><TextEditor value={autorData.descricao || ''} onChange={(v) => handleRichTextChange('descricao', v)} html={true} /></Grid><Grid item xs={12}><FormControl fullWidth><InputLabel>Tipo de Organização</InputLabel><Select name="tipo" value={autorData.tipo || ''} onChange={handleChange} label="Tipo de Organização">{TIPO_ORGANIZACAO_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}</Select></FormControl></Grid>{autorData.tipo === 'Outro' && <Grid item xs={12}><TextField label="Especifique o Tipo" name="tipoOrganizacaoOutro" value={autorData.tipoOrganizacaoOutro || ''} onChange={handleChange} fullWidth /></Grid>}<Grid item xs={12}><Typography variant="subtitle1" gutterBottom>Objetivo Estratégico</Typography><TextEditor value={autorData.objetivoEstrategico || ''} onChange={(v) => handleRichTextChange('objetivoEstrategico', v)} html={true} /></Grid><Grid item xs={12}><Typography variant="subtitle1" gutterBottom>Objetivo de Engajamento</Typography><TextEditor value={autorData.objetivoEngajamento || ''} onChange={(v) => handleRichTextChange('objetivoEngajamento', v)} html={true} /></Grid></Grid></Box>;
      default: return 'Unknown step';
    }
  };

  return (
    <Box {...swipeHandlers} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">Etapa {activeStep + 1} de {steps.length}: {steps[activeStep]}</Typography>
        <LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100} sx={{ mt: 1 }} />
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {getStepContent(activeStep)}
      </Box>
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onClose}
          color="secondary"
          sx={{ width: { xs: '100%', sm: 'auto' }, mb: { xs: 1, sm: 0 } }}
        >
          Cancelar
        </Button>
        <Box sx={{ display: 'flex', width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            variant="outlined"
            startIcon={<ArrowBack />}
          >
            Anterior
          </Button>
          <Button
            onClick={handleNext}
            variant="outlined"
            endIcon={<ArrowForward />}
            disabled={isNextDisabled() || activeStep === steps.length - 1}
            sx={{ ml: 1 }}
          >
            Próximo
          </Button>
          <Button
            onClick={onSave}
            variant="contained"
            color="primary"
            sx={{ ml: 2 }}
          >
            Salvar
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * @component AutorWizard
 * @description A wrapper component for the AutorWizardContent.
 */
const AutorWizard = ({ open, onClose, onSave, ...props }) => {
  const isMobile = useIsMobile();

  if (!open) {
    return null;
  }

  if (isMobile) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen>
        <DialogTitle>Assistente de Criação de Autor</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 1, height: '100%' }}>
            <AutorWizardContent onClose={onClose} onSave={onSave} {...props} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Assistente de Criação de Autor
      </Typography>
      <AutorWizardContent onClose={onClose} onSave={onSave} {...props} />
    </>
  );
};

export default AutorWizard;
