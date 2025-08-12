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
  ListItemText,
  Checkbox,
  Tooltip,
  IconButton,
  Link,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import {
    Campaign as CampaignIcon,
    ExpandMore as ExpandMoreIcon,
    InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';
import RichTextEditor from './RichTextEditor';

const Campaign = ({
    personaFields,
    setPersonaFields,
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
    campaignContent,
    handleGenerateCampaignContent,
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
}) => {

    const handlePersonaChange = (event) => {
        const { name, value } = event.target;
        setPersonaFields(prev => ({ ...prev, [name]: value }));
    };

    const handlePersonaMultiSelectChange = (event) => {
        const { name, value } = event.target;
        setPersonaFields(prev => ({
            ...prev,
            [name]: typeof value === 'string' ? value.split(',') : value,
        }));
    };

    const handlePersonaRichTextChange = (name, value) => {
        setPersonaFields(prev => ({ ...prev, [name]: value }));
    };

    const handlePersonaCheckboxChange = (category, field) => (event) => {
        const { checked } = event.target;
        setPersonaFields(prev => {
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
        <Tooltip title={<Typography variant="body2" sx={{ p: 1 }}>{title} {url && <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ color: 'cyan', display: 'block', mt: 1 }}>Saiba mais</Link>}</Typography>}>
            <IconButton>
                <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
            </IconButton>
        </Tooltip>
    );

    return (
        <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CampaignIcon />
                    {steps[0].label}
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
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
                    <Grid item xs={12} md={6}>
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

                <Accordion sx={{ mt: 4, '&.Mui-expanded': {  bgcolor: 'background.default' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Definição da Persona</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            {/* Nome da Persona */}
                            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
                                <TextField
                                    label="Nome da Persona"
                                    name="nome"
                                    value={personaFields?.nome || ''}
                                    onChange={handlePersonaChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                />
                                <InfoTooltip title="É a identificação clara e concisa do perfil de cliente ideal que você está descrevendo. Ajuda a humanizar o perfil, tornando-o mais fácil de ser compreendido por toda a equipe." />
                            </Grid>

                            {/* Posição/Cargo */}
                            <Grid item xs={12} md={(personaFields?.posicaoCargo || []).includes('Outro(s)') ? 6 : 12} sx={{ display: 'flex', alignItems: 'center' }}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Posição/Cargo</InputLabel>
                                    <Select
                                        multiple
                                        name="posicaoCargo"
                                        value={personaFields?.posicaoCargo || []}
                                        onChange={handlePersonaMultiSelectChange}
                                        renderValue={(selected) => selected.join(', ')}
                                        label="Posição/Cargo"
                                    >
                                        {POSICOES_CARGOS.map((pos) => (
                                            <MenuItem key={pos} value={pos}>
                                                <Checkbox checked={(personaFields?.posicaoCargo || []).indexOf(pos) > -1} />
                                                <ListItemText primary={pos} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <InfoTooltip title="Este campo identifica a função formal da persona dentro da empresa. A posição define a autoridade de decisão, as responsabilidades e as métricas de sucesso que a persona utiliza." url="https://www.google.com/search?q=https://www.linkedin.com/business/talent/blog/talent-acquisition/types-of-job-titles" />
                            </Grid>
                            {(personaFields?.posicaoCargo || []).includes('Outro(s)') && (
                                <Grid item xs={12} md={6}>
                                    <TextField label="Especifique Outro Cargo" name="posicaoCargoOutro" value={personaFields?.posicaoCargoOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined"/>
                                </Grid>
                            )}

                            {/* Segmento da Empresa */}
                            <Grid item xs={12} md={(personaFields?.segmentoEmpresa || []).includes('Outro(s)') ? 6 : 12} sx={{ display: 'flex', alignItems: 'center' }}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Segmento da Empresa</InputLabel>
                                    <Select multiple name="segmentoEmpresa" value={personaFields?.segmentoEmpresa || []} onChange={handlePersonaMultiSelectChange} renderValue={(selected) => selected.join(', ')} label="Segmento da Empresa">
                                        {SEGMENTOS_EMPRESA.map((seg) => (<MenuItem key={seg} value={seg}><Checkbox checked={(personaFields?.segmentoEmpresa || []).indexOf(seg) > -1} /><ListItemText primary={seg} /></MenuItem>))}
                                    </Select>
                                </FormControl>
                                <InfoTooltip title="Este campo classifica a indústria ou setor de atuação da empresa. O segmento de mercado influencia diretamente os desafios, a cultura e as regulamentações que a persona enfrenta." url="https://www.google.com/search?q=https://blog.hubspot.com/marketing/market-segmentation-guide" />
                            </Grid>
                            {(personaFields?.segmentoEmpresa || []).includes('Outro(s)') && (
                                <Grid item xs={12} md={6}>
                                    <TextField label="Especifique Outro Segmento" name="segmentoEmpresaOutro" value={personaFields?.segmentoEmpresaOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined"/>
                                </Grid>
                            )}

                            {/* Responsabilidades-Chave */}
                            <Grid item xs={12} md={(personaFields?.responsabilidadesChave || []).includes('Outro(s)') ? 6 : 12} sx={{ display: 'flex', alignItems: 'center' }}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Responsabilidades-Chave</InputLabel>
                                    <Select multiple name="responsabilidadesChave" value={personaFields?.responsabilidadesChave || []} onChange={handlePersonaMultiSelectChange} renderValue={(selected) => selected.join(', ')} label="Responsabilidades-Chave">
                                        {RESPONSABILIDADES_CHAVE.map((resp) => (<MenuItem key={resp} value={resp}><Checkbox checked={(personaFields?.responsabilidadesChave || []).indexOf(resp) > -1} /><ListItemText primary={resp} /></MenuItem>))}
                                    </Select>
                                </FormControl>
                                <InfoTooltip title="Detalha as principais tarefas e áreas de atuação da persona. Entender suas responsabilidades ajuda a identificar como sua solução pode facilitar o trabalho dela ou ajudá-la a atingir metas específicas." />
                            </Grid>
                            {(personaFields?.responsabilidadesChave || []).includes('Outro(s)') && (
                                <Grid item xs={12} md={6}>
                                    <TextField label="Especifique Outra Responsabilidade" name="responsabilidadesChaveOutro" value={personaFields?.responsabilidadesChaveOutro || ''} onChange={handlePersonaChange} fullWidth required variant="outlined"/>
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
                                                {items.map((item) => (<FormControlLabel key={item} control={<Checkbox checked={(personaFields?.[key] || []).includes(item)} onChange={handlePersonaCheckboxChange(key, item)} />} label={item} />))}
                                            </FormGroup>
                                            {(personaFields?.[key] || []).includes('Outro(s)') && (
                                                <TextField label={`Especifique Outra Dor (${label})`} name={`${key}Outro`} value={personaFields?.[`${key}Outro`] || ''} onChange={handlePersonaChange} fullWidth required variant="outlined" sx={{ mt: 2 }}/>
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
                                                {items.map((item) => (<FormControlLabel key={item} control={<Checkbox checked={(personaFields?.[key] || []).includes(item)} onChange={handlePersonaCheckboxChange(key, item)} />} label={item} />))}
                                            </FormGroup>
                                            {(personaFields?.[key] || []).includes('Outro(s)') && (
                                                <TextField label={`Especifique Outro(a) (${label})`} name={`${key}Outro`} value={personaFields?.[`${key}Outro`] || ''} onChange={handlePersonaChange} fullWidth required variant="outlined" sx={{ mt: 2 }}/>
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
                                    value={personaFields?.mentalidadeValores || ''}
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
                                    value={personaFields?.contextoCultural || ''}
                                    onChange={(value) => handlePersonaRichTextChange('contextoCultural', value)}
                                />
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => handleGenerateCampaignContent(false)}
                        disabled={!problema.trim() || !solucao.trim() || isGeneratingCampaign || campaignContent !== null}
                    >
                        {isGeneratingCampaign ? 'Gerando...' : 'Gerar Tudo com IA'}
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
                                <AccordionDetails>
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

                {isGeneratingImage && (
                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>
                            Gerando Imagem...
                        </Typography>
                        {/* Pode adicionar um componente de loading mais elaborado aqui */}
                    </Box>
                )}

                {generatedImageUrl && !isGeneratingImage && (
                    <Box sx={{ mt: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" gutterBottom>Imagem Gerada</Typography>
                            <Button onClick={handleGenerateImage} disabled={isGeneratingImage}>
                                {isGeneratingImage ? 'Gerando...' : 'Regenerar Imagem'}
                            </Button>
                        </Box>
                        <img src={generatedImageUrl} alt="Imagem gerada pela IA" style={{ maxWidth: '100%', borderRadius: '8px', mt: 2 }} />
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default Campaign;
