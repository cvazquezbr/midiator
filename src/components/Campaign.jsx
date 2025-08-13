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
} from '@mui/material';
import {
    Campaign as CampaignIcon,
    ExpandMore as ExpandMoreIcon,
    Image as ImageIcon,
} from '@mui/icons-material';

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
    return (
        <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CampaignIcon />
                    {steps[0].label}
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            label="Problema"
                            multiline
                            rows={4}
                            value={problema}
                            onChange={(e) => setProblema(e.target.value)}
                            variant="outlined"
                            fullWidth
                            placeholder="Descreva o problema que sua campanha busca resolver."
                            disabled={campaignContent !== null}
                        />
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
                        <TextField
                            label="Solução"
                            multiline
                            rows={4}
                            value={solucao}
                            onChange={(e) => setSolucao(e.target.value)}
                            variant="outlined"
                            fullWidth
                            placeholder="Descreva a solução que sua campanha oferece."
                            disabled={campaignContent !== null}
                        />
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
            </CardContent>
        </Card>
    );
};

export default Campaign;
