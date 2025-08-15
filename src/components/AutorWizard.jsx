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
  Tooltip,
  IconButton,
} from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import RichTextEditor from './RichTextEditor';

const steps = [
  'Início Rápido com IA',
  'Revisão Detalhada',
];

const TIPO_ORGANIZACAO_OPTIONS = ['Braço de tecnologia', 'Agência de marketing', 'Consultoria', 'Startup', 'Empresa de Software (SaaS)', 'E-commerce', 'Outro'];

const InfoTooltip = ({ title }) => (
    <Tooltip title={<Typography variant="body2" sx={{ p: 1 }}>{title}</Typography>}>
      <IconButton>
        <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
      </IconButton>
    </Tooltip>
);

export const AutorWizardContent = ({ onClose, onSave, onGenerate, isGeneratingAutor, autor }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [autorData, setAutorData] = useState(autor || {});

  useEffect(() => {
    // Unlike the modal version, we don't reset the step when 'open' changes here.
    // The parent component will control the mounting/unmounting.
    // We do want to initialize the data when the component mounts or the initial 'autor' prop changes.
    setAutorData(autor || {
      descricaoGeral: '',
      dominioReferencia: '',
      siteExclusao: '',
      identidade: '',
      descricao: '',
      tipo: '',
      tipoOrganizacaoOutro: '',
      objetivoEstrategico: '',
      objetivoEngajamento: '',
    });
  }, [autor]);

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
    setAutorData(prev => {
      const newState = { ...prev, [name]: value };
      // Se o tipo de organização for alterado para algo diferente de "Outro",
      // limpa o campo de texto `tipoOrganizacaoOutro`.
      if (name === 'tipo' && value !== 'Outro') {
        newState.tipoOrganizacaoOutro = '';
      }
      return newState;
    });
  };

  const handleRichTextChange = (name, value) => {
    setAutorData(prev => ({ ...prev, [name]: value }));
  };

  const getStepContent = (step) => {
    const emptyLabelStyle = {
        '& .MuiInputLabel-root:not(.Mui-focused):not(.MuiFormLabel-filled)': {
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '1.4rem',
            // Ajustado para um campo de 6 linhas
            transform: 'translate(14px, 60px) scale(1)',
        },
    };

    switch (step) {
      case 0:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TextField
                  name="descricaoGeral"
                  label="Descrição do Autor"
                  multiline
                  rows={6}
                  fullWidth
                  value={autorData.descricaoGeral || ''}
                  onChange={handleChange}
                  placeholder="Ex: 'Uma empresa de consultoria de marketing digital focada em startups de tecnologia...'"
                  disabled={isGeneratingAutor}
                  sx={!(autorData.descricaoGeral || '').trim() ? emptyLabelStyle : {}}
                />
                <InfoTooltip title="Forneça uma breve descrição do perfil do autor (a empresa ou marca). A IA irá usar essa informação para preencher os campos detalhados." />
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
              {autorData.tipo === 'Outro' && (
                <Grid item xs={12}>
                  <TextField
                    name="tipoOrganizacaoOutro"
                    label="Qual?"
                    fullWidth
                    value={autorData.tipoOrganizacaoOutro || ''}
                    onChange={handleChange}
                    placeholder="Especifique o tipo de organização"
                    required
                  />
                </Grid>
              )}
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
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {getStepContent(activeStep)}
      <DialogActions sx={{ p: 3, justifyContent: 'space-between', mt: 2, flexWrap: 'wrap' }}>
        <Box>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} color="secondary">Salvar</Button>
        </Box>
        <Box sx={{ display: 'flex', mt: { xs: 2, sm: 0 } }}>
          <Button onClick={handleBack} disabled={activeStep === 0}>
            Voltar
          </Button>
          <Button
              onClick={handleNext}
              variant="contained"
              disabled={isNextDisabled()}
              sx={{ ml: 1 }}
          >
            {isGeneratingAutor && activeStep === 0 && <CircularProgress size={24} />}
            {!isGeneratingAutor && (activeStep === 0 ? 'Gerar com IA' : 'Finalizar e Salvar')}
          </Button>
        </Box>
      </DialogActions>
    </Box>
  );
};


const AutorWizard = ({ open, onClose, onSave, ...props }) => {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>
        Assistente de Criação de Autor
      </DialogTitle>
      <DialogContent sx={{ minHeight: '50vh' }}>
        <AutorWizardContent
            onClose={onClose}
            onSave={(data) => {
                onSave(data);
                onClose(); // In modal context, save also closes.
            }}
            {...props}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AutorWizard;
