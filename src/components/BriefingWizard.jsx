import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, IconButton, Tooltip, Paper, Dialog, DialogTitle, DialogContent, CircularProgress, Radio, RadioGroup, FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, useMediaQuery, Alert, Stepper, Step, StepLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add, ArrowBack, ArrowForward, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import TomDeVozModal from './TomDeVozModal';
import SuggestionModal from './SuggestionModal';
import ReviewSuggestionModal from './ReviewSuggestionModal';
import InfoBox from './InfoBox';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';
import TextEditor from './TextEditor';

const ctaBestPractices = (
    <Box>
        <Typography variant="h6" gutterBottom>Boas Práticas para CTAs</Typography>
        <Typography variant="body2" gutterBottom><strong>1. Comece com um Verbo de Ação:</strong> Use palavras que incentivem a ação imediata. Ex: "Compre", "Baixe", "Inscreva-se", "Descubra".</Typography>
        <Typography variant="body2" gutterBottom><strong>2. Crie Urgência e Escassez:</strong> Incentive a ação rápida com termos como "Hoje", "Agora", "Últimas unidades", "Oferta por tempo limitado".</Typography>
        <Typography variant="body2" gutterBottom><strong>3. Destaque o Benefício:</strong> Deixe claro o que o usuário ganha ao clicar. Ex: "Compre agora e ganhe 20% de desconto" em vez de apenas "Compre agora".</Typography>
        <Typography variant="body2" gutterBottom><strong>4. Seja Claro e Conciso:</strong> O CTA deve ser curto, direto e fácil de entender. Evite jargões ou frases complexas.</Typography>
        <Typography variant="body2" gutterBottom><strong>5. Use a Primeira Pessoa:</strong> CTAs como "Quero meu e-book" podem ter uma taxa de conversão maior do que "Baixe o e-book".</Typography>
        <Typography variant="body2" gutterBottom><strong>6. Teste Cores e Contraste:</strong> O botão de CTA deve se destacar visualmente do resto da página para atrair a atenção.</Typography>
    </Box>
);

const TONS_DE_VOZ = [
  "Inspirador", "Educativo", "Confiante", "Próximo", "Engraçado / Descontraído",
  "Elegante / Sofisticado", "Inovador", "Institucional", "Cuidadoso / Humano",
  "Visionário", "Provocador", "Acessível / Democrático"
];

const MOTIVACOES = [
    { id: 'reconhecimento', nome: 'Aumentar reconhecimento da marca', descricao: 'Tornar a marca mais conhecida e presente na mente do público-alvo.' },
    { id: 'engajamento', nome: 'Engajar e gerar conexão com a audiência', descricao: 'Criar interações autênticas, fortalecendo o vínculo com os consumidores.' },
    { id: 'vendas', nome: 'Impulsionar vendas ou conversões', descricao: 'Direcionar o público para comprar, assinar ou experimentar o produto/serviço.' },
    { id: 'educar', nome: 'Educar o público sobre a marca/produto', descricao: 'Explicar benefícios, diferenciais e funcionalidades de forma clara e atrativa.' },
    { id: 'reforcar', nome: 'Reforçar posicionamento e valores da marca', descricao: 'Transmitir a identidade, propósito e diferenciais competitivos de forma consistente.' },
];

const SUGESTOES_NAO_FACA = [
  "Não use imagens ou logos de outras marcas.",
  "Não utilize imagens de pessoas sem autorização.",
  "Evite qualquer conteúdo ofensivo, político ou inapropriado.",
  "Não use trilhas com direitos autorais.",
  "Não ter legendas que facilitam o entendimento.",
  "Não ter um som audível e limpo.",
  "Legendas ou títulos cortados ou mal posicionados.",
  "Não use templates ou capas que não fazem parte do conteúdo do vídeo."
];

const SUGESTOES_FACA = [
  "Boa iluminação e enquadramento.",
  "Crie com paixão pela produção de conteúdo.",
  "Atenção ao Content Score.",
  "Clareza na captação de áudio.",
  "Legende seu vídeo."
];

