import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, IconButton, Tooltip, Paper, Dialog, DialogTitle, DialogContent, CircularProgress,
} from '@mui/material';
import { Add, ArrowBack, ArrowForward, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import AISuggestionModal from './AISuggestionModal';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';
import TextEditor from './TextEditor';

export const emptyBriefingWizardData = {
  name: '',
  tom_de_voz: '',
  nao_faca: [],
  faca: [],
  saudacao: '',
  entregas: '',
  objetivo: '',
  briefing_final: '',
};

const TONS_DE_VOZ = [
  "Inspirador", "Educativo", "Confiante", "Próximo", "Engraçado / Descontraído",
  "Elegante / Sofisticado", "Inovador", "Institucional", "Cuidadoso / Humano",
  "Visionário", "Provocador", "Acessível / Democrático"
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

const BriefingWizard = ({ open, onClose, onSave, briefingData, onBriefingDataChange, initialStep = 0 }) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', field: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  const handleOpenModal = async (field, title, promptGenerator) => {
    if (!geminiAPI.isInitialized) {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        toast.error('Chave de API do Gemini não configurada.');
        return;
      }
      geminiAPI.initialize(apiKey);
    }

    setModalConfig({ title, field });
    setModalOpen(true);
    setLoadingSuggestions(true);
    setSuggestions([]);

    try {
      const prompt = promptGenerator();
      const response = await geminiAPI.generateContent(prompt);
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonResponse = JSON.parse(cleanedResponse);
      setSuggestions(jsonResponse.saudacoes || jsonResponse.entregas || jsonResponse.opcoes_revisadas || []);
    } catch (error) {
      toast.error('Erro ao gerar sugestões com IA.');
      console.error("AI suggestion error:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    onBriefingDataChange(prev => ({ ...prev, [modalConfig.field]: suggestion }));
    setModalOpen(false);
  };

  const handleNext = () => setActiveStep(1);
  const handleBack = () => setActiveStep(0);

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

  const generateBriefingFinal = () => {
    const { tom_de_voz, nao_faca, faca, saudacao, entregas, objetivo } = briefingData;
    const finalBriefing = `
      **Tom de Voz:** ${tom_de_voz}\n
      **O que FAZER:**\n${faca.map(item => `- ${item}`).join('\n')}\n
      **O que NÃO FAZER:**\n${nao_faca.map(item => `- ${item}`).join('\n')}\n
      **Objetivo:** ${objetivo}\n
      **Saudação:** ${saudacao}\n
      **Entregas:** ${entregas}
    `;
    onBriefingDataChange(prev => ({ ...prev, briefing_final: finalBriefing.trim() }));
  };

  useEffect(() => {
    if (activeStep === 1) {
      generateBriefingFinal();
    }
  }, [activeStep]);

  if (!open || !briefingData) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Assistente de Criação de Briefing</DialogTitle>
      <DialogContent>
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Nome do Briefing"
                fullWidth
                value={briefingData.name || ''}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tom de Voz</InputLabel>
                <Select name="tom_de_voz" value={briefingData.tom_de_voz || ''} onChange={handleChange} label="Tom de Voz">
                  {TONS_DE_VOZ.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <ChipInput
                label="FAÇA (DOs)"
                items={briefingData.faca || []}
                setItems={(v) => handleChipChange('faca', v)}
                suggestions={SUGESTOES_FACA}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ChipInput
                label="NÃO FAÇA (DON'Ts)"
                items={briefingData.nao_faca || []}
                setItems={(v) => handleChipChange('nao_faca', v)}
                suggestions={SUGESTOES_NAO_FACA}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField name="objetivo" label="Objetivo" fullWidth value={briefingData.objetivo || ''} onChange={handleChange} multiline rows={3} />
                <Tooltip title="Gerar com IA">
                  <IconButton color="primary" onClick={() => handleOpenModal('objetivo', 'Sugestões de Objetivo', () => `'A partir do texto do usuário ${briefingData.objetivo} e considerando os critérios de comunicação da marca fornecidos nos Do’s ${briefingData.faca.join(', ')} e Don’ts ${briefingData.nao_faca.join(', ')}, gere até 5 opções de texto revisado que estejam alinhadas com o tom de voz da marca.
Cada opção deve:
Seguir fielmente os Do’s, incorporando boas práticas de tom, estilo e linguagem;
Evitar estritamente os Don’ts, como termos, expressões ou estilos proibidos;
Manter o significado original do texto do usuário, aprimorando clareza, engajamento e adequação à marca;
Ser concisa, clara e com impacto emocional adequado ao público.
O JSON de saída deve ter a seguinte estrutura:
{
  "opcoes_revisadas": [
    {"opcao": 1, "texto": "{texto_revisado_1}"},
    {"opcao": 2, "texto": "{texto_revisado_2}"},
    {"opcao": 3, "texto": "{texto_revisado_3}"},
    {"opcao": 4, "texto": "{texto_revisado_4}"},
    {"opcao": 5, "texto": "{texto_revisado_5}"}
  ]
}
'`)}>
                    <AutoAwesomeIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField name="saudacao" label="Saudação" fullWidth value={briefingData.saudacao || ''} onChange={handleChange} multiline rows={2} />
                <Tooltip title="Gerar com IA">
                  <IconButton color="primary" onClick={() => handleOpenModal('saudacao', 'Sugestões de Saudação', () => `{
  "saudacoes": [
    {"opcao": 1, "mensagem": "{mensagem_1}"},
    {"opcao": 2, "mensagem": "{mensagem_2}"},
    {"opcao": 3, "mensagem": "{mensagem_3}"},
    {"opcao": 4, "mensagem": "{mensagem_4}"},
    {"opcao": 5, "mensagem": "{mensagem_5}"}
  ]
}`)}>
                    <AutoAwesomeIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField name="entregas" label="Entregas" fullWidth value={briefingData.entregas || ''} onChange={handleChange} multiline rows={3} />
                <Tooltip title="Gerar com IA">
                  <IconButton color="primary" onClick={() => handleOpenModal('entregas', 'Sugestões de Entregas', () => `'A partir do texto de referência ${briefingData.entregas}, gere um JSON contendo uma lista de entregas esperadas para uma missão ou desafio de marketing de conteúdo (UGC ou EGC). Cada entrega deve conter até 250 caracteres e resumir claramente o que o participante deve produzir.
O JSON deve ter a seguinte estrutura:
{
 "entregas": [
    {"opcao": 1, "descricao": "{descricao_1}"},
    {"opcao": 2, "descricao": "{descricao_2}"},
    {"opcao": 3, "descricao": "{descricao_3}"},
    {"opcao": 4, "descricao": "{descricao_4}"},
    {"opcao": 5, "descricao": "{descricao_5}"}
  ]
}
Regras:
Cada descrição deve ser clara, objetiva e prática.
Incluir quantidade de conteúdos, formato, links ou cupons, e prazo se mencionados no texto de referência.
Adaptar o tom para facilitar o entendimento e execução do participante.'`)}>
                    <AutoAwesomeIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Revisão do Briefing</Typography>
            <TextEditor
              value={briefingData.briefing_final || ''}
              onChange={(v) => handleRichTextChange('briefing_final', v)}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={onClose} color="secondary">Cancelar</Button>
          <Box>
            {activeStep > 0 && <Button onClick={handleBack} startIcon={<ArrowBack />}>Anterior</Button>}
            {activeStep < 1 && <Button onClick={handleNext} endIcon={<ArrowForward />} sx={{ ml: 1 }}>Próximo</Button>}
            <Button onClick={onSave} variant="contained" color="primary" sx={{ ml: 2 }}>Salvar</Button>
          </Box>
        </Box>
      </DialogContent>
      <AISuggestionModal
        open={modalOpen}
        title={modalConfig.title}
        suggestions={suggestions}
        loading={loadingSuggestions}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelectSuggestion}
        bestPractices={modalConfig.field === 'saudacao' ? `1. Clareza e objetividade
A saudação deve transmitir imediatamente a mensagem de boas-vindas.

Exemplo bom: “Bem-vindo ao nosso desafio! Estamos felizes que você está aqui.”

2. Tom de voz consistente com a marca

A saudação deve refletir a personalidade da marca:

Inspirador: motiva e engaja (“Vamos juntos transformar ideias em ação!”)
Próximo: cria conexão pessoal (“Olá! Que bom ter você conosco no desafio!”)
Descontraído: leve e divertido (“Oi! Preparado para se divertir e criar algo incrível?”)
Institucional: formal e sério (“Seja bem-vindo ao nosso programa de inovação.”)

3. Humanização
Use a primeira pessoa do plural (“estamos felizes”) ou a segunda pessoa (“você”) para criar proximidade.

4. Encorajamento à participação
Inclua uma breve menção ao propósito do desafio ou incentivo à ação.

5. Brevidade
Idealmente, até 150 caracteres, para que a mensagem seja rápida de ler e fácil de lembrar.

6. Personalização (quando possível)
Inserir o nome do participante ou referência ao seu perfil aumenta a conexão.

7. Tom positivo e acolhedor
A primeira impressão é crucial. Use palavras que transmitam entusiasmo, acolhimento e confiança.` : null}
      />
    </Dialog>
  );
};

export default BriefingWizard;