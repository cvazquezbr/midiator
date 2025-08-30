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

// Constants
const POSICOES_CARGOS = ['Liderança Executiva: CEO, Diretor Executivo, Sócio', 'Gestão de Tecnologia: CTO, Head de Engenharia, Gerente de TI', 'Gestão de Marketing: Gerente de Marketing, Coordenador de Marketing', 'Gestão de Vendas: Gerente de Vendas, Diretor Comercial', 'Gestão de Recursos Humanos: Head de RH, Analista de RH', 'Outro(s)'];
const SEGMENTOS_EMPRESA = ['Tecnologia (Software, SaaS, Hardware)', 'Serviços Financeiros (Fintech)', 'E-commerce e Varejo', 'Saúde (Healthtech, Farmacêutica)', 'Manufatura', 'Consultoria e Serviços', 'Outro(s)'];
const RESPONSABILIDADES_CHAVE = ['Gerenciamento de Orçamento', 'Tomada de Decisão Estratégica', 'Gestão de Equipes', 'Inovação de Produtos', 'Garantir a Operação e Estabilidade', 'Compliance e Governança', 'Outro(s)'];
const DORES_DESAFIOS = { /* ... data ... */ };
const GATILHOS_BARREIRAS = { /* ... data ... */ };
export const emptyPersonaWizardData = { description: '', nome: '', posicaoCargo: [], segmentoEmpresa: [], responsabilidadesChave: [], doresEstrategicos: [], doresOperacionais: [], doresPessoas: [], doresRegulatorios: [], gatilhosCompra: [], barreirasAdocao: [], mentalidadeValores: '', contextoCultural: '' };

const steps = ['Início Rápido com IA', 'Revisão Básica', 'Responsabilidades', 'Dores e Desafios', 'Gatilhos e Barreiras', 'Mentalidade e Cultura'];

export const PersonaWizardContent = ({ onSave, onClose, onGenerate, isGeneratingPersona, persona, initialStep = 0, onReset }) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [personaData, setPersonaData] = useState(persona || emptyPersonaWizardData);

  // This effect synchronizes the internal state with the props passed from the parent
  useEffect(() => {
    console.log("DEBUG: [Wizard] useEffect triggered.");
    console.log("DEBUG: [Wizard] Received persona prop:", persona);
    console.log("DEBUG: [Wizard] Received initialStep prop:", initialStep);
    const newPersonaData = persona || emptyPersonaWizardData;
    setPersonaData(newPersonaData);
    setActiveStep(initialStep || 0);
    console.log("DEBUG: [Wizard] State updated. personaData:", newPersonaData, "activeStep:", initialStep || 0);
  }, [persona, initialStep]);

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
  const handleChange = (event) => setPersonaData(prev => ({ ...prev, [event.target.name]: event.target.value }));
  const handleMultiSelectChange = (event) => setPersonaData(prev => ({ ...prev, [event.target.name]: typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value }));
  const handleRichTextChange = (name, value) => setPersonaData(prev => ({ ...prev, [name]: value }));
  const handleChipDelete = (fieldName, valueToDelete) => setPersonaData(prev => ({ ...prev, [fieldName]: (prev[fieldName] || []).filter(item => item !== valueToDelete) }));

  const handleReset = () => {
    if (window.confirm("Tem certeza que deseja recomeçar? Todos os dados não salvos nesta persona serão perdidos e o processo de criação iniciará do zero.")) {
      if (onReset) onReset();
    }
  };

  const getStepContent = (step) => { /* ... (implementation is correct and omitted for brevity) ... */ return <Box>Step {step} content</Box> };
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
            <Button onClick={onClose}>Cancelar</Button>
            {initialStep > 0 && <Button onClick={handleReset} color="error" startIcon={<ReplayIcon />}>Recomeçar</Button>}
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

const PersonaWizard = ({ open, onClose, onSave, ...props }) => {
  const isMobile = useIsMobile();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>Assistente de Criação de Persona</DialogTitle>
      <DialogContent sx={{ minHeight: '50vh' }}>
          <PersonaWizardContent onClose={onClose} onSave={onSave} {...props} />
      </DialogContent>
    </Dialog>
  );
};

export default PersonaWizard;