export const emptyBriefingWizardData = {
  name: '',
  // Step 1: Motivacao
  motivacao: '',
  // Step 2: Objeto
  marca: '',
  produtoServico: '',
  descricao: '',
  // Step 3: Referencias
  tom_de_voz: [],
  faca: SUGESTOES_FACA,
  nao_faca: SUGESTOES_NAO_FACA,
  quantidadeConteudos: 1,
  envioProdutos: 'não',
  prazoEnvio: null,
  egcUgc: 'ugc',
  inspiracoes: ['', '', ''],
  // Step 4: Mensagem
  objetivo: '',
  cta: '',
  mensagemPrincipal: '',
  textoBase: '',
  // Step 5: Finalizacao (revisão)
};

const ChipInput = ({ label, items, setItems, suggestions }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue && !items.includes(inputValue)) {
      setItems([...items, inputValue]);
      setInputValue('');
    }
  };

  const handleDelete = (itemToDelete) => {
    setItems(items.filter((item) => item !== itemToDelete));
  };

  const handleAddSuggestion = (suggestion) => {
    if (!items.includes(suggestion)) {
      setItems([...items, suggestion]);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          label={`Adicionar ${label}`}
          fullWidth
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} variant="contained" startIcon={<Add />}>Adicionar</Button>
      </Box>
      <Paper variant="outlined" sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {items.map((item) => (
          <Chip key={item} label={item} onDelete={() => handleDelete(item)} />
        ))}
      </Paper>
      <Typography variant="caption">Sugestões:</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {suggestions.filter(s => !items.includes(s)).map(s => (
          <Chip key={s} label={s} onClick={() => handleAddSuggestion(s)} size="small" />
        ))}
      </Box>
    </Box>
  );
};

const steps = [
    'Objetivo da Campanha',
    'Produto, Serviço ou Experiência',
    'Guia da Marca',
    'Inspiração',
    'Entregas',
    'Mensagem',
    'Finalização'
];

