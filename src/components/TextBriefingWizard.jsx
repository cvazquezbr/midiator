import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Typography, Stepper, Step, StepLabel, Dialog, DialogTitle, DialogContent, Grid, CircularProgress, TextField, useMediaQuery, Backdrop, DialogActions, Paper, Card, CardContent, CardActions, Alert
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack, ArrowForward, UploadFile, Edit, Check } from '@mui/icons-material';
import { toast } from 'sonner';

import TextEditor from './TextEditor';
import { parseWordDocument, parsePdfDocument } from '../utils/fileImport';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

// --- Helper Functions ---
const parseRevisedTextToSections = (text) => {
  if (!text) return {};
  const sections = {};
  const regex = /^##\s+(.*)$/gm;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (lastIndex > 0) {
      const lastMatch = text.substring(0, lastIndex).match(/##\s+(.*)$/gm).pop();
      const sectionTitle = lastMatch.replace('## ', '').trim();
      const sectionContent = text.substring(lastIndex, match.index).trim();
      sections[sectionTitle] = sectionContent;
    }
    lastIndex = match.index;
  }

  if (lastIndex > 0) {
    const lastMatch = text.substring(0, lastIndex).match(/##\s+(.*)$/gm).pop();
    const sectionTitle = lastMatch.replace('## ', '').trim();
    const sectionContent = text.substring(lastIndex).replace(lastMatch, '').trim();
    sections[sectionTitle] = sectionContent;
  } else if (text) {
      // Handle case with no sections
      sections['Texto Completo'] = text;
  }

  return sections;
};

const sectionsToMarkdown = (sections) => {
    return Object.entries(sections)
        .map(([title, content]) => `## ${title}\n\n${content}`)
        .join('\n\n');
};


// --- Main Component ---
export const emptyTextBriefingData = {
  name: '',
  baseText: '',
  referenceText: '',
  revisedText: '',
  revisionNotes: '',
  sections: {},
  finalText: '',
};

const steps = ['Edição', 'Revisão', 'Completar Blocos', 'Finalização'];

