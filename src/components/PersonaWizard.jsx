import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, LinearProgress, Box, TextField, Typography, Grid, FormControl, InputLabel, Select, MenuItem, Chip, Checkbox, ListItemText, Accordion, AccordionSummary, AccordionDetails, FormGroup, FormControlLabel, CircularProgress, Tooltip, IconButton, Link as MuiLink,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, InfoOutlined as InfoOutlinedIcon, Replay as ReplayIcon, ArrowBack, ArrowForward, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import TextEditor from './TextEditor';
import { toast } from 'sonner';
import isEqual from 'lodash.isequal';


// Constants
const POSICOES_CARGOS = ['Liderança Executiva: CEO, Diretor Executivo, Sócio', 'Gestão de Tecnologia: CTO, Head de Engenharia, Gerente de TI', 'Gestão de Marketing: Gerente de Marketing, Coordenador de Marketing', 'Gestão de Vendas: Gerente de Vendas, Diretor Comercial', 'Gestão de Recursos Humanos: Head de RH, Analista de RH', 'Outro(s)'];
const SEGMENTOS_EMPRESA = ['Tecnologia (Software, SaaS, Hardware)', 'Serviços Financeiros (Fintech)', 'E-commerce e Varejo', 'Saúde (Healthtech, Farmacêutica)', 'Manufatura', 'Consultoria e Serviços', 'Outro(s)'];
const RESPONSABILIDADES_CHAVE = ['Gerenciamento de Orçamento', 'Tomada de Decisão Estratégica', 'Gestão de Equipes', 'Inovação de Produtos', 'Garantir a Operação e Estabilidade', 'Compliance e Governança', 'Outro(s)'];
const DORES_DESAFIOS = { "doresEstrategicos": { "label": "Estratégicos", "items": [{ "nome": "Dificuldade em Crescer", "descricao": "A persona se sente estagnada, com pouco ou nenhum avanço em seus objetivos. O desafio é encontrar um caminho claro para a expansão e o sucesso." }, { "nome": "Posicionamento de Mercado Fraco", "descricao": "A persona não consegue se diferenciar da concorrência. Sua marca não é reconhecida, e a proposta de valor não é clara para o público." }, { "nome": "Falta de Direção Clara", "descricao": "A persona não tem um plano de longo prazo definido. Ela age por impulso, o que resulta em esforços dispersos e resultados inconsistentes." }] }, "doresOperacionais": { "label": "Operacionais", "items": [{ "nome": "Processos Ineficientes", "descricao": "A rotina de trabalho é desorganizada, com falhas na comunicação e falta de automação. A persona perde tempo em tarefas manuais que poderiam ser otimizadas." }, { "nome": "Falta de Ferramentas Adequadas", "descricao": "A persona utiliza tecnologias e softwares desatualizados que a impedem de ser produtiva, criando gargalos no fluxo de trabalho." }, { "nome": "Orçamento Limitado", "descricao": "A necessidade de maximizar os resultados com poucos recursos financeiros, exigindo um alto retorno sobre o investimento (ROI) para justificar os gastos." }] }, "doresPessoas": { "label": "Pessoas e Cultura", "items": [{ "nome": "Clima Organizacional Tóxico", "descricao": "O ambiente de trabalho é negativo, com baixa motivação e conflitos interpessoais. O desafio é construir um espaço de trabalho saudável e colaborativo." }, { "nome": "Dificuldade em Atrair e Reter Talentos", "descricao": "A persona tem problemas para encontrar profissionais qualificados e, quando os encontra, não consegue mantê-los. Isso gera um ciclo constante de recrutamento." }, { "nome": "Falta de Alinhamento e Engajamento", "descricao": "A equipe não está alinhada aos valores e à visão da empresa, o que pode levar a um desempenho abaixo do esperado." }] }, "doresRegulatorios": { "label": "Regulatórios e Métricas", "items": [{ "nome": "Falta de Conformidade Legal", "descricao": "A persona não está atualizada sobre as leis e regulamentos do seu setor, o que pode levar a multas, penalidades e problemas legais." }, { "nome": "Análise de Dados Complexa", "descricao": "A persona coleta muitos dados, mas não sabe como interpretá-los para extrair insights valiosos." }, { "nome": "Definição de KPIs Inadequados", "descricao": "Os indicadores de desempenho (KPIs) usados não refletem os objetivos estratégicos da persona." }] } };
const GATILHOS_BARREIRAS = { 'gatilhosCompra': { label: 'Gatilhos de Compra', items: ['Problema técnico urgente', 'Pressão do board', 'Necessidade de redução de custos', 'Vantagem competitiva'] }, 'barreirasAdocao': { label: 'Barreiras de Adoção', items: ['Orçamento limitado', 'Resistência à mudança da equipe', 'Preocupação com segurança e compliance', 'Dificuldade de integração'] } };
export const emptyPersonaWizardData = { description: '', nome: '', posicaoCargo: [], segmentoEmpresa: [], responsabilidadesChave: [], doresEstrategicos: [], doresOperacionais: [], doresPessoas: [], doresRegulatorios: [], gatilhosCompra: [], barreirasAdocao: [], mentalidadeValores: '', contextoCultural: '' };

