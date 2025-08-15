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
  Alert,
    Tooltip,
    IconButton,
    Link as MuiLink,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';
import RichTextEditor from './RichTextEditor';

// Constants for Persona fields (copied from CampaignStandardsModal)
const POSICOES_CARGOS = ['Liderança Executiva: CEO, Diretor Executivo, Sócio', 'Gestão de Tecnologia: CTO, Head de Engenharia, Gerente de TI', 'Gestão de Marketing: Gerente de Marketing, Coordenador de Marketing', 'Gestão de Vendas: Gerente de Vendas, Diretor Comercial', 'Gestão de Recursos Humanos: Head de RH, Analista de RH', 'Outro(s)'];
const SEGMENTOS_EMPRESA = ['Tecnologia (Software, SaaS, Hardware)', 'Serviços Financeiros (Fintech)', 'E-commerce e Varejo', 'Saúde (Healthtech, Farmacêutica)', 'Manufatura', 'Consultoria e Serviços', 'Outro(s)'];
const RESPONSABILIDADES_CHAVE = ['Gerenciamento de Orçamento', 'Tomada de Decisão Estratégica', 'Gestão de Equipes', 'Inovação de Produtos', 'Garantir a Operação e Estabilidade', 'Compliance e Governança', 'Outro(s)'];
const DORES_DESAFIOS = {
    "doresEstrategicos": {
      "label": "Estratégicos",
      "items": [
        {
          "nome": "Dificuldade em Crescer",
          "descricao": "A persona se sente estagnada, com pouco ou nenhum avanço em seus objetivos. O desafio é encontrar um caminho claro para a expansão e o sucesso."
        },
        {
          "nome": "Posicionamento de Mercado Fraco",
          "descricao": "A persona não consegue se diferenciar da concorrência. Sua marca não é reconhecida, e a proposta de valor não é clara para o público."
        },
        {
          "nome": "Falta de Direção Clara",
          "descricao": "A persona não tem um plano de longo prazo definido. Ela age por impulso, o que resulta em esforços dispersos e resultados inconsistentes."
        }
      ]
    },
    "doresOperacionais": {
      "label": "Operacionais",
      "items": [
        {
          "nome": "Processos Ineficientes",
          "descricao": "A rotina de trabalho é desorganizada, com falhas na comunicação e falta de automação. A persona perde tempo em tarefas manuais que poderiam ser otimizadas."
        },
        {
          "nome": "Falta de Ferramentas Adequadas",
          "descricao": "A persona utiliza tecnologias e softwares desatualizados que a impedem de ser produtiva, criando gargalos no fluxo de trabalho."
        },
        {
          "nome": "Orçamento Limitado",
          "descricao": "A necessidade de maximizar os resultados com poucos recursos financeiros, exigindo um alto retorno sobre o investimento (ROI) para justificar os gastos."
        }
      ]
    },
    "doresPessoas": {
      "label": "Pessoas e Cultura",
      "items": [
        {
          "nome": "Clima Organizacional Tóxico",
          "descricao": "O ambiente de trabalho é negativo, com baixa motivação e conflitos interpessoais. O desafio é construir um espaço de trabalho saudável e colaborativo."
        },
        {
          "nome": "Dificuldade em Atrair e Reter Talentos",
          "descricao": "A persona tem problemas para encontrar profissionais qualificados e, quando os encontra, não consegue mantê-los. Isso gera um ciclo constante de recrutamento."
        },
        {
          "nome": "Falta de Alinhamento e Engajamento",
          "descricao": "A equipe não está alinhada aos valores e à visão da empresa, o que pode levar a um desempenho abaixo do esperado."
        }
      ]
    },
    "doresRegulatorios": {
      "label": "Regulatórios e Métricas",
      "items": [
        {
          "nome": "Falta de Conformidade Legal",
          "descricao": "A persona não está atualizada sobre as leis e regulamentos do seu setor, o que pode levar a multas, penalidades e problemas legais. O desafio é garantir que todas as operações estejam de acordo com a legislação."
        },
        {
          "nome": "Análise de Dados Complexa",
          "descricao": "A persona coleta muitos dados, mas não sabe como interpretá-los para extrair insights valiosos. Ela tem dificuldade em identificar o que está funcionando e o que precisa ser melhorado."
        },
        {
          "nome": "Definição de KPIs Inadequados",
          "descricao": "Os indicadores de desempenho (KPIs) usados não refletem os objetivos estratégicos da persona. Os números não contam a história completa, o que resulta em decisões equivocadas."
        }
      ]
    }
  };
