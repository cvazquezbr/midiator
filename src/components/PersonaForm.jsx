import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
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
  TextField,
  Button,
  Tooltip,
  IconButton,
  Link as MuiLink,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  InfoOutlined as InfoOutlinedIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';

import TextEditor from './TextEditor';
import PersonaGenerationModal from './PersonaGenerationModal';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

// Constants for Persona fields
const POSICOES_CARGOS = ['Liderança Executiva: CEO, Diretor Executivo, Sócio', 'Gestão de Tecnologia: CTO, Head de Engenharia, Gerente de TI', 'Gestão de Marketing: Gerente de Marketing, Coordenador de Marketing', 'Gestão de Vendas: Gerente de Vendas, Diretor Comercial', 'Gestão de Recursos Humanos: Head de RH, Analista de RH', 'Outro(s)'];
const SEGMENTOS_EMPRESA = ['Tecnologia (Software, SaaS, Hardware)', 'Serviços Financeiros (Fintech)', 'E-commerce e Varejo', 'Saúde (Healthtech, Farmacêutica)', 'Manufatura', 'Consultoria e Serviços', 'Outro(s)'];
const RESPONSABILIDADES_CHAVE = ['Gerenciamento de Orçamento', 'Tomada de Decisão Estratégica', 'Gestão de Equipes', 'Inovação de Produtos', 'Garantir a Operação e Estabilidade', 'Compliance e Governança', 'Outro(s)'];
const DORES_DESAFIOS = {
    "doresEstrategicos": { "label": "Estratégicos", "items": [{"nome": "Dificuldade em Crescer", "descricao": "A persona se sente estagnada..."}, {"nome": "Posicionamento de Mercado Fraco", "descricao": "A persona não consegue se diferenciar..."}, {"nome": "Falta de Direção Clara", "descricao": "A persona não tem um plano de longo prazo..."}] },
    "doresOperacionais": { "label": "Operacionais", "items": [{"nome": "Processos Ineficientes", "descricao": "A rotina de trabalho é desorganizada..."}, {"nome": "Falta de Ferramentas Adequadas", "descricao": "A persona utiliza tecnologias desatualizadas..."}, {"nome": "Orçamento Limitado", "descricao": "A necessidade de maximizar resultados com poucos recursos..."}] },
    "doresPessoas": { "label": "Pessoas e Cultura", "items": [{"nome": "Clima Organizacional Tóxico", "descricao": "O ambiente de trabalho é negativo..."}, {"nome": "Dificuldade em Atrair e Reter Talentos", "descricao": "A persona tem problemas para encontrar profissionais..."}, {"nome": "Falta de Alinhamento e Engajamento", "descricao": "A equipe não está alinhada..."}] },
    "doresRegulatorios": { "label": "Regulatórios e Métricas", "items": [{"nome": "Falta de Conformidade Legal", "descricao": "A persona não está atualizada sobre as leis..."}, {"nome": "Análise de Dados Complexa", "descricao": "A persona coleta muitos dados mas não sabe interpretar..."}, {"nome": "Definição de KPIs Inadequados", "descricao": "Os indicadores de desempenho não refletem os objetivos..."}] }
};
const GATILHOS_BARREIRAS = {
    'gatilhosCompra': { label: 'Gatilhos de Compra', items: ['Problema técnico urgente', 'Pressão do board', 'Necessidade de redução de custos', 'Vantagem competitiva'] },
    'barreirasAdocao': { label: 'Barreiras de Adoção', items: ['Orçamento limitado', 'Resistência à mudança da equipe', 'Preocupação com segurança e compliance', 'Dificuldade de integração'] },
};

export const emptyPersonaData = {
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
};

const InfoTooltip = ({ title, url }) => (
    <Tooltip title={<Typography variant="body2" sx={{ p: 1 }}>{title} {url && <MuiLink href={url} target="_blank" rel="noopener noreferrer" sx={{ color: 'cyan', display: 'block', mt: 1 }}>Saiba mais</MuiLink>}</Typography>}>
        <IconButton>
            <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
        </IconButton>
    </Tooltip>
);