const TextBriefingWizard = ({ open, onClose, onSave, briefingData, onBriefingDataChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // State for block completion step
  const [activeSuggestion, setActiveSuggestion] = useState({ title: null, content: '' });

  const wordInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const referenceInputRef = useRef(null);

  useEffect(() => {
    if (activeStep === 3) { // When entering finalization step
        const finalMarkdown = sectionsToMarkdown(briefingData.sections);
        onBriefingDataChange(prev => ({ ...prev, finalText: finalMarkdown }));
    }
  }, [activeStep, briefingData.sections, onBriefingDataChange]);


  const handleNext = async () => {
    if (activeStep === 0) { // Edição -> Revisão
        if (!briefingData.baseText || !briefingData.referenceText) {
            toast.error('O texto base e o modelo de referência são obrigatórios.');
            return;
        }
        if (!geminiAPI.isInitialized) {
            const apiKey = getGeminiApiKey();
            if (!apiKey) { toast.error('Chave de API do Gemini não configurada.'); return; }
            geminiAPI.initialize(apiKey);
        }

        setLoadingMessage('A IA está revisando seu briefing...');
        setIsLoading(true);

        try {
            const result = await geminiAPI.reviseBriefing(briefingData.baseText, briefingData.referenceText);
            const sections = parseRevisedTextToSections(result.revisedText);
            onBriefingDataChange(prev => ({
                ...prev,
                revisedText: result.revisedText, // keep original markdown
                revisionNotes: result.revisionNotes,
                sections: sections, // store structured data
            }));
            toast.success('Briefing revisado com sucesso!');
            setActiveStep(1);
        } catch (error) {
            toast.error(`Erro na revisão com IA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    } else {
       setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
      setActiveStep(prev => prev - 1);
  };

  const handleBriefingDataChange = (field, value) => {
    onBriefingDataChange(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (title, content) => {
      onBriefingDataChange(prev => ({
          ...prev,
          sections: { ...prev.sections, [title]: content }
      }));
  };

  const handleFileImport = async (event, parser, contentSetter) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoadingMessage('Importando arquivo...');
    setIsLoading(true);

    try {
      const content = await parser(file);
      contentSetter(content);
      toast.success(`${file.name} importado com sucesso!`);
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setIsLoading(false);
      event.target.value = null;
    }
  };

  const handleGenerateSuggestion = async (title) => {
      setLoadingMessage(`Gerando sugestão para "${title}"...`);
      setIsLoading(true);
      // Do not set intermediate state, wait for the API call to complete

      try {
          const context = {
              dos: briefingData.sections['DOs'] || '',
              donts: briefingData.sections["DON'Ts"] || '',
              mainMessage: briefingData.sections['Mensagem Principal'] || '',
              campaignInfo: briefingData.sections['Sobre a campanha'] || '',
          };
          const suggestion = await geminiAPI.generateBlockSuggestion(title, context);
          setActiveSuggestion({ title, content: suggestion });
      } catch (error) {
          toast.error(`Erro ao gerar sugestão: ${error.message}`);
          setActiveSuggestion({ title, content: `Falha ao gerar sugestão: ${error.message}` });
      } finally {
          setIsLoading(false);
      }
  };

  const handleAcceptSuggestion = () => {
      if (!activeSuggestion.title) return;
      handleSectionChange(activeSuggestion.title, activeSuggestion.content);
      toast.success(`Bloco "${activeSuggestion.title}" atualizado!`);
      setActiveSuggestion({ title: null, content: '' });
  };

  // --- Render Functions for Each Step ---

  const renderStep0_Edit = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>Editor de Briefing</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cole, digite ou importe o texto base do seu briefing.
        </Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <TextEditor
            value={briefingData.baseText}
            onChange={(val) => handleBriefingDataChange('baseText', val)}
            html={true}
            placeholder="Digite ou cole o conteúdo do briefing aqui..."
          />
        </Box>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <input type="file" ref={wordInputRef} hidden accept=".docx" onChange={(e) => handleFileImport(e, parseWordDocument, (val) => handleBriefingDataChange('baseText', val))} />
          <input type="file" ref={pdfInputRef} hidden accept=".pdf" onChange={(e) => handleFileImport(e, parsePdfDocument, (val) => handleBriefingDataChange('baseText', val))} />
          <input type="file" ref={referenceInputRef} hidden accept=".txt,.md" onChange={(e) => handleFileImport(e, readTextFile, (val) => handleBriefingDataChange('referenceText', val))} />
          <Button variant="outlined" onClick={(e) => { e.stopPropagation(); wordInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isLoading}>Importar Word (.docx)</Button>
          <Button variant="outlined" onClick={(e) => { e.stopPropagation(); pdfInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isLoading}>Importar PDF</Button>
          <Button variant="outlined" onClick={(e) => { e.stopPropagation(); referenceInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isLoading} color={briefingData.referenceText ? "success" : "primary"}>
            {briefingData.referenceText ? "Modelo Carregado" : "Importar Modelo"}
          </Button>
        </Box>
    </Box>
  );

  const renderStep1_Review = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <TextField name="name" label="Nome do Briefing" fullWidth value={briefingData.name || ''} onChange={(e) => handleBriefingDataChange('name', e.target.value)} required sx={{ mb: 2, flexShrink: 0 }}/>
        <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>Briefing Revisado (Editável)</Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <TextEditor value={briefingData.revisedText} onChange={(val) => handleBriefingDataChange('revisedText', val)} html={true} />
                </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>Notas da Revisão (Editável)</Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                    <TextEditor value={briefingData.revisionNotes} onChange={(val) => handleBriefingDataChange('revisionNotes', val)} html={true} />
                </Box>
            </Grid>
        </Grid>
    </Box>
  );

  const renderStep2_CompleteBlocks = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>Completar Blocos</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Complete as seções que a IA não conseguiu preencher ou edite as existentes.
        </Typography>
        <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Grid item xs={12} md={5} sx={{ height: '100%', overflowY: 'auto' }}>
                {Object.entries(briefingData.sections).map(([title, content]) => {
                    const isEmpty = !content || content.trim() === '';
                    return (
                        <Card key={title} variant="outlined" sx={{ mb: 2, borderColor: isEmpty ? 'error.main' : 'divider' }}>
                            <CardContent>
                                <Typography variant="h6" component="div">{title}</Typography>
                                {isEmpty ? (
                                    <Alert severity="warning" sx={{ mt: 1 }}>Este bloco está vazio.</Alert>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ maxHeight: 100, overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: content }} />
                                )}
                            </CardContent>
                            <CardActions>
                                <Button size="small" startIcon={<Edit />} onClick={() => setActiveSuggestion({ title, content: content || '' })}>Editar</Button>
                                {isEmpty && <Button size="small" onClick={() => handleGenerateSuggestion(title)}>Sugerir</Button>}
                            </CardActions>
                        </Card>
                    );
                })}
            </Grid>
            <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {activeSuggestion.title ? (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>Sugestão para: "{activeSuggestion.title}"</Typography>
                        <Box sx={{ flexGrow: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <TextEditor value={activeSuggestion.content} onChange={(val) => setActiveSuggestion(prev => ({ ...prev, content: val }))} html={true} />
                        </Box>
                        <Button onClick={handleAcceptSuggestion} variant="contained" startIcon={<Check />} sx={{ mt: 2 }}>Aceitar e Usar este Texto</Button>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography color="text.secondary">Selecione "Editar" ou "Sugerir" em um bloco à esquerda.</Typography>
                    </Box>
                )}
            </Grid>
        </Grid>
    </Box>
  );

  const renderStep3_Finalize = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>Finalização</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Revise e faça os ajustes finais no documento completo antes de salvar.
        </Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <TextEditor value={briefingData.finalText} onChange={(val) => handleBriefingDataChange('finalText', val)} html={true} />
        </Box>
    </Box>
  );

  const renderContent = () => {
      switch(activeStep) {
          case 0: return renderStep0_Edit();
          case 1: return renderStep1_Review();
          case 2: return renderStep2_CompleteBlocks();
          case 3: return renderStep3_Finalize();
          default: return null;
      }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" fullScreen={isMobile} PaperProps={{ sx: { height: isMobile ? '100%' : '90vh' } }}>
        <DialogTitle>Novo Briefing a partir de Texto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden', p: { xs: 1, sm: 2, md: 3 } }}>
          <Stepper activeStep={activeStep} sx={{ mb: 2, flexShrink: 0 }}>
            {steps.map((label) => ( <Step key={label}><StepLabel>{label}</StepLabel></Step> ))}
          </Stepper>
          <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
            {renderContent()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary">Cancelar</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button disabled={activeStep === 0} onClick={handleBack}>Anterior</Button>
          {activeStep === steps.length - 1 ? (
            <Button onClick={() => onSave(briefingData)} variant="contained" color="primary">Salvar Briefing</Button>
          ) : (
            <Button onClick={handleNext} endIcon={<ArrowForward />}>Próximo</Button>
          )}
        </DialogActions>
      </Dialog>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 100 }} open={isLoading}>
        <CircularProgress color="inherit" />
        <Typography sx={{ ml: 2 }}>{loadingMessage}</Typography>
      </Backdrop>
    </>
  );
};

// Helper function to read text files
const readTextFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

export default TextBriefingWizard;