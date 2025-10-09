import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, IconButton, Tooltip, Paper, Dialog, DialogTitle, DialogContent, CircularProgress, Radio, RadioGroup, FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, useMediaQuery, Alert, Stepper, Step, StepLabel, Switch, Tabs, Tab
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add, ArrowBack, ArrowForward, AutoAwesome as AutoAwesomeIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import noCameraSvg from '../assets/no-camera.svg';
import AISuggestionModal from './AISuggestionModal';
import BriefingTemplateModal from './BriefingTemplateModal';
import InfoBox from './InfoBox';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';
import TextEditor from './TextEditor';
import { diffChars } from 'diff';

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
  // Step 4: Saudacao
  saudacao: '',
  // Step 5: Entregas - This is now an array of objects
  entregas: [{
    quantidade: 1,
    tipo: '',
    envioProdutos: false,
    prazoDias: '', // Prazo em dias para envio
    mensagemPrincipal: '',
    cta: '',
  }],
  // Step 5: Inspiracoes
  inspiracoes: [{ description: '', link: '', screenshotUrl: '' }],
  // Step 6: Finalizacao (revisão)
};

const TONS_DE_VOZ_DATA = [
  { tom: 'Próximo e Humano', quando: 'Para criar vínculo emocional, campanhas de lifestyle, bem-estar, cuidado.', como: 'Empático, acolhedor, acessível.', exemplo: '“A gente sabe que sua rotina é corrida, por isso criamos essa solução rápida e prática.”' },
  { tom: 'Inspirador e Aspiracional', quando: 'Quando a marca quer elevar autoestima, estilo de vida ou conquistas.', como: 'Motivador, positivo, sonhador.', exemplo: '“Mais que um produto, é um convite para você viver sua melhor versão.”' },
  { tom: 'Didático e Prático', quando: 'Em instruções, briefings de UGC, passo a passo, orientações claras.', como: 'Objetivo, simples, direto.', exemplo: '“Passo 1: escolha o formato. Passo 2: grave em boa luz. Passo 3: suba seu vídeo na plataforma.”' },
  { tom: 'Cool e Descolado', quando: 'Para públicos jovens, moda, música, drinks, cultura pop.', como: 'Leve, divertido, atual.', exemplo: '“Tá liberado soltar a criatividade e mostrar seu estilo único. A gente quer ver a sua versão mais autêntica!”' },
  { tom: 'Profissional e Objetivo', quando: 'Em contextos mais sérios: saúde, finanças, B2B, campanhas institucionais.', como: 'Confiante, claro, responsável.', exemplo: '“Nosso compromisso é entregar qualidade com segurança. Participe e leve sua experiência ao próximo nível.”' },
];

