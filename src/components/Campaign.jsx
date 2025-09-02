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
} from '@mui/material';
import { generateCommonProblems, generateCommonSolutions } from '../utils/generationHandlers';
import { getCampaignPrompt } from '../utils/campaignPrompt';
import { useSettings } from '../context/SettingsContext';
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
} from '@mui/icons-material';

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
    setProblema,
    solucao,
    setSolucao,
    objetivo,
    setObjetivo,
    tomDeVoz,
    setTomDeVoz,
    followupPostsQuantity,
    setFollowupPostsQuantity,
    aspectRatio,
    setAspectRatio,
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
    generatedImageUrl,
    isGeneratingImage,
    handleGenerateImage,
    setCampaignContent,
    onEditFollowup,
    autor,
    autorList,
    selectedAutorForCampaign,
    setSelectedAutorForCampaign,
    persona,
    personaList,
    selectedPersonaForCampaign,
    setSelectedPersonaForCampaign,
}) => {
    useSettings();
    const [activeTab, setActiveTab] = useState(0);
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

    const emptyLabelStyle = {
        '& .MuiInputLabel-root:not(.Mui-focused):not(.MuiFormLabel-filled)': {
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '1.4rem',
            // Aproxima o posicionamento ao centro para um campo de 4 linhas, com maior recuo e tamanho
            transform: 'translate(24px, 47px) scale(1)',
        },
    };

    const prevCampaignContentRef = useRef();
    useEffect(() => {
        prevCampaignContentRef.current = campaignContent;
    });
    const prevCampaignContent = prevCampaignContentRef.current;

    useEffect(() => {
        // Only switch to tab 1 if campaignContent just became available (was null or undefined before)
        // and the campaign is not currently being generated.
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
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || persona;
            if (!finalPersona || Object.keys(finalPersona).length === 0) {
                throw new Error("Por favor, selecione uma persona para obter sugestões.");
            }
            const problems = await generateCommonProblems({ persona: finalPersona, autor });
            setCommonProblems(problems);
        } catch (error) {
            setProblemsError(error.message);
        } finally {
            setIsLoadingProblems(false);
        }
    }, [commonProblems.length, persona, autor, selectedPersonaForCampaign, personaList]);

    const handleRegenerateProblems = useCallback(async () => {
        setIsLoadingProblems(true);
        setProblemsError(null);
        setCommonProblems([]);
        try {
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || persona;
            if (!finalPersona || Object.keys(finalPersona).length === 0) {
                throw new Error("Por favor, selecione uma persona para obter sugestões.");
            }
            const problems = await generateCommonProblems({ persona: finalPersona, autor });
            setCommonProblems(problems);
        } catch (error) {
            setProblemsError(error.message);
        } finally {
            setIsLoadingProblems(false);
        }
    }, [persona, autor, selectedPersonaForCampaign, personaList]);

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
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || persona;
            const solutions = await generateCommonSolutions({ problema, persona: finalPersona, autor });
            setCommonSolutions(solutions);
        } catch (error) {
            setSolutionsError(error.message);
        } finally {
            setIsLoadingSolutions(false);
        }
    }, [commonSolutions.length, problema, persona, autor, selectedPersonaForCampaign, personaList]);

    const handleRegenerateSolutions = useCallback(async () => {
        setIsLoadingSolutions(true);
        setSolutionsError(null);
        setCommonSolutions([]);
        try {
            if (!problema.trim()) {
                throw new Error("Descreva o problema primeiro.");
            }
            const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || persona;
            const solutions = await generateCommonSolutions({ problema, persona: finalPersona, autor });
            setCommonSolutions(solutions);
        } catch (error) {
            setSolutionsError(error.message);
        } finally {
            setIsLoadingSolutions(false);
        }
    }, [problema, persona, autor, selectedPersonaForCampaign, personaList]);

    useEffect(() => {
        if (isSolucaoHintModalOpen) {
            fetchSolutionsOnOpen();
        }
    }, [isSolucaoHintModalOpen, fetchSolutionsOnOpen]);

    const handleSaveToDrive = async () => {
        setIsSavingToDrive(true);
        setImageTabError('');

        if (!generatedImageUrl) {
            setImageTabError("Nenhuma imagem gerada para salvar.");
            setIsSavingToDrive(false);
            return;
        }

        try {
            const folderId = await getOrCreateBackgroundsFolderId();
            if (!folderId) {
                // The utility function should throw, but as a safeguard:
                throw new Error("Não foi possível obter a pasta de coleção do Google Drive.");
            }

            const response = await fetch(generatedImageUrl);
            if (!response.ok) {
                throw new Error('Não foi possível baixar a imagem gerada.');
            }
            const imageBlob = await response.blob();

            await uploadImageToDrive(imageBlob, folderId);
            // Success toast is handled inside uploadImageToDrive
        } catch (error) {
            // Error toast is also handled inside the utility functions
            setImageTabError(error.message || "Ocorreu uma falha ao salvar na coleção.");
            console.error("Falha ao salvar na coleção:", error);
        } finally {
            setIsSavingToDrive(false);
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
                        <Tab label="Imagem" disabled={!campaignContent} />
                        <Tab label="Posts de Follow-Up" disabled={!campaignContent} />
                        <Tab label="Conteúdo WordPress" disabled={!campaignContent} />
                    </Tabs>
                </Box>

                {/* Painel 0: Problema e Solução */}
                <TabPanel value={activeTab} index={0}>
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                                <InputLabel id="persona-select-label">Selecionar Persona</InputLabel>
                                <Select
                                    labelId="persona-select-label"
                                    value={selectedPersonaForCampaign}
                                    onChange={(e) => setSelectedPersonaForCampaign(e.target.value)}
                                    label="Selecionar Persona"
                                >
                                    <MenuItem value="">
                                        <em>Nenhuma (Usará Padrões)</em>
                                    </MenuItem>
                                    {personaList.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <TextField
                                    label="Problema ou Necessidade"
                                    multiline
                                    rows={4}
                                    value={problema}
                                    onChange={(e) => setProblema(e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="Descreva o problema que sua campanha busca resolver."
                                    disabled={campaignContent !== null}
                                    sx={problema.trim() === '' ? emptyLabelStyle : {}}
                                />
                                <IconButton color="primary" sx={{ mt: 1 }} onClick={() => setHintModalOpen(true)}>
                                    <GeminiIcon />
                                </IconButton>
                            </Box>
                        </Grid>

                        {problema.trim() !== '' && (
                            <>
                                <Grid item xs={12}>
                                    <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                                        <InputLabel id="autor-select-label">Selecionar Autor</InputLabel>
                                        <Select
                                            labelId="autor-select-label"
                                            value={selectedAutorForCampaign}
                                            onChange={(e) => setSelectedAutorForCampaign(e.target.value)}
                                            label="Selecionar Autor"
                                        >
                                            <MenuItem value="">
                                                <em>Nenhum (Usará Padrões)</em>
                                            </MenuItem>
                                            {autorList.map((p) => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <TextField
                                            label="Solução ou Proposta"
                                            multiline
                                            rows={4}
                                            value={solucao}
                                            onChange={(e) => setSolucao(e.target.value)}
                                            variant="outlined"
                                            fullWidth
                                            placeholder="Descreva a solução que sua campanha oferece."
                                            disabled={campaignContent !== null}
                                        />
                                        <IconButton color="primary" sx={{ mt: 1 }} onClick={() => setSolucaoHintModalOpen(true)}>
                                            <GeminiIcon />
                                        </IconButton>
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
                                            onChange={(e) => setObjetivo(e.target.value)}
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
                                            onChange={(e) => setTomDeVoz(e.target.value)}
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

                {/* Painel 1: Conteúdo Principal */}
                <TabPanel value={activeTab} index={1}>
                    {campaignContent && (
                        <Grid container spacing={2} sx={{ mt: 2 }}>
                             <Grid item xs={12}>
                                <TextField
                                    label="Título"
                                    value={campaignContent.titulo}
                                    onChange={(e) => setCampaignContent({ ...campaignContent, titulo: e.target.value })}
                                    variant="outlined"
                                    fullWidth
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
                                    {campaignContent.hashtags.map((tag, index) => (
                                        <Chip
                                            key={index}
                                            label={tag}
                                            onDelete={() => {
                                                const newHashtags = [...campaignContent.hashtags];
                                                newHashtags.splice(index, 1);
                                                setCampaignContent({ ...campaignContent, hashtags: newHashtags });
                                            }}
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                        label="Nova Hashtag"
                                        size="small"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim() !== '') {
                                                e.preventDefault();
                                                setCampaignContent({ ...campaignContent, hashtags: [...campaignContent.hashtags, e.target.value.trim()] });
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <Button onClick={() => {
                                        const newTag = document.querySelector('input[label="Nova Hashtag"]').value.trim();
                                        if (newTag) {
                                            setCampaignContent({ ...campaignContent, hashtags: [...campaignContent.hashtags, newTag] });
                                            document.querySelector('input[label="Nova Hashtag"]').value = '';
                                        }
                                    }}>Adicionar</Button>
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </TabPanel>

                {/* Painel 2: Imagem */}
                <TabPanel value={activeTab} index={2}>
                    {campaignContent && (
                        <Box sx={{ mt: 2 }}>
                             <Grid item xs={12} md={6}>
                                <FormControl fullWidth variant="outlined" disabled={!campaignContent}>
                                    <InputLabel id="aspect-ratio-label">Razão de Aspecto</InputLabel>
                                    <Select
                                        labelId="aspect-ratio-label"
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value)}
                                        label="Razão de Aspecto"
                                    >
                                        <MenuItem value="1:1">Quadrado (1:1)</MenuItem>
                                        <MenuItem value="4:5">Retrato (4:5)</MenuItem>
                                        <MenuItem value="16:9">Paisagem (16:9)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            {imageTabError && <Grid item xs={12}><Alert severity="error">{imageTabError}</Alert></Grid>}
                            {generatedImageUrl && !isGeneratingImage && (
                                <Box sx={{ maxWidth: '600px', margin: 'auto' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
                                        <Typography variant="h6" gutterBottom>Imagem Gerada</Typography>
                                        <Box>
                                            <Button onClick={handleSaveToDrive} disabled={isSavingToDrive || isGeneratingImage} startIcon={<SaveIcon />}>
                                                {isSavingToDrive ? 'Salvando...' : 'Salvar na Coleção'}
                                            </Button>
                                            <Button onClick={() => handleGenerateImage(campaignContent)} disabled={isGeneratingImage || isSavingToDrive} startIcon={<GeminiIcon />} sx={{ ml: 1 }}>
                                                {isGeneratingImage ? 'Gerando...' : 'Regerar Imagem'}
                                            </Button>
                                        </Box>
                                    </Box>
                                    <img src={generatedImageUrl} alt="Imagem gerada pela IA" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', marginTop: 2 }} />
                                </Box>
                            )}
                            {isGeneratingImage && (
                                <Box sx={{ textAlign: 'center', mt: 2 }}>
                                    <CircularProgress />
                                    <Typography variant="h6" gutterBottom>Gerando Imagem...</Typography>
                                </Box>
                            )}
                            {!generatedImageUrl && !isGeneratingImage && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => handleGenerateImage(campaignContent)}
                                        startIcon={<ImageIcon />}
                                        disabled={isGeneratingImage}
                                    >
                                        Gerar Imagem
                                    </Button>
                                </Box>
                            )}
                             {campaignGenerationFailed && (
                                <Box sx={{ mt: 3, textAlign: 'center' }}>
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        <strong>Falha na geração de imagem:</strong> {generationError}
                                    </Alert>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        size="large"
                                        onClick={() => handleGenerateImage(campaignContent)}
                                        disabled={isGeneratingImage}
                                        startIcon={<ImageIcon />}
                                    >
                                        {isGeneratingImage ? 'Gerando Imagem...' : 'Tentar Gerar Apenas a Imagem'}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </TabPanel>

                {/* Painel 3: Posts de Follow-Up */}
                <TabPanel value={activeTab} index={3}>
                    {campaignContent && (
                         <Grid container spacing={2} sx={{ mt: 2 }}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Quantidade de Posts de Follow-up"
                                    type="number"
                                    value={followupPostsQuantity || ''}
                                    onChange={(e) => setFollowupPostsQuantity(parseInt(e.target.value, 10))}
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
                            {followupPosts.map((post, index) => (
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
                                            {post.hashtags_sugeridas.map((tag, i) => (
                                                <Chip key={i} label={`#${tag}`} size="small" />
                                            ))}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}
                </TabPanel>

                {/* Painel 4: Conteúdo WordPress */}
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


                <Dialog open={isHintModalOpen} onClose={() => setHintModalOpen(false)} maxWidth="lg" fullWidth>
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
                                                    setProblema(problem.replace(/\*\*(.*?)\*\*\\n/g, '$1\n')); // Remove markdown bold for the text field
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

                <Dialog open={isSolucaoHintModalOpen} onClose={() => setSolucaoHintModalOpen(false)} maxWidth="lg" fullWidth>
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
                                                    setSolucao(solution.replace(/\*\*(.*?)\*\*\\n/g, '$1\n')); // Remove markdown bold
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
            </CardContent>
        </Card>
    );
};

export default Campaign;
