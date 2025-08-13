import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../hooks/use-mobile.js';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Link as MuiLink,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  ListItemText,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import RichTextEditor from './RichTextEditor';
import {
  Close as CloseIcon,
  TextFields as TextFieldsIcon,
  Palette as PaletteIcon,
  InfoOutlined as InfoOutlinedIcon,
  ExpandMore as ExpandMoreIcon,
  UploadFile as UploadFileIcon,
  Link as LinkIcon,
  AutoAwesome as AutoAwesomeIcon,
  Description as DescriptionIcon,
  Add,
} from '@mui/icons-material';
import { toast } from 'sonner';
import ColorThief from 'colorthief';

import TextEditorDialog from './TextEditorDialog';
import HtmlDisplayField from './HtmlDisplayField';
import PaletteReportModal from './PaletteReportModal';
import PersonaGenerationModal from './PersonaGenerationModal';
import PersonaWizard from './PersonaWizard';
import MemorialDescritivoModal from './MemorialDescritivoModal';
import { getCampaignPrompt, saveCampaignPrompt } from '../utils/campaignPrompt';
import { callGeminiApi } from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, width: '100%', overflowY: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const briefingOptions = {
  objective: ['Branding', 'Site', 'Produto', 'Campanha de Marketing'],
  targetAudience: ['Mulheres 30-45 anos', 'Jovens Gamers', 'Executivos C-Level', 'Famílias com Crianças'],
  mainMessage: ['Confiança', 'Inovação', 'Sustentabilidade', 'Acessibilidade', 'Luxo'],
  atmosphere: ['Calmo e Sereno', 'Energético e Vibrante', 'Premium e Sofisticado', 'Divertido e Descontraído'],
};

const CampaignStandardsModal = ({ open, onClose, onGeneratePalette }) => {
  const isMobile = useIsMobile();
  const [value, setValue] = useState(0);
  const [persona, setPersona] = useState({});
  const [autor, setAutor] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [formato, setFormato] = useState('');
  const [colors, setColors] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const imageInputRef = useRef(null);

  // State for AI Palette Generation
  const [briefing, setBriefing] = useState({
    objective: '',
    targetAudience: '',
    mainMessage: '',
    atmosphere: '',
    details: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPalette, setGeneratedPalette] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // State for AI Persona Generation
  const [personaDescription, setPersonaDescription] = useState('');
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [showPersonaGenModal, setShowPersonaGenModal] = useState(false);
  const [showPersonaWizard, setShowPersonaWizard] = useState(false);
  const [showMemorialModal, setShowMemorialModal] = useState(false);

  const handleBriefingChange = (e) => {
    const { name, value } = e.target;
    setBriefing(prev => ({ ...prev, [name]: value }));
  };

  const handleGeneratePersonaWithAI = async (description, callback) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      toast.error('Chave de API do Gemini não configurada.');
      return;
    }

    setIsGeneratingPersona(true);
    const prompt = `
A partir da seguinte descrição de persona, preencha os campos do objeto JSON abaixo. Use exatamente os nomes de chave em camelCase fornecidos. Se a informação para algum campo não estiver na descrição, use um array vazio [] ou uma string vazia "".

Descrição: ${description}

Campos para preencher (use exatamente estes nomes de chave):
- nome: (string)
- posicaoCargo: (array de strings)
- segmentoEmpresa: (array de strings)
- responsabilidadesChave: (array de strings)
- doresEstrategicos: (array de strings)
- doresOperacionais: (array de strings)
- doresPessoas: (array de strings)
- doresRegulatorios: (array de strings)
- gatilhosCompra: (array de strings)
- barreirasAdocao: (array de strings)
- mentalidadeValores: (string)
- contextoCultural: (string)

Retorne apenas um único objeto JSON com estas chaves, sem texto adicional, markdown, ou qualquer outra formatação.
    `;

    try {
      const response = await callGeminiApi(prompt, apiKey);
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();

      if (!cleanedResponse) {
        toast.error('A IA retornou uma resposta vazia.');
        return;
      }

      const generatedPersona = JSON.parse(cleanedResponse);

      if(callback) {
        callback(generatedPersona);
      } else {
        setPersona(prev => ({ ...prev, ...generatedPersona }));
        toast.success('Persona gerada com sucesso! Revise os campos preenchidos.');
        setShowPersonaGenModal(false);
      }

    } catch (error) {
      console.error("Erro ao gerar ou processar persona com IA:", error);
      toast.error('Ocorreu um erro ao processar a resposta da IA. Verifique o console do navegador para detalhes.');
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    setGeneratedPalette(null);
    try {
      const fullBriefing = `
- Objetivo: ${briefing.objective}
- Público-alvo: ${briefing.targetAudience}
- Mensagem principal: ${briefing.mainMessage}
- Atmosfera desejada: ${briefing.atmosphere}
- Detalhes adicionais: ${briefing.details}
      `;
      const result = await onGeneratePalette(fullBriefing.trim());
      setGeneratedPalette(result);
      setShowReportModal(true); // Open the report modal
    } catch (error) {
      toast.error('Erro ao gerar paleta de cores. Tente novamente.');
      console.error("Error generating color palette:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyGeneratedPalette = () => {
    if (generatedPalette && generatedPalette.palette) {
      const newColors = generatedPalette.palette.map(p => p.hex);
      setColors(newColors);
      toast.success('Paleta de cores aplicada!');
    }
  };

  useEffect(() => {
    if (open) {
      const { persona, autor, instrucoes, formato, colors } = getCampaignPrompt();
      setPersona(persona);
      setAutor(autor);
      setInstrucoes(instrucoes);
      setFormato(formato);
      setColors(colors || []);
    }
  }, [open]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSave = () => {
    saveCampaignPrompt({ persona, autor, instrucoes, formato, colors });
    toast.success('Padrões de campanha salvos com sucesso!');
    onClose();
  };

  const handleOpenEditor = (field) => {
    setEditingField(field);
  };

  const handleCloseEditor = () => {
    setEditingField(null);
  };

  const handleSaveEditor = (newContent) => {
    if (editingField === 'persona') {
      setPersona(newContent);
    } else if (editingField === 'autor') {
      setAutor(newContent);
    } else if (editingField === 'instrucoes') {
      setInstrucoes(newContent);
    } else if (editingField === 'formato') {
      setFormato(newContent);
    }
    setEditingField(null);
  };

  const getCurrentContent = () => {
    if (editingField === 'persona') return persona;
    if (editingField === 'autor') return autor;
    if (editingField === 'instrucoes') return instrucoes;
    if (editingField === 'formato') return formato;
    return '';
  };

  const getEditorTitle = () => {
      if (editingField === 'persona') return 'Editar Persona';
      if (editingField === 'autor') return 'Editar Autor';
      if (editingField === 'instrucoes') return 'Editar Instruções';
      if (editingField === 'formato') return 'Editar Formato';
      return 'Editar';
  };

  const handleColorChange = (index, newColor) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    setColors(newColors);
  };

  const addColor = () => {
    if (colors.length < 5) {
      setColors([...colors, '#000000']);
    }
  };

  const removeColor = (index) => {
    const newColors = colors.filter((_, i) => i !== index);
    setColors(newColors);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(img, 5);
          setColors(palette.map(rgb => `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePersonaChange = (event) => {
      const { name, value } = event.target;
      setPersona(prev => ({ ...prev, [name]: value }));
  };

  const handlePersonaMultiSelectChange = (event) => {
      const { name, value } = event.target;
      setPersona(prev => ({
          ...prev,
          [name]: typeof value === 'string' ? value.split(',') : value,
      }));
  };

  const handlePersonaRichTextChange = (name, value) => {
      setPersona(prev => ({ ...prev, [name]: value }));
  };

  const handlePersonaCheckboxChange = (category, field) => (event) => {
      const { checked } = event.target;
      setPersona(prev => {
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

  const handlePersonaChipDelete = (fieldName, valueToDelete) => {
    setPersona(prev => {
        const currentValues = prev[fieldName] || [];
        const newValues = currentValues.filter(item => item !== valueToDelete);
        return { ...prev, [fieldName]: newValues };
    });
  };

  // Constants for Persona fields
  const POSICOES_CARGOS = ['Liderança Executiva: CEO, Diretor Executivo, Sócio', 'Gestão de Tecnologia: CTO, Head de Engenharia, Gerente de TI', 'Gestão de Marketing: Gerente de Marketing, Coordenador de Marketing', 'Gestão de Vendas: Gerente de Vendas, Diretor Comercial', 'Gestão de Recursos Humanos: Head de RH, Analista de RH', 'Outro(s)'];
  const SEGMENTOS_EMPRESA = ['Tecnologia (Software, SaaS, Hardware)', 'Serviços Financeiros (Fintech)', 'E-commerce e Varejo', 'Saúde (Healthtech, Farmacêutica)', 'Manufatura', 'Consultoria e Serviços', 'Outro(s)'];
  const RESPONSABILIDADES_CHAVE = ['Gerenciamento de Orçamento', 'Tomada de Decisão Estratégica', 'Gestão de Equipes', 'Inovação de Produtos', 'Garantir a Operação e Estabilidade', 'Compliance e Governança', 'Outro(s)'];
  const DORES_DESAFIOS = {
      'doresEstrategicos': { label: 'Estratégicos', items: ['ROI de Inovação', 'Dependência de Fornecedores', 'Escalabilidade de Negócios', 'Outro(s)']},
      'doresOperacionais': { label: 'Operacionais', items: ['Manutenção de Sistemas Legados', 'Custos Operacionais', 'Segurança de Dados', 'Interoperabilidade de Sistemas', 'Outro(s)']},
      'doresPessoas': { label: 'Pessoas e Cultura', items: ['Retenção de Talentos', 'Alinhamento de Equipes', 'Resistência à Mudança', 'Treinamento e Capacitação', 'Outro(s)']},
      'doresRegulatorios': { label: 'Regulatórios e Métricas', items: ['Compliance (LGPD, etc.)', 'Medição de Valor (ROI)', 'Prioridades Conflitantes', 'Outro(s)']},
  };
  const GATILHOS_BARREIRAS = {
      'gatilhosCompra': { label: 'Gatilhos de Compra', items: ['Problema técnico urgente', 'Pressão do board', 'Necessidade de redução de custos', 'Vantagem competitiva', 'Outro(s)']},
      'barreirasAdocao': { label: 'Barreiras de Adoção', items: ['Orçamento limitado', 'Resistência à mudança da equipe', 'Preocupação com segurança e compliance', 'Dificuldade de integração', 'Outro(s)']},
  };

  const InfoTooltip = ({ title, url }) => (
      <Tooltip title={<Typography variant="body2" sx={{ p: 1 }}>{title} {url && <MuiLink href={url} target="_blank" rel="noopener noreferrer" sx={{ color: 'cyan', display: 'block', mt: 1 }}>Saiba mais</MuiLink>}</Typography>}>
          <IconButton>
              <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
          </IconButton>
      </Tooltip>
  );

  const a11yProps = (index) => {
    return {
      id: `vertical-tab-${index}`,
      'aria-controls': `vertical-tabpanel-${index}`,
    };
  };

  const colorPalettes = [
    { name: 'Coolors', url: 'https://coolors.co/' },
    { name: 'Adobe Color', url: 'https://color.adobe.com/' },
    { name: 'Color Hunt', url: 'https://colorhunt.co/' },
    { name: 'Paletton', url: 'https://paletton.com/' },
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth={false} fullScreen>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                Padrões de Campanha
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DescriptionIcon />}
                    onClick={() => setShowMemorialModal(true)}
                    sx={{ ml: 2 }}
                >
                    Gerar Memorial Descritivo
                </Button>
            </Box>
          <IconButton onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              orientation="horizontal"
              variant="scrollable"
              value={value}
              onChange={handleChange}
              aria-label="Padrões de Campanha"
            >
              <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Persona" {...a11yProps(0)} />
              <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Autor" {...a11yProps(1)} />
              <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Formato" {...a11yProps(2)} />
              <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Instruções" {...a11yProps(3)} />
              <Tab icon={<PaletteIcon />} iconPosition="start" label="Cores" {...a11yProps(4)} />
            </Tabs>
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <TabPanel value={value} index={0}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mb: 2, alignItems: 'flex-start' }}
            >
                <Button
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => setShowPersonaGenModal(true)}
                >
                    Gerar com IA (Simples)
                </Button>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setShowPersonaWizard(true)}
                >
                    Assistente de Criação de Persona
                </Button>
            </Stack>
            <Grid container spacing={3}>
                {/* Nome da Persona */}
                <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                        label="Nome da Persona"
                        name="nome"
                        value={persona?.nome || ''}
                        onChange={handlePersonaChange}
                        fullWidth
                        required
                        variant="outlined"
                    />
                    <InfoTooltip title="É a identificação clara e concisa do perfil de cliente ideal que você está descrevendo. Ajuda a humanizar o perfil, tornando-o mais fácil de ser compreendido por toda a equipe." />
                </Grid>

                {/* Posição/Cargo */}
                <Grid item xs={12} md={(persona?.posicaoCargo || []).includes('Outro(s)') ? 6 : 12} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Posição/Cargo</InputLabel>
                        <Select
                            multiple
                            name="posicaoCargo"
                            value={persona?.posicaoCargo || []}
                            onChange={handlePersonaMultiSelectChange}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip
                                            key={value}
                                            label={value}
                                            onDelete={() => handlePersonaChipDelete('posicaoCargo', value)}
                                            onMouseDown={(event) => event.stopPropagation()}
                                        />
                                    ))}
                                </Box>
                            )}
                            label="Posição/Cargo"
                        >
                            {POSICOES_CARGOS.map((pos) => (
                                <MenuItem key={pos} value={pos}>
                                    <Checkbox checked={(persona?.posicaoCargo || []).indexOf(pos) > -1} />
                                    <ListItemText primary={pos} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <InfoTooltip title="Este campo identifica a função formal da persona dentro da empresa. A posição define a autoridade de decisão, as responsabilidades e as métricas de sucesso que a persona utiliza." url="https://www.google.com/search?q=https://www.linkedin.com/business/talent/blog/talent-acquisition/types-of-job-titles" />
                </Grid>
                {(persona?.posicaoCargo || []).includes('Outro(s)') && (
                    <Grid item xs={12} md={6}>
                        <TextField label="Especifique Outro Cargo" name="posicaoCargoOutro" value={persona?.posicaoCargoOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined"/>
                    </Grid>
                )}

                {/* Segmento da Empresa */}
                <Grid item xs={12} md={(persona?.segmentoEmpresa || []).includes('Outro(s)') ? 6 : 12} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Segmento da Empresa</InputLabel>
                        <Select
                            multiple
                            name="segmentoEmpresa"
                            value={persona?.segmentoEmpresa || []}
                            onChange={handlePersonaMultiSelectChange}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip
                                            key={value}
                                            label={value}
                                            onDelete={() => handlePersonaChipDelete('segmentoEmpresa', value)}
                                            onMouseDown={(event) => event.stopPropagation()}
                                        />
                                    ))}
                                </Box>
                            )}
                            label="Segmento da Empresa"
                        >
                            {SEGMENTOS_EMPRESA.map((seg) => (<MenuItem key={seg} value={seg}><Checkbox checked={(persona?.segmentoEmpresa || []).indexOf(seg) > -1} /><ListItemText primary={seg} /></MenuItem>))}
                        </Select>
                    </FormControl>
                    <InfoTooltip title="Este campo classifica a indústria ou setor de atuação da empresa. O segmento de mercado influencia diretamente os desafios, a cultura e as regulamentações que a persona enfrenta." url="https://www.google.com/search?q=https://blog.hubspot.com/marketing/market-segmentation-guide" />
                </Grid>
                {(persona?.segmentoEmpresa || []).includes('Outro(s)') && (
                    <Grid item xs={12} md={6}>
                        <TextField label="Especifique Outro Segmento" name="segmentoEmpresaOutro" value={persona?.segmentoEmpresaOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined"/>
                    </Grid>
                )}

                {/* Responsabilidades-Chave */}
                <Grid item xs={12} md={(persona?.responsabilidadesChave || []).includes('Outro(s)') ? 6 : 12} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Responsabilidades-Chave</InputLabel>
                        <Select
                            multiple
                            name="responsabilidadesChave"
                            value={persona?.responsabilidadesChave || []}
                            onChange={handlePersonaMultiSelectChange}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip
                                            key={value}
                                            label={value}
                                            onDelete={() => handlePersonaChipDelete('responsabilidadesChave', value)}
                                            onMouseDown={(event) => event.stopPropagation()}
                                        />
                                    ))}
                                </Box>
                            )}
                            label="Responsabilidades-Chave"
                        >
                            {RESPONSABILIDADES_CHAVE.map((resp) => (<MenuItem key={resp} value={resp}><Checkbox checked={(persona?.responsabilidadesChave || []).indexOf(resp) > -1} /><ListItemText primary={resp} /></MenuItem>))}
                        </Select>
                    </FormControl>
                    <InfoTooltip title="Detalha as principais tarefas e áreas de atuação da persona. Entender suas responsabilidades ajuda a identificar como sua solução pode facilitar o trabalho dela ou ajudá-la a atingir metas específicas." />
                </Grid>
                {(persona?.responsabilidadesChave || []).includes('Outro(s)') && (
                    <Grid item xs={12} md={6}>
                        <TextField label="Especifique Outra Responsabilidade" name="responsabilidadesChaveOutro" value={persona?.responsabilidadesChaveOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined"/>
                    </Grid>
                )}

                {/* Dores e Desafios */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">Dores e Desafios</Typography>
                        <InfoTooltip title="Esta seção descreve os problemas e obstáculos que a persona enfrenta. Compreender suas dores permite que você posicione sua solução como uma resposta direta a um problema real." url="https://www.google.com/search?q=https://blog.hotmart.com/pt-br/dor-do-cliente/" />
                    </Box>
                    {Object.entries(DORES_DESAFIOS).map(([key, { label, items }]) => (
                        <Accordion key={key}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary>
                            <AccordionDetails>
                                <FormGroup>
                                    {items.map((item) => (<FormControlLabel key={item} control={<Checkbox checked={(persona?.[key] || []).includes(item)} onChange={handlePersonaCheckboxChange(key, item)} />} label={item} />))}
                                </FormGroup>
                                {(persona?.[key] || []).includes('Outro(s)') && (
                                    <TextField label={`Especifique Outra Dor (${label})`} name={`${key}Outro`} value={persona?.[`${key}Outro`] || ''} onChange={handlePersonaChange} fullWidth required variant="outlined" sx={{ mt: 2 }}/>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Grid>

                {/* Gatilhos de Compra e Barreiras de Adoção */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">Gatilhos de Compra e Barreira de Adoção</Typography>
                        <InfoTooltip title="Detalha os fatores que levam a persona a buscar uma solução (gatilhos) e os obstáculos que podem atrasar ou impedir a decisão de compra (barreiras)." />
                    </Box>
                    {Object.entries(GATILHOS_BARREIRAS).map(([key, { label, items }]) => (
                        <Accordion key={key}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary>
                            <AccordionDetails>
                                <FormGroup>
                                    {items.map((item) => (
                                        <FormControlLabel
                                            key={item}
                                            control={<Checkbox checked={(persona?.[key] || []).includes(item)} onChange={handlePersonaCheckboxChange(key, item)} />}
                                            label={item}
                                        />
                                    ))}
                                </FormGroup>
                                {(persona?.[key] || []).includes('Outro(s)') && (
                                    <TextField
                                        label={`Especifique Outro(a) (${label})`}
                                        name={`${key}Outro`}
                                        value={persona?.[`${key}Outro`] || ''}
                                        onChange={handlePersonaChange}
                                        fullWidth
                                        required
                                        variant="outlined"
                                        sx={{ mt: 2 }}
                                    />
                                )}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Grid>

                {/* Mentalidade e Valores */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">Mentalidade e Valores</Typography>
                        <InfoTooltip title="Descreve a forma de pensar, os valores e a atitude da persona em relação ao trabalho e às decisões. Esta informação é fundamental para adaptar a linguagem e o tom da comunicação." />
                    </Box>
                    <RichTextEditor
                        value={persona?.mentalidadeValores || ''}
                        onChange={(value) => handlePersonaRichTextChange('mentalidadeValores', value)}
                    />
                </Grid>

                {/* Contexto Cultural */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">Contexto Cultural</Typography>
                        <InfoTooltip title="Aqui é detalhado o ambiente de trabalho e a cultura organizacional na qual a persona está inserida. Isso inclui o contexto interno, como a convivência com processos antigos, a pressão por inovação ou a colaboração entre equipes." />
                    </Box>
                    <RichTextEditor
                        value={persona?.contextoCultural || ''}
                        onChange={(value) => handlePersonaRichTextChange('contextoCultural', value)}
                    />
                </Grid>
            </Grid>
          </TabPanel>
          <TabPanel value={value} index={1}>
            <HtmlDisplayField
              title="Autor"
              tooltip="Descreva o autor ou a voz da marca que está criando o conteúdo. Qual o tom, estilo e perspectiva?"
              htmlContent={autor}
              onClick={() => handleOpenEditor('autor')}
              placeholder="Clique para editar o autor..."
            />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <HtmlDisplayField
              title="Formato"
              tooltip="Descreva a estrutura do conteúdo. É uma lista? Um passo-a-passo? Uma história? Dê exemplos se possível."
              htmlContent={formato}
              onClick={() => handleOpenEditor('formato')}
              placeholder="Clique para editar o formato..."
            />
          </TabPanel>
          <TabPanel value={value} index={3}>
            <HtmlDisplayField
              title="Instruções"
              tooltip="Forneça instruções detalhadas para a IA. Inclua o que fazer e o que não fazer, palavras-chave, e o objetivo do conteúdo."
              htmlContent={instrucoes}
              onClick={() => handleOpenEditor('instrucoes')}
              placeholder="Clique para editar as instruções..."
            />
          </TabPanel>

          <TabPanel value={value} index={4}>
            <Typography variant="h6" gutterBottom>Cores da Campanha</Typography>
            <Typography variant="body2" gutterBottom>
              Defina até 5 cores de referência para a campanha.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
              {colors.map((color, index) => (
                <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    style={{ width: '50px', height: '50px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <Button size="small" onClick={() => removeColor(index)}>Remover</Button>
                </Box>
              ))}
              {colors.length < 5 && (
                <Button variant="outlined" onClick={addColor}>Adicionar Cor</Button>
              )}
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Extrair Cores de Imagem</Typography>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => imageInputRef.current.click()}
              >
                Upload de Imagem
              </Button>
              <input
                type="file"
                hidden
                accept="image/*"
                ref={imageInputRef}
                onChange={handleImageUpload}
              />
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Inspiração de Paletas de Cores</Typography>
              {colorPalettes.map((palette) => (
                <Chip
                  key={palette.name}
                  icon={<LinkIcon />}
                  label={palette.name}
                  component="a"
                  href={palette.url}
                  target="_blank"
                  clickable
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* AI Palette Generator */}
            <Box>
              <Typography variant="h6" gutterBottom>Gerar Paleta com IA</Typography>
              <Grid container spacing={2}>
                {Object.keys(briefingOptions).map(key => (
                  <Grid item xs={12} sm={6} key={key}>
                    <FormControl fullWidth>
                      <InputLabel>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}</InputLabel>
                      <Select
                        name={key}
                        value={briefing[key]}
                        label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                        onChange={handleBriefingChange}
                      >
                        {briefingOptions[key].map(option => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                ))}
              </Grid>
              <TextField
                name="details"
                label="Detalhes Adicionais do Briefing"
                multiline
                rows={4}
                value={briefing.details}
                onChange={handleBriefingChange}
                fullWidth
                placeholder="INCLUINDO:
- Quaisquer cores proibidas ou obrigatórias"
                margin="normal"
              />
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleGenerateClick}
                disabled={isGenerating || !onGeneratePalette}
              >
                {isGenerating ? <CircularProgress size={24} /> : 'Gerar Paleta'}
              </Button>
            </Box>
          </TabPanel>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Salvar Padrões</Button>
        </DialogActions>
      </Dialog>

      <TextEditorDialog
        open={editingField !== null}
        title={getEditorTitle()}
        content={getCurrentContent()}
        onSave={handleSaveEditor}
        onClose={handleCloseEditor}
      />

      <PaletteReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        paletteData={generatedPalette}
        onApplyPalette={applyGeneratedPalette}
        briefing={briefing}
      />

      <PersonaGenerationModal
        open={showPersonaGenModal}
        onClose={() => setShowPersonaGenModal(false)}
        onGenerate={() => handleGeneratePersonaWithAI(personaDescription)}
        description={personaDescription}
        setDescription={setPersonaDescription}
        isLoading={isGeneratingPersona}
      />

      <PersonaWizard
        open={showPersonaWizard}
        onClose={() => setShowPersonaWizard(false)}
        persona={persona}
        onSave={(newPersona) => {
            setPersona(newPersona);
            setShowPersonaWizard(false);
            toast.success('Persona salva com sucesso!');
        }}
        onGenerate={handleGeneratePersonaWithAI}
        isGeneratingPersona={isGeneratingPersona}
      />

      <MemorialDescritivoModal
        open={showMemorialModal}
        onClose={() => setShowMemorialModal(false)}
        campaignData={{ persona, autor, instrucoes, formato, colors, briefing }}
      />
    </>
  );
};

export default CampaignStandardsModal;
