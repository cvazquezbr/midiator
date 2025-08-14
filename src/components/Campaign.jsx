import React from 'react';
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
} from '@mui/material';
import { generateCommonProblems } from '../utils/generationHandlers';
import { getCampaignPrompt } from '../utils/campaignPrompt';
import {
    Campaign as CampaignIcon,
    ExpandMore as ExpandMoreIcon,
    Image as ImageIcon,
    InfoOutlined as InfoIcon,
    HelpOutline as HelpOutlineIcon,
    TipsAndUpdatesOutlined as TipsAndUpdatesIcon,
    FactCheckOutlined as FactCheckIcon,
    AutoAwesomeOutlined as GeminiIcon,
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


const Campaign = ({
    steps,
    problema,
    setProblema,
    solucao,
    setSolucao,
    followupPostsQuantity,
    setFollowupPostsQuantity,
    aspectRatio,
    setAspectRatio,
    isGeneratingCampaign,
    isGeneratingSolucao,
    campaignContent,
    campaignGenerationFailed,
    generationError,
    handleGenerateCampaignContent,
    handleGenerateSolucao,
    handleResetCampaign,
    handleExportHtml,
    setEditingField,
    conteudoMedio,
    setConteudoMedio,
    isGeneratingSummaryMedio,
    handleGenerateSummary,
    conteudoPequeno,
    setConteudoPequeno,
    isGeneratingSummaryPequeno,
    conteudoFormatado,
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
}) => {
    const [isHintModalOpen, setHintModalOpen] = React.useState(false);
    const [isSolucaoHintModalOpen, setSolucaoHintModalOpen] = React.useState(false);
    const [commonProblems, setCommonProblems] = React.useState([]);
    const [isLoadingProblems, setIsLoadingProblems] = React.useState(false);
    const [problemsError, setProblemsError] = React.useState(null);

    const handleGenerateProblems = async () => {
        setIsLoadingProblems(true);
        setProblemsError(null);
        setCommonProblems([]);
        try {
            const { persona } = getCampaignPrompt();
            if (!persona || Object.keys(persona).length === 0) {
                throw new Error("Defina uma persona primeiro na aba 'Setup'.");
            }
            const problems = await generateCommonProblems({ persona });
            setCommonProblems(problems);
        } catch (error) {
            setProblemsError(error.message);
        } finally {
            setIsLoadingProblems(false);
        }
    };

    return (
        <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CampaignIcon />
                    {steps[0].label}
                </Typography>
                <Grid container spacing={3}>
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
                            />
                            <IconButton color="primary" sx={{ mt: 1 }} onClick={() => setHintModalOpen(true)}>
                                <GeminiIcon />
                            </IconButton>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={handleGenerateSolucao}
                            disabled={isGeneratingSolucao || !problema.trim() || (solucao && solucao.trim() !== '')}
                        >
                            {isGeneratingSolucao ? 'Gerando...' : 'Gerar Solução'}
                        </Button>
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
                                <InfoIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Quantidade de Posts de Follow-up"
                            type="number"
                            value={followupPostsQuantity}
                            onChange={(e) => setFollowupPostsQuantity(parseInt(e.target.value, 10))}
                            fullWidth
                            variant="outlined"
                            disabled={campaignContent !== null}
                            InputProps={{ inputProps: { min: 1, max: 10 } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth variant="outlined" disabled={campaignContent !== null}>
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
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => handleGenerateCampaignContent(false)}
                        disabled={!problema.trim() || !solucao.trim() || isGeneratingCampaign || campaignContent !== null}
                    >
                        {isGeneratingCampaign ? 'Gerando...' : 'Elaborar Conteúdo'}
                    </Button>
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
                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            onClick={() => handleGenerateImage()}
                            disabled={isGeneratingImage}
                            startIcon={<ImageIcon />}
                        >
                            {isGeneratingImage ? 'Gerando Imagem...' : 'Tentar Gerar Apenas a Imagem'}
                        </Button>
                    </Box>
                )}

                {campaignContent && (
                    <Box sx={{ mt: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={handleExportHtml}
                            >
                                Exportar como HTML
                            </Button>
                        </Box>
                        <Typography variant="h6" gutterBottom>Conteúdo Gerado</Typography>
                        <Grid container spacing={2}>
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
                                <Button onClick={() => handleGenerateCampaignContent(true)} disabled={isGeneratingCampaign}>Gerar</Button>
                            </Grid>

                            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    label="Conteúdo Médio (máx. 1800 caracteres)"
                                    multiline
                                    rows={2}
                                    value={conteudoMedio}
                                    onChange={(e) => setConteudoMedio(e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                />
                                <Button onClick={() => handleGenerateSummary(1800)} disabled={isGeneratingSummaryMedio || !campaignContent}>
                                    {isGeneratingSummaryMedio ? 'Gerando...' : 'Gerar'}
                                </Button>
                            </Grid>

                            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    label="Conteúdo Pequeno (máx. 130 caracteres)"
                                    multiline
                                    rows={1}
                                    value={conteudoPequeno}
                                    onChange={(e) => setConteudoPequeno(e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                />
                                <Button onClick={() => handleGenerateSummary(130)} disabled={isGeneratingSummaryPequeno || !campaignContent}>
                                    {isGeneratingSummaryPequeno ? 'Gerando...' : 'Gerar'}
                                </Button>
                            </Grid>

                            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    label="Conteúdo Formatado (HTML)"
                                    multiline
                                    rows={3}
                                    value={conteudoFormatado}
                                    onClick={() => setEditingField('conteudoFormatado')}
                                    readOnly
                                    variant="outlined"
                                    fullWidth
                                    sx={{ cursor: 'pointer' }}
                                />
                                <Button onClick={() => handleGenerateFormattedContent()} disabled={isGeneratingConteudoFormatado || !campaignContent}>
                                    {isGeneratingConteudoFormatado ? 'Gerando...' : 'Gerar'}
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
                    </Box>
                )}

                {isGeneratingFollowup && (
                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>Gerando Posts de Follow-up...</Typography>
                    </Box>
                )}

                {followupPosts.length > 0 && !isGeneratingFollowup && (
                    <Box sx={{ mt: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" gutterBottom>Posts de Follow-up Gerados</Typography>
                            <Button onClick={() => handleGenerateFollowupPosts()} disabled={isGeneratingFollowup}>
                                {isGeneratingFollowup ? 'Gerando...' : 'Regenerar Posts'}
                            </Button>
                        </Box>
                        {followupPosts.map((post, index) => (
                            <Accordion key={index}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>Post {post.post_numero}: {post.tipo_gancho}</Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ cursor: 'pointer' }} onClick={() => onEditFollowup(index, post.conteudo)}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {post.conteudo}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                        CTA: {post.cta}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                        {post.hashtags_sugeridas.map((tag, i) => (
                                            <Chip key={i} label={tag} size="small" />
                                        ))}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                )}

                {/* Bloco de Geração e Exibição de Imagem */}
                {campaignContent && (
                    <Box sx={{ mt: 4 }}>
                        {/* Se a imagem já foi gerada, exibe */}
                        {generatedImageUrl && !isGeneratingImage && (
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" gutterBottom>Imagem Gerada</Typography>
                                    <Button onClick={handleGenerateImage} disabled={isGeneratingImage}>
                                        {isGeneratingImage ? 'Gerando...' : 'Regenerar Imagem'}
                                    </Button>
                                </Box>
                                <img src={generatedImageUrl} alt="Imagem gerada pela IA" style={{ maxWidth: '100%', borderRadius: '8px', mt: 2 }} />
                            </Box>
                        )}

                        {/* Se está gerando a imagem, mostra o loading */}
                        {isGeneratingImage && (
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" gutterBottom>
                                    Gerando Imagem...
                                </Typography>
                            </Box>
                        )}

                        {/* Se AINDA NÃO tem imagem e NÃO está gerando, mostra o botão para gerar */}
                        {!generatedImageUrl && !isGeneratingImage && (
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleGenerateImage}
                                    startIcon={<ImageIcon />}
                                >
                                    Gerar Imagem
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}

                <Dialog open={isHintModalOpen} onClose={() => setHintModalOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Como Descrever o Problema ou Necessidade</DialogTitle>
                    <DialogContent>
                        {problemaHint}
                        <Box sx={{ my: 2, borderTop: 1, borderColor: 'divider' }} />
                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleGenerateProblems}
                                disabled={isLoadingProblems}
                            >
                                {isLoadingProblems ? <CircularProgress size={24} /> : "Sugerir Problemas com IA"}
                            </Button>
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
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setHintModalOpen(false)}>Fechar</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={isSolucaoHintModalOpen} onClose={() => setSolucaoHintModalOpen(false)} maxWidth="md">
                    <DialogTitle>Como Descrever a Solução ou Proposta</DialogTitle>
                    <DialogContent>
                        {solucaoHint}
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
