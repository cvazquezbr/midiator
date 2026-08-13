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
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { generateCommonProblems, generateCommonSolutions } from '../utils/generationHandlers';
import { useSettings } from '../context/SettingsContext';
import PaletteWizard from './PaletteWizard';
import { uploadImageToDrive, getOrCreateBackgroundsFolderId } from '../utils/googleApi';
import { toast } from 'sonner';
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
    Delete as DeleteIcon,
    Code as CodeIcon,
} from '@mui/icons-material';
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
    const { settings } = useSettings();
    const problemaRef = useRef(null);

    const [activeTab, setActiveTab] = useState(0);

    // Manual / Edit Follow-up Modal State
    const [followupFormOpen, setFollowupFormOpen] = useState(false);
    const [editingFollowupIndex, setEditingFollowupIndex] = useState(null); // null means adding a new one
    const [followupForm, setFollowupForm] = useState({
        titulo: '',
        conteudo: '',
        cta: '',
        etapa_aida: 'Atenção',
        tipo_gancho: '',
        hashtags_sugeridas: '',
    });

    // JSON Import Modal State
    const [jsonImportOpen, setJsonImportOpen] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [jsonError, setJsonError] = useState('');

    // Export MD Modal State
    const [exportMdOpen, setExportMdOpen] = useState(false);
    const [exportSelections, setExportSelections] = useState({});
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
            const problems = await generateCommonProblems({
                persona: finalPersona,
                autor: finalAutor,
                model: settings.gemini_model,
                apiKey: settings.gemini_api_key
            });
            setCommonProblems(problems);
        } catch (error) {
            setProblemsError(error.message);
        } finally {
            setIsLoadingProblems(false);
        }
    }, [commonProblems.length, selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign, settings]);

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
            const problems = await generateCommonProblems({
                persona: finalPersona,
                autor: finalAutor,
                model: settings.gemini_model,
                apiKey: settings.gemini_api_key
            });
            setCommonProblems(problems);
        } catch (error) {
            setProblemsError(error.message);
        } finally {
            setIsLoadingProblems(false);
        }
    }, [selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign, settings]);

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
            const solutions = await generateCommonSolutions({
                problema,
                persona: finalPersona,
                autor: finalAutor,
                model: settings.gemini_model,
                apiKey: settings.gemini_api_key
            });
            setCommonSolutions(solutions);
        } catch (error) {
            setSolutionsError(error.message);
        } finally {
            setIsLoadingSolutions(false);
        }
    }, [commonSolutions.length, problema, selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign, settings]);

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
            const solutions = await generateCommonSolutions({
                problema,
                persona: finalPersona,
                autor: finalAutor,
                model: settings.gemini_model,
                apiKey: settings.gemini_api_key
            });
            setCommonSolutions(solutions);
        } catch (error) {
            setSolutionsError(error.message);
        } finally {
            setIsLoadingSolutions(false);
        }
    }, [problema, selectedPersonaForCampaign, personaList, autorList, selectedAutorForCampaign, settings]);

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

    // Helper to open manual form
    const handleOpenAddFollowup = () => {
        setEditingFollowupIndex(null);
        setFollowupForm({
            titulo: '',
            conteudo: '',
            cta: '',
            etapa_aida: 'Atenção',
            tipo_gancho: '',
            hashtags_sugeridas: '',
        });
        setFollowupFormOpen(true);
    };

    const handleOpenEditFollowup = (index, post) => {
        setEditingFollowupIndex(index);
        setFollowupForm({
            titulo: post.titulo || '',
            conteudo: post.conteudo || '',
            cta: post.cta || '',
            etapa_aida: post.etapa_aida || 'Atenção',
            tipo_gancho: post.tipo_gancho || '',
            hashtags_sugeridas: Array.isArray(post.hashtags_sugeridas) ? post.hashtags_sugeridas.join(', ') : '',
        });
        setFollowupFormOpen(true);
    };

    const handleSaveFollowupForm = () => {
        const processedHashtags = followupForm.hashtags_sugeridas
            .split(/[\s,]+/)
            .map(h => h.trim().replace(/^#/, ''))
            .filter(Boolean);

        const newPost = {
            post_numero: editingFollowupIndex !== null ? (followupPosts[editingFollowupIndex]?.post_numero || (editingFollowupIndex + 1)) : (followupPosts.length + 1),
            tipo_gancho: followupForm.tipo_gancho,
            etapa_aida: followupForm.etapa_aida,
            titulo: followupForm.titulo,
            conteudo: followupForm.conteudo,
            cta: followupForm.cta,
            hashtags_sugeridas: processedHashtags,
        };

        let updatedFollowups;
        if (editingFollowupIndex !== null) {
            updatedFollowups = followupPosts.map((p, idx) => idx === editingFollowupIndex ? newPost : p);
            toast.success("Post de follow-up atualizado com sucesso!");
        } else {
            updatedFollowups = [...followupPosts, newPost];
            toast.success("Post de follow-up adicionado com sucesso!");
        }

        setCampaignState(prev => ({ ...prev, followupPosts: updatedFollowups }));
        setFollowupFormOpen(false);
    };

    const handleDeleteFollowup = (index) => {
        const updatedFollowups = followupPosts.filter((_, idx) => idx !== index).map((p, idx) => ({ ...p, post_numero: idx + 1 }));
        setCampaignState(prev => ({ ...prev, followupPosts: updatedFollowups }));
        toast.success("Post de follow-up excluído com sucesso!");
    };

    const handleImportJson = () => {
        try {
            const parsed = JSON.parse(jsonText);
            if (!Array.isArray(parsed)) {
                setJsonError("O JSON deve ser uma lista (array) de objetos de post.");
                return;
            }

            const newPosts = parsed.map((item, index) => {
                const title = item.titulo || item.titulo_sugerido || `Post ${item.post_numero || index + 1}`;
                const content = item.conteudo || item.coracao_prompt || '';
                const cta = item.cta || item.cta_sugerido || '';
                const etapa_aida = item.etapa_aida || 'Atenção';
                const tipo_gancho = item.tipo_gancho || '';

                let hashtags_sugeridas = [];
                if (Array.isArray(item.hashtags_sugeridas)) {
                    hashtags_sugeridas = item.hashtags_sugeridas.map(h => h.trim().replace(/^#/, ''));
                } else if (typeof item.hashtags_sugeridas === 'string') {
                    hashtags_sugeridas = item.hashtags_sugeridas.split(/[\s,]+/).map(h => h.trim().replace(/^#/, '')).filter(Boolean);
                }

                return {
                    post_numero: followupPosts.length + index + 1,
                    tipo_gancho,
                    etapa_aida,
                    titulo: title,
                    conteudo: content,
                    cta,
                    hashtags_sugeridas,
                };
            });

            setCampaignState(prev => ({ ...prev, followupPosts: [...prev.followupPosts, ...newPosts] }));
            toast.success(`${newPosts.length} post(s) importado(s) com sucesso!`);
            setJsonImportOpen(false);
            setJsonText('');
            setJsonError('');
        } catch (e) {
            setJsonError(`Erro de parsing JSON: ${e.message}`);
        }
    };

    const getExportableFields = useCallback(() => {
        const fields = [];

        // Tab 1: Problema e Solução
        if (selectedPersonaForCampaign) {
            const personaObj = personaList.find(p => p.id === selectedPersonaForCampaign);
            if (personaObj) {
                fields.push({ id: 'persona', label: 'Persona', value: personaObj.name, tab: 'Problema e Solução' });
            }
        }
        if (problema && problema.trim()) {
            fields.push({ id: 'problema', label: 'Problema', value: problema.trim(), tab: 'Problema e Solução' });
        }
        if (selectedAutorForCampaign) {
            const autorObj = autorList.find(a => a.id === selectedAutorForCampaign);
            if (autorObj) {
                fields.push({ id: 'autor', label: 'Autor', value: autorObj.name, tab: 'Problema e Solução' });
            }
        }
        if (solucao && solucao.trim()) {
            fields.push({ id: 'solucao', label: 'Solução', value: solucao.trim(), tab: 'Problema e Solução' });
        }
        if (objetivo && objetivo.trim()) {
            fields.push({ id: 'objetivo', label: 'Objetivo', value: objetivo.trim(), tab: 'Problema e Solução' });
        }
        if (tomDeVoz && tomDeVoz.trim()) {
            fields.push({ id: 'tomDeVoz', label: 'Tom de Voz', value: tomDeVoz.trim(), tab: 'Problema e Solução' });
        }

        // Tab 2: Conteúdo Principal
        if (campaignContent) {
            if (campaignContent.titulo && campaignContent.titulo.trim()) {
                fields.push({ id: 'titulo', label: 'Título', value: campaignContent.titulo.trim(), tab: 'Conteúdo Principal' });
            }
            if (campaignContent.conteudo && campaignContent.conteudo.trim()) {
                fields.push({ id: 'conteudo', label: 'Conteúdo', value: campaignContent.conteudo.trim(), tab: 'Conteúdo Principal' });
            }
            if (campaignContent.conteudoMedio && campaignContent.conteudoMedio.trim()) {
                fields.push({ id: 'conteudoMedio', label: 'Conteúdo Médio', value: campaignContent.conteudoMedio.trim(), tab: 'Conteúdo Principal' });
            }
            if (campaignContent.notification_email && campaignContent.notification_email.trim()) {
                fields.push({ id: 'notification_email', label: 'E-mail de Notificação', value: campaignContent.notification_email.trim(), tab: 'Conteúdo Principal' });
            }
            if (campaignContent.conteudoPequeno && campaignContent.conteudoPequeno.trim()) {
                fields.push({ id: 'conteudoPequeno', label: 'Conteúdo Pequeno', value: campaignContent.conteudoPequeno.trim(), tab: 'Conteúdo Principal' });
            }
            if (campaignContent.cta && campaignContent.cta.trim()) {
                fields.push({ id: 'cta', label: 'CTA', value: campaignContent.cta.trim(), tab: 'Conteúdo Principal' });
            }
            if (campaignContent.hashtags && campaignContent.hashtags.length > 0) {
                fields.push({ id: 'hashtags', label: 'Hashtags', value: campaignContent.hashtags.join(', '), tab: 'Conteúdo Principal' });
            }
        }

        // Tab 3: Página
        const selectedPaletteObj = paletteId === 'custom'
            ? customPalette
            : (palettes || []).find(p => p.id === paletteId);
        if (selectedPaletteObj && selectedPaletteObj.colors && selectedPaletteObj.colors.length > 0) {
            const colorsStr = selectedPaletteObj.colors.map(c => `${c.name || c.hex} (${c.hex})`).join(', ');
            fields.push({ id: 'paletaCores', label: 'Paleta de Cores', value: `${selectedPaletteObj.name || 'Customizada'}: ${colorsStr}`, tab: 'Página' });
        }
        if (aspectRatio && aspectRatio.trim()) {
            fields.push({ id: 'aspectRatio', label: 'Proporção', value: aspectRatio.trim(), tab: 'Página' });
        }
        if (generatedPageUrl && generatedPageUrl.trim()) {
            fields.push({ id: 'generatedPageUrl', label: 'Imagem Gerada (URL)', value: generatedPageUrl.trim(), tab: 'Página' });
        }

        // Tab 4: Posts de Follow-Up
        if (followupPosts && followupPosts.length > 0) {
            fields.push({ id: 'followupPosts', label: 'Posts de Follow-up (exportar todos)', value: followupPosts, tab: 'Posts de Follow-Up' });
        }

        // Tab 5: Conteúdo WordPress
        if (campaignContent && campaignContent.conteudoFormatado && campaignContent.conteudoFormatado.trim()) {
            fields.push({ id: 'conteudoFormatado', label: 'Conteúdo WordPress (HTML)', value: campaignContent.conteudoFormatado.trim(), tab: 'Conteúdo WordPress' });
        }

        return fields;
    }, [selectedPersonaForCampaign, personaList, problema, selectedAutorForCampaign, autorList, solucao, objetivo, tomDeVoz, campaignContent, paletteId, customPalette, palettes, aspectRatio, generatedPageUrl, followupPosts]);

    const handleOpenExportMd = () => {
        const availableFields = getExportableFields();
        const initialSelections = {};
        availableFields.forEach(f => {
            initialSelections[f.id] = true;
        });
        setExportSelections(initialSelections);
        setExportMdOpen(true);
    };

    const handleToggleAllExportSelections = (checked) => {
        const availableFields = getExportableFields();
        const updated = {};
        availableFields.forEach(f => {
            updated[f.id] = checked;
        });
        setExportSelections(updated);
    };

    const generateMarkdownText = () => {
        const availableFields = getExportableFields();
        const selectedFields = availableFields.filter(f => exportSelections[f.id]);

        if (selectedFields.length === 0) {
            return '';
        }

        let markdown = `# Campanha\n\n`;

        // Group by tab
        const groups = {};
        selectedFields.forEach(f => {
            if (!groups[f.tab]) {
                groups[f.tab] = [];
            }
            groups[f.tab].push(f);
        });

        const tabOrder = [
            'Problema e Solução',
            'Conteúdo Principal',
            'Página',
            'Posts de Follow-Up',
            'Conteúdo WordPress'
        ];

        tabOrder.forEach(tabName => {
            if (groups[tabName] && groups[tabName].length > 0) {
                markdown += `## ${tabName}\n\n`;
                groups[tabName].forEach(f => {
                    if (f.id === 'followupPosts') {
                        // Special formatting for all follow-up posts
                        const posts = f.value;
                        posts.forEach((post) => {
                            markdown += `### ${post.titulo || `Post ${post.post_numero}`}\n`;
                            if (post.etapa_aida) markdown += `- **Etapa AIDA**: ${post.etapa_aida}\n`;
                            if (post.tipo_gancho) markdown += `- **Tipo de Gancho**: ${post.tipo_gancho}\n`;
                            if (post.conteudo) markdown += `\n${post.conteudo}\n\n`;
                            if (post.cta) markdown += `**CTA**: ${post.cta}\n\n`;
                            if (post.hashtags_sugeridas && post.hashtags_sugeridas.length > 0) {
                                markdown += `**Hashtags**: ${post.hashtags_sugeridas.map(h => `#${h}`).join(' ')}\n\n`;
                            }
                            markdown += `---\n\n`;
                        });
                    } else if (f.id === 'conteudoFormatado') {
                        // Option 3B: HTML inside code block
                        markdown += `\`\`\`html\n${f.value}\n\`\`\`\n\n`;
                    } else if (f.id === 'hashtags') {
                        markdown += `**${f.label}**: ${f.value.split(/[\s,]+/).map(h => h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`).join(' ')}\n\n`;
                    } else {
                        // Normal fields (multiline values should be handled nicely)
                        if (f.value.includes('\n')) {
                            markdown += `### ${f.label}\n${f.value}\n\n`;
                        } else {
                            markdown += `**${f.label}**: ${f.value}\n\n`;
                        }
                    }
                });
            }
        });

        return markdown.trim();
    };

    const handleCopyMarkdownToClipboard = () => {
        const text = generateMarkdownText();
        if (!text) {
            toast.error("Nenhum dado selecionado para exportar!");
            return;
        }
        navigator.clipboard.writeText(text)
            .then(() => {
                toast.success("Markdown copiado para a área de transferência!");
            })
            .catch(err => {
                console.error("Falha ao copiar:", err);
                toast.error("Erro ao copiar Markdown.");
            });
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
                            <Grid item xs={12} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button onClick={() => handleGenerateFollowupPosts()} disabled={isGeneratingFollowup} startIcon={<GeminiIcon />} variant="contained">
                                    {isGeneratingFollowup ? 'Gerando...' : 'Gerar Posts de Follow-up com IA'}
                                </Button>
                                <Button onClick={handleOpenAddFollowup} startIcon={<AddIcon />} variant="outlined">
                                    Adicionar Post Manual
                                </Button>
                                <Button onClick={() => setJsonImportOpen(true)} startIcon={<CodeIcon />} variant="outlined">
                                    Importar JSON
                                </Button>
                                <Button onClick={handleOpenExportMd} startIcon={<CodeIcon />} variant="outlined">
                                    Exportar MD
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
                                <Typography variant="h6" gutterBottom>Posts de Follow-up ({followupPosts.length})</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button onClick={() => handleGenerateFollowupPosts()} disabled={isGeneratingFollowup} startIcon={<GeminiIcon />} size="small">
                                        {isGeneratingFollowup ? 'Gerando...' : 'Regerar com IA'}
                                    </Button>
                                </Box>
                            </Box>
                            {(followupPosts || []).filter(Boolean).map((post, index) => (
                                <Accordion key={index}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <Typography sx={{ flexGrow: 1, mr: 2, fontWeight: 'bold' }}>{post.titulo || `Post ${post.post_numero}`}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Chip label={post.etapa_aida || 'AIDA'} size="small" color="primary" variant="outlined" />
                                                <IconButton size="small" color="primary" onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditFollowup(index, post);
                                                }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteFollowup(index);
                                                }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ cursor: 'pointer' }} onClick={() => handleOpenEditFollowup(index, post)}>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                                            {post.conteudo}
                                        </Typography>
                                        {post.cta && (
                                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                                <strong>CTA:</strong> {post.cta}
                                            </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                            {post.tipo_gancho && <Chip icon={<InfoIcon />} label={post.tipo_gancho} size="small" variant="outlined" />}
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


                {/* Manual Inclusion / Edit Dialog */}
                <Dialog open={followupFormOpen} onClose={() => setFollowupFormOpen(false)} fullWidth maxWidth="md">
                    <DialogTitle>
                        {editingFollowupIndex !== null ? `Editar Post de Follow-up #${editingFollowupIndex + 1}` : 'Adicionar Novo Post de Follow-up'}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Título do Post"
                                    fullWidth
                                    value={followupForm.titulo}
                                    onChange={(e) => setFollowupForm(prev => ({ ...prev, titulo: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Conteúdo"
                                    fullWidth
                                    multiline
                                    rows={6}
                                    value={followupForm.conteudo}
                                    onChange={(e) => setFollowupForm(prev => ({ ...prev, conteudo: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="CTA (Chamada para Ação)"
                                    fullWidth
                                    value={followupForm.cta}
                                    onChange={(e) => setFollowupForm(prev => ({ ...prev, cta: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="etapa-aida-label">Etapa AIDA</InputLabel>
                                    <Select
                                        labelId="etapa-aida-label"
                                        value={followupForm.etapa_aida}
                                        onChange={(e) => setFollowupForm(prev => ({ ...prev, etapa_aida: e.target.value }))}
                                        label="Etapa AIDA"
                                    >
                                        <MenuItem value="Atenção">Atenção</MenuItem>
                                        <MenuItem value="Interesse">Interesse</MenuItem>
                                        <MenuItem value="Desejo">Desejo</MenuItem>
                                        <MenuItem value="Ação">Ação</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Tipo de Gancho"
                                    fullWidth
                                    value={followupForm.tipo_gancho}
                                    onChange={(e) => setFollowupForm(prev => ({ ...prev, tipo_gancho: e.target.value }))}
                                    placeholder="Ex: Narrativa de Dor, Insight Contraintuitivo"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Hashtags Sugeridas"
                                    fullWidth
                                    value={followupForm.hashtags_sugeridas}
                                    onChange={(e) => setFollowupForm(prev => ({ ...prev, hashtags_sugeridas: e.target.value }))}
                                    placeholder="Separadas por vírgula ou espaço. Ex: #inovacao, #marketing, tech"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setFollowupFormOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveFollowupForm} variant="contained" color="primary">Salvar</Button>
                    </DialogActions>
                </Dialog>

                {/* JSON Import Dialog */}
                <Dialog open={jsonImportOpen} onClose={() => setJsonImportOpen(false)} fullWidth maxWidth="md">
                    <DialogTitle>Importar Posts de Follow-up via JSON</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, mt: 1 }}>
                            Cole uma lista (array) de objetos JSON representando os posts de follow-up.
                            O importador mapeará chaves como "titulo_sugerido", "coracao_prompt" (conteúdo), "cta_sugerido", etc.
                        </Typography>
                        <TextField
                            label="JSON dos Posts"
                            fullWidth
                            multiline
                            rows={12}
                            value={jsonText}
                            onChange={(e) => {
                                setJsonText(e.target.value);
                                setJsonError('');
                            }}
                            placeholder='[\n  {\n    "titulo_sugerido": "Sua comunidade...",\n    "coracao_prompt": "Abra questionando...",\n    "cta_sugerido": "Comente..."\n  }\n]'
                            error={!!jsonError}
                            helperText={jsonError}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setJsonImportOpen(false)}>Cancelar</Button>
                        <Button onClick={handleImportJson} variant="contained" color="primary" disabled={!jsonText.trim()}>
                            Importar
                        </Button>
                    </DialogActions>
                </Dialog>

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
                {/* Export Markdown Dialog */}
                <Dialog
                    open={exportMdOpen}
                    onClose={() => setExportMdOpen(false)}
                    fullWidth
                    maxWidth="md"
                    PaperProps={{
                        sx: {
                            backgroundColor: 'background.paper',
                            backgroundImage: 'none',
                        }
                    }}
                >
                    <DialogTitle>Exportar Campanha no Formato Markdown</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            Selecione abaixo os dados que deseja incluir no arquivo Markdown (.md). Apenas os campos preenchidos são listados.
                        </Typography>

                        {getExportableFields().length > 0 ? (
                            <>
                                <Box sx={{ mb: 2 }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={getExportableFields().every(f => exportSelections[f.id])}
                                                indeterminate={
                                                    getExportableFields().some(f => exportSelections[f.id]) &&
                                                    !getExportableFields().every(f => exportSelections[f.id])
                                                }
                                                onChange={(e) => handleToggleAllExportSelections(e.target.checked)}
                                            />
                                        }
                                        label={<strong>Selecionar Todos / Desmarcar Todos</strong>}
                                    />
                                </Box>

                                {(() => {
                                    const available = getExportableFields();
                                    const groups = {};
                                    available.forEach(f => {
                                        if (!groups[f.tab]) groups[f.tab] = [];
                                        groups[f.tab].push(f);
                                    });

                                    const tabOrder = [
                                        'Problema e Solução',
                                        'Conteúdo Principal',
                                        'Página',
                                        'Posts de Follow-Up',
                                        'Conteúdo WordPress'
                                    ];

                                    return tabOrder.map(tabName => {
                                        if (!groups[tabName] || groups[tabName].length === 0) return null;
                                        return (
                                            <Box key={tabName} sx={{ mb: 3 }}>
                                                <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                    {tabName}
                                                </Typography>
                                                <Divider sx={{ mb: 1.5 }} />
                                                <FormGroup row sx={{ pl: 1 }}>
                                                    {groups[tabName].map(f => (
                                                        <FormControlLabel
                                                            key={f.id}
                                                            control={
                                                                <Checkbox
                                                                    checked={!!exportSelections[f.id]}
                                                                    onChange={(e) => {
                                                                        setExportSelections(prev => ({
                                                                            ...prev,
                                                                            [f.id]: e.target.checked
                                                                        }));
                                                                    }}
                                                                />
                                                            }
                                                            label={f.label}
                                                            sx={{ width: { xs: '100%', sm: '48%' }, mb: 0.5 }}
                                                        />
                                                    ))}
                                                </FormGroup>
                                            </Box>
                                        );
                                    });
                                })()}
                            </>
                        ) : (
                            <Typography variant="body1" color="textSecondary" align="center" sx={{ py: 4 }}>
                                Nenhum conteúdo preenchido disponível para exportação no momento.
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setExportMdOpen(false)}>Fechar</Button>
                        <Button
                            onClick={handleCopyMarkdownToClipboard}
                            variant="contained"
                            color="primary"
                            disabled={!getExportableFields().some(f => exportSelections[f.id])}
                        >
                            Copiar para Área de Transferência
                        </Button>
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