const ChecklistChipEditor = ({ label, items, setItems, suggestions }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddItem = (item) => {
    if (item && !items.includes(item)) {
      setItems([...items, item]);
    }
  };

  const handleRemoveItem = (itemToRemove) => {
    setItems(items.filter((item) => item !== itemToRemove));
  };

  const handleCustomAdd = () => {
    if (inputValue) {
      handleAddItem(inputValue);
      setInputValue('');
    }
  };

  const handleSuggestionToggle = (suggestion) => {
    if (items.includes(suggestion)) {
      handleRemoveItem(suggestion);
    } else {
      handleAddItem(suggestion);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>{label}</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          label="Adicionar item customizado"
          fullWidth
          onKeyPress={(e) => e.key === 'Enter' && handleCustomAdd()}
        />
        <Button onClick={handleCustomAdd} variant="contained" startIcon={<Add />}>Adicionar</Button>
      </Box>

      <Typography variant="subtitle1" gutterBottom>Sugestões</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1}>
          {suggestions.map((suggestion) => (
            <Grid item xs={12} sm={6} key={suggestion}>
              <FormControlLabel
                control={
                  <Switch
                    checked={items.includes(suggestion)}
                    onChange={() => handleSuggestionToggle(suggestion)}
                  />
                }
                label={suggestion}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Typography variant="subtitle1" gutterBottom>Itens Aplicados</Typography>
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '48px' }}>
        {items.length > 0 ? items.map((item) => (
          <Chip key={item} label={item} onDelete={() => handleRemoveItem(item)} />
        )) : (
          <Typography color="text.secondary">Nenhum item aplicado.</Typography>
        )}
      </Paper>
    </Box>
  );
};

const steps = [
  'Objetivo da Campanha',
  'Produto, Serviço ou Experiência',
  'Guia da Marca',
  'Saudação',
  'Entregas',
  'Inspiração',
  'Revisar e Refinar',
  'Finalização'
];

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`brand-guide-tabpanel-${index}`}
      aria-labelledby={`brand-guide-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const BriefingWizard = ({ open, onClose, onSave, briefingData, onBriefingDataChange, initialStep = 0 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(initialStep);
  const [productSuggestionModalOpen, setProductSuggestionModalOpen] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [loadingProductSuggestions, setLoadingProductSuggestions] = useState(false);
  const [messageSuggestionModalOpen, setMessageSuggestionModalOpen] = useState(false);
  const [messageSuggestions, setMessageSuggestions] = useState([]);
  const [loadingMessageSuggestions, setLoadingMessageSuggestions] = useState(false);
  const [ctaSuggestionModalOpen, setCtaSuggestionModalOpen] = useState(false);
  const [ctaSuggestions, setCtaSuggestions] = useState([]);
  const [loadingCtaSuggestions, setLoadingCtaSuggestions] = useState(false);
  const [saudacaoSuggestionModalOpen, setSaudacaoSuggestionModalOpen] = useState(false);
  const [saudacaoSuggestions, setSaudacaoSuggestions] = useState([]);
  const [loadingSaudacaoSuggestions, setLoadingSaudacaoSuggestions] = useState(false);
  const [activeEntregaIndex, setActiveEntregaIndex] = useState(null);
  const [editedBriefingText, setEditedBriefingText] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [brandGuideTab, setBrandGuideTab] = useState(0);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [reviewSuggestions, setReviewSuggestions] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);


  const handleSaveTemplate = (templateData) => {
    // This function receives the data from the modal and applies it to the current briefing.
    onBriefingDataChange(prev => {
      const newEntregas = [...prev.entregas];
      // Ensure there's at least one "entrega" to apply the template to.
      if (newEntregas.length === 0) {
        newEntregas.push({ ...emptyBriefingWizardData.entregas[0] });
      }

      // Apply template data to the first "entrega" item.
      if (templateData.mensagem_principal) {
        newEntregas[0].mensagemPrincipal = templateData.mensagem_principal;
      }
      if (templateData.cta) {
        newEntregas[0].cta = templateData.cta;
      }

      // Note: The template fields for DOs, DON'Ts, and Inspirations are TextEditors,
      // while the briefing data expects arrays. A simple text-to-array conversion
      // (e.g., splitting by lines) is brittle. For now, we are only applying
      // the fields that have a direct 1-to-1 mapping.
      // A future improvement would be to have structured fields in the template modal.

      return {
        ...prev,
        name: templateData.titulo_missao || prev.name,
        saudacao: templateData.saudacao || prev.saudacao,
        entregas: newEntregas,
        // The following are not applied due to data structure mismatch.
        // faca: templateData.dos ? parseList(templateData.dos) : prev.faca,
        // nao_faca: templateData.donts ? parseList(templateData.donts) : prev.nao_faca,
      };
    });

    toast.success("Modelo aplicado ao seu briefing!");
  };

  const generateBriefingText = React.useCallback((asHtml = false) => {
    if (!briefingData) return '';

    const e = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Basic escape for non-html content

    const selectedMotivacao = MOTIVACOES.find(m => m.id === briefingData.motivacao);
    const selectedToneName = (briefingData.tom_de_voz || [])[0];
    const toneOfVoiceData = TONS_DE_VOZ_DATA.find(t => t.tom === selectedToneName);
    const entregas = briefingData.entregas || [];

    let sections = [];

    // Helper to add sections
    const addSection = (title, content, isHtml = false) => {
        if (!content) return;
        if (asHtml) {
            sections.push(`<h2>${e(title)}</h2>${isHtml ? content : `<p>${e(content).replace(/\n/g, '<br>')}</p>`}`);
        } else {
            sections.push(`** ${title.toUpperCase()} **\n\n${content}\n`);
        }
    };

    addSection('TÍTULO DA MISSÃO', briefingData.name);
    addSection('SAUDAÇÃO', briefingData.saudacao, true);

    let objetivoContent = selectedMotivacao ? `Nosso objetivo com esta campanha é <strong>${e(selectedMotivacao.nome)}</strong>, visando ${e(selectedMotivacao.descricao)}` : 'Não definido.';
    addSection('OBJETIVO', objetivoContent);

    let produtoContent = `O foco da campanha é <strong>${e(briefingData.produtoServico || 'N/A')}</strong>. ${e(briefingData.descricao || '')}`;
    addSection('PRODUTO/SERVIÇO', produtoContent);

    if (toneOfVoiceData) {
        let toneContent = asHtml
            ? `<ul><li><strong>Quando usar:</strong> ${e(toneOfVoiceData.quando)}</li><li><strong>Como soa:</strong> ${e(toneOfVoiceData.como)}</li><li><strong>Exemplo:</strong> <em>${e(toneOfVoiceData.exemplo)}</em></li></ul>`
            : `  - Quando usar: ${toneOfVoiceData.quando}\n  - Como soa: ${toneOfVoiceData.como}\n  - Exemplo: ${toneOfVoiceData.exemplo}`;
        addSection(`TOM DE VOZ: ${toneOfVoiceData.tom}`, toneContent, true);
    }

    const formatListToHtml = (items) => `<ul>${items.map(item => `<li>${e(item)}</li>`).join('')}</ul>`;
    if (briefingData.faca && briefingData.faca.length > 0) {
        addSection('O QUE FAZER (DOs)', asHtml ? formatListToHtml(briefingData.faca) : briefingData.faca.join('\n'), asHtml);
    }
    if (briefingData.nao_faca && briefingData.nao_faca.length > 0) {
        addSection('O QUE NÃO FAZER (DON\'Ts)', asHtml ? formatListToHtml(briefingData.nao_faca) : briefingData.nao_faca.join('\n'), asHtml);
    }

    let entregasContent = '';
    if (asHtml) {
        entregasContent = entregas.map((entrega, index) => `
            <div style="border-left: 3px solid #ccc; padding-left: 15px; margin-bottom: 20px;">
                <h4>Entrega #${index + 1}</h4>
                <p><strong>Quantidade:</strong> ${e(String(entrega.quantidade))} | <strong>Tipo:</strong> ${e(entrega.tipo || 'N/A')}</p>
                <p><strong>Envio de produtos:</strong> ${entrega.envioProdutos ? `Sim (prazo: ${e(entrega.prazoDias || 'N/A')} dias)` : 'Não'}</p>
                <h5>Mensagem Principal</h5>
                <div>${entrega.mensagemPrincipal || '<p>N/A</p>'}</div>
                <h5>CTA (Call to Action)</h5>
                <div>${entrega.cta || '<p>N/A</p>'}</div>
            </div>
        `).join('');
    } else {
         entregasContent = entregas.map((entrega, index) => `
- Entrega N° ${index + 1}
  - Quantidade: ${entrega.quantidade}
  - Detalhes: ${entrega.tipo || 'N/A'}
  - Envio de produtos: ${entrega.envioProdutos ? `Sim, em até ${entrega.prazoDias || 'a definir'} dias` : 'Não'}
  - Mensagem Principal: ${entrega.mensagemPrincipal || 'N/A'}
  - CTA: ${entrega.cta || 'N/A'}
        `).join('\n');
    }
    addSection('ENTREGAS', entregasContent, true);

    const inspirations = (briefingData.inspiracoes || []).filter(i => i.link);
    if (inspirations.length > 0) {
        let inspoContent = asHtml
            ? `<ul>${inspirations.map(i => `<li>${e(i.description)}: <a href="${e(i.link)}" target="_blank">${e(i.link)}</a></li>`).join('')}</ul>`
            : inspirations.map(i => `${i.description ? `${i.description} (${i.link})` : i.link}`).join('\n');
        addSection('INSPIRAÇÕES', inspoContent, asHtml);
    }

    if (briefingData.proximos_passos) addSection('PRÓXIMOS PASSOS', briefingData.proximos_passos, true);
    if (briefingData.hashtags) addSection('HASHTAGS', asHtml ? `<p><em>${e(briefingData.hashtags.join(', '))}</em></p>` : briefingData.hashtags.join(', '));


    return asHtml ? sections.join('') : sections.join('\n');
  }, [briefingData]);


  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (activeStep === 7) {
      setLoadingSummary(true);
      // Simulate async generation to allow loader to show
      setTimeout(() => {
        const summaryHtml = generateBriefingText(true); // Pass true for HTML output
        setEditedBriefingText(summaryHtml);
        setLoadingSummary(false);
      }, 100); // A short delay is enough
    }
  }, [activeStep, generateBriefingText]);

  const TOTAL_STEPS = 8; // Incremented from 7 to 8

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
      prazoDias: '',
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
      2.  **Formato HTML:** Cada sugestão DEVE ser uma string contendo HTML simples e bem formado. Use `<p>` para parágrafos e `<ul>` com `<li>` para listas.
      3.  **Clareza e Estrutura:** As sugestões devem ser claras, bem estruturadas e fáceis de ler.
      4.  **Separação Visual:** No array de sugestões, cada item deve ser uma string HTML completa. A apresentação final na UI cuidará da separação, mas a IA deve gerar cada sugestão como um bloco de conteúdo independente.

      **FORMATO DA RESPOSTA FINAL:**
      Sua resposta DEVE ser APENAS um objeto JSON válido, sem nenhum texto, markdown, ou qualquer formatação adicional antes ou depois. Use EXATAMENTE a seguinte estrutura:
      {
        "sugestoes": [
            "<h3>Opção 1: Foco em Emoção</h3><p>Conecte-se com a audiência mostrando como nosso produto se encaixa na vida deles. Use uma narrativa que desperte sentimentos.</p><ul><li>Mostre pessoas reais sorrindo.</li><li>Use uma música inspiradora.</li></ul>",
            "<h3>Opção 2: Foco em Benefício</h3><p>Deixe claro como nosso produto resolve um problema. Seja direto e informativo.</p><p>Destaque os 3 principais benefícios de forma rápida e objetiva.</p>"
        ]
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
        1.  Cada CTA deve ser claro, conciso e orientado para a ação, encapsulado em um parágrafo HTML (`<p>`).
        2.  As sugestões devem ser variadas, explorando diferentes gatilhos (urgência, benefício, curiosidade, etc.).
        3.  O CTA deve estar alinhado com a motivação e o objetivo da campanha.
        4.  O conteúdo dentro da tag `<p>` deve ter no mínimo 8 palavras e no máximo 15 palavras.
        5.  Evite jargões ou termos muito técnicos.
        6.  O formato da resposta deve ser um array JSON de strings, onde cada string é um CTA em HTML. Exemplo: ["<p>CTA 1</p>", "<p>CTA 2</p>", "<p>CTA 3</p>"]

        Gere o JSON com as 3 sugestões de CTA em HTML.
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

  const handleGenerateSaudacaoSuggestions = async () => {
    if (!geminiAPI.isInitialized) {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        toast.error('Chave de API do Gemini não configurada.');
        return;
      }
      geminiAPI.initialize(apiKey);
    }

    setLoadingSaudacaoSuggestions(true);
    setSaudacaoSuggestions([]);

    const { motivacao, tom_de_voz, faca, nao_faca, produtoServico, descricao } = briefingData;
    const motivacaoObj = MOTIVACOES.find(m => m.id === motivacao);
    const selectedToneName = (tom_de_voz || [])[0];
    const toneOfVoiceData = TONS_DE_VOZ_DATA.find(t => t.tom === selectedToneName);

    let toneOfVoicePromptSection = `Tom de Voz: ${selectedToneName || 'Não definido'}`;
    if (toneOfVoiceData) {
      toneOfVoicePromptSection += `\n    - QUANDO USAR: ${toneOfVoiceData.quando}\n    - COMO SOA: ${toneOfVoiceData.como}\n    - EXEMPLO: ${toneOfVoiceData.exemplo}`;
    }

    const prompt = `
        Aja como um copywriter criativo. Com base no briefing de campanha, gere 3 sugestões de "Saudação" para iniciar a comunicação.

        **Contexto da Campanha:**
        - **Objetivo Principal:** ${motivacaoObj ? motivacaoObj.nome : 'Não definido'}
        - **Produto/Serviço:** ${produtoServico || 'Não definido'}
        - **Descrição do Produto/Serviço:** ${descricao || 'Não definida'}
        - **Tom de Voz Desejado:**
          - ${toneOfVoicePromptSection}
        - **O que FAZER (DOs):** ${faca.join(', ')}
        - **O que NÃO FAZER (DON'Ts):** ${nao_faca.join(', ')}

        **Requisitos para as sugestões de Saudação:**
        1. Cada saudação deve ser curta, impactante e convidativa.

        2. O texto deve ter duas partes:
        a) uma saudação direta ao público (ex.: “Oi, Creator!”);
        b) um breve parágrafo introdutório (1 a 2 frases) que crie conexão e prepare o leitor para a mensagem principal da campanha.

        3. O texto completo (saudação + introdução) deve:
        a) Ter no máximo 150 caracteres.
        b) A saudação direta ao público deve estar separada do parágrafo introdutório por uma linha en branco.
        4. As sugestões devem ser distintas, explorando diferentes abordagens (ex.: uma mais direta, outra mais emocional, outra mais criativa).

        5. A saudação deve estar alinhada ao:
        a) Objetivo Principal;
        b) Nome e descrição do produto;
        c) Tom de Voz Desejado;
        d) DOs; e
        e) DON'Ts.

        6. A resposta DEVE ser um array JSON contendo 3 strings. Exemplo: ["Saudação 1", "Saudação 2", "Saudação 3"]

        Gere o JSON com as 3 sugestões de saudação.
    `;

    try {
      const response = await geminiAPI.generateContent(prompt);
      // More robust JSON extraction
      const match = response.match(/\[((.|\n)*)\]/);
      if (match) {
        const jsonString = match[0];
        const jsonResponse = JSON.parse(jsonString);
        setSaudacaoSuggestions(jsonResponse);
        setSaudacaoSuggestionModalOpen(true);
      } else {
        throw new Error("Nenhum array JSON válido encontrado na resposta da IA.");
      }
    } catch (error) {
      toast.error('Erro ao gerar sugestões de Saudação.');
      console.error("Saudação suggestion error:", error);
    } finally {
      setLoadingSaudacaoSuggestions(false);
    }
  };

  const handleReviewBriefing = async () => {
    if (!geminiAPI.isInitialized) {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        toast.error('Chave de API do Gemini não configurada.');
        return;
      }
      geminiAPI.initialize(apiKey);
    }

    setLoadingReview(true);
    setReviewSuggestions(null);

    const fullBriefingText = generateBriefingText();

    const prompt = `
      Aja como um Diretor de Criação sênior. Sua tarefa é revisar o briefing de campanha completo fornecido abaixo e aprimorá-lo.
      Para cada uma das seções listadas, gere um conteúdo revisado e melhorado, mantendo o tom de voz e o objetivo originais, mas aprimorando a clareza, o impacto e a criatividade.

      **BRIEFING ATUAL:**
      ---
      ${fullBriefingText}
      ---

      **SEÇÕES PARA REVISAR:**
      - TÍTULO DA MISSÃO (baseado no nome do briefing)
      - SAUDAÇÃO
      - MENSAGEM PRINCIPAL (para a primeira entrega)
      - CTA (para a primeira entrega)
      - INSPIRAÇÕES (sugira 1-2 novas inspirações com links fictícios se necessário)
      - PRÓXIMOS PASSOS (sugira os próximos passos para o criador)
      - DOs (sugira 2-3 DOs adicionais)
      - DON'Ts (sugira 2-3 DON'Ts adicionais)
      - HASHTAGS (sugira 3-5 hashtags relevantes)

      **REQUISITOS DA RESPOSTA:**
      - A resposta DEVE ser um objeto JSON válido, sem nenhum texto ou formatação fora dele.
      - As chaves do JSON devem ser: "titulo_missao", "saudacao", "mensagem_principal", "cta", "inspiracoes", "proximos_passos", "dos", "donts", "hashtags".
      - O conteúdo de "mensagem_principal" e "cta" deve ser em HTML simples (usando <p>, <ul>, <li>).
      - O conteúdo de "dos", "donts", e "hashtags" deve ser um array de strings.
      - O conteúdo de "inspiracoes" deve ser um array de objetos com "description" e "link".

      Exemplo da estrutura JSON de resposta:
      {
        "titulo_missao": "Campanha de Lançamento Verão Solar",
        "saudacao": "<p>Olá, squad criativo!</p><p>Estamos prontos para fazer barulho juntos?</p>",
        "mensagem_principal": "<p>Nossa nova coleção é sobre celebrar a energia do sol. Queremos vídeos que capturem essa vibe vibrante e autêntica.</p><ul><li>Mostre o produto em uso ao ar livre.</li><li>Foque em closes que exaltem a qualidade.</li></ul>",
        "cta": "<p>Use a hashtag #VeraoSolar e marque nosso perfil para aparecer em nossas redes!</p>",
        "inspiracoes": [
          { "description": "Referência de tom e ritmo", "link": "https://vimeo.com/123456" }
        ],
        "proximos_passos": "<p>1. Grave seus vídeos até a próxima sexta-feira.</p><p>2. Submeta o conteúdo na plataforma para aprovação.</p>",
        "dos": ["Usar luz natural", "Manter a energia lá em cima"],
        "donts": ["Usar filtros que alterem a cor real do produto", "Gravar em ambientes escuros"],
        "hashtags": ["#VeraoSolar", "#ModaPraia", "#EnergiaPositiva"]
      }
    `;

    try {
      const response = await geminiAPI.generateContent(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const jsonString = match[0];
        const jsonResponse = JSON.parse(jsonString);
        setReviewSuggestions(jsonResponse);
      } else {
        throw new Error("Nenhum JSON válido encontrado na resposta da IA.");
      }
    } catch (error) {
      toast.error('Erro ao revisar o briefing.');
      console.error("Briefing review error:", error);
    } finally {
      setLoadingReview(false);
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
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>Qual é o principal objetivo da sua campanha?</Typography>
                <Button
                    startIcon={<EditIcon />}
                    onClick={() => setTemplateModalOpen(true)}
                    variant="outlined"
                >
                    Gerenciar Modelo
                </Button>
            </Box>
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
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={brandGuideTab} onChange={(e, newValue) => setBrandGuideTab(newValue)} aria-label="abas do guia da marca">
                <Tab label="Voz da Marca" id="brand-guide-tab-0" aria-controls="brand-guide-tabpanel-0" />
                <Tab label="O que FAZER (DOs)" id="brand-guide-tab-1" aria-controls="brand-guide-tabpanel-1" />
                <Tab label="O que NÃO FAZER (DON'Ts)" id="brand-guide-tab-2" aria-controls="brand-guide-tabpanel-2" />
              </Tabs>
            </Box>
            <TabPanel value={brandGuideTab} index={0}>
              <RadioGroup
                aria-label="tom-de-voz"
                value={(briefingData.tom_de_voz || [])[0] || ''}
                onChange={(e) => {
                  const newSelection = (briefingData.tom_de_voz || []).includes(e.target.value) ? [] : [e.target.value];
                  handleChipChange('tom_de_voz', newSelection);
                }}
              >
                <Grid container spacing={2}>
                  {TONS_DE_VOZ_DATA.map((item) => (
                    <Grid item xs={12} md={6} key={item.tom}>
                      <Paper
                        variant="outlined"
                        onClick={() => {
                          const newSelection = (briefingData.tom_de_voz || []).includes(item.tom) ? [] : [item.tom];
                          handleChipChange('tom_de_voz', newSelection);
                        }}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          border: 2,
                          borderColor: (briefingData.tom_de_voz || []).includes(item.tom) ? 'primary.main' : 'divider',
                          backgroundColor: (briefingData.tom_de_voz || []).includes(item.tom) ? 'action.selected' : 'background.paper',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Radio value={item.tom} checked={(briefingData.tom_de_voz || []).includes(item.tom)} />
                          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            {item.tom}
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 4 }}>
                          <Typography variant="caption" color="text.secondary" display="block">QUANDO USAR</Typography>
                          <Typography variant="body2" gutterBottom>{item.quando}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">COMO SOA</Typography>
                          <Typography variant="body2" gutterBottom>{item.como}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">EXEMPLO</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{item.exemplo}</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>
            </TabPanel>
            <TabPanel value={brandGuideTab} index={1}>
              <ChecklistChipEditor
                label="O que FAZER (DOs)"
                items={briefingData.faca || []}
                setItems={(v) => handleChipChange('faca', v)}
                suggestions={SUGESTOES_FACA}
              />
            </TabPanel>
            <TabPanel value={brandGuideTab} index={2}>
              <ChecklistChipEditor
                label="O que NÃO FAZER (DON'Ts)"
                items={briefingData.nao_faca || []}
                setItems={(v) => handleChipChange('nao_faca', v)}
                suggestions={SUGESTOES_NAO_FACA}
              />
            </TabPanel>
          </Box>
        );
      case 3: // Saudação
        return (
          <Box sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>Saudação</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crie uma saudação inicial para sua campanha. Pense em como você quer que o público se sinta ao ver seu conteúdo pela primeira vez.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <TextField
                name="saudacao"
                label="Texto da Saudação"
                fullWidth
                multiline
                rows={5}
                value={briefingData.saudacao || ''}
                onChange={handleChange}
                inputProps={{ maxLength: 150 }}
                helperText={`${(briefingData.saudacao || '').length}/150`}
                placeholder="Ex: Olá! Bem-vindo à nossa nova jornada."
              />
              <Tooltip title="Gerar sugestões de Saudação com IA">
                <span>
                  <IconButton
                    color="primary"
                    onClick={handleGenerateSaudacaoSuggestions}
                    disabled={loadingSaudacaoSuggestions}
                  >
                    {loadingSaudacaoSuggestions ? <CircularProgress size={24} /> : <AutoAwesomeIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        );
      case 4: // Entregas
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
                      {entrega.envioProdutos && (
                        <Grid item xs={12}>
                          <TextField
                            label="Prazo para envio (dias)"
                            type="number"
                            fullWidth
                            value={entrega.prazoDias || ''}
                            onChange={(e) => handleEntregaChange(index, 'prazoDias', e.target.value)}
                            InputProps={{ inputProps: { min: 1 } }}
                            helperText="Informe o prazo em dias para o envio do produto."
                          />
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>Mensagem Principal</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ flexGrow: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                            <TextEditor
                              content={entrega.mensagemPrincipal}
                              onUpdate={(newContent) => handleEntregaChange(index, 'mensagemPrincipal', newContent)}
                              placeholder="Digite o texto base aqui ou clique no botão para gerar sugestões com IA."
                            />
                          </Box>
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
                         <Typography variant="subtitle1" gutterBottom>CTA (Call to Action)</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <Box sx={{ flexGrow: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                            <TextEditor
                              content={entrega.cta}
                              onUpdate={(newContent) => handleEntregaChange(index, 'cta', newContent)}
                            />
                          </Box>
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
      case 5: // Inspiração
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
      case 6: // Revisar e Refinar
        return (
          <Box sx={{ p: 2, minHeight: 400, maxHeight: '70vh', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Revisar e Refinar com IA</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Clique no botão abaixo para que a IA analise todo o seu briefing e sugira melhorias em todas as seções para torná-lo ainda mais claro, criativo e impactante.
            </Typography>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleReviewBriefing}
                disabled={loadingReview}
              >
                {loadingReview ? 'Analisando Briefing...' : 'Revisar Briefing com IA'}
              </Button>
            </Box>

            {loadingReview && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {reviewSuggestions && (
              <Box>
                <Typography variant="h5" sx={{ my: 2 }}>Sugestões de Melhoria</Typography>
                <Grid container spacing={3}>
                  {Object.entries(reviewSuggestions).map(([key, value]) => (
                    <Grid item xs={12} md={6} key={key}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="overline" color="text.secondary">{key.replace(/_/g, ' ').toUpperCase()}</Typography>
                            {Array.isArray(value) ? (
                            <Box component="ul" sx={{ pl: 2, mt: 1, '& li': { mb: 0.5 } }}>
                                {value.map((item, index) => (
                                <Typography component="li" key={index} variant="body2">
                                    {typeof item === 'object' ? `${item.description} (${item.link})` : item}
                                </Typography>
                                ))}
                            </Box>
                            ) : (
                            <Box dangerouslySetInnerHTML={{ __html: value }} sx={{ mt: 1, wordBreak: 'break-word', '& p': {m:0} }}/>
                            )}
                        </Box>
                        <Button
                          size="small"
                          onClick={() => {
                            let update = {};
                            if (key === 'titulo_missao') update.name = value;
                            else if (key === 'saudacao') update.saudacao = value;
                            else if (key === 'mensagem_principal') {
                                const newEntregas = [...briefingData.entregas];
                                if(newEntregas.length > 0) newEntregas[0].mensagemPrincipal = value;
                                update.entregas = newEntregas;
                            }
                             else if (key === 'cta') {
                                const newEntregas = [...briefingData.entregas];
                                if(newEntregas.length > 0) newEntregas[0].cta = value;
                                update.entregas = newEntregas;
                            }
                            else if (key === 'dos') update.faca = [...new Set([...briefingData.faca, ...value])];
                            else if (key === 'donts') update.nao_faca = [...new Set([...briefingData.nao_faca, ...value])];
                            else if (key === 'inspiracoes') update.inspiracoes = [...briefingData.inspiracoes, ...value.filter(item => item.link)]; // Filter out empty inspirations
                            else {
                                // For keys that don't exist yet like 'proximos_passos', 'hashtags'
                                update[key] = value;
                            }
                            onBriefingDataChange(prev => ({...prev, ...update}));
                            toast.success(`'${key.replace(/_/g, ' ')}' atualizado com a sugestão da IA.`);
                          }}
                          sx={{alignSelf: 'flex-end', mt: 1}}
                        >
                          Aplicar Sugestão
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        );
      case 7: { // Finalização
        return (
          <Box sx={{ p: 2, maxHeight: '70vh', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Finalização e Revisão</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField name="name" label="Nome do Briefing" fullWidth value={briefingData.name || ''} onChange={handleChange} required helperText="Dê um nome para identificar facilmente este briefing no futuro." />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>Resumo do Briefing</Divider>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Abaixo está o resumo completo do seu briefing. Você pode fazer edições finais diretamente no texto antes de salvar.
                </Typography>
                {loadingSummary ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Gerando resumo final...</Typography>
                  </Box>
                ) : (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: '400px' }}>
                    <TextEditor
                      content={editedBriefingText}
                      onUpdate={(newContent) => setEditedBriefingText(newContent)}
                    />
                  </Box>
                )}
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
      <AISuggestionModal
        open={productSuggestionModalOpen}
        onClose={() => setProductSuggestionModalOpen(false)}
        title="Sugestões para Produto e Descrição"
        loading={loadingProductSuggestions}
        loadingText="Analisando o link e gerando sugestões..."
        suggestions={productSuggestions}
        onSelectSuggestion={(suggestion) => {
          onBriefingDataChange(prev => ({
            ...prev,
            produtoServico: suggestion.produtoServico,
            descricao: suggestion.descricao,
          }));
          setProductSuggestionModalOpen(false);
        }}
        onRegenerate={handleGenerateProductSuggestions}
        suggestionType="product"
      />

      <AISuggestionModal
        open={messageSuggestionModalOpen}
        onClose={() => setMessageSuggestionModalOpen(false)}
        title="Sugestões para Mensagem Principal"
        loading={loadingMessageSuggestions}
        suggestions={messageSuggestions}
        onSelectSuggestion={(suggestion) => {
          handleEntregaChange(activeEntregaIndex, 'mensagemPrincipal', suggestion);
          setMessageSuggestionModalOpen(false);
        }}
        onRegenerate={() => handleGenerateMessageSuggestions(activeEntregaIndex)}
      />

      <AISuggestionModal
        open={ctaSuggestionModalOpen}
        onClose={() => setCtaSuggestionModalOpen(false)}
        title="Sugestões de Call-to-Action (CTA)"
        loading={loadingCtaSuggestions}
        suggestions={ctaSuggestions}
        onSelectSuggestion={(suggestion) => {
          handleEntregaChange(activeEntregaIndex, 'cta', suggestion);
          setCtaSuggestionModalOpen(false);
        }}
        onRegenerate={() => handleGenerateCtaSuggestions(activeEntregaIndex)}
        bestPractices={ctaBestPractices}
      />

      <AISuggestionModal
        open={saudacaoSuggestionModalOpen}
        onClose={() => setSaudacaoSuggestionModalOpen(false)}
        title="Sugestões de Saudação"
        loading={loadingSaudacaoSuggestions}
        suggestions={saudacaoSuggestions}
        onSelectSuggestion={(suggestion) => {
          handleChange({ target: { name: 'saudacao', value: suggestion } });
          setSaudacaoSuggestionModalOpen(false);
        }}
        onRegenerate={handleGenerateSaudacaoSuggestions}
      />
       <BriefingTemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSave={handleSaveTemplate}
      />
    </Dialog>
  );
};

export default BriefingWizard;