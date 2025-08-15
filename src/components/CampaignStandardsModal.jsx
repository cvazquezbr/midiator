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
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import ColorThief from 'colorthief';

import TextEditorDialog from './TextEditorDialog';
import HtmlDisplayField from './HtmlDisplayField';
import PersonaGenerationModal from './PersonaGenerationModal';
import PersonaWizard, { PersonaWizardContent } from './PersonaWizard';
import AutorWizard from './AutorWizard';
import PaletteWizard from './PaletteWizard';
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

const CampaignStandardsModal = ({ open, onClose, onGeneratePalette, onShowMemorial }) => {
  const isMobile = useIsMobile();
  const [value, setValue] = useState(0);
  const [persona, setPersona] = useState({});
  const [otherItemInputs, setOtherItemInputs] = useState({});
  const [editingChip, setEditingChip] = useState(null); // { key, value, newValue }
  const [autor, setAutor] = useState({});
  const [instrucoes, setInstrucoes] = useState('');
  const [formato, setFormato] = useState('');
  const [colors, setColors] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const imageInputRef = useRef(null);

  // State for AI Palette Generation
  const [isGenerating, setIsGenerating] = useState(false);

  // State for AI Persona Generation
  const [personaDescription, setPersonaDescription] = useState('');
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [showPersonaGenModal, setShowPersonaGenModal] = useState(false);
  const [isPersonaWizardVisible, setIsPersonaWizardVisible] = useState(false);

  // State for AI Autor Generation
  const [isGeneratingAutor, setIsGeneratingAutor] = useState(false);
  const [showAutorWizard, setShowAutorWizard] = useState(false);

  // State for AI Palette Wizard
  const [showPaletteWizard, setShowPaletteWizard] = useState(false);

  const handleGeneratePersonaWithAI = async (description, callback) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      toast.error('Chave de API do Gemini não configurada.');
      return;
    }

    setIsGeneratingPersona(true);
    const prompt = `
A partir da seguinte descrição de persona, preencha os campos do objeto JSON abaixo. 
Use exatamente os nomes de chave em camelCase fornecidos. 
Se a informação para algum campo não estiver na descrição, use um array vazio [] ou uma string vazia "".

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

      if (callback) {
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

  const handleGenerateAutorWithAI = async (descricaoGeral, dominioReferencia, siteExclusao, callback) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      toast.error('Chave de API do Gemini não configurada.');
      return;
    }

    setIsGeneratingAutor(true);
    const prompt = `
Com base na descrição do autor, preencha os campos do objeto JSON abaixo.

**Descrição do Autor:**
${descricaoGeral}

**Instruções Adicionais:**
${dominioReferencia ? `- Use o site \`${dominioReferencia}\` como principal fonte de referência para entender o tom, a linguagem e a área de atuação.` : ''}
${siteExclusao ? `- NÃO use o site \`${siteExclusao}\` como referência.` : ''}
- As respostas devem ser concisas e diretas.

**Campos para preencher (use exatamente estes nomes de chave):**
- identidade: (string) O nome da empresa ou marca.
- descricao: (string em HTML) Uma breve descrição da empresa, detalhando sua área de atuação, especializações e foco.
- tipo: (string) Uma classificação da natureza da empresa (ex: "Braço de tecnologia", "Agência de marketing", "Consultoria").
- objetivoEstrategico: (string em HTML) A meta de longo prazo da mensagem (posicionamento da marca, construção de autoridade, etc.).
- objetivoEngajamento: (string em HTML) O tipo de interação que a mensagem deve estimular (gerar comentários, compartilhamentos, etc.).