const steps = ['Início Rápido com IA', 'Revisão Básica', 'Responsabilidades', 'Dores e Desafios', 'Gatilhos e Barreiras', 'Mentalidade e Cultura'];

export const PersonaWizardContent = ({ onSave, onClose, onGenerate, isGeneratingPersona, personaData, onPersonaDataChange, initialStep = 0, onReset }) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [otherItemInputs, setOtherItemInputs] = useState({});
  const [editingChip, setEditingChip] = useState(null);

  useEffect(() => {
    setActiveStep(initialStep || 0);
  }, [initialStep]);

  if (!personaData) {
    return <CircularProgress />;
  }

  const handleNext = () => setActiveStep((prevActiveStep) => prevActiveStep + 1);
  const handleBack = () => setActiveStep((prevActiveStep) => prevActiveStep - 1);
  const handleChange = (event) => onPersonaDataChange(prev => ({ ...prev, [event.target.name]: event.target.value }));
  const handleMultiSelectChange = (event) => onPersonaDataChange(prev => ({ ...prev, [event.target.name]: typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value }));
  const handleCheckboxChange = (category, field) => (event) => { const { checked } = event.target; onPersonaDataChange(prev => { const currentValues = prev[category] || []; const newValues = checked ? [...currentValues, field] : currentValues.filter(item => item !== field); return { ...prev, [category]: newValues }; }); };
  const handleRichTextChange = (name, value) => onPersonaDataChange(prev => ({ ...prev, [name]: value }));
  const handleChipDelete = (fieldName, valueToDelete) => onPersonaDataChange(prev => ({ ...prev, [fieldName]: (prev[fieldName] || []).filter(item => item !== valueToDelete) }));
  const handleOtherInputChange = (key, value) => setOtherItemInputs(prev => ({ ...prev, [key]: value }));
  const handleAddNewItem = (key) => { const newItem = otherItemInputs[key]?.trim(); if (!newItem) return; if ((personaData[key] || []).map(item => item.toLowerCase()).includes(newItem.toLowerCase())) { toast.warning('Este item já foi adicionado.'); return; } onPersonaDataChange(prev => ({ ...prev, [key]: [...(prev[key] || []), newItem] })); handleOtherInputChange(key, ''); };
  const handleEditChip = (key, value) => setEditingChip({ key, value, newValue: value });
  const handleUpdateChipValue = () => { if (!editingChip) return; const { key, value, newValue } = editingChip; const trimmedNewValue = newValue.trim(); if (!trimmedNewValue) { toast.error("O valor não pode ser vazio."); setEditingChip(null); return; } if (value.toLowerCase() === trimmedNewValue.toLowerCase()) { setEditingChip(null); return; } if ((personaData[key] || []).map(item => item.toLowerCase()).includes(trimmedNewValue.toLowerCase())) { toast.warning('Este item já foi adicionado.'); setEditingChip(null); return; } onPersonaDataChange(prev => ({ ...prev, [key]: (prev[key] || []).map(item => (item === value ? trimmedNewValue : item)) })); setEditingChip(null); };

  const handleGenerateClick = () => {
    const hasExistingData = personaData && personaData.nome; // Check if a name already exists
    const proceed = () => {
        onGenerate(personaData.description, (generatedPersona) => {
            onPersonaDataChange(prev => ({ ...prev, ...generatedPersona }));
            setActiveStep(1); // Move to the next step to show the results
        });
    };

    if (hasExistingData) {
        if (window.confirm("Gerar uma nova persona com IA irá sobrescrever os dados atuais. Deseja continuar?")) {
            proceed();
        }
    } else {
        proceed();
    }
  };


  const InfoTooltip = ({ title, url }) => (<Tooltip title={<Typography variant="body2" sx={{ p: 1 }}>{title} {url && <MuiLink href={url} target="_blank" rel="noopener noreferrer" sx={{ color: 'cyan', display: 'block', mt: 1 }}>Saiba mais</MuiLink>}</Typography>}><IconButton><InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} /></IconButton></Tooltip>);

  const getStepContent = (step) => {
    switch (step) {
      case 0: return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField name="description" label="Descrição da Persona" multiline rows={6} fullWidth value={personaData.description || ''} onChange={handleChange} placeholder="Ex: 'CTO de uma startup...'" disabled={isGeneratingPersona} />
            <Tooltip title="Gerar persona com IA">
                <IconButton onClick={handleGenerateClick} disabled={isGeneratingPersona || !personaData.description?.trim()} color="primary">
                    {isGeneratingPersona ? <CircularProgress size={24} /> : <AutoAwesomeIcon />}
                </IconButton>
            </Tooltip>
            <InfoTooltip title="Forneça uma breve descrição do perfil. A IA irá usar essa informação para preencher os primeiros campos automaticamente." />
        </Box>
      );
      case 1: return <Box><Typography variant="h6" gutterBottom>Revisão e Detalhamento Básico</Typography><Grid container spacing={3}><Grid item xs={12}><TextField label="Nome da Persona" name="nome" value={personaData.nome || ''} onChange={handleChange} fullWidth required /></Grid><Grid item xs={12} md={(personaData.posicaoCargo || []).includes('Outro(s)') ? 6 : 12}><FormControl fullWidth><InputLabel>Posição/Cargo</InputLabel><Select multiple name="posicaoCargo" value={personaData.posicaoCargo || []} onChange={handleMultiSelectChange} renderValue={(s) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{s.map((v) => <Chip key={v} label={v} onDelete={() => handleChipDelete('posicaoCargo', v)} onMouseDown={(e) => e.stopPropagation()} />)}</Box>} label="Posição/Cargo">{POSICOES_CARGOS.map((p) => <MenuItem key={p} value={p}><Checkbox checked={(personaData.posicaoCargo || []).indexOf(p) > -1} /><ListItemText primary={p} /></MenuItem>)}</Select></FormControl></Grid>{(personaData.posicaoCargo || []).includes('Outro(s)') && <Grid item xs={12} md={6}><TextField label="Especifique Outro Cargo" name="posicaoCargoOutro" value={personaData.posicaoCargoOutro || ''} onChange={handleChange} fullWidth required /></Grid>}<Grid item xs={12} md={(personaData.segmentoEmpresa || []).includes('Outro(s)') ? 6 : 12}><FormControl fullWidth><InputLabel>Segmento da Empresa</InputLabel><Select multiple name="segmentoEmpresa" value={personaData.segmentoEmpresa || []} onChange={handleMultiSelectChange} renderValue={(s) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{s.map((v) => <Chip key={v} label={v} onDelete={() => handleChipDelete('segmentoEmpresa', v)} onMouseDown={(e) => e.stopPropagation()} />)}</Box>} label="Segmento da Empresa">{SEGMENTOS_EMPRESA.map((s) => <MenuItem key={s} value={s}><Checkbox checked={(personaData.segmentoEmpresa || []).indexOf(s) > -1} /><ListItemText primary={s} /></MenuItem>)}</Select></FormControl></Grid>{(personaData.segmentoEmpresa || []).includes('Outro(s)') && <Grid item xs={12} md={6}><TextField label="Especifique Outro Segmento" name="segmentoEmpresaOutro" value={personaData.segmentoEmpresaOutro || ''} onChange={handleChange} fullWidth required /></Grid>}</Grid></Box>;
      case 2: return <Box><Typography variant="h6" gutterBottom>Responsabilidades-Chave</Typography><FormControl fullWidth><InputLabel>Responsabilidades-Chave</InputLabel><Select multiple name="responsabilidadesChave" value={personaData.responsabilidadesChave || []} onChange={handleMultiSelectChange} renderValue={(s) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{s.map((v) => <Chip key={v} label={v} onDelete={() => handleChipDelete('responsabilidadesChave', v)} onMouseDown={(e) => e.stopPropagation()} />)}</Box>} label="Responsabilidades-Chave">{RESPONSABILIDADES_CHAVE.map((r) => <MenuItem key={r} value={r}><Checkbox checked={(personaData.responsabilidadesChave || []).indexOf(r) > -1} /><ListItemText primary={r} /></MenuItem>)}</Select></FormControl>{(personaData.responsabilidadesChave || []).includes('Outro(s)') && <TextField label="Especifique Outra Responsabilidade" name="responsabilidadesChaveOutro" value={personaData.responsabilidadesChaveOutro || ''} onChange={handleChange} fullWidth required sx={{ mt: 2 }} />}</Box>;
      case 3: return <Box><Typography variant="h6" gutterBottom>Dores e Desafios</Typography>{Object.entries(DORES_DESAFIOS).map(([key, { label, items }]) => <Accordion key={key} defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary><AccordionDetails><FormGroup>{items.map((item) => <Box key={item.nome}><FormControlLabel control={<Checkbox checked={(personaData[key] || []).includes(item.nome)} onChange={handleCheckboxChange(key, item.nome)} />} label={item.nome} /><InfoTooltip title={item.descricao} /></Box>)}</FormGroup></AccordionDetails></Accordion>)}</Box>;
      case 4: return <Box><Typography variant="h6" gutterBottom>Gatilhos e Barreiras</Typography>{Object.entries(GATILHOS_BARREIRAS).map(([key, { label, items }]) => <Accordion key={key} defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary><AccordionDetails><FormGroup>{items.map((item) => <FormControlLabel key={item} control={<Checkbox checked={(personaData[key] || []).includes(item)} onChange={handleCheckboxChange(key, item)} />} label={item} />)}</FormGroup></AccordionDetails></Accordion>)}</Box>;
      case 5: return <Box><Typography variant="h6" gutterBottom>Mentalidade e Valores</Typography><TextEditor value={personaData.mentalidadeValores || ''} onChange={(v) => handleRichTextChange('mentalidadeValores', v)} html={true} /><Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Contexto Cultural</Typography><TextEditor value={personaData.contextoCultural || ''} onChange={(v) => handleRichTextChange('contextoCultural', v)} html={true} /></Box>;
      default: return 'Unknown step';
    }
  };

  const isNextDisabled = () => (activeStep === 1 && !(personaData.nome || '').trim());

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">Etapa {activeStep + 1} de {steps.length}: {steps[activeStep]}</Typography>
        <LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100} sx={{ mt: 1 }} />
      </Box>
      <Box sx={{ mt: 4, mb: 4, minHeight: '30vh' }}>{getStepContent(activeStep)}</Box>
      <DialogActions
        sx={{
          p: 2,
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
      </DialogActions>
    </Box>
  );
};

const PersonaWizard = ({ open, onClose, onSave, ...props }) => {
  const isMobile = useIsMobile();

  if (!open) {
    return null;
  }

  if (isMobile) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen>
        <DialogTitle>Assistente de Criação de Persona</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 1, height: '100%' }}>
            <PersonaWizardContent onClose={onClose} onSave={onSave} {...props} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return <PersonaWizardContent onClose={onClose} onSave={onSave} {...props} />;
};

export default PersonaWizard;
