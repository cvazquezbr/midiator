import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, IconButton, Tooltip, Paper, Dialog, DialogTitle, DialogContent, CircularProgress, Radio, RadioGroup, FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, useMediaQuery, Alert, Stepper, Step, StepLabel, Switch
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add, ArrowBack, ArrowForward, AutoAwesome as AutoAwesomeIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import noCameraSvg from '../assets/no-camera.svg';
import TomDeVozModal, { TONS_DE_VOZ_DATA } from './TomDeVozModal';
import SuggestionModal from './SuggestionModal';
import ProductSuggestionModal from './ProductSuggestionModal';
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
  productUrl: '',
  produtoServico: '',
  descricao: '',
  // Step 3: Referencias
  tom_de_voz: [],
  faca: SUGESTOES_FACA,
  nao_faca: SUGESTOES_NAO_FACA,
  // Step 4: Entregas - This is now an array of objects
  entregas: [{
    quantidade: 1,
    tipo: '',
    envioProdutos: false,
    mensagemPrincipal: '',
    cta: '',
  }],
  // Step 5: Inspiracoes
  inspiracoes: [{ description: '', link: '', screenshotUrl: '' }],
  // Step 6: Finalizacao (revisão)
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
    'Entregas',
    'Inspiração',
    'Finalização'
];

