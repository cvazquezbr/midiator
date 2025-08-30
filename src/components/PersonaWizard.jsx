import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Box,
  TextField,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Checkbox,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  CircularProgress,
  Tooltip,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    InfoOutlined as InfoOutlinedIcon,
    Replay as ReplayIcon,
    ArrowBack,
    ArrowForward,
} from '@mui/icons-material';
import TextEditor from './TextEditor';
import { toast } from 'sonner';
import isEqual from 'lodash.isequal';

// Constants
const POSICOES_CARGOS = ['Liderança Executiva: CEO, Diretor Executivo, Sócio', 'Gestão de Tecnologia: CTO, Head de Engenharia, Gerente de TI', 'Gestão de Marketing: Gerente de Marketing, Coordenador de Marketing', 'Gestão de Vendas: Gerente de Vendas, Diretor Comercial', 'Gestão de Recursos Humanos: Head de RH, Analista de RH', 'Outro(s)'];
const SEGMENTOS_EMPRESA = ['Tecnologia (Software, SaaS, Hardware)', 'Serviços Financeiros (Fintech)', 'E-commerce e Varejo', 'Saúde (Healthtech, Farmacêutica)', 'Manufatura', 'Consultoria e Serviços', 'Outro(s)'];
const RESPONSABILIDADES_CHAVE = ['Gerenciamento de Orçamento', 'Tomada de Decisão Estratégica', 'Gestão de Equipes', 'Inovação de Produtos', 'Garantir a Operação e Estabilidade', 'Compliance e Governança', 'Outro(s)'];
const DORES_DESAFIOS = { /* ... data ... */ };
const GATILHOS_BARREIRAS = { /* ... data ... */ };
export const emptyPersonaWizardData = { description: '', nome: '', posicaoCargo: [], segmentoEmpresa: [], responsabilidadesChave: [], doresEstrategicos: [], doresOperacionais: [], doresPessoas: [], doresRegulatorios: [], gatilhosCompra: [], barreirasAdocao: [], mentalidadeValores: '', contextoCultural: '' };

const steps = ['Início Rápido com IA', 'Revisão Básica', 'Responsabilidades', 'Dores e Desafios', 'Gatilhos e Barreiras', 'Mentalidade e Cultura'];

export const PersonaWizardContent = ({ onSave, onClose, onGenerate, isGeneratingPersona, persona, initialStep = 0, onReset, onDirtyChange }) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [personaData, setPersonaData] = useState(persona || emptyPersonaWizardData);
  const [initialData, setInitialData] = useState(persona || emptyPersonaWizardData);
  const [isDirty, setIsDirty] = useState(false);

  // Sync with parent state
  useEffect(() => {
    const newPersonaData = persona || emptyPersonaWizardData;
    setPersonaData(newPersonaData);
    setInitialData(newPersonaData);
    setActiveStep(initialStep || 0);
  }, [persona, initialStep]);

  // Track if form is dirty
  useEffect(() => {
    const dirty = !isEqual(initialData, personaData);
    setIsDirty(dirty);
    if (onDirtyChange) {
      onDirtyChange(dirty);
    }
  }, [personaData, initialData, onDirtyChange]);

  const handleDataChange = (newPersonaData) => {
    setPersonaData(newPersonaData);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      onGenerate(personaData.description, (generatedPersona) => {
        setPersonaData(prev => ({ ...prev, ...generatedPersona }));
        setActiveStep(1);
      });
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => setActiveStep((prevActiveStep) => prevActiveStep - 1);

  // Simplified handlers using a common function
  const createChangeHandler = (name, value) => handleDataChange({ ...personaData, [name]: value });
  const createMultiSelectHandler = (name) => (event) => handleDataChange({ ...personaData, [name]: typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value });
  // ... other handlers would be refactored similarly ...

  const getStepContent = (step) => { /* ... */ };
  const isNextDisabled = () => (activeStep === 0 && !(personaData.description || '').trim()) || (activeStep === 1 && !(personaData.nome || '').trim());

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
            Etapa {activeStep + 1} de {steps.length}: {steps[activeStep]}
        </Typography>
        <LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100} sx={{ mt: 1 }} />
      </Box>

      <Box sx={{ mt: 4, mb: 4, minHeight: '30vh' }}>
        {getStepContent(activeStep)}
      </Box>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between', mt: 2 }}>
        {/* Left-aligned Actions */}
        <Box>
            <Button onClick={() => onClose(isDirty)}>Cancelar</Button>
            {initialStep > 0 && <Button onClick={() => onReset(isDirty)} color="error" startIcon={<ReplayIcon />}>Recomeçar</Button>}
        </Box>

        {/* Center-aligned Save */}
        <Box>
             <Button onClick={() => onSave(personaData)} variant="contained" color="primary">Salvar</Button>
        </Box>

        {/* Right-aligned Navigation */}
        <Box>
            <Button onClick={handleBack} disabled={activeStep === 0} variant="outlined" startIcon={<ArrowBack />}>
                Anterior
            </Button>
            {activeStep === 0 && (
                 <Button onClick={handleNext} variant="outlined" endIcon={<ArrowForward />} disabled={isNextDisabled() || isGeneratingPersona} sx={{ ml: 1 }}>
                    {isGeneratingPersona ? <CircularProgress size={24} /> : 'Gerar com IA'}
                 </Button>
            )}
            {activeStep > 0 && activeStep < steps.length - 1 && (
                <Button onClick={handleNext} variant="outlined" endIcon={<ArrowForward />} sx={{ ml: 1 }}>
                    Próximo
                </Button>
            )}
        </Box>
      </DialogActions>
    </Box>
  );
};

// The shell Dialog remains the same
const PersonaWizard = ({ open, onClose, onSave, ...props }) => {
  const isMobile = useIsMobile();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>Assistente de Criação de Persona</DialogTitle>
      <DialogContent sx={{ minHeight: '50vh' }}><PersonaWizardContent onClose={onClose} onSave={onSave} {...props} /></DialogContent>
    </Dialog>
  );
};

export default PersonaWizard;