const PersonaForm = ({ persona, onChange, isSaving }) => {
    const [otherItemInputs, setOtherItemInputs] = useState({});
    const [editingChip, setEditingChip] = useState(null);
    const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
    const [showPersonaGenModal, setShowPersonaGenModal] = useState(false);
    const [personaDescription, setPersonaDescription] = useState('');

    const handleGeneratePersonaWithAI = async (description) => {
        if (!geminiAPI.isInitialized) {
          const apiKey = getGeminiApiKey();
          if (!apiKey) {
            toast.error('Chave de API do Gemini não configurada.');
            return;
          }
          geminiAPI.initialize(apiKey);
        }

        setIsGeneratingPersona(true);
        const prompt = `
    Descriver uma persona para uma campanha de marketing para ${description}.
    Preencha os campos do objeto JSON abaixo.
    Use exatamente os nomes de chave em camelCase fornecidos.
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
    Para o caso de não conseguir gerar conteúdo para algum cmapo, use um array vazio [] ou uma string vazia "".

    Retorne apenas um único objeto JSON com estas chaves, sem texto adicional, markdown, ou qualquer outra formatação.
        `;

        try {
          const response = await geminiAPI.generateContent(prompt);
          const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();

          if (!cleanedResponse) {
            toast.error('A IA retornou uma resposta vazia.');
            return;
          }

          const generatedPersona = JSON.parse(cleanedResponse);

          onChange({ ...persona, ...generatedPersona });
          toast.success('Persona gerada com sucesso! Revise os campos preenchidos.');
          setShowPersonaGenModal(false);

        } catch (error) {
          console.error("Erro ao gerar ou processar persona com IA:", error);
          toast.error('Ocorreu um erro ao processar a resposta da IA. Verifique o console do navegador para detalhes.');
        } finally {
          setIsGeneratingPersona(false);
        }
      };

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        onChange({ ...persona, [name]: value });
    };

    const handleMultiSelectChange = (event) => {
        const { name, value } = event.target;
        onChange({
            ...persona,
            [name]: typeof value === 'string' ? value.split(',') : value,
        });
    };

    const handleCheckboxChange = (category, field) => (event) => {
        const { checked } = event.target;
        const currentValues = persona[category] || [];
        let newValues;
        if (checked) {
            newValues = [...currentValues, field];
        } else {
            newValues = currentValues.filter(item => item !== field);
        }
        onChange({ ...persona, [category]: newValues });
    };

    const handleChipDelete = (fieldName, valueToDelete) => {
        const currentValues = persona[fieldName] || [];
        const newValues = currentValues.filter(item => item !== valueToDelete);
        onChange({ ...persona, [fieldName]: newValues });
    };

    const handleRichTextChange = (name, value) => {
        onChange({ ...persona, [name]: value });
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

        onChange({
            ...persona,
            [key]: [...(persona[key] || []), newItem]
        });
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

        const currentValues = persona[key] || [];
        const newValues = currentValues.map(item => (item === value ? trimmedNewValue : item));
        onChange({ ...persona, [key]: newValues });

        setEditingChip(null);
    };

    if (!persona) return null;

    return (
        <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Button
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => setShowPersonaGenModal(true)}
                    disabled={isGeneratingPersona || isSaving}
                >
                    {isGeneratingPersona ? 'Gerando...' : 'Gerar com IA'}
                </Button>
            </Stack>
            <Grid container spacing={3}>
                <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                        label="Nome da Persona"
                        name="nome"
                        value={persona?.nome || ''}
                        onChange={handleFieldChange}
                        fullWidth
                        required
                        variant="outlined"
                    />
                    <InfoTooltip title="É a identificação clara e concisa do perfil de cliente ideal." />
                </Grid>

                <Grid item xs={12} md={(persona?.posicaoCargo || []).includes('Outro(s)') ? 6 : 12}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Posição/Cargo</InputLabel>
                        <Select multiple name="posicaoCargo" value={persona?.posicaoCargo || []} onChange={handleMultiSelectChange}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => ( <Chip key={value} label={value} onDelete={() => handleChipDelete('posicaoCargo', value)} onMouseDown={(e) => e.stopPropagation()} /> ))}
                                </Box>
                            )}
                            label="Posição/Cargo">
                            {POSICOES_CARGOS.map((pos) => ( <MenuItem key={pos} value={pos}><Checkbox checked={(persona?.posicaoCargo || []).indexOf(pos) > -1} /> <ListItemText primary={pos} /> </MenuItem> ))}
                        </Select>
                    </FormControl>
                </Grid>
                {(persona?.posicaoCargo || []).includes('Outro(s)') && (
                    <Grid item xs={12} md={6}><TextField label="Especifique Outro Cargo" name="posicaoCargoOutro" value={persona?.posicaoCargoOutro || ''} onChange={handleFieldChange} fullWidth required /></Grid>
                )}

                <Grid item xs={12} md={(persona?.segmentoEmpresa || []).includes('Outro(s)') ? 6 : 12}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Segmento da Empresa</InputLabel>
                        <Select multiple name="segmentoEmpresa" value={persona?.segmentoEmpresa || []} onChange={handleMultiSelectChange}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => ( <Chip key={value} label={value} onDelete={() => handleChipDelete('segmentoEmpresa', value)} onMouseDown={(e) => e.stopPropagation()} /> ))}
                                </Box>
                            )}
                            label="Segmento da Empresa">
                            {SEGMENTOS_EMPRESA.map((seg) => ( <MenuItem key={seg} value={seg}><Checkbox checked={(persona?.segmentoEmpresa || []).indexOf(seg) > -1} /><ListItemText primary={seg} /></MenuItem> ))}
                        </Select>
                    </FormControl>
                </Grid>
                {(persona?.segmentoEmpresa || []).includes('Outro(s)') && (
                    <Grid item xs={12} md={6}><TextField label="Especifique Outro Segmento" name="segmentoEmpresaOutro" value={persona?.segmentoEmpresaOutro || ''} onChange={handleFieldChange} fullWidth required /></Grid>
                )}

                <Grid item xs={12} md={(persona?.responsabilidadesChave || []).includes('Outro(s)') ? 6 : 12}>
                     <FormControl fullWidth variant="outlined">
                        <InputLabel>Responsabilidades-Chave</InputLabel>
                        <Select multiple name="responsabilidadesChave" value={persona?.responsabilidadesChave || []} onChange={handleMultiSelectChange}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => ( <Chip key={value} label={value} onDelete={() => handleChipDelete('responsabilidadesChave', value)} onMouseDown={(e) => e.stopPropagation()} /> ))}
                                </Box>
                            )}
                            label="Responsabilidades-Chave">
                            {RESPONSABILIDADES_CHAVE.map((resp) => ( <MenuItem key={resp} value={resp}><Checkbox checked={(persona?.responsabilidadesChave || []).indexOf(resp) > -1} /><ListItemText primary={resp} /></MenuItem> ))}
                        </Select>
                    </FormControl>
                </Grid>
                {(persona?.responsabilidadesChave || []).includes('Outro(s)') && (
                    <Grid item xs={12} md={6}><TextField label="Especifique Outra Responsabilidade" name="responsabilidadesChaveOutro" value={persona?.responsabilidadesChaveOutro || ''} onChange={handleFieldChange} fullWidth required /></Grid>
                )}

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}><Typography variant="subtitle1">Dores e Desafios</Typography><InfoTooltip title="Descreve os problemas e obstáculos que a persona enfrenta." /></Box>
                    {Object.entries(DORES_DESAFIOS).map(([key, { label, items }]) => {
                        const customItems = (persona?.[key] || []).filter((pItem) => !items.some((i) => i.nome === pItem));
                        return (
                            <Accordion key={key}><AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary>
                                <AccordionDetails>
                                    <FormGroup>
                                        {items.map((item) => ( <Box key={item.nome} sx={{ display: 'flex', alignItems: 'center' }}><FormControlLabel control={<Checkbox checked={(persona?.[key] || []).includes(item.nome)} onChange={handleCheckboxChange(key, item.nome)} />} label={item.nome} /> <InfoTooltip title={item.descricao} /> </Box> ))}
                                    </FormGroup>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                                        {customItems.map((item) => ( editingChip && editingChip.key === key && editingChip.value === item ? ( <TextField key={item} value={editingChip.newValue} onChange={(e) => setEditingChip({ ...editingChip, newValue: e.target.value })} onBlur={handleUpdateChipValue} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateChipValue(); } if (e.key === 'Escape') { setEditingChip(null); } }} autoFocus size="small" /> ) : ( <Chip key={item} label={item} onClick={() => handleEditChip(key, item)} onDelete={() => handleChipDelete(key, item)} /> )))}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                                        <TextField label={`Adicionar Outra Dor (${label})`} value={otherItemInputs[key] || ''} onChange={(e) => handleOtherInputChange(key, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewItem(key); } }} fullWidth size="small" />
                                        <Button onClick={() => handleAddNewItem(key)} variant="outlined">Adicionar</Button>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </Grid>

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}><Typography variant="subtitle1">Gatilhos e Barreiras</Typography><InfoTooltip title="Fatores que levam à busca por uma solução e os obstáculos para a compra." /></Box>
                    {Object.entries(GATILHOS_BARREIRAS).map(([key, { label, items }]) => {
                        const customItems = (persona?.[key] || []).filter(pItem => !items.includes(pItem));
                        return (
                            <Accordion key={key}><AccordionSummary expandIcon={<ExpandMoreIcon />}>{label}</AccordionSummary>
                                <AccordionDetails>
                                    <FormGroup>{items.map((item) => ( <FormControlLabel key={item} control={<Checkbox checked={(persona?.[key] || []).includes(item)} onChange={handleCheckboxChange(key, item)} />} label={item} /> ))}</FormGroup>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                                        {customItems.map((item) => ( editingChip && editingChip.key === key && editingChip.value === item ? ( <TextField key={item} value={editingChip.newValue} onChange={(e) => setEditingChip({ ...editingChip, newValue: e.target.value })} onBlur={handleUpdateChipValue} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateChipValue(); } if (e.key === 'Escape') { setEditingChip(null); } }} autoFocus size="small" /> ) : ( <Chip key={item} label={item} onClick={() => handleEditChip(key, item)} onDelete={() => handleChipDelete(key, item)} /> )))}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                                        <TextField label={`Adicionar Outro(a) (${label})`} value={otherItemInputs[key] || ''} onChange={(e) => handleOtherInputChange(key, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewItem(key); } }} fullWidth size="small" />
                                        <Button onClick={() => handleAddNewItem(key)} variant="outlined">Adicionar</Button>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </Grid>

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}><Typography variant="subtitle1">Mentalidade e Valores</Typography><InfoTooltip title="A forma de pensar, valores e atitude da persona." /></Box>
                    <TextEditor value={persona?.mentalidadeValores || ''} onChange={(value) => handleRichTextChange('mentalidadeValores', value)} html={true} />
                </Grid>

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}><Typography variant="subtitle1">Contexto Cultural</Typography><InfoTooltip title="O ambiente de trabalho e a cultura organizacional da persona." /></Box>
                    <TextEditor value={persona?.contextoCultural || ''} onChange={(value) => handleRichTextChange('contextoCultural', value)} html={true} />
                </Grid>
            </Grid>

            <PersonaGenerationModal
                open={showPersonaGenModal}
                onClose={() => setShowPersonaGenModal(false)}
                onGenerate={handleGeneratePersonaWithAI}
                description={personaDescription}
                setDescription={setPersonaDescription}
                isLoading={isGeneratingPersona}
            />
        </Box>
    );
};

export default PersonaForm;