const BriefingWizard = ({ open, onClose, onSave, briefingData, onBriefingDataChange, initialStep = 0 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(initialStep);
  const [tomDeVozModalOpen, setTomDeVozModalOpen] = useState(false);
  const [productSuggestionModalOpen, setProductSuggestionModalOpen] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [loadingProductSuggestions, setLoadingProductSuggestions] = useState(false);
  const [messageSuggestionModalOpen, setMessageSuggestionModalOpen] = useState(false);
  const [messageSuggestions, setMessageSuggestions] = useState([]);
  const [loadingMessageSuggestions, setLoadingMessageSuggestions] = useState(false);
  const [ctaSuggestionModalOpen, setCtaSuggestionModalOpen] = useState(false);
  const [ctaSuggestions, setCtaSuggestions] = useState([]);
  const [loadingCtaSuggestions, setLoadingCtaSuggestions] = useState(false);
  const [activeEntregaIndex, setActiveEntregaIndex] = useState(null);


  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  const TOTAL_STEPS = 6;

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

  const handleEntregaChange = (index, field, value) => {
    const newEntregas = [...briefingData.entregas];
    newEntregas[index][field] = value;
    onBriefingDataChange(prev => ({ ...prev, entregas: newEntregas }));
  };

  const handleAddEntrega = () => {
    const newEntregas = [...(briefingData.entregas || []), {
        quantidade: 1,
        tipo: '',
        envioProdutos: false,
        mensagemPrincipal: '',
        cta: '',
      }];
    onBriefingDataChange(prev => ({ ...prev, entregas: newEntregas }));
  };

  const handleRemoveEntrega = (index) => {
    if (briefingData.entregas.length <= 1) {
        toast.info('É necessário ter pelo menos uma entrega.');
        return;
    }
    const newEntregas = briefingData.entregas.filter((_, i) => i !== index);
    onBriefingDataChange(prev => ({ ...prev, entregas: newEntregas }));
  };

  const handleInspiracaoChange = (index, field, value) => {
    const newInspiracoes = [...briefingData.inspiracoes];
    newInspiracoes[index][field] = value;
    onBriefingDataChange(prev => ({ ...prev, inspiracoes: newInspiracoes }));
  };

  const handleAddInspiracao = () => {
      if ((briefingData.inspiracoes || []).length >= 3) {
        toast.info('Você pode adicionar no máximo 3 inspirações.');
        return;
      }
      const newInspiracoes = [...briefingData.inspiracoes, { description: '', link: '', screenshotUrl: '' }];
      onBriefingDataChange(prev => ({ ...prev, inspiracoes: newInspiracoes }));
  };

  const handleRemoveInspiracao = (index) => {
      const newInspiracoes = briefingData.inspiracoes.filter((_, i) => i !== index);
      onBriefingDataChange(prev => ({ ...prev, inspiracoes: newInspiracoes }));
  };

  const handleLinkBlur = (index, link) => {
    if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
      const screenshotUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(link)}?w=400`;
      handleInspiracaoChange(index, 'screenshotUrl', screenshotUrl);
    } else {
      handleInspiracaoChange(index, 'screenshotUrl', ''); // Clear screenshot if link is invalid
    }
  };


  const handleGenerateProductSuggestions = async () => {
    if (!geminiAPI.isInitialized) {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error('Chave de API do Gemini não configurada.');
            return;
        }
        geminiAPI.initialize(apiKey);
    }

    setLoadingProductSuggestions(true);
    setProductSuggestions([]);
    setProductSuggestionModalOpen(true); // Open modal to show loading state

    const { productUrl } = briefingData;

    const prompt = `
      Aja como um especialista em copywriting e marketing de produto. Sua tarefa é analisar o conteúdo da URL fornecida e, a partir dela, criar 3 propostas de marketing para um produto ou serviço.

      URL para análise: ${productUrl}

      Para cada proposta, você deve gerar:
      1.  **"produtoServico"**: Um nome ou título curto para o produto/serviço. **Limite rigoroso de 40 caracteres.**
      2.  **"descricao"**: Uma descrição concisa e atraente. **Limite rigoroso de 250 caracteres.**

      **Instruções Importantes:**
      - O objetivo é resumir e otimizar a mensagem principal da página, não apenas truncar o texto.
      - As propostas devem ser distintas entre si, explorando ângulos diferentes (ex: uma focada em benefício, outra em funcionalidade, outra em um apelo emocional).
      - Sua resposta DEVE ser um objeto JSON válido, contendo um array chamado "propostas". Não inclua nenhum texto, explicação ou formatação fora do JSON.

      **Formato da Resposta (JSON):**
      {
        "propostas": [
          {
            "produtoServico": "Exemplo de Produto 1",
            "descricao": "Descrição da primeira proposta, focada em resolver um problema específico do cliente."
          },
          {
            "produtoServico": "Exemplo de Produto 2",
            "descricao": "Descrição da segunda proposta, destacando o principal diferencial competitivo do produto."
          },
          {
            "produtoServico": "Exemplo de Produto 3",
            "descricao": "Descrição da terceira proposta, com uma abordagem mais aspiracional e conectada ao estilo de vida."
          }
        ]
      }
    `;

    try {
        const response = await geminiAPI.generateContent(prompt);
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const jsonString = match[0];
            const jsonResponse = JSON.parse(jsonString);
            if (jsonResponse.propostas && jsonResponse.propostas.length > 0) {
                setProductSuggestions(jsonResponse.propostas);
            } else {
                throw new Error("A resposta da IA não contém a estrutura de 'propostas' esperada.");
            }
        } else {
            throw new Error("Nenhum JSON válido encontrado na resposta da IA.");
        }
    } catch (error) {
        toast.error('Erro ao gerar sugestões de produto.');
        console.error("Product suggestion error:", error);
        setProductSuggestionModalOpen(false); // Close modal on error
    } finally {
        setLoadingProductSuggestions(false);
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

  const handleGenerateMessageSuggestions = async (entregaIndex) => {
    if (!geminiAPI.isInitialized) {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            toast.error('Chave de API do Gemini não configurada.');
            return;
        }
        geminiAPI.initialize(apiKey);
    }

    setLoadingMessageSuggestions(true);
    setActiveEntregaIndex(entregaIndex);
    setMessageSuggestions([]);

    const { motivacao, faca, nao_faca, tom_de_voz } = briefingData;
    const entrega = briefingData.entregas[entregaIndex];
    const motivacaoObj = MOTIVACOES.find(m => m.id === motivacao);

    // Find the detailed tone of voice object
    const selectedToneName = (tom_de_voz || [])[0]; // Assuming only one can be selected
    const toneOfVoiceData = TONS_DE_VOZ_DATA.find(t => t.tom === selectedToneName);

    // Build the detailed tone of voice string for the prompt
    let toneOfVoicePromptSection = `1.4. TOM DE VOZ - ${selectedToneName || 'Não definido'}`;
    if (toneOfVoiceData) {
        toneOfVoicePromptSection += `
        1.4.1. QUANDO USAR: ${toneOfVoiceData.quando}
        1.4.2. COMO SOA: ${toneOfVoiceData.como}
        1.4.3. EXEMPLO: ${toneOfVoiceData.exemplo}`;
    }

    const prompt = `
      Aja como um especialista em comunicação e marketing. Sua tarefa é gerar 2 sugestões de texto para uma campanha de marketing.

      **INSTRUÇÕES PARA SUA ANÁLISE INTERNA (NÃO INCLUA ISSO NA RESPOSTA):**
      1.  Analise o "Texto Base" do usuário.
      2.  Avalie se ele está alinhado com o "Objetivo Principal", "DOS", "DON'TS" e "TOM DE VOZ" fornecidos.
      3.  Use essa análise para criar duas novas versões do texto.

      **CONTEXTO FORNECIDO:**
      - **Objetivo Principal:** ${motivacaoObj ? motivacaoObj.nome : 'Não definido'}
      - **Texto Base do Usuário:** "${entrega.mensagemPrincipal}"
      - **DOS (O que fazer):** ${faca.join(', ')}
      - **DON'TS (O que não fazer):** ${nao_faca.join(', ')}
      - **TOM DE VOZ:**
          - NOME: ${selectedToneName || 'Não definido'}
          - QUANDO USAR: ${toneOfVoiceData ? toneOfVoiceData.quando : 'N/A'}
          - COMO SOA: ${toneOfVoiceData ? toneOfVoiceData.como : 'N/A'}
          - EXEMPLO: ${toneOfVoiceData ? toneOfVoiceData.exemplo : 'N/A'}

      **REQUISITOS PARA AS SUGESTÕES GERADAS:**
      1.  **Aderência:** As sugestões devem estar fortemente alinhadas ao contexto fornecido (Objetivo, Tom de Voz, etc.).
      2.  **Clareza:** Use uma estrutura de tópicos. As sugestões devem ser sintéticas, objetivas e sem repetições.
      3.  **Simplicidade:** Cada sugestão deve ter no máximo 3 tópicos.

      **FORMATO DA RESPOSTA FINAL:**
      Sua resposta DEVE ser APENAS um objeto JSON válido, sem nenhum texto, markdown, ou qualquer formatação adicional antes ou depois. Use EXATAMENTE a seguinte estrutura:
      {
        "sugestoes": ["Sugestão 1 em formato de string", "Sugestão 2 em formato de string"]
      }
    `;

    try {
        const response = await geminiAPI.generateContent(prompt);
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const jsonString = match[0];
            const jsonResponse = JSON.parse(jsonString);
            if (jsonResponse.sugestoes && jsonResponse.sugestoes.length > 0) {
                setMessageSuggestions(jsonResponse.sugestoes);
                setMessageSuggestionModalOpen(true);
            } else {
                 throw new Error("A resposta da IA não contém a estrutura de 'sugestoes' esperada.");
            }
        } else {
            throw new Error("Nenhum JSON válido encontrado na resposta da IA.");
        }
    } catch (error) {
        toast.error('Erro ao gerar sugestões de mensagem.');
        console.error("Message suggestion error:", error);
    } finally {
        setLoadingMessageSuggestions(false);
    }
  };

  const handleGenerateCtaSuggestions = async (entregaIndex) => {
    if (!geminiAPI.isInitialized) {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        toast.error('Chave de API do Gemini não configurada.');
        return;
      }
      geminiAPI.initialize(apiKey);
    }

    setLoadingCtaSuggestions(true);
    setActiveEntregaIndex(entregaIndex);
    setCtaSuggestions([]);

    const { motivacao, produtoServico, descricao, tom_de_voz, faca, nao_faca } = briefingData;
    const entrega = briefingData.entregas[entregaIndex];
    const motivacaoObj = MOTIVACOES.find(m => m.id === motivacao);

    // Find the detailed tone of voice object
    const selectedToneName = (tom_de_voz || [])[0];
    const toneOfVoiceData = TONS_DE_VOZ_DATA.find(t => t.tom === selectedToneName);

    // Build the detailed tone of voice string for the prompt
    let toneOfVoicePromptSection = `Tom de Voz: ${selectedToneName || 'Não definido'}`;
    if (toneOfVoiceData) {
        toneOfVoicePromptSection += `\n    - QUANDO USAR: ${toneOfVoiceData.quando}\n    - COMO SOA: ${toneOfVoiceData.como}\n    - EXEMPLO: ${toneOfVoiceData.exemplo}`;
    }

    const prompt = `
        Aja como um especialista em marketing digital. Com base nas seguintes informações de um briefing de campanha, gere 3 sugestões de Call-to-Action (CTA) curtas e eficazes.

        **Contexto da Campanha:**
        - **Objetivo Principal:** ${motivacaoObj ? motivacaoObj.nome : 'Não definido'}
        - **Produto/Serviço:** ${produtoServico || 'Não definido'}
        - **Descrição do Produto/Serviço:** ${descricao || 'Não definida'}
        - **Tom de Voz Desejado:**
          - ${toneOfVoicePromptSection}
        - **DOS:** ${faca.join(', ')}
        - **DONTS:** ${nao_faca.join(', ')}
        - **Mensagem Principal:** ${entrega.mensagemPrincipal || 'Não definida'}

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
        11.  O formato da resposta deve ser um array JSON de strings. Exemplo: ["CTA 1", "CTA 2", "CTA 3"]

        Gere o JSON com as 3 sugestões de CTA.
    `;

    try {
        const response = await geminiAPI.generateContent(prompt);
        const match = response.match(/\[(.*?)\]/s);
        if (match) {
            const jsonString = `[${match[1]}]`;
            const jsonResponse = JSON.parse(jsonString);
            setCtaSuggestions(jsonResponse);
            setCtaSuggestionModalOpen(true);
        } else {
            throw new Error("Nenhum array JSON válido encontrado na resposta da IA.");
        }
    } catch (error) {
        toast.error('Erro ao gerar sugestões de CTA.');
        console.error("CTA suggestion error:", error);
    } finally {
        setLoadingCtaSuggestions(false);
    }
  };

  if (!open || !briefingData) return null;

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Objetivo
        if (isMobile) {
          return (
            <Box sx={{ p: 1, minHeight: 400 }}>
              <Typography variant="h6" gutterBottom>Qual é a principal motivação?</Typography>
              <RadioGroup aria-label="motivacao" name="motivacao" value={briefingData.motivacao} onChange={handleChange}>
                <Grid container spacing={2}>
                  {MOTIVACOES.map((motiv) => (
                    <Grid item xs={12} key={motiv.id}>
                      <Paper
                        variant="outlined"
                        onClick={() => onBriefingDataChange(prev => ({ ...prev, motivacao: motiv.id }))}
                        sx={{ p: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', backgroundColor: briefingData.motivacao === motiv.id ? 'action.selected' : 'background.paper', border: 2, borderColor: briefingData.motivacao === motiv.id ? 'primary.main' : 'divider' }}
                      >
                        <Radio checked={briefingData.motivacao === motiv.id} value={motiv.id} name="motivacao-radio" />
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
                    <TableRow key={motiv.id} hover onClick={() => onBriefingDataChange(prev => ({ ...prev, motivacao: motiv.id }))} role="radio" aria-checked={briefingData.motivacao === motiv.id} selected={briefingData.motivacao === motiv.id} sx={{ cursor: 'pointer' }}>
                      <TableCell padding="checkbox"><Radio checked={briefingData.motivacao === motiv.id} value={motiv.id} name="motivacao-radio" /></TableCell>
                      <TableCell component="th" scope="row">{motiv.nome}</TableCell>
                      <TableCell>{motiv.descricao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      case 1: // Produto
        return (
          <Box sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>Qual é o produto, serviço ou experiência da sua campanha?</Typography>
            <Grid container spacing={3}>
               <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Link do Produto (Opcional)</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <TextField
                    name="productUrl"
                    label="Cole aqui o link do produto ou serviço"
                    fullWidth
                    value={briefingData.productUrl || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                  <Tooltip title="Analisar link e gerar sugestões com IA">
                    <span>
                      <IconButton
                        color="primary"
                        onClick={handleGenerateProductSuggestions}
                        disabled={!briefingData.productUrl || loadingProductSuggestions}
                        sx={{ mt: 1 }}
                      >
                        {loadingProductSuggestions ? <CircularProgress size={24} /> : <AutoAwesomeIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12}>
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
      case 2: // Guia da Marca
        return (
            <Box sx={{ p: 2, minHeight: 400, maxHeight: '70vh', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>Guia da Marca</Typography>
                <Grid container spacing={3}>
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
                    <Grid item xs={12} md={6}>
                        <ChipInput label="FAÇA (DOs)" items={briefingData.faca || []} setItems={(v) => handleChipChange('faca', v)} suggestions={SUGESTOES_FACA} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ChipInput label="NÃO FAÇA (DON'Ts)" items={briefingData.nao_faca || []} setItems={(v) => handleChipChange('nao_faca', v)} suggestions={SUGESTOES_NAO_FACA} />
                    </Grid>
                </Grid>
            </Box>
        );
      case 3: // Entregas
        return (
            <Box sx={{ p: 2, minHeight: 400, maxHeight: '70vh', overflowY: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Entregas</Typography>
                    <Button startIcon={<Add />} onClick={handleAddEntrega} variant="contained">Adicionar Entrega</Button>
                </Box>
                <Grid container spacing={3}>
                    {(briefingData.entregas || []).map((entrega, index) => (
                        <Grid item xs={12} key={index}>
                            <Paper variant="outlined" sx={{ p: 3, position: 'relative' }}>
                                <IconButton
                                    aria-label="delete"
                                    onClick={() => handleRemoveEntrega(index)}
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                    disabled={briefingData.entregas.length <= 1}
                                >
                                    <DeleteIcon />
                                </IconButton>
                                <Typography variant="h6" gutterBottom>Entrega #{index + 1}</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            label="Quantidade"
                                            type="number"
                                            fullWidth
                                            value={entrega.quantidade}
                                            onChange={(e) => handleEntregaChange(index, 'quantidade', parseInt(e.target.value, 10))}
                                            InputProps={{ inputProps: { min: 1 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={8}>
                                        <TextField
                                            label="Tipo"
                                            fullWidth
                                            value={entrega.tipo}
                                            onChange={(e) => handleEntregaChange(index, 'tipo', e.target.value)}
                                            inputProps={{ maxLength: 40 }}
                                            helperText={`${(entrega.tipo || '').length}/40`}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={entrega.envioProdutos}
                                                    onChange={(e) => handleEntregaChange(index, 'envioProdutos', e.target.checked)}
                                                />
                                            }
                                            label="Há envio de produtos para esta entrega?"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <TextField
                                              label="Mensagem Principal"
                                              fullWidth
                                              multiline
                                              rows={4}
                                              value={entrega.mensagemPrincipal}
                                              onChange={(e) => handleEntregaChange(index, 'mensagemPrincipal', e.target.value)}
                                              placeholder="Digite o texto base aqui ou clique no botão para gerar sugestões com IA."
                                            />
                                            <Tooltip title="Gerar sugestões para a Mensagem Principal com IA">
                                                <span>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => handleGenerateMessageSuggestions(index)}
                                                        disabled={(loadingMessageSuggestions && activeEntregaIndex === index) || !entrega.mensagemPrincipal}
                                                    >
                                                        {loadingMessageSuggestions && activeEntregaIndex === index ? <CircularProgress size={24} /> : <AutoAwesomeIcon />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TextField
                                              label="CTA (Call to Action)"
                                              fullWidth
                                              value={entrega.cta}
                                              onChange={(e) => handleEntregaChange(index, 'cta', e.target.value)}
                                            />
                                            <Tooltip title="Gerar sugestões de CTA com IA">
                                                <span>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => handleGenerateCtaSuggestions(index)}
                                                        disabled={loadingCtaSuggestions && activeEntregaIndex === index}
                                                    >
                                                        {loadingCtaSuggestions && activeEntregaIndex === index ? <CircularProgress size={24} /> : <AutoAwesomeIcon />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
      case 4: // Inspiração
        return (
            <Box sx={{ p: 2, minHeight: 400, maxHeight: '70vh', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>Inspirações</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Adicione links de conteúdos que servem como referência. A aplicação tentará gerar uma miniatura da página.</Typography>
                <Grid container spacing={3}>
                    {(briefingData.inspiracoes || []).map((inspiracao, index) => (
                        <Grid item xs={12} key={index}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} md={9}>
                                        <TextField
                                            label="O que você quer usar de referência desse link? (opcional)"
                                            fullWidth
                                            value={inspiracao.description}
                                            onChange={(e) => handleInspiracaoChange(index, 'description', e.target.value)}
                                            inputProps={{ maxLength: 80 }}
                                            helperText={`${(inspiracao.description || '').length}/80`}
                                            sx={{ mb: 2 }}
                                        />
                                        <TextField
                                            label="Link"
                                            fullWidth
                                            value={inspiracao.link}
                                            onChange={(e) => handleInspiracaoChange(index, 'link', e.target.value)}
                                            onBlur={(e) => handleLinkBlur(index, e.target.value)}
                                            placeholder="https://exemplo.com"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
                                        <a href={inspiracao.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                            <Box
                                                component="img"
                                                sx={{
                                                    width: '100%',
                                                    aspectRatio: '16/9',
                                                    objectFit: 'cover',
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    cursor: inspiracao.link ? 'pointer' : 'default',
                                                    backgroundColor: 'grey.200'
                                                }}
                                                src={inspiracao.screenshotUrl || noCameraSvg}
                                                alt={inspiracao.screenshotUrl ? `Screenshot de ${inspiracao.link}` : 'Nenhuma imagem disponível'}
                                                onError={(e) => { e.target.onerror = null; e.target.src = noCameraSvg; }}
                                            />
                                        </a>
                                    </Grid>
                                    <Grid item xs={12} sx={{ textAlign: 'right' }}>
                                        <IconButton onClick={() => handleRemoveInspiracao(index)} color="error" size="small"><DeleteIcon /></IconButton>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    ))}
                    <Grid item xs={12}>
                        <Button startIcon={<Add />} onClick={handleAddInspiracao} disabled={(briefingData.inspiracoes || []).length >= 3}>Adicionar Inspiração</Button>
                    </Grid>
                </Grid>
            </Box>
        );
      case 5: { // Finalização
        const selectedMotivacao = MOTIVACOES.find(m => m.id === briefingData.motivacao);
        return (
            <Box sx={{ p: 2, maxHeight: '70vh', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>Finalização e Revisão</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField name="name" label="Nome do Briefing" fullWidth value={briefingData.name || ''} onChange={handleChange} required helperText="Dê um nome para identificar facilmente este briefing no futuro." />
                    </Grid>
                    <Grid item xs={12}><Divider>Resumo do Briefing</Divider></Grid>
                    <Grid item xs={12} md={6}><Typography variant="subtitle2" gutterBottom><strong>Objetivo da Campanha</strong></Typography><Typography>{selectedMotivacao ? selectedMotivacao.nome : 'Não definido'}</Typography></Grid>
                    <Grid item xs={12} md={6}><Typography variant="subtitle2" gutterBottom><strong>Produto, Serviço ou Experiência</strong></Typography><Typography>{briefingData.produtoServico || 'N/A'}</Typography></Grid>
                    <Grid item xs={12}><Typography variant="subtitle2" gutterBottom><strong>Descrição</strong></Typography><Typography sx={{ whiteSpace: 'pre-wrap', maxHeight: 80, overflowY: 'auto' }}>{briefingData.descricao || 'N/A'}</Typography></Grid>
                    <Grid item xs={12} md={6}><Typography variant="subtitle2" gutterBottom><strong>Tom de Voz</strong></Typography><Typography>{(briefingData.tom_de_voz || []).join(', ') || 'N/A'}</Typography></Grid>
                    <Grid item xs={12}><Typography variant="subtitle2" gutterBottom><strong>Inspirações</strong></Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {(briefingData.inspiracoes || []).filter(i => i.link).map((i, index) => (
                                <li key={index}>
                                    <Typography variant="body2">
                                        {i.description ? `${i.description} (` : ''}
                                        <a href={i.link} target="_blank" rel="noopener noreferrer">{i.link}</a>
                                        {i.description ? ')' : ''}
                                    </Typography>
                                </li>
                            ))}
                            {(briefingData.inspiracoes || []).filter(i => i.link).length === 0 && <Typography variant="body2">Nenhuma</Typography>}
                        </Box>
                    </Grid>
                    <Grid item xs={12}><Divider>Entregas</Divider></Grid>
                     {(briefingData.entregas || []).map((entrega, index) => (
                        <Grid item xs={12} key={index}>
                            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                                <Typography variant="subtitle1" gutterBottom><strong>Entrega #{index + 1}: {entrega.tipo}</strong></Typography>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}><Typography variant="body2"><strong>Quantidade:</strong> {entrega.quantidade}</Typography></Grid>
                                    <Grid item xs={6}><Typography variant="body2"><strong>Envio de Produtos:</strong> {entrega.envioProdutos ? 'Sim' : 'Não'}</Typography></Grid>
                                    <Grid item xs={12}><Typography variant="body2"><strong>CTA:</strong> {entrega.cta || 'N/A'}</Typography></Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2"><strong>Mensagem Principal:</strong></Typography>
                                        <Paper variant="outlined" sx={{ p: 1, whiteSpace: 'pre-wrap', maxHeight: 100, overflowY: 'auto', backgroundColor: 'action.hover' }}>
                                            {entrega.mensagemPrincipal || 'Nenhuma mensagem gerada.'}
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    ))}
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
        open={messageSuggestionModalOpen}
        onClose={() => setMessageSuggestionModalOpen(false)}
        title="Sugestões para Mensagem Principal"
        suggestionTitle="Sugestões Geradas pela IA"
        suggestionDescription="Clique em uma sugestão para usá-la como sua Mensagem Principal."
        suggestions={messageSuggestions}
        onSelectSuggestion={(suggestion) => {
          handleEntregaChange(activeEntregaIndex, 'mensagemPrincipal', suggestion);
          setMessageSuggestionModalOpen(false);
        }}
        onRegenerate={() => handleGenerateMessageSuggestions(activeEntregaIndex)}
        loading={loadingMessageSuggestions}
        error={null}
      />
      <SuggestionModal
        open={ctaSuggestionModalOpen}
        onClose={() => setCtaSuggestionModalOpen(false)}
        title="Sugestões de Call-to-Action (CTA)"
        suggestionTitle="Sugestões Geradas pela IA"
        suggestionDescription="Clique em uma sugestão para usá-la no seu briefing."
        bestPractices={ctaBestPractices}
        suggestions={ctaSuggestions}
        onSelectSuggestion={(suggestion) => {
          handleEntregaChange(activeEntregaIndex, 'cta', suggestion);
          setCtaSuggestionModalOpen(false);
        }}
        onRegenerate={() => handleGenerateCtaSuggestions(activeEntregaIndex)}
        loading={loadingCtaSuggestions}
        error={null}
      />
      <ProductSuggestionModal
        open={productSuggestionModalOpen}
        onClose={() => setProductSuggestionModalOpen(false)}
        suggestions={productSuggestions}
        loading={loadingProductSuggestions}
        onRegenerate={handleGenerateProductSuggestions}
        onSelectSuggestion={(suggestion) => {
          onBriefingDataChange(prev => ({
            ...prev,
            produtoServico: suggestion.produtoServico,
            descricao: suggestion.descricao,
          }));
          setProductSuggestionModalOpen(false);
        }}
      />
    </Dialog>
  );
};

export default BriefingWizard;