const BriefingWizard = ({ open, onClose, onSave, briefingData, onBriefingDataChange, initialStep = 0 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(initialStep);
  const [tomDeVozModalOpen, setTomDeVozModalOpen] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [showTextoBase, setShowTextoBase] = useState(true);
  const [ctaModalOpen, setCtaModalOpen] = useState(false);
  const [ctaSuggestions, setCtaSuggestions] = useState([]);
  const [loadingCtaSuggestions, setLoadingCtaSuggestions] = useState(false);
  const [ctaError, setCtaError] = useState(null);
  const [textoBaseReviewModalOpen, setTextoBaseReviewModalOpen] = useState(false);
  const [textoBaseReview, setTextoBaseReview] = useState(null);
  const [loadingTextoBaseReview, setLoadingTextoBaseReview] = useState(false);

  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  const TOTAL_STEPS = 7;

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const handleChange = (event) => {
    const { name, value } = event.target;
    onBriefingDataChange(prev => ({ ...prev, [name]: value }));
  };

  const handleChipChange = (name, value) => {
    onBriefingDataChange(prev => ({ ...prev, [name]: value }));
  };

  const handleRichTextChange = (name, value) => {
    onBriefingDataChange(prev => ({ ...prev, [name]: value }));
  };

  const handleInspiracaoChange = (index, value) => {
      const newInspiracoes = [...briefingData.inspiracoes];
      newInspiracoes[index] = value;
      onBriefingDataChange(prev => ({ ...prev, inspiracoes: newInspiracoes }));
  };

  const objetivoMensagemDescription = "Descreve de forma concisa o propósito do conteúdo solicitado ao participante da missão ou desafio. Deve indicar:\n• A ação desejada do público ou participante (ex: engajar, convidar, informar, ensinar);\n• A dor ou necessidade que o conteúdo pretende atender;\n• O resultado esperado ou valor agregado da ação.\nServe como guia para o criador entender o “porquê” da missão e alinhar o conteúdo com os objetivos da marca, mantendo clareza e foco na mensagem principal.";
  const textoBaseDescription = "Convidar seus seguidores a participarem do evento aberto ao público CURTINDO O SEXO NA ENVELHESCÊNCIA. O foco é resolver uma das maiores dores de quem ama sexo na menopausa: estar sempre molhadinha - e com a KY Gel isso é possível!";

  const handleReviewTextoBase = async () => {
    if (!geminiAPI.isInitialized) {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error('Chave de API do Gemini não configurada.');
            return;
        }
        geminiAPI.initialize(apiKey);
    }
    setLoadingTextoBaseReview(true);
    setTextoBaseReview(null);

    const prompt = `
      Aja como um especialista em comunicação e marketing. Analise o "Texto Base" fornecido pelo usuário e critique-o com base no seguinte objetivo:

      **Objetivo Principal:**
      "${textoBaseDescription}"

      **Texto do Usuário para Análise:**
      "${briefingData.textoBase}"

      **Sua Tarefa:**
      1.  **Analise o texto:** Avalie se o texto do usuário está alinhado com o objetivo principal.
      2.  **Identifique Pontos Fortes:** Liste os aspectos positivos do texto.
      3.  **Identifique Pontos a Melhorar:** Aponte o que está faltando ou o que poderia ser mais claro e direto para atingir o objetivo.
      4.  **Gere 3 Sugestões Alternativas:** Crie três novas versões do "Texto Base" que melhorem o texto original, focando no objetivo.
      5.  **Responda em formato JSON:** Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto ou formatação adicional antes ou depois. Use a seguinte estrutura:
          {
            "pontosFortes": "...",
            "pontosFracos": "...",
            "sugestoes": ["Sugestão 1", "Sugestão 2", "Sugestão 3"]
          }
    `;

    try {
        const response = await geminiAPI.generateContent(prompt);
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const jsonString = match[0];
            const jsonResponse = JSON.parse(jsonString);
            setTextoBaseReview(jsonResponse);
            setTextoBaseReviewModalOpen(true);
        } else {
            throw new Error("Nenhum JSON válido encontrado na resposta da IA.");
        }
    } catch (error) {
        toast.error('Erro ao gerar revisão do texto base.');
        console.error("Texto Base review error:", error);
    } finally {
        setLoadingTextoBaseReview(false);
    }
  };

  const handleGenerateCtaSuggestions = async () => {
    if (!geminiAPI.isInitialized) {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error('Chave de API do Gemini não configurada.');
            return;
        }
        geminiAPI.initialize(apiKey);
    }

    setLoadingCtaSuggestions(true);
    setCtaError(null);
    setCtaSuggestions([]);

    const { motivacao, marca, produtoServico, descricao, tom_de_voz } = briefingData;
    const motivacaoObj = MOTIVACOES.find(m => m.id === motivacao);

    const prompt = `
        Aja como um especialista em marketing digital. Com base nas seguintes informações de um briefing de campanha, gere 5 sugestões de Call-to-Action (CTA) curtas e eficazes.

        **Contexto da Campanha:**
        - **Objetivo Principal:** ${motivacaoObj ? motivacaoObj.nome : 'Não definida'} (${motivacaoObj ? motivacaoObj.descricao : ''})
        - **Marca:** ${marca || 'Não definida'}
        - **Produto/Serviço:** ${produtoServico || 'Não definido'}
        - **Descrição do Produto/Serviço:** ${descricao || 'Não definida'}
        - **Tom de Voz Desejado:** ${(tom_de_voz || []).join(', ') || 'Neutro'}

        **Requisitos para as sugestões de CTA:**
        1.  Cada CTA deve ser claro, conciso e orientado para a ação.
        2.  As sugestões devem ser variadas, explorando diferentes gatilhos (urgência, benefício, curiosidade, etc.).
        3.  O CTA deve estar alinhado com a motivação e o objetivo da campanha.
        4.  O CTA deve ter no mínimo 8 palavras e no máximo 15 palavras.
        5.  Evite jargões ou termos muito técnicos; o CTA deve ser facilmente compreendido pelo público geral.
        6.  Não use pontuação excessiva (ex: "Compre agora!!!" ou "Clique aqui...").
        7.  Não repita palavras ou ideias entre os CTAs.
        8.  Não use mais de um número em cada CTA (ex: "Compre 1 e ganhe 1" não é permitido).
        9.  Não inclua nenhum elemento que não seja texto (ex: emojis, símbolos).
        10. Não use frases que já foram usadas em outros CTAs famosos ou clichês.
        11.  O formato da resposta deve ser um array JSON de strings. Exemplo: ["CTA 1", "CTA 2", "CTA 3", "CTA 4", "CTA 5"]

        Gere o JSON com as 5 sugestões de CTA.
    `;

    try {
        const response = await geminiAPI.generateContent(prompt);
        // Robustly find the JSON array within the response string
        const match = response.match(/\[(.*?)\]/s);
        if (match) {
            const jsonString = match[0];
            const jsonResponse = JSON.parse(jsonString);
            setCtaSuggestions(jsonResponse);
            setCtaModalOpen(true);
        } else {
            throw new Error("Nenhum array JSON válido encontrado na resposta da IA.");
        }
    } catch (error) {
        toast.error('Erro ao gerar sugestões de CTA.');
        console.error("CTA suggestion error:", error);
        setCtaError('Não foi possível gerar as sugestões. Tente novamente.');
    } finally {
        setLoadingCtaSuggestions(false);
    }
  };

  const handleGenerateAIMessage = async () => {
    if (!geminiAPI.isInitialized) {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error('Chave de API do Gemini não configurada.');
            return;
        }
        geminiAPI.initialize(apiKey);
    }

    const { textoBase, cta, faca, nao_faca } = briefingData;
    if (!textoBase) {
        toast.error('O texto base não pode estar vazio.');
        return;
    }

    const prompt = `
        Elabore uma proposta de "Mensagem Principal" a partir do "Texto Base" a seguir.

        Texto Base: "${textoBase}"

        Siga estas regras rigorosamente:
        1. O texto final deve ter no máximo 250 caracteres.
        2. A mensagem deve ser dividida em no máximo 4 parágrafos, cada um com até 80 caracteres.
        3. Não pode haver repetições de palavras ou ideias.
        4. A mensagem deve conter apenas UM número (ex: "1", "uma vez").
        5. A mensagem NÃO PODE conter NADA que esteja no CTA ("${cta}"), nos DOs ("${faca.join(', ')}") ou nos DON'Ts ("${nao_faca.join(', ')}").

        Retorne apenas o texto da mensagem principal, sem formatação extra, sem introduções ou observações.
    `;

    setIsGeneratingMessage(true);
    try {
        const response = await geminiAPI.generateContent(prompt);
        onBriefingDataChange(prev => ({ ...prev, mensagemPrincipal: response.trim() }));
        setShowTextoBase(false);
        toast.success('Mensagem principal gerada com sucesso!');
    } catch (error) {
        toast.error('Erro ao gerar mensagem com IA.');
        console.error("AI message generation error:", error);
    } finally {
        setIsGeneratingMessage(false);
    }
  };

  if (!open || !briefingData) return null;

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        if (isMobile) {
          return (
            <Box sx={{ p: 1, minHeight: 400 }}>
              <Typography variant="h6" gutterBottom>Qual é a principal motivação?</Typography>
              <RadioGroup
                aria-label="motivacao"
                name="motivacao"
                value={briefingData.motivacao}
                onChange={handleChange}
              >
                <Grid container spacing={2}>
                  {MOTIVACOES.map((motiv) => (
                    <Grid item xs={12} key={motiv.id}>
                      <Paper
                        variant="outlined"
                        onClick={() => onBriefingDataChange(prev => ({ ...prev, motivacao: motiv.id }))}
                        sx={{
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          backgroundColor: briefingData.motivacao === motiv.id ? 'action.selected' : 'background.paper',
                          border: 2,
                          borderColor: briefingData.motivacao === motiv.id ? 'primary.main' : 'divider',
                        }}
                      >
                        <Radio
                          checked={briefingData.motivacao === motiv.id}
                          value={motiv.id}
                          name="motivacao-radio"
                        />
                        <Box ml={1}>
                          <Typography variant="subtitle1" component="div">{motiv.nome}</Typography>
                          <Typography variant="body2" color="text.secondary">{motiv.descricao}</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>
            </Box>
          );
        }
        return (
          <Box sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>Qual é o principal objetivo da sua campanha?</Typography>
            <TableContainer component={Paper}>
              <Table aria-label="tabela de motivações">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Motivação</TableCell>
                    <TableCell>Descrição</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MOTIVACOES.map((motiv) => (
                    <TableRow
                      key={motiv.id}
                      hover
                      onClick={() => onBriefingDataChange(prev => ({ ...prev, motivacao: motiv.id }))}
                      role="radio"
                      aria-checked={briefingData.motivacao === motiv.id}
                      selected={briefingData.motivacao === motiv.id}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Radio
                          checked={briefingData.motivacao === motiv.id}
                          value={motiv.id}
                          name="motivacao-radio"
                        />
                      </TableCell>
                      <TableCell component="th" scope="row">{motiv.nome}</TableCell>
                      <TableCell>{motiv.descricao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>Qual é o produto, serviço ou experiência da sua campanha?</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="marca"
                  label="Marca"
                  fullWidth
                  value={briefingData.marca || ''}
                  onChange={handleChange}
                  inputProps={{ maxLength: 40 }}
                  helperText={`${(briefingData.marca || '').length}/40`}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="produtoServico"
                  label="Produto ou Serviço"
                  fullWidth
                  value={briefingData.produtoServico || ''}
                  onChange={handleChange}
                  inputProps={{ maxLength: 40 }}
                  helperText={`${(briefingData.produtoServico || '').length}/40`}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="descricao"
                  label="Descrição do Produto ou Serviço"
                  fullWidth
                  multiline
                  rows={4}
                  value={briefingData.descricao || ''}
                  onChange={handleChange}
                  inputProps={{ maxLength: 250 }}
                  helperText={`${(briefingData.descricao || '').length}/250`}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        );
      case 2:
        return (
            <Box sx={{ p: 2, minHeight: 400, maxHeight: '70vh', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>Guia da Marca</Typography>
                <Grid container spacing={3}>
                    {/* Tom de Voz */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>Tom de Voz</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Paper variant="outlined" sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 1, flexGrow: 1, minHeight: '40px' }}>
                                {(briefingData.tom_de_voz || []).map((item) => <Chip key={item} label={item} />)}
                                {(briefingData.tom_de_voz || []).length === 0 && <Typography sx={{p:1}} color="text.secondary">Nenhum tom selecionado</Typography>}
                            </Paper>
                            <Button onClick={() => setTomDeVozModalOpen(true)} variant="outlined">Selecionar</Button>
                        </Box>
                    </Grid>
                    {/* DOs e DON'Ts */}
                    <Grid item xs={12} md={6}>
                        <ChipInput label="FAÇA (DOs)" items={briefingData.faca || []} setItems={(v) => handleChipChange('faca', v)} suggestions={SUGESTOES_FACA} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ChipInput label="NÃO FAÇA (DON'Ts)" items={briefingData.nao_faca || []} setItems={(v) => handleChipChange('nao_faca', v)} suggestions={SUGESTOES_NAO_FACA} />
                    </Grid>
                </Grid>
            </Box>
        );
      case 3:
        return (
            <Box sx={{ p: 2, minHeight: 400, maxHeight: '70vh', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>Inspirações</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Adicione links ou descrições de conteúdos que servem como referência ou inspiração para a campanha.
                </Typography>
                <Grid container spacing={3}>
                    {briefingData.inspiracoes.map((inspiracao, index) => (
                        <Grid item xs={12} key={index}>
                            <TextField
                                label={`Inspiração ${index + 1}`}
                                fullWidth
                                value={inspiracao}
                                onChange={(e) => handleInspiracaoChange(index, e.target.value)}
                                inputProps={{ maxLength: 150 }}
                                helperText={`${(inspiracao || '').length}/150`}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
      case 4:
        return (
            <Box sx={{ p: 2, minHeight: 400, maxHeight: '70vh', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>Entregas</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Defina os detalhes sobre os conteúdos a serem produzidos e a logística de envio de produtos, se aplicável.
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            name="quantidadeConteudos"
                            label="Quantidade de Conteúdos"
                            type="number"
                            fullWidth
                            value={briefingData.quantidadeConteudos || 1}
                            onChange={handleChange}
                            InputProps={{ inputProps: { min: 1 } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl component="fieldset">
                           <Typography variant="subtitle2">EGC ou UGC?</Typography>
                            <RadioGroup row name="egcUgc" value={briefingData.egcUgc} onChange={handleChange}>
                                <FormControlLabel value="egc" control={<Radio />} label="EGC" />
                                <FormControlLabel value="ugc" control={<Radio />} label="UGC" />
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl component="fieldset">
                            <Typography variant="subtitle2">Envio de Produtos?</Typography>
                            <RadioGroup row name="envioProdutos" value={briefingData.envioProdutos} onChange={handleChange}>
                                <FormControlLabel value="sim" control={<Radio />} label="Sim" />
                                <FormControlLabel value="não" control={<Radio />} label="Não" />
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                    {briefingData.envioProdutos === 'sim' && (
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="prazoEnvio"
                                label="Prazo de Envio"
                                type="date"
                                fullWidth
                                value={briefingData.prazoEnvio || ''}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    )}
                </Grid>
            </Box>
        );
      case 5: {
        const textoBaseLength = (briefingData.textoBase || '').length;
        let counterColor = 'green';
        if (textoBaseLength > 500) {
            counterColor = 'red';
        } else if (textoBaseLength > 250) {
            counterColor = 'yellow';
        }

        return (
            <Box sx={{ p: 2, minHeight: 400 }}>
                <Typography variant="h6" gutterBottom>Mensagem Principal da Campanha</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                         <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <TextField
                                name="cta"
                                label="CTA (Call to Action)"
                                fullWidth
                                multiline
                                rows={3}
                                value={briefingData.cta || ''}
                                onChange={handleChange}
                                inputProps={{ maxLength: 250 }}
                                helperText={`${(briefingData.cta || '').length}/250`}
                            />
                            <Tooltip title="Gerar Sugestões de CTA com IA">
                                <IconButton color="primary" onClick={handleGenerateCtaSuggestions} sx={{ mt: 1 }}>
                                    <AutoAwesomeIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Grid>

                    {isGeneratingMessage ? (
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                            <CircularProgress />
                            <Typography sx={{ ml: 2 }}>Gerando mensagem...</Typography>
                        </Grid>
                    ) : showTextoBase ? (
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" component="label" htmlFor="texto-base-field" sx={{ fontWeight: 'medium' }}>
                                    Texto Base para a Mensagem Principal
                                </Typography>
                                <InfoBox title="Texto Base para a Mensagem Principal" description={textoBaseDescription} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <TextField
                                    id="texto-base-field"
                                    name="textoBase"
                                    fullWidth
                                    multiline
                                    rows={8}
                                    value={briefingData.textoBase || ''}
                                    onChange={handleChange}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                    <Tooltip title="Revisar Texto Base com IA">
                                        <span>
                                        <IconButton color="primary" onClick={handleReviewTextoBase} disabled={!briefingData.textoBase || loadingTextoBaseReview}>
                                            {loadingTextoBaseReview ? <CircularProgress size={24} /> : <AutoAwesomeIcon />}
                                        </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Gerar Mensagem Principal com IA (usando este texto como base)">
                                        <span>
                                        <IconButton color="secondary" onClick={handleGenerateAIMessage} disabled={!briefingData.textoBase}>
                                            <AutoAwesomeIcon />
                                        </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                            </Box>
                            <Typography variant="caption" sx={{ color: counterColor, fontWeight: 'bold' }}>
                                {textoBaseLength}
                            </Typography>
                            {textoBaseLength > 250 && (
                                <Alert severity="warning" sx={{ mt: 1 }}>
                                    O texto final gerado pela IA será limitado a 250 caracteres, mas não se preocupe, todo o conteúdo que você escreveu será considerado.
                                </Alert>
                            )}
                        </Grid>
                    ) : (
                        <Grid item xs={12}>
                             <Typography variant="subtitle1" gutterBottom>Mensagem Principal (Gerada por IA)</Typography>
                             <Paper elevation={2} sx={{p: 2, mb: 1}}>
                                <Typography sx={{whiteSpace: 'pre-wrap'}}>{briefingData.mensagemPrincipal}</Typography>
                             </Paper>
                             <Button onClick={() => setShowTextoBase(true)} size="small">Voltar e editar texto base</Button>
                        </Grid>
                    )}
                </Grid>
            </Box>
        );
      }
      case 6: {
        const selectedMotivacao = MOTIVACOES.find(m => m.id === briefingData.motivacao);
        return (
            <Box sx={{ p: 2, maxHeight: '70vh', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>Finalização e Revisão</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            name="name"
                            label="Nome do Briefing"
                            fullWidth
                            value={briefingData.name || ''}
                            onChange={handleChange}
                            required
                            helperText="Dê um nome para identificar facilmente este briefing no futuro."
                        />
                    </Grid>
                    <Grid item xs={12}><Divider>Resumo do Briefing</Divider></Grid>

                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom><strong>Objetivo da Campanha</strong></Typography>
                        <Typography>{selectedMotivacao ? selectedMotivacao.nome : 'Não definido'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom><strong>Produto, Serviço ou Experiência</strong></Typography>
                        <Typography>{briefingData.marca || 'N/A'} / {briefingData.produtoServico || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom><strong>Descrição</strong></Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', maxHeight: 80, overflowY: 'auto' }}>{briefingData.descricao || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom><strong>Tom de Voz</strong></Typography>
                        <Typography>{(briefingData.tom_de_voz || []).join(', ') || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom><strong>Tipo de Conteúdo</strong></Typography>
                        <Typography>{briefingData.egcUgc === 'egc' ? 'EGC' : 'UGC'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom><strong>Envio de Produtos</strong></Typography>
                        <Typography>{briefingData.envioProdutos === 'sim' ? `Sim (Prazo: ${briefingData.prazoEnvio || 'N/A'})` : 'Não'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom><strong>Quantidade</strong></Typography>
                        <Typography>{briefingData.quantidadeConteudos || 1}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom><strong>Inspirações</strong></Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {briefingData.inspiracoes.filter(i => i).map((i, index) => <li key={index}><Typography variant="body2">{i}</Typography></li>)}
                            {briefingData.inspiracoes.filter(i => i).length === 0 && <Typography variant="body2">Nenhuma</Typography>}
                        </Box>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom><strong>Mensagem Principal</strong></Typography>
                        <Paper variant="outlined" sx={{ p: 1, whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto', backgroundColor: 'action.hover' }}>
                            {briefingData.mensagemPrincipal || 'Nenhuma mensagem gerada.'}
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        );
      }
      default:
        return <Box sx={{ p: 2, minHeight: 400 }}><Typography>Step {step + 1} Content</Typography></Box>;
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Assistente de Criação de Briefing</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => (
                <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                </Step>
            ))}
        </Stepper>
        {renderStepContent(activeStep)}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={onClose} color="secondary">Cancelar</Button>
          <Box>
            <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<ArrowBack />}>Anterior</Button>
            {activeStep < TOTAL_STEPS - 1 && <Button onClick={handleNext} endIcon={<ArrowForward />} sx={{ ml: 1 }}>Próximo</Button>}
            {activeStep === TOTAL_STEPS - 1 && <Button onClick={onSave} variant="contained" color="primary" sx={{ ml: 2 }}>Salvar Briefing</Button>}
          </Box>
        </Box>
      </DialogContent>
      <TomDeVozModal
        open={tomDeVozModalOpen}
        onClose={() => setTomDeVozModalOpen(false)}
        selectedTones={briefingData.tom_de_voz || []}
        onSave={(newTones) => handleChipChange('tom_de_voz', newTones)}
      />
      <SuggestionModal
        open={ctaModalOpen}
        onClose={() => setCtaModalOpen(false)}
        title="Sugestões de Call-to-Action (CTA)"
        suggestionTitle="Sugestões Geradas pela IA"
        suggestionDescription="Clique em uma sugestão para usá-la no seu briefing."
        bestPractices={ctaBestPractices}
        suggestions={ctaSuggestions}
        onSelectSuggestion={(suggestion) => {
          onBriefingDataChange(prev => ({ ...prev, cta: suggestion }));
          setCtaModalOpen(false);
        }}
        onRegenerate={handleGenerateCtaSuggestions}
        loading={loadingCtaSuggestions}
        error={ctaError}
      />
      <ReviewSuggestionModal
        open={textoBaseReviewModalOpen}
        onClose={() => setTextoBaseReviewModalOpen(false)}
        review={textoBaseReview}
        originalText={briefingData.textoBase}
        onSelectSuggestion={(suggestion) => {
          onBriefingDataChange(prev => ({ ...prev, textoBase: suggestion }));
          setTextoBaseReviewModalOpen(false);
        }}
      />
    </Dialog>
  );
};

export default BriefingWizard;