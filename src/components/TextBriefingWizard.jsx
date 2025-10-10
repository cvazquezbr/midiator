import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Typography, Stepper, Step, StepLabel, Dialog, DialogTitle, DialogContent, Grid, CircularProgress, TextField, useMediaQuery, Backdrop, DialogActions, Paper, Card, CardContent, CardActions, Alert, Drawer, Tooltip, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack, ArrowForward, UploadFile, Edit, Check, Notes as NotesIcon, Fullscreen, FullscreenExit } from '@mui/icons-material';
import { toast } from 'sonner';

import TextEditor from './TextEditor';
import HtmlDisplay from './HtmlDisplay';
import BriefingTemplateModal from './BriefingTemplateModal';
import { parseWordDocument, parsePdfDocument } from '../utils/fileImport';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

const sectionsToHtml = (sections) => {
    let dos = sections['DOs'] || '';
    let donts = sections["DON'Ts"] || '';

    // Remove DOs and DON'Ts from the main sections object to avoid duplication
    const otherSections = { ...sections };
    delete otherSections['DOs'];
    delete otherSections["DON'Ts"];

    const parseList = (htmlContent) => {
        const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
        // Look for list items or paragraphs
        const items = Array.from(doc.body.querySelectorAll('li, p'));
        if (items.length > 0) {
            return items.map(item => item.textContent.trim()).filter(text => text);
        }
        // Fallback for plain text with newlines
        return htmlContent.split('<br>').map(s => s.trim()).filter(Boolean);
    };

    const dosList = parseList(dos);
    const dontsList = parseList(donts);

    const mainContent = Object.entries(otherSections)
        .map(([title, content]) => {
            return `<h3>${title}</h3>\n${content}`;
        })
        .join('\n\n');

    const dosAndDontsTable = `
        <br><br>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-size: 1.5em;">DO'S</th>
                    <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-size: 1.5em;">DON'TS</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="vertical-align: top; padding: 8px; width: 50%;">
                        <ul style="list-style-type: none; padding-left: 0;">
                            ${dosList.map(item => `<li style="margin-bottom: 8px;">→ ${item}</li>`).join('')}
                        </ul>
                    </td>
                    <td style="vertical-align: top; padding: 8px; width: 50%;">
                        <ul style="list-style-type: none; padding-left: 0;">
                            ${dontsList.map(item => `<li style="margin-bottom: 8px;">→ ${item}</li>`).join('')}
                        </ul>
                    </td>
                </tr>
            </tbody>
        </table>
    `;

    return mainContent + (dosList.length > 0 || dontsList.length > 0 ? dosAndDontsTable : '');
};

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
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isNotesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [focusModeTarget, setFocusModeTarget] = useState(null); // null | 'baseText' | 'revisedText'

  const [activeSuggestion, setActiveSuggestion] = useState({ title: null, content: '' });

  const wordInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    if (activeStep === 3) {
        setLoadingMessage('Gerando texto final...');
        setIsLoading(true);
        setTimeout(() => {
            const finalHtml = sectionsToHtml(briefingData.sections);
            onBriefingDataChange(prev => ({ ...prev, finalText: finalHtml }));
            setIsLoading(false);
        }, 100);
    }
  }, [activeStep, briefingData.sections, onBriefingDataChange]);

  const handleNext = async () => {
    if (activeStep === 0) {
        if (!briefingData.baseText || !briefingData.referenceText) {
            toast.error('O texto base e o modelo de referência são obrigatórios.');
            return;
        }
        if (!geminiAPI.isInitialized) {
            const apiKey = getGeminiApiKey();
            if (!apiKey) { toast.error('Chave de API do Gemini não configurada.'); return; }
            geminiAPI.initialize(apiKey);
        }

        setIsRevising(true);

        try {
            const result = await geminiAPI.reviseBriefing(briefingData.baseText, briefingData.referenceText);
            const sections = result.sections || {};
            const revisedText = sectionsToHtml(sections);
            const formattedNotes = Array.isArray(result.revisionNotes)
                ? result.revisionNotes.map(note => `<p>- ${note}</p>`).join('')
                : result.revisionNotes || '';

            onBriefingDataChange(prev => ({
                ...prev,
                revisedText: revisedText,
                revisionNotes: formattedNotes,
                sections: sections,
            }));
            toast.success('Briefing revisado com sucesso!');
            setActiveStep(1);
        } catch (error) {
            toast.error(`Erro na revisão com IA: ${error.message}`);
        } finally {
            setIsRevising(false);
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

  const handleSaveTemplate = (markdown) => {
    handleBriefingDataChange('referenceText', markdown);
    setTemplateModalOpen(false);
  };

  const handleGenerateSuggestion = async (title) => {
      setLoadingMessage(`Gerando sugestão para "${title}"...`);
      setIsLoading(true);
      try {
          const context = {
              dos: briefingData.sections['DOs'] || '',
              donts: briefingData.sections["DON'Ts"] || '',
              mainMessage: briefingData.sections['Mensagem Principal'] || '',
              campaignInfo: briefingData.sections['Sobre a campanha'] || '',
          };
          const suggestion = await geminiAPI.generateBlockSuggestion(title, context);
          if (suggestion && suggestion.trim() !== '') {
            setActiveSuggestion({ title, content: suggestion });
          } else {
            toast.info('A IA não conseguiu gerar uma sugestão para este bloco. Tente editar manualmente.');
          }
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

  const renderStep0_Edit = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box>
                <Typography variant="h6" gutterBottom mb={0}>Editor de Briefing</Typography>
                <Typography variant="body2" color="text.secondary">
                  Cole, digite ou importe o texto base do seu briefing.
                </Typography>
            </Box>
            <Tooltip title="Edição Focada">
                <IconButton onClick={() => setFocusModeTarget('baseText')}>
                    <Fullscreen />
                </IconButton>
            </Tooltip>
        </Box>
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
          <Button variant="outlined" onClick={(e) => { e.stopPropagation(); wordInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isLoading}>Importar Word (.docx)</Button>
          <Button variant="outlined" onClick={(e) => { e.stopPropagation(); pdfInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isLoading}>Importar PDF</Button>
          <Button
            variant="outlined"
            onClick={() => setTemplateModalOpen(true)}
            startIcon={<Edit />}
            disabled={isLoading}
            color={briefingData.referenceText ? "success" : "primary"}
          >
            {briefingData.referenceText ? "Modelo Carregado" : "Gerenciar Modelo"}
          </Button>
        </Box>
    </Box>
  );

  const renderStep1_Review = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
        <Grid item xs={12} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" gutterBottom mb={0}>
              Briefing Revisado (Editável)
            </Typography>
            <Box>
                <Tooltip title="Edição Focada">
                    <IconButton onClick={() => setFocusModeTarget('revisedText')}>
                        <Fullscreen />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Ver Notas da Revisão">
                  <Button startIcon={<NotesIcon />} onClick={() => setNotesDrawerOpen(true)}>
                    Ver Notas
                  </Button>
                </Tooltip>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <TextEditor value={briefingData.revisedText} onChange={(val) => handleBriefingDataChange('revisedText', val)} html={true} />
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
          Defina um nome para o seu briefing e revise o documento final. Para fazer ajustes, volte às etapas anteriores.
        </Typography>
        <TextField
          name="name"
          label="Nome do Briefing"
          fullWidth
          value={briefingData.name || ''}
          onChange={(e) => handleBriefingDataChange('name', e.target.value)}
          required
          sx={{ mb: 2, flexShrink: 0 }}
        />
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <HtmlDisplay htmlContent={briefingData.finalText} />
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
            <Button
              onClick={handleNext}
              endIcon={isRevising ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
              disabled={isRevising}
            >
              {isRevising && activeStep === 0 ? 'Revisando...' : 'Próximo'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 100 }} open={isLoading}>
        <CircularProgress color="inherit" />
        <Typography sx={{ ml: 2 }}>{loadingMessage}</Typography>
      </Backdrop>
      <BriefingTemplateModal
        open={isTemplateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSave={handleSaveTemplate}
      />
      <Drawer
        anchor="right"
        open={isNotesDrawerOpen}
        onClose={() => setNotesDrawerOpen(false)}
        PaperProps={{
            sx: {
                width: isMobile ? '90%' : 450,
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }
        }}
      >
        <Typography variant="h6" gutterBottom>Notas da Revisão (Editável)</Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
          <TextEditor value={briefingData.revisionNotes} onChange={(val) => handleBriefingDataChange('revisionNotes', val)} html={true} />
        </Box>
        <Button onClick={() => setNotesDrawerOpen(false)} sx={{ mt: 2 }}>
          Fechar
        </Button>
      </Drawer>
      <Dialog open={Boolean(focusModeTarget)} onClose={() => setFocusModeTarget(null)} fullScreen>
        <DialogTitle>
            Edição Focada
            <IconButton
                aria-label="close"
                onClick={() => setFocusModeTarget(null)}
                sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                }}
            >
                <FullscreenExit />
            </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, m: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {focusModeTarget && (
                <TextEditor
                    value={briefingData[focusModeTarget]}
                    onChange={(val) => handleBriefingDataChange(focusModeTarget, val)}
                    html={true}
                />
            )}
        </DialogContent>
      </Dialog>
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