const GATILHOS_BARREIRAS = {
    'gatilhosCompra': { label: 'Gatilhos de Compra', items: ['Problema técnico urgente', 'Pressão do board', 'Necessidade de redução de custos', 'Vantagem competitiva']},
    'barreirasAdocao': { label: 'Barreiras de Adoção', items: ['Orçamento limitado', 'Resistência à mudança da equipe', 'Preocupação com segurança e compliance', 'Dificuldade de integração']},
};


const steps = [
  'Início Rápido com IA',
  'Revisão Básica',
  'Responsabilidades',
  'Dores e Desafios',
  'Gatilhos e Barreiras',
  'Mentalidade e Cultura',
];

export const PersonaWizardContent = ({ onSave, onClose, onGenerate, isGeneratingPersona, persona }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [personaData, setPersonaData] = useState(persona || {});
  const [otherItemInputs, setOtherItemInputs] = useState({});
  const [editingChip, setEditingChip] = useState(null);

  useEffect(() => {
    setPersonaData(persona || {
        description: '',
        nome: '',
        posicaoCargo: [],
        segmentoEmpresa: [],
        responsabilidadesChave: [],
        doresEstrategicos: [],
        doresOperacionais: [],
        doresPessoas: [],
        doresRegulatorios: [],
        gatilhosCompra: [],
        barreirasAdocao: [],
        mentalidadeValores: '',
        contextoCultural: '',
    });
    setActiveStep(0);
  }, [persona]);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSave();
    } else if (activeStep === 0) {
        onGenerate(personaData.description, (generatedPersona) => {
            setPersonaData(prev => ({...prev, ...generatedPersona}));
            setActiveStep(1);
        });
    } else {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSave = () => {
    onSave(personaData);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setPersonaData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (event) => {
      const { name, value } = event.target;
      setPersonaData(prev => ({
          ...prev,
          [name]: typeof value === 'string' ? value.split(',') : value,
      }));
  };

    const handleCheckboxChange = (category, field) => (event) => {
        const { checked } = event.target;
        setPersonaData(prev => {
            const currentValues = prev[category] || [];
            let newValues;
            if (checked) {
                newValues = [...currentValues, field];
            } else {
                newValues = currentValues.filter(item => item !== field);
            }
            return { ...prev, [category]: newValues };
        });
    };

    const handleChipDelete = (fieldName, valueToDelete) => {
        setPersonaData(prev => {
            const currentValues = prev[fieldName] || [];
            const newValues = currentValues.filter(item => item !== valueToDelete);
            return { ...prev, [fieldName]: newValues };
        });
    };

  const handleRichTextChange = (name, value) => {
      setPersonaData(prev => ({ ...prev, [name]: value }));
  };

  const handleOtherInputChange = (key, value) => {
    setOtherItemInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleAddNewItem = (key) => {
    const newItem = otherItemInputs[key]?.trim();
    if (!newItem) return;

    const existingItems = (personaData[key] || []).map(item => item.toLowerCase());
    if (existingItems.includes(newItem.toLowerCase())) {
        console.warn('Attempted to add a duplicate item:', newItem);
        return;
    }

    setPersonaData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), newItem]
    }));
    handleOtherInputChange(key, '');
  };

  const handleEditChip = (key, value) => {
    setEditingChip({ key, value, newValue: value });
  };

  const handleUpdateChipValue = () => {
    if (!editingChip) return;
    const { key, value, newValue } = editingChip;
    const trimmedNewValue = newValue.trim();

    if (!trimmedNewValue) {
        console.error("Chip value cannot be empty.");
        setEditingChip(null);
        return;
    }

    if (value.toLowerCase() === trimmedNewValue.toLowerCase()) {
        setEditingChip(null);
        return;
    }

    const existingItems = (personaData[key] || []).map(item => item.toLowerCase());
    if (existingItems.includes(trimmedNewValue.toLowerCase())) {
        console.warn('Attempted to update to a duplicate item:', trimmedNewValue);
        setEditingChip(null);
        return;
    }

    setPersonaData(prev => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.map(item => (item === value ? trimmedNewValue : item));
      return { ...prev, [key]: newValues };
    });

    setEditingChip(null);
  };

  const InfoTooltip = ({ title, url }) => (
    <Tooltip title={<Typography variant="body2" sx={{ p: 1 }}>{title} {url && <MuiLink href={url} target="_blank" rel="noopener noreferrer" sx={{ color: 'cyan', display: 'block', mt: 1 }}>Saiba mais</MuiLink>}</Typography>}>
      <IconButton>
        <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
      </IconButton>
    </Tooltip>
  );

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
            <Alert severity="info" sx={{ mb: 2 }}>
              Forneça uma breve descrição do perfil. A IA irá usar essa informação para preencher os primeiros campos automaticamente. Ex: 'CTO de uma startup de tecnologia que precisa inovar rapidamente e reduzir custos com a nuvem.'
            </Alert>
            <TextField
              name="description"
              label="Descrição da Persona"
              multiline
              rows={6}
              fullWidth
              value={personaData.description || ''}
              onChange={handleChange}
              placeholder="Ex: 'CTO de uma startup de tecnologia que precisa inovar rapidamente e reduzir custos com a nuvem.'"
              disabled={isGeneratingPersona}
              sx={!(personaData.description || '').trim() ? emptyLabelStyle : {}}
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Revisão e Detalhamento Básico</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              A IA preencheu os campos abaixo com base na sua descrição. Revise e ajuste se necessário.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Nome da Persona"
                  name="nome"
                  value={personaData.nome || ''}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Posição/Cargo</InputLabel>
                  <Select
                    multiple
                    name="posicaoCargo"
                    value={personaData.posicaoCargo || []}
                    onChange={handleMultiSelectChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={value}
                            onDelete={() => handleChipDelete('posicaoCargo', value)}
                            onMouseDown={(event) => event.stopPropagation()}
                          />
                        ))}
                      </Box>
                    )}
                    label="Posição/Cargo"
                  >
                    {POSICOES_CARGOS.map((pos) => (
                      <MenuItem key={pos} value={pos}>
                        <Checkbox checked={(personaData.posicaoCargo || []).indexOf(pos) > -1} />
                        <ListItemText primary={pos} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {(personaData.posicaoCargo || []).includes('Outro(s)') && (
                <Grid item xs={12}>
                  <TextField
                    label="Especifique Outro Cargo"
                    name="posicaoCargoOutro"
                    value={personaData.posicaoCargoOutro || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Segmento da Empresa</InputLabel>
                  <Select
                    multiple
                    name="segmentoEmpresa"
                    value={personaData.segmentoEmpresa || []}
                    onChange={handleMultiSelectChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={value}
                            onDelete={() => handleChipDelete('segmentoEmpresa', value)}
                            onMouseDown={(event) => event.stopPropagation()}
                          />
                        ))}
                      </Box>
                    )}
                    label="Segmento da Empresa"
                  >
                    {SEGMENTOS_EMPRESA.map((seg) => (<MenuItem key={seg} value={seg}><Checkbox checked={(personaData.segmentoEmpresa || []).indexOf(seg) > -1} /><ListItemText primary={seg} /></MenuItem>))}
                  </Select>
                </FormControl>
              </Grid>
              {(personaData.segmentoEmpresa || []).includes('Outro(s)') && (
                <Grid item xs={12}>
                  <TextField
                    label="Especifique Outro Segmento"
                    name="segmentoEmpresaOutro"
                    value={personaData.segmentoEmpresaOutro || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Responsabilidades-Chave</Typography>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Responsabilidades-Chave</InputLabel>
              <Select
                multiple
                name="responsabilidadesChave"
                value={personaData.responsabilidadesChave || []}
                onChange={handleMultiSelectChange}
                renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                            <Chip
                                key={value}
                                label={value}
                                onDelete={() => handleChipDelete('responsabilidadesChave', value)}
                                onMouseDown={(event) => event.stopPropagation()}
                            />
                        ))}
                    </Box>
                )}
                label="Responsabilidades-Chave"
              >
                {RESPONSABILIDADES_CHAVE.map((resp) => (<MenuItem key={resp} value={resp}><Checkbox checked={(personaData.responsabilidadesChave || []).indexOf(resp) > -1} /><ListItemText primary={resp} /></MenuItem>))}
              </Select>
            </FormControl>
            {(personaData.responsabilidadesChave || []).includes('Outro(s)') && (
              <TextField
                label="Especifique Outra Responsabilidade"
                name="responsabilidadesChaveOutro"
                value={personaData.responsabilidadesChaveOutro || ''}
                onChange={handleChange}
                fullWidth
                required
                variant="outlined"
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Dores e Desafios</Typography>
            {Object.entries(DORES_DESAFIOS).map(([key, { label, items }]) => {
              const customItems = (personaData?.[key] || []).filter(
                (pItem) => !items.some((i) => i.nome === pItem)
              );
              return (
                <Accordion key={key} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary>
                  <AccordionDetails>
                    <FormGroup>
                      {items.map((item) => (
                        <Box key={item.nome} sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            control={<Checkbox checked={(personaData[key] || []).includes(item.nome)} onChange={handleCheckboxChange(key, item.nome)} />}
                            label={item.nome}
                          />
                          <InfoTooltip title={item.descricao} />
                        </Box>
                      ))}
                    </FormGroup>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                      {customItems.map((item) => (
                        editingChip && editingChip.key === key && editingChip.value === item ? (
                          <TextField
                            key={item}
                            value={editingChip.newValue}
                            onChange={(e) => setEditingChip({ ...editingChip, newValue: e.target.value })}
                            onBlur={handleUpdateChipValue}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateChipValue(); } if (e.key === 'Escape') { setEditingChip(null); } }}
                            autoFocus
                            size="small"
                            sx={{ width: 'auto', minWidth: '100px' }}
                          />
                        ) : (
                          <Chip
                            key={item}
                            label={item}
                            onClick={() => handleEditChip(key, item)}
                            onDelete={() => handleChipDelete(key, item)}
                          />
                        )
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                      <TextField
                        label={`Adicionar Outra Dor (${label})`}
                        value={otherItemInputs[key] || ''}
                        onChange={(e) => handleOtherInputChange(key, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewItem(key); } }}
                        fullWidth
                        variant="outlined"
                        size="small"
                      />
                      <Button onClick={() => handleAddNewItem(key)} variant="outlined">
                        Adicionar
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        );
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Gatilhos de Compra e Barreiras de Adoção</Typography>
            {Object.entries(GATILHOS_BARREIRAS).map(([key, { label, items }]) => {
              const customItems = (personaData?.[key] || []).filter(pItem => !items.includes(pItem));
              return (
                <Accordion key={key} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary>
                  <AccordionDetails>
                    <FormGroup>
                      {items.map((item) => (<FormControlLabel key={item} control={<Checkbox checked={(personaData[key] || []).includes(item)} onChange={handleCheckboxChange(key, item)} />} label={item} />))}
                    </FormGroup>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                      {customItems.map((item) => (
                        editingChip && editingChip.key === key && editingChip.value === item ? (
                          <TextField
                            key={item}
                            value={editingChip.newValue}
                            onChange={(e) => setEditingChip({ ...editingChip, newValue: e.target.value })}
                            onBlur={handleUpdateChipValue}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateChipValue(); } if (e.key === 'Escape') { setEditingChip(null); } }}
                            autoFocus
                            size="small"
                            sx={{ width: 'auto', minWidth: '100px' }}
                          />
                        ) : (
                          <Chip
                            key={item}
                            label={item}
                            onClick={() => handleEditChip(key, item)}
                            onDelete={() => handleChipDelete(key, item)}
                          />
                        )
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                      <TextField
                        label={`Adicionar Outro(a) (${label})`}
                        value={otherItemInputs[key] || ''}
                        onChange={(e) => handleOtherInputChange(key, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewItem(key); } }}
                        fullWidth
                        variant="outlined"
                        size="small"
                      />
                      <Button onClick={() => handleAddNewItem(key)} variant="outlined">
                        Adicionar
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        );
      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Mentalidade e Valores</Typography>
            <RichTextEditor
                value={personaData.mentalidadeValores || ''}
                onChange={(value) => handleRichTextChange('mentalidadeValores', value)}
            />
            <Typography variant="h6" gutterBottom sx={{mt: 3}}>Contexto Cultural</Typography>
            <RichTextEditor
                value={personaData.contextoCultural || ''}
                onChange={(value) => handleRichTextChange('contextoCultural', value)}
            />
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  const isNextDisabled = () => {
    if (activeStep === 0 && !(personaData.description || '').trim()) {
        return true;
    }
    if (activeStep === 1 && !(personaData.nome || '').trim()) {
        return true;
    }
    return false;
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
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
                disabled={isNextDisabled() || isGeneratingPersona}
                sx={{ ml: 1 }}
            >
            {isGeneratingPersona && activeStep === 0 && <CircularProgress size={24} />}
            {!isGeneratingPersona && (activeStep === 0 ? 'Gerar com IA' : activeStep === steps.length - 1 ? 'Finalizar e Salvar' : 'Continuar')}
            </Button>
        </Box>
      </DialogActions>
    </Box>
  );
};


const PersonaWizard = ({ open, onClose, onSave, ...props }) => {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>
        Assistente de Criação de Persona
      </DialogTitle>
      <DialogContent sx={{ minHeight: '50vh' }}>
        <PersonaWizardContent
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

export default PersonaWizard;