Retorne apenas um único objeto JSON com estas chaves, sem texto adicional, markdown, ou qualquer outra formatação.
`;

    try {
      const response = await callGeminiApi(prompt, apiKey);
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();

      if (!cleanedResponse) {
        toast.error('A IA retornou uma resposta vazia.');
        return;
      }

      const generatedAutor = JSON.parse(cleanedResponse);

      if (callback) {
        callback(generatedAutor);
      }

    } catch (error) {
      console.error("Erro ao gerar ou processar autor com IA:", error);
      toast.error('Ocorreu um erro ao processar a resposta da IA. Verifique o console do navegador para detalhes.');
    } finally {
      setIsGeneratingAutor(false);
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

      // Se a persona não existir ou não tiver um nome, mostre o assistente por padrão
      if (!persona || !persona.nome) {
        setIsPersonaWizardVisible(true);
      } else {
        setIsPersonaWizardVisible(false);
        // Se a persona existe, verifica o autor.
        // A ausência de 'identidade' é um bom indicador de que o autor não foi preenchido.
        if (!autor || !autor.identidade) {
            // Muda para a aba "Autor" para dar contexto ao usuário
            setValue(1);
            // Mostra o assistente de criação do autor
            setShowAutorWizard(true);
        }
      }
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
    } else if (editingField.startsWith('autor.')) {
      const fieldName = editingField.split('.')[1];
      setAutor(prev => ({ ...prev, [fieldName]: newContent }));
    }
    else if (editingField === 'instrucoes') {
      setInstrucoes(newContent);
    } else if (editingField === 'formato') {
      setFormato(newContent);
    }
    setEditingField(null);
  };

  const getCurrentContent = () => {
    if (!editingField) return '';
    if (editingField === 'persona') return persona;
    if (editingField.startsWith('autor.')) {
      const fieldName = editingField.split('.')[1];
      return autor[fieldName] || '';
    }
    if (editingField === 'instrucoes') return instrucoes;
    if (editingField === 'formato') return formato;
    return '';
  };

  const getEditorTitle = () => {
    if (editingField === 'persona') return 'Editar Persona';
    if (editingField === 'autor.descricao') return 'Editar Descrição da Empresa';
    if (editingField === 'autor.tipo') return 'Editar Tipo de Organização';
    if (editingField === 'autor.objetivoEstrategico') return 'Editar Objetivo Estratégico';
    if (editingField === 'autor.objetivoEngajamento') return 'Editar Objetivo de Engajamento';
    if (editingField === 'instrucoes') return 'Editar Instruções';
    if (editingField === 'formato') return 'Editar Formato';
    return 'Editar';
  };

  const handleColorChange = (index, newColor) => {
    const newColors = [...colors];
    // When changing the color manually, we only update the hex and rgb value.
    // We keep the name and role if they exist.
    newColors[index] = {
      ...newColors[index],
      hex: newColor,
      rgb: `RGB(${parseInt(newColor.substr(1, 2), 16)}, ${parseInt(newColor.substr(3, 2), 16)}, ${parseInt(newColor.substr(5, 2), 16)})`
    };
    setColors(newColors);
  };

  const addColor = () => {
    if (colors.length < 5) {
      const newColor = {
        hex: '#000000',
        rgb: 'RGB(0, 0, 0)',
        name: 'Nova Cor',
        role: 'Manual',
        justification: 'Adicionada manualmente pelo usuário.'
      };
      setColors([...colors, newColor]);
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
          try {
            const colorThief = new ColorThief();
            const palette = colorThief.getPalette(img, 5); // Returns array of [R, G, B]
            const newColors = palette.map((rgb, index) => {
              const hex = `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
              return {
                hex: hex,
                rgb: `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                name: `Cor Extraída ${index + 1}`,
                role: 'Extraída de Imagem',
                justification: 'Cor extraída automaticamente da imagem de referência.'
              };
            });
            setColors(newColors);
            toast.success('Paleta de cores extraída da imagem com sucesso!');
          } catch (error) {
            console.error("Erro ao extrair paleta de cores da imagem:", error);
            toast.error('Não foi possível extrair as cores desta imagem. Tente uma imagem diferente.');
          }
        };
        img.onerror = () => {
          toast.error('Ocorreu um erro ao carregar a imagem.');
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

  const handleAutorChange = (event) => {
    const { name, value } = event.target;
    setAutor(prev => ({ ...prev, [name]: value }));
  };

  const handleOtherInputChange = (key, value) => {
    setOtherItemInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleAddNewItem = (key) => {
    const newItem = otherItemInputs[key]?.trim();
    if (!newItem) return;

    const existingItems = (persona[key] || []).map(item => item.toLowerCase());
    if (existingItems.includes(newItem.toLowerCase())) {
        toast.warning('Este item já foi adicionado.');
        return;
    }

    setPersona(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), newItem]
    }));
    handleOtherInputChange(key, ''); // Clear input
  };

  const handleEditChip = (key, value) => {
    setEditingChip({ key, value, newValue: value });
  };

  const handleUpdateChipValue = () => {
    if (!editingChip) return;
    const { key, value, newValue } = editingChip;
    const trimmedNewValue = newValue.trim();

    if (!trimmedNewValue) {
        toast.error("O valor não pode ser vazio.");
        setEditingChip(null);
        return;
    }

    if (value.toLowerCase() === trimmedNewValue.toLowerCase()) {
        setEditingChip(null); // No change
        return;
    }

    const existingItems = (persona[key] || []).map(item => item.toLowerCase());
    if (existingItems.includes(trimmedNewValue.toLowerCase())) {
        toast.warning('Este item já foi adicionado.');
        setEditingChip(null);
        return;
    }

    setPersona(prev => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.map(item => (item === value ? trimmedNewValue : item));
      return { ...prev, [key]: newValues };
    });

    setEditingChip(null);
  };

  const handleClearPersona = () => {
    if (window.confirm('Tem certeza que deseja limpar todos osados da persona? Esta ação não pode ser desfeita.')) {
      setPersona({});
      toast.success('Dados da persona foram limpos.');
    }
  };

  const handleClearAutor = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados do autor? Esta ação não pode ser desfeita.')) {
      setAutor({});
      toast.success('Dados do autor foram limpos.');
    }
  };


  // Constants for Persona fields
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
  }; const GATILHOS_BARREIRAS = {
    'gatilhosCompra': { label: 'Gatilhos de Compra', items: ['Problema técnico urgente', 'Pressão do board', 'Necessidade de redução de custos', 'Vantagem competitiva'] },
    'barreirasAdocao': { label: 'Barreiras de Adoção', items: ['Orçamento limitado', 'Resistência à mudança da equipe', 'Preocupação com segurança e compliance', 'Dificuldade de integração'] },
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
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            Padrões de Campanha
            <Button
              size="small"
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={onShowMemorial}
              sx={{ ml: 2 }}
            >
              Ver Memorial Descritivo
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
              {isPersonaWizardVisible ? (
                <PersonaWizardContent
                  persona={persona}
                  onGenerate={handleGeneratePersonaWithAI}
                  isGeneratingPersona={isGeneratingPersona}
                  onClose={() => setIsPersonaWizardVisible(false)}
                  onSave={(newPersona) => {
                    setPersona(newPersona);
                    setIsPersonaWizardVisible(false);
                    toast.success('Persona salva com o assistente!');
                  }}
                />
              ) : (
                <>
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
                      onClick={() => setIsPersonaWizardVisible(true)}
                    >
                      Editar com Assistente
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={handleClearPersona}
                      disabled={!persona || Object.keys(persona).length === 0}
                    >
                      Limpar Dados
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
                    <TextField label="Especifique Outro Cargo" name="posicaoCargoOutro" value={persona?.posicaoCargoOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined" />
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
                    <TextField label="Especifique Outro Segmento" name="segmentoEmpresaOutro" value={persona?.segmentoEmpresaOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined" />
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
                    <TextField label="Especifique Outra Responsabilidade" name="responsabilidadesChaveOutro" value={persona?.responsabilidadesChaveOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined" />
                  </Grid>
                )}

                {/* Dores e Desafios */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Dores e Desafios</Typography>
                    <InfoTooltip title="Esta seção descreve os problemas e obstáculos que a persona enfrenta. Compreender suas dores permite que você posicione sua solução como uma resposta direta a um problema real." url="https://www.google.com/search?q=https://blog.hotmart.com/pt-br/dor-do-cliente/" />
                  </Box>
                  {Object.entries(DORES_DESAFIOS).map(([key, { label, items }]) => {
                    const customItems = (persona?.[key] || []).filter(
                      (pItem) => !items.some((i) => i.nome === pItem)
                    );

                    return (
                      <Accordion key={key}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary>
                        <AccordionDetails>
                          <FormGroup>
                            {items.map((item) => (
                              <Box key={item.nome} sx={{ display: 'flex', alignItems: 'center' }}>
                                <FormControlLabel
                                  control={<Checkbox checked={(persona?.[key] || []).includes(item.nome)} onChange={handlePersonaCheckboxChange(key, item.nome)} />}
                                  label={item.nome}
                                />
                                <InfoTooltip title={item.descricao} />
                              </Box>
                            ))}
                          </FormGroup>

                          {/* Custom items as chips */}
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
                                  onDelete={() => handlePersonaChipDelete(key, item)}
                                />
                              )
                            ))}
                          </Box>

                          {/* Add new item input */}
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
                </Grid>

                {/* Gatilhos de Compra e Barreiras de Adoção */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Gatilhos de Compra e Barreira de Adoção</Typography>
                    <InfoTooltip title="Detalha os fatores que levam a persona a buscar uma solução (gatilhos) e os obstáculos que podem atrasar ou impedir a decisão de compra (barreiras)." />
                  </Box>
                  {Object.entries(GATILHOS_BARREIRAS).map(([key, { label, items }]) => {
                    const customItems = (persona?.[key] || []).filter(pItem => !items.includes(pItem));

                    return (
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

                                {/* Custom items as chips */}
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
                                            onDelete={() => handlePersonaChipDelete(key, item)}
                                          />
                                        )
                                    ))}
                                </Box>

                                {/* Add new item input */}
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
            </>
          )}
        </TabPanel>
            <TabPanel value={value} index={1}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setShowAutorWizard(true)}
                    >
                      Assistente de Criação de Autor
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={handleClearAutor}
                      disabled={!autor || Object.keys(autor).length === 0}
                    >
                      Limpar Dados
                    </Button>
                </Stack>

                <TextField
                  fullWidth
                  label="Nome"
                  name="identidade"
                  value={autor?.identidade || ''}
                  onChange={handleAutorChange}
                  inputProps={{ maxLength: 120 }}
                  helperText={`${(autor?.identidade || '').length}/120 O nome da empresa ou marca que está publicando o conteúdo. Ex: ACME Corporation.`}
                />
                <HtmlDisplayField
                  title="Descrição da Empresa"
                  tooltip="Uma breve descrição que detalha a área de atuação, as especializações e o foco do negócio."
                  htmlContent={autor?.descricao}
                  onClick={() => handleOpenEditor('autor.descricao')}
                  placeholder="Clique para editar a descrição..."
                />
                <HtmlDisplayField
                  title="Tipo de Organização"
                  tooltip="Uma classificação que define a natureza da empresa (ex: 'braço de tecnologia', 'agência de marketing')."
                  htmlContent={autor?.tipo}
                  onClick={() => handleOpenEditor('autor.tipo')}
                  placeholder="Clique para editar o tipo..."
                />
                <HtmlDisplayField
                  title="Objetivo Estratégico"
                  tooltip="A meta de longo prazo da mensagem (posicionamento da marca, construção de autoridade, etc.)."
                  htmlContent={autor?.objetivoEstrategico}
                  onClick={() => handleOpenEditor('autor.objetivoEstrategico')}
                  placeholder="Clique para editar o objetivo estratégico..."
                />
                <HtmlDisplayField
                  title="Objetivo de Engajamento"
                  tooltip="O tipo de interação que a mensagem deve estimular no público."
                  htmlContent={autor?.objetivoEngajamento}
                  onClick={() => handleOpenEditor('autor.objetivoEngajamento')}
                  placeholder="Clique para editar o objetivo de engajamento..."
                />
              </Stack>
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
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => setShowPaletteWizard(true)}
                  disabled={!onGeneratePalette}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Assistente de Geração de Paleta
                </Button>
              </Stack>

              <Divider />

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Cores da Campanha</Typography>
              <Typography variant="body2" gutterBottom>
                Defina até 5 cores de referência para a campanha. As cores podem ser geradas pelo assistente, extraídas de uma imagem ou adicionadas manualmente.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                {colors.map((color, index) => (
                  <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={color.hex}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      style={{ width: '50px', height: '50px', border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                    <Typography variant="caption">{color.name || color.hex}</Typography>
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

      <PersonaGenerationModal
        open={showPersonaGenModal}
        onClose={() => setShowPersonaGenModal(false)}
        onGenerate={() => handleGeneratePersonaWithAI(personaDescription)}
        description={personaDescription}
        setDescription={setPersonaDescription}
        isLoading={isGeneratingPersona}
      />

      <AutorWizard
        open={showAutorWizard}
        onClose={() => setShowAutorWizard(false)}
        autor={autor}
        onSave={(newAutor) => {
          setAutor(newAutor);
          setShowAutorWizard(false);
          toast.success('Autor salvo com sucesso!');
        }}
        onGenerate={handleGenerateAutorWithAI}
        isGeneratingAutor={isGeneratingAutor}
      />

      <PaletteWizard
        open={showPaletteWizard}
        onClose={() => setShowPaletteWizard(false)}
        onSave={(newPalette) => {
          setColors(newPalette);
          toast.success('Paleta de cores aplicada!');
        }}
        onGenerate={async (briefing, callback) => {
          setIsGenerating(true);
          try {
            const result = await onGeneratePalette(briefing);
            callback(result);
          } catch (error) {
            toast.error('Erro ao gerar paleta de cores. Tente novamente.');
            console.error("Error generating color palette:", error);
          } finally {
            setIsGenerating(false);
          }
        }}
        isGenerating={isGenerating}
      />

    </>
  );
};

export default CampaignStandardsModal;
