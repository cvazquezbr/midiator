import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Tooltip,
} from '@mui/material';
import { generateCommonProblems, generateCommonSolutions } from '../utils/generationHandlers';
import { useSettings } from '../context/SettingsContext';
import { useCampaign as useCampaignContext } from '../context/CampaignContext';
import PaletteWizard from './PaletteWizard';
import { uploadImageToDrive, getOrCreateBackgroundsFolderId } from '../utils/googleApi';
import {
    Campaign as CampaignIcon,
    ExpandMore as ExpandMoreIcon,
    Image as ImageIcon,
    InfoOutlined as InfoIcon,
    HelpOutline as HelpOutlineIcon,
    TipsAndUpdatesOutlined as TipsAndUpdatesIcon,
    FactCheckOutlined as FactCheckIcon,
    AutoAwesomeOutlined as GeminiIcon,
    Edit as EditIcon,
    Close as CloseIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Spellcheck as SpellcheckIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import RevisaoTextoModal from './RevisaoTextoModal/RevisaoTextoModal';
import AspectRatioSelector from './ui/AspectRatioSelector';

const problemaHint = (
    <Box sx={{ p: 2, maxWidth: 500 }}>
        <Typography variant="body1" gutterBottom>
            Aqui você descreve a situação real que sua campanha pretende resolver ou a necessidade do seu público que será atendida.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpOutlineIcon color="action" />
            <Typography variant="h6">Por que isso importa?</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ pl: 4, mt: 1 }}>
            Entender o problema central ajuda a criar campanhas direcionadas, eficazes e alinhadas aos objetivos do negócio.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TipsAndUpdatesIcon color="action" />
            <Typography variant="h6">Dicas para preencher</Typography>
        </Box>
        <Box sx={{ pl: 4, mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2"><strong>1️⃣ Seja específico:</strong></Typography>
            <Alert severity="error" icon={false}>Exemplo ruim: “Precisamos de mais vendas.”</Alert>
            <Alert severity="success" icon={false}>Exemplo bom: “Clientes não conhecem nosso novo plano de pagamento parcelado.”</Alert>

            <Typography variant="body2"><strong>2️⃣ Pense no público:</strong> Qual dor, desejo ou desafio seus clientes têm?</Typography>
            <Alert severity="info" icon={false}>Exemplo: “Pequenos empreendedores precisam de ferramentas simples para controlar estoque.”</Alert>

            <Typography variant="body2"><strong>3️⃣ Baseie-se em fatos:</strong> Use feedbacks de clientes, pesquisas ou dados de vendas para embasar sua resposta.</Typography>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FactCheckIcon color="action" />
            <Typography variant="h6">Exemplos Práticos</Typography>
        </Box>
        <Box component="ul" sx={{ pl: 6, mt: 1, '& li': { mb: 0.5 } }}>
            <Typography component="li" variant="body2">“Muitos abandonam o carrinho antes de finalizar a compra.”</Typography>
            <Typography component="li" variant="body2">“Nossos clientes não sabem que oferecemos frete grátis acima de R$ 100.”</Typography>
            <Typography component="li" variant="body2">“Empresas locais não encontram fornecedores rápidos para reposição de produtos.”</Typography>
        </Box>
    </Box>
);

const solucaoHint = (
    <Box sx={{ p: 2, maxWidth: 500 }}>
        <Typography variant="body1" gutterBottom>
            Aqui você descreve a ideia principal da campanha para resolver o problema ou atender à necessidade mencionada.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpOutlineIcon color="action" />
            <Typography variant="h6">Por que isso importa?</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ pl: 4, mt: 1 }}>
            Uma solução bem definida direciona toda a comunicação e ações da campanha, mostrando ao público como você ajudará concretamente.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TipsAndUpdatesIcon color="action" />
            <Typography variant="h6">Dicas para preencher</Typography>
        </Box>
        <Box sx={{ pl: 4, mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2"><strong>1️⃣ Seja direto e tangível:</strong></Typography>
            <Alert severity="error" icon={false}>Exemplo ruim: "Vamos melhorar a experiência do cliente."</Alert>
            <Alert severity="success" icon={false}>Exemplo bom: "Ofereceremos 30 dias de teste grátis do produto."</Alert>

            <Typography variant="body2"><strong>2️⃣ Destaque o benefício principal:</strong> Responda: "O que o público ganha com isso?"</Typography>
            <Alert severity="info" icon={false}>Exemplo: "Clientes economizarão 40% no primeiro pedido com cupom X."</Alert>

            <Typography variant="body2"><strong>3️⃣ Conecte ao problema:</strong> Garanta que a solução responda diretamente à necessidade identificada.</Typography>
            <Alert severity="info" icon={false}>
                Exemplo de alinhamento:<br/>
                <strong>Problema:</strong> "Empresas não conhecem nosso serviço de entrega expressa."<br/>
                <strong>Solução:</strong> "Criaremos um comparador online mostrando que somos 2x mais rápidos."
            </Alert>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FactCheckIcon color="action" />
            <Typography variant="h6">Exemplos Práticos</Typography>
        </Box>
        <Box component="ul" sx={{ pl: 6, mt: 1, '& li': { mb: 0.5 } }}>
            <Typography component="li" variant="body2">"Criaremos vídeos curtos mostrando como instalar o produto em 5 minutos."</Typography>
            <Typography component="li" variant="body2">"Lançaremos um desconto progressivo: quanto mais amigos indicarem, maior o desconto."</Typography>
            <Typography component="li" variant="body2">"Faremos lives diárias para tirar dúvidas técnicas em tempo real."</Typography>
        </Box>
    </Box>
);

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`campaign-tabpanel-${index}`}
      aria-labelledby={`campaign-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Campaign = ({
    steps,
    activeStep,
    problema,
    solucao,
    objetivo,
    tomDeVoz,
    followupPostsQuantity,
    aspectRatio,
    isGeneratingCampaign,
    campaignContent,
    campaignGenerationFailed,
    generationError,
    handleGenerateCampaignContent,
    handleResetCampaign,
    setEditingField,
    isGeneratingSummaryMedio,
    handleGenerateSummary,
    isGeneratingSummaryPequeno,
    isGeneratingConteudoFormatado,
    handleGenerateFormattedContent,
    followupPosts,
    isGeneratingFollowup,
    handleGenerateFollowupPosts,
    generatedPageUrl,
    isGeneratingImage,
    handleGenerateImage,
    onEditFollowup,
    setCampaignState,
    autorList,
    selectedAutorForCampaign,
    personaList,
    selectedPersonaForCampaign,
    palettes,
    onRequestNewAutor,
    onRequestNewPersona,
    paletteId,
    customPalette,
}) => {
    useSettings();
    const problemaRef = useRef(null);

    const [activeTab, setActiveTab] = useState(0);
    const [isRevisaoModalOpen, setRevisaoModalOpen] = useState(false);
    const [campoEmRevisao, setCampoEmRevisao] = useState({ nome: '', texto: '' });
    const [isHintModalOpen, setHintModalOpen] = React.useState(false);
    const [isSolucaoHintModalOpen, setSolucaoHintModalOpen] = React.useState(false);
    const [isSavingToDrive, setIsSavingToDrive] = React.useState(false);
    const [commonProblems, setCommonProblems] = React.useState([]);
    const [isLoadingProblems, setIsLoadingProblems] = React.useState(false);
    const [problemsError, setProblemsError] = React.useState(null);
    const [commonSolutions, setCommonSolutions] = React.useState([]);
    const [isLoadingSolutions, setIsLoadingSolutions] = React.useState(false);
    const [solutionsError, setSolutionsError] = React.useState(null);
    const [imageTabError, setImageTabError] = React.useState('');
    const [isPaletteWizardOpen, setPaletteWizardOpen] = useState(false);
    const [newHashtag, setNewHashtag] = useState('');

    const emptyLabelStyle = {
        '& .MuiInputLabel-root:not(.Mui-focused):not(.MuiFormLabel-filled)': {
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '1.4rem',
            transform: 'translate(24px, 47px) scale(1)',
        },
    };

    const prevCampaignContentRef = useRef();
    useEffect(() => {
        prevCampaignContentRef.current = campaignContent;
    });
    const prevCampaignContent = prevCampaignContentRef.current;

    useEffect(() => {
        if (problemaRef.current) {
            problemaRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (campaignContent && !prevCampaignContent && !isGeneratingCampaign) {
            setActiveTab(1);
        }
    }, [campaignContent, prevCampaignContent, isGeneratingCampaign]);

    const handleTabChange = (event, newValue) => {
      setActiveTab(newValue);
    };

    const fetchProblemsOnOpen = useCallback(async () => {
        if (commonProblems.length > 0) return;
        setIsLoadingProblems(true);
        setProblemsError(null);
        setCommonProblems([]);
        try {
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
            if (finalPersona === 'indisponível') {
                throw new Error("Por favor, selecione uma persona para obter sugestões.");
            }
            const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';
            const problems = await generateCommonProblems({ persona: finalPersona, autor: finalAutor });
            setCommonProblems(problems);
        } catch (error) {
            setProblemsError(error.message);
        } finally {
            setIsLoadingProblems(false);
        }
    }, [commonProblems.length, selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign]);

    const handleRegenerateProblems = useCallback(async () => {
        setIsLoadingProblems(true);
        setProblemsError(null);
        setCommonProblems([]);
        try {
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
            if (finalPersona === 'indisponível') {
                throw new Error("Por favor, selecione uma persona para obter sugestões.");
            }
            const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';
            const problems = await generateCommonProblems({ persona: finalPersona, autor: finalAutor });
            setCommonProblems(problems);
        } catch (error) {
            setProblemsError(error.message);
        } finally {
            setIsLoadingProblems(false);
        }
    }, [selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign]);

    useEffect(() => {
        if (isHintModalOpen) {
            fetchProblemsOnOpen();
        }
    }, [isHintModalOpen, fetchProblemsOnOpen]);

    const fetchSolutionsOnOpen = useCallback(async () => {
        if (commonSolutions.length > 0) return;
        setIsLoadingSolutions(true);
        setSolutionsError(null);
        setCommonSolutions([]);
        try {
            if (!problema.trim()) {
                throw new Error("Descreva o problema primeiro.");
            }
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
            const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';
            const solutions = await generateCommonSolutions({ problema, persona: finalPersona, autor: finalAutor });
            setCommonSolutions(solutions);
        } catch (error) {
            setSolutionsError(error.message);
        } finally {
            setIsLoadingSolutions(false);
        }
    }, [commonSolutions.length, problema, selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign]);

    const handleRegenerateSolutions = useCallback(async () => {
        setIsLoadingSolutions(true);
        setSolutionsError(null);
        setCommonSolutions([]);
        try {
            if (!problema.trim()) {
                throw new Error("Descreva o problema primeiro.");
            }
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
            const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';
            const solutions = await generateCommonSolutions({ problema, persona: finalPersona, autor: finalAutor });
            setCommonSolutions(solutions);
        } catch (error) {
            setSolutionsError(error.message);
        } finally {
            setIsLoadingSolutions(false);
        }
    }, [problema, selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign]);

    useEffect(() => {
        if (isSolucaoHintModalOpen) {
            fetchSolutionsOnOpen();
        }
    }, [isSolucaoHintModalOpen, fetchSolutionsOnOpen]);

    const handleSaveToDrive = async () => {
        setIsSavingToDrive(true);
        setImageTabError('');

        if (!generatedPageUrl) {
            setImageTabError("Nenhuma página gerada para salvar.");
            setIsSavingToDrive(false);
            return;
        }

        let folderId;
        try {
            folderId = await getOrCreateBackgroundsFolderId();
        } catch (error) {
            setImageTabError(error.message || "Ocorreu uma falha ao salvar na coleção.");
            console.error("Falha ao salvar na coleção:", error);
            setIsSavingToDrive(false);
            return;
        }
        try {
            if (!folderId) {
                throw new Error("Não foi possível obter a pasta de coleção do Google Drive.");
            }

            const response = await fetch(generatedPageUrl);
            if (!response.ok) {
                throw new Error('Não foi possível baixar a página gerada.');
            }
            const imageBlob = await response.blob();

            await uploadImageToDrive(imageBlob, folderId);
        } catch (error) {
            setImageTabError(error.message || "Ocorreu uma falha ao salvar na coleção.");
            console.error("Falha ao salvar na coleção:", error);
        } finally {
            setIsSavingToDrive(false);
        }
    };

    const handleAbrirRevisao = (nomeCampo, texto) => {
        setCampoEmRevisao({ nome: nomeCampo, texto });
        setRevisaoModalOpen(true);
    };

    const handleSalvarRevisao = (textoRevisado) => {
        setCampaignState(prev => ({ ...prev, [campoEmRevisao.nome]: textoRevisado }));
        setRevisaoModalOpen(false);
    };

    const handleAddHashtag = () => {
        const tagToAdd = newHashtag.trim();
        if (tagToAdd) {
            const currentHashtags = campaignContent.hashtags || [];
            setCampaignState(prev => ({
                ...prev,
                campaignContent: {
                    ...campaignContent,
                    hashtags: [...currentHashtags, tagToAdd],
                },
            }));
            setNewHashtag('');
        }
    };

    return (
        <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CampaignIcon />
                    {steps && activeStep && steps[activeStep] ? steps[activeStep].label : 'Campanha'}
                </Typography>

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="abas da campanha" variant="scrollable" scrollButtons="auto">
                        <Tab label="Problema e Solução" />
                        <Tab label="Conteúdo Principal" disabled={!campaignContent} />
                        <Tab label="Página" disabled={!campaignContent} />
                        <Tab label="Posts de Follow-Up" disabled={!campaignContent} />
                        <Tab label="Conteúdo WordPress" disabled={!campaignContent} />
                    </Tabs>
                </Box>

                <TabPanel value={activeTab} index={0}>
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <FormControl fullWidth variant="outlined" disabled={campaignContent !== null}>
                                    <InputLabel id="persona-select-label">Selecionar Persona</InputLabel>
                                    <Select
                                        labelId="persona-select-label"
                                        value={selectedPersonaForCampaign}
                                        onChange={(e) => setCampaignState(prev => ({ ...prev, selectedPersonaForCampaign: e.target.value }))}
                                        label="Selecionar Persona"
                                    >
                                        <MenuItem value="">
                                            <em>Não especificar</em>
                                        </MenuItem>
                                        {(personaList || []).map((p) => (
                                            <MenuItem key={p.id} value={p.id}>
                                                {p.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Tooltip title="Adicionar nova persona">
                                    <IconButton
                                        color="primary"
                                        onClick={onRequestNewPersona}
                                        disabled={campaignContent !== null}
                                    >
                                        <AddIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <TextField
                                    label="Problema ou Necessidade"
                                    multiline
                                    rows={4}
                                    value={problema}
                                    onChange={(e) => setCampaignState(prev => ({ ...prev, problema: e.target.value }))}
                                    variant="outlined"
                                    placeholder="Descreva o problema que sua campanha busca resolver."
                                    disabled={campaignContent !== null}
                                    sx={{
                                        flexGrow: 1,
                                        ...(problema.trim() === '' ? emptyLabelStyle : {})
                                    }}
                                    inputRef={problemaRef}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1 }}>
                                    <Tooltip title="Sugerir problemas com IA">
                                        <IconButton color="primary" onClick={() => setHintModalOpen(true)}>
                                            <GeminiIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Revisar texto com IA">
                                        <IconButton color="secondary" onClick={() => handleAbrirRevisao('problema', problema)}>
                                            <SpellcheckIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </Grid>

                        {problema.trim() !== '' && (
                            <>
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <FormControl fullWidth variant="outlined" disabled={campaignContent !== null}>
                                            <InputLabel id="autor-select-label">Selecionar Autor</InputLabel>
                                            <Select
                                                labelId="autor-select-label"
                                                value={selectedAutorForCampaign}
                                                onChange={(e) => setCampaignState(prev => ({ ...prev, selectedAutorForCampaign: e.target.value }))}
                                                label="Selecionar Autor"
                                            >
                                                <MenuItem value="">
                                                    <em>Não especificar</em>
                                                </MenuItem>
                                                {(autorList || []).map((p) => (
                                                    <MenuItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Tooltip title="Adicionar novo autor">
                                            <IconButton
                                                color="primary"
                                                onClick={onRequestNewAutor}
                                                disabled={campaignContent !== null}
                                            >
                                                <AddIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Grid>
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <TextField
                                            label="Solução ou Proposta"
                                            multiline
                                            rows={4}
                                            value={solucao}
                                            onChange={(e) => setCampaignState(prev => ({ ...prev, solucao: e.target.value }))}
                                            variant="outlined"
                                            placeholder="Descreva a solução que sua campanha oferece."
                                            disabled={campaignContent !== null}
                                            sx={{ flexGrow: 1 }}
                                        />
                                        <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1 }}>
                                            <Tooltip title="Sugerir soluções com IA">
                                                <IconButton color="primary" onClick={() => setSolucaoHintModalOpen(true)}>
                                                    <GeminiIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Revisar texto com IA">
                                                <IconButton color="secondary" onClick={() => handleAbrirRevisao('solucao', solucao)}>
                                                    <SpellcheckIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </Grid>
                            </>
                        )}
                        {solucao.trim() !== '' && (
                            <>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth variant="outlined" disabled={campaignContent !== null}>
                                        <InputLabel id="objetivo-select-label">Objetivo Principal do Post</InputLabel>
                                        <Select
                                            labelId="objetivo-select-label"
                                            value={objetivo}
                                            onChange={(e) => setCampaignState(prev => ({ ...prev, objetivo: e.target.value }))}
                                            label="Objetivo Principal do Post"
                                        >
                                            <MenuItem value="Gerar leads">Gerar leads</MenuItem>
                                            <MenuItem value="Construir autoridade">Construir autoridade</MenuItem>
                                            <MenuItem value="Educar o mercado">Educar o mercado</MenuItem>
                                            <MenuItem value="Iniciar uma conversa">Iniciar uma conversa</MenuItem>
                                            <MenuItem value="Promover um serviço/produto">Promover um serviço/produto</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth variant="outlined" disabled={campaignContent !== null}>
                                        <InputLabel id="tom-de-voz-select-label">Tom de Voz</InputLabel>
                                        <Select
                                            labelId="tom-de-voz-select-label"
                                            value={tomDeVoz}
                                            onChange={(e) => setCampaignState(prev => ({ ...prev, tomDeVoz: e.target.value }))}
                                            label="Tom de Voz"
                                        >
                                            <MenuItem value="Profissional e direto">Profissional e direto</MenuItem>
                                            <MenuItem value="Inspirador e motivacional">Inspirador e motivacional</MenuItem>
                                            <MenuItem value="Técnico e educativo">Técnico e educativo</MenuItem>
                                            <MenuItem value="Conversacional e amigável">Conversacional e amigável</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </>
                        )}
                    </Grid>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
                        {problema.trim() && solucao.trim() && (
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => handleGenerateCampaignContent(false)}
                                disabled={isGeneratingCampaign || campaignContent !== null}
                                startIcon={<GeminiIcon />}
                            >
                                {isGeneratingCampaign ? 'Gerando...' : 'Elaborar Postagens'}
                            </Button>
                        )}
                        {campaignContent && (
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={handleResetCampaign}
                            >
                                Resetar
                            </Button>
                        )}
                    </Box>
                    {campaignGenerationFailed && (
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Alert severity="error" sx={{ mb: 2 }}>
                                <strong>Ocorreu um erro ao gerar o conteúdo:</strong> {generationError}
                            </Alert>
                        </Box>
                    )}
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    {campaignContent && (
                        <Grid container spacing={2} sx={{ mt: 2 }}>
                             <Grid item xs={12}>
                                <TextField
                                    label="Título"
                                    value={campaignContent.titulo}
                                     onChange={(e) => setCampaignState(prev => ({ ...prev, campaignContent: { ...campaignContent, titulo: e.target.value }}))}
                                    variant="outlined"
                                    fullWidth
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    label="Conteúdo"
                                    multiline
                                    rows={4}
                                    value={campaignContent.conteudo}
                                    onClick={() => setEditingField('conteudo')}
                                    readOnly
                                    variant="outlined"
                                    fullWidth
                                    sx={{ cursor: 'pointer' }}
                                />
                                <Button onClick={() => handleGenerateCampaignContent(true)} disabled={isGeneratingCampaign} startIcon={<GeminiIcon />}>Gerar</Button>
                            </Grid>
                            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    label="Conteúdo Médio (máx. 1800 caracteres)"
                                    multiline
                                    rows={2}
                                    value={campaignContent.conteudoMedio || ''}
                                    onClick={() => setEditingField('conteudoMedio')}
                                    readOnly
                                    variant="outlined"
                                    fullWidth
                                    sx={{ cursor: 'pointer' }}
                                />
                                <Button onClick={() => handleGenerateSummary(1800)} disabled={isGeneratingSummaryMedio || !campaignContent} startIcon={<GeminiIcon />}>
                                    {isGeneratingSummaryMedio ? 'Gerando...' : 'Gerar'}
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Email de Notificação"
                                    value={campaignContent.notification_email || ''}
                                    onChange={(e) => setCampaignState(prev => ({
                                        ...prev,
                                        campaignContent: { ...campaignContent, notification_email: e.target.value }
                                    }))}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="email@exemplo.com (para receber o link da publicação)"
                                />
                            </Grid>
                            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    label="Conteúdo Pequeno (máx. 130 caracteres)"
                                    multiline
                                    rows={1}
                                    value={campaignContent.conteudoPequeno || ''}
                                    onClick={() => setEditingField('conteudoPequeno')}
                                    readOnly
                                    variant="outlined"
                                    fullWidth
                                    sx={{ cursor: 'pointer' }}
                                />
                                <Button onClick={() => handleGenerateSummary(130)} disabled={isGeneratingSummaryPequeno || !campaignContent} startIcon={<GeminiIcon />}>
                                    {isGeneratingSummaryPequeno ? 'Gerando...' : 'Gerar'}
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="CTA (Chamada para Ação)"
                                    multiline
                                    rows={2}
                                    value={campaignContent.cta}
                                    onClick={() => setEditingField('cta')}
                                    readOnly
                                    variant="outlined"
                                    fullWidth
                                    sx={{ cursor: 'pointer' }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>Hashtags</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {(campaignContent.hashtags || []).map((tag, index) => (
                                        <Chip
                                            key={index}
                                            label={tag}
                                            onDelete={() => {
                                                const newHashtags = [...campaignContent.hashtags];
                                                newHashtags.splice(index, 1);
                                                setCampaignState(prev => ({ ...prev, campaignContent: { ...campaignContent, hashtags: newHashtags }}));
                                            }}
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                        label="Nova Hashtag"
                                        size="small"
                                        value={newHashtag}
                                        onChange={(e) => setNewHashtag(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddHashtag();
                                            }
                                        }}
                                    />
                                    <Button onClick={handleAddHashtag}>Adicionar</Button>
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                    {campaignContent && (
                        <Box sx={{ mt: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth variant="outlined" disabled={!campaignContent}>
                                        <InputLabel id="palette-select-label">Paleta de Cores</InputLabel>
                                        <Select
                                            labelId="palette-select-label"
                                            value={paletteId || 'custom'}
                                            onChange={(e) => {
                                                const newPaletteId = e.target.value;
                                                const updates = { paletteId: newPaletteId };
                                                if (newPaletteId !== 'custom') {
                                                  updates.customPalette = null;
                                                }
                                                setCampaignState(prev => ({ ...prev, ...updates }));
                                            }}
                                            label="Paleta de Cores"
                                        >
                                            <MenuItem value="custom">Paleta Customizada da Campanha</MenuItem>
                                            <Divider />
                                            {(palettes || []).map((p) => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                        <Typography sx={{ flexGrow: 1 }}>{p.name}</Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                                                            {(p.colors || []).slice(0, 5).map((color, index) => (
                                                                <Tooltip title={color.name || color.hex} key={index}>
                                                                    <Box
                                                                        sx={{
                                                                            width: 16,
                                                                            height: 16,
                                                                            backgroundColor: color.hex,
                                                                            borderRadius: '50%',
                                                                            border: '1px solid rgba(0,0,0,0.2)',
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Button
                                        onClick={() => {
                                            setCampaignState(prev => ({ ...prev, paletteId: 'custom' }));
                                            setPaletteWizardOpen(true);
                                        }}
                                        variant="contained"
                                    >
                                        {customPalette ? 'Editar Paleta Customizada' : 'Criar Paleta Customizada'}
                                    </Button>
                                </Grid>

                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2, flexWrap: 'wrap' }}>
                                        {(() => {
                                            const selectedPalette = paletteId === 'custom'
                                                ? customPalette
                                                : (palettes || []).find(p => p.id === paletteId);

                                            const colors = selectedPalette?.colors || [];

                                            if (colors.length === 0) {
                                                return (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Nenhuma paleta selecionada ou a paleta selecionada não possui cores.
                                                    </Typography>
                                                );
                                            }

                                            return colors.map((color, index) => (
                                                <Tooltip title={color.name || color.hex} key={index}>
                                                    <Box
                                                        sx={{
                                                            width: 30,
                                                            height: 30,
                                                            borderRadius: '50%',
                                                            backgroundColor: color.hex,
                                                            border: '1px solid #ddd',
                                                        }}
                                                    />
                                                </Tooltip>
                                            ));
                                        })()}
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <AspectRatioSelector
                                        value={aspectRatio}
                                        onChange={(e) => setCampaignState(prev => ({ ...prev, aspectRatio: e.target.value }))}
                                    />
                                </Grid>
                            {imageTabError && <Grid item xs={12}><Alert severity="error">{imageTabError}</Alert></Grid>}
                            {generatedPageUrl && !isGeneratingImage && (
                                <Box sx={{ maxWidth: '600px', margin: 'auto' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
                                        <Typography variant="h6" gutterBottom>Página Gerada</Typography>
                                        <Box>
                                            <Button onClick={handleSaveToDrive} disabled={isSavingToDrive || isGeneratingImage} startIcon={<SaveIcon />}>
                                                {isSavingToDrive ? 'Salvando...' : 'Salvar na Coleção'}
                                            </Button>
                                            <Button onClick={() => {
                                                const selectedPalette = paletteId === 'custom'
                                                    ? customPalette
                                                    : palettes.find(p => p.id === paletteId);
                                                handleGenerateImage(campaignContent, selectedPalette);
                                            }} disabled={isGeneratingImage || isSavingToDrive} startIcon={<GeminiIcon />} sx={{ ml: 1 }}>
                                                {isGeneratingImage ? 'Gerando...' : 'Regerar Página'}
                                            </Button>
                                        </Box>
                                    </Box>
                                    <img src={generatedPageUrl} alt="Página gerada pela IA" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', marginTop: 2 }} />
                                </Box>
                            )}
                            {isGeneratingImage && (
                                <Box sx={{ textAlign: 'center', mt: 2 }}>
                                    <CircularProgress />
                                    <Typography variant="h6" gutterBottom>Gerando Página...</Typography>
                                </Box>
                            )}
                            {!generatedPageUrl && !isGeneratingImage && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => {
                                            const selectedPalette = paletteId === 'custom'
                                                ? customPalette
                                                : palettes.find(p => p.id === paletteId);
                                            handleGenerateImage(campaignContent, selectedPalette);
                                        }}
                                        startIcon={<ImageIcon />}
                                        disabled={isGeneratingImage}
                                    >
                                        Gerar Página
                                    </Button>
                                </Box>
                            )}
                             {campaignGenerationFailed && (
                                <Box sx={{ mt: 3, textAlign: 'center' }}>
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        <strong>Falha na geração de página:</strong> {generationError}
                                    </Alert>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        size="large"
                                        onClick={() => {
                                            const selectedPalette = paletteId === 'custom'
                                                ? customPalette
                                                : palettes.find(p => p.id === paletteId);
                                            handleGenerateImage(campaignContent, selectedPalette);
                                        }}
                                        disabled={isGeneratingImage}
                                        startIcon={<ImageIcon />}
                                    >
                                        {isGeneratingImage ? 'Gerando Página...' : 'Tentar Gerar Apenas a Página'}
                                    </Button>
                                </Box>
                            )}
                            </Grid>
                        </Box>
                    )}
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                    {campaignContent && (
                         <Grid container spacing={2} sx={{ mt: 2 }}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Quantidade de Posts de Follow-up"
                                    type="number"
                                    value={followupPostsQuantity || ''}
                                     onChange={(e) => setCampaignState(prev => ({ ...prev, followupPostsQuantity: parseInt(e.target.value, 10) }))}
                                    fullWidth
                                    variant="outlined"
                                    InputProps={{ inputProps: { min: 1, max: 10 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button onClick={() => handleGenerateFollowupPosts()} disabled={isGeneratingFollowup} startIcon={<GeminiIcon />}>
                                    {isGeneratingFollowup ? 'Gerando...' : 'Gerar Posts de Follow-up'}
                                </Button>
                            </Grid>
                        </Grid>
                    )}
                    {isGeneratingFollowup && (
                        <Box sx={{ mt: 4, textAlign: 'center' }}>
                            <CircularProgress />
                            <Typography variant="h6" gutterBottom>Gerando Posts de Follow-up...</Typography>
                        </Box>
                    )}
                    {followupPosts.length > 0 && !isGeneratingFollowup && (
                        <Box sx={{ mt: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" gutterBottom>Posts de Follow-up Gerados</Typography>
                                <Button onClick={() => handleGenerateFollowupPosts()} disabled={isGeneratingFollowup} startIcon={<GeminiIcon />}>
                                    {isGeneratingFollowup ? 'Gerando...' : 'Regerar Posts'}
                                </Button>
                            </Box>
                            {(followupPosts || []).filter(Boolean).map((post, index) => (
                                <Accordion key={index}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <Typography sx={{ flexGrow: 1, mr: 2 }}>{post.titulo || `Post ${post.post_numero}`}</Typography>
                                            <Chip label={post.etapa_aida || 'AIDA'} size="small" color="primary" variant="outlined" />
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ cursor: 'pointer' }} onClick={() => onEditFollowup(index, post.conteudo)}>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                                            {post.conteudo}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                            <strong>CTA:</strong> {post.cta}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                            <Chip icon={<InfoIcon />} label={post.tipo_gancho || 'Gancho'} size="small" variant="outlined" />
                                            {(post.hashtags_sugeridas || []).map((tag, i) => (
                                                <Chip key={i} label={`#${tag}`} size="small" />
                                            ))}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}
                </TabPanel>

                <TabPanel value={activeTab} index={4}>
                    {campaignContent && (
                        <Grid container spacing={2} sx={{ mt: 2 }}>
                             <Grid item xs={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h6" gutterBottom component="div" sx={{ mb: 0 }}>
                                        Pré-visualização
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            onClick={() => setEditingField('conteudoFormatado')}
                                            startIcon={<EditIcon />}
                                            variant="outlined"
                                            size="small"
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            onClick={() => handleGenerateFormattedContent()}
                                            disabled={isGeneratingConteudoFormatado || !campaignContent}
                                            startIcon={<GeminiIcon />}
                                            variant="outlined"
                                            size="small"
                                        >
                                            {isGeneratingConteudoFormatado ? 'Gerando...' : 'Gerar'}
                                        </Button>
                                    </Box>
                                </Box>
                                <Box border={1} borderColor="grey.300" p={2} borderRadius={1} sx={{ minHeight: 300, '& *': { all: 'revert' } }}>
                                    <div dangerouslySetInnerHTML={{ __html: campaignContent.conteudoFormatado || '' }} />
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </TabPanel>


                <Dialog open={isHintModalOpen} onClose={() => setHintModalOpen(false)} fullWidth maxWidth="lg">
                    <DialogTitle>
                        Como Descrever o Problema ou Necessidade
                        <IconButton
                            aria-label="close"
                            onClick={() => setHintModalOpen(false)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={4} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>Sugestões com IA</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                    Use as sugestões abaixo como ponto de partida ou para refinar sua ideia. Clique em uma para usá-la.
                                </Typography>

                                <Button
                                    variant="contained"
                                    startIcon={<GeminiIcon />}
                                    onClick={handleRegenerateProblems}
                                    disabled={isLoadingProblems}
                                    sx={{ mb: 2 }}
                                >
                                    Sugerir Problemas
                                </Button>

                                {isLoadingProblems && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                                        <CircularProgress />
                                    </Box>
                                )}
                                {problemsError && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {problemsError}
                                    </Alert>
                                )}
                                {commonProblems.length > 0 && (
                                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {commonProblems.map((problem, index) => (
                                            <Alert
                                                key={index}
                                                severity="info"
                                                onClick={() => {
                                                    setCampaignState(prev => ({ ...prev, problema: problem.replace(/\*\*(.*?)\*\*\\n/g, '$1\n') }));
                                                    setHintModalOpen(false);
                                                }}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    },
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            >
                                                {problem.replace(/\*\*/g, '')}
                                            </Alert>
                                        ))}
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {problemaHint}
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setHintModalOpen(false)}>Fechar</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={isSolucaoHintModalOpen} onClose={() => setSolucaoHintModalOpen(false)} fullWidth maxWidth="lg">
                    <DialogTitle>
                        Como Descrever a Solução ou Proposta
                        <IconButton
                            aria-label="close"
                            onClick={() => setSolucaoHintModalOpen(false)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={4} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>Sugestões com IA</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                    Use as sugestões abaixo como ponto de partida ou para refinar sua ideia. Clique em uma para usá-la.
                                </Typography>

                                <Button
                                    variant="contained"
                                    startIcon={<GeminiIcon />}
                                    onClick={handleRegenerateSolutions}
                                    disabled={isLoadingSolutions || !problema.trim()}
                                    sx={{ mb: 2 }}
                                >
                                    Sugerir Soluções
                                </Button>

                                {isLoadingSolutions && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                                        <CircularProgress />
                                    </Box>
                                )}
                                {solutionsError && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {solutionsError}
                                    </Alert>
                                )}
                                {commonSolutions.length > 0 && (
                                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {commonSolutions.map((solution, index) => (
                                            <Alert
                                                key={index}
                                                severity="info"
                                                onClick={() => {
                                                    setCampaignState(prev => ({ ...prev, solucao: solution.replace(/\*\*(.*?)\*\*\\n/g, '$1\n') }));
                                                    setSolucaoHintModalOpen(false);
                                                }}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    },
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            >
                                                {solution.replace(/\*\*/g, '')}
                                            </Alert>
                                        ))}
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {solucaoHint}
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSolucaoHintModalOpen(false)}>Fechar</Button>
                    </DialogActions>
                </Dialog>
                {isPaletteWizardOpen && (
                    <PaletteWizard
                        open={isPaletteWizardOpen}
                        onClose={() => setPaletteWizardOpen(false)}
                        onSave={(paletteData) => {
                            setCampaignState(prev => ({ ...prev, customPalette: paletteData }));
                            setPaletteWizardOpen(false);
                        }}
                        paletteData={customPalette || { name: 'Paleta da Campanha', colors: [], harmony: '', harmony_justification: '' }}
                        onPaletteDataChange={(newData) => setCampaignState(prev => ({ ...prev, customPalette: newData }))}
                        initialStep={0} // Always start from the beginning for the campaign's custom palette
                    />
                )}
                <RevisaoTextoModal
                    open={isRevisaoModalOpen}
                    onFechar={() => setRevisaoModalOpen(false)}
                    onSalvar={handleSalvarRevisao}
                    textoOriginal={campoEmRevisao.texto}
                />
            </CardContent>
        </Card>
    );
};

export default Campaign;
