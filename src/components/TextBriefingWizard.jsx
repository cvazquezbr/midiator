import React, { useState, useRef } from 'react';
import {
  Box, Button, Typography, Stepper, Step, StepLabel, Dialog, DialogTitle, DialogContent, Grid, CircularProgress, TextField, useMediaQuery, Backdrop, DialogActions
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack, ArrowForward, UploadFile } from '@mui/icons-material';
import { toast } from 'sonner';

import TextEditor from './TextEditor';
import { parseWordDocument, parsePdfDocument } from '../utils/fileImport';
import geminiAPI from '../utils/geminiAPI';
import { getGeminiApiKey } from '../utils/geminiCredentials';

export const emptyTextBriefingData = {
  name: '',
  baseText: '',
  referenceText: '',
  revisedText: '',
  revisionNotes: '',
};

const steps = ['Edição do Briefing', 'Revisão com IA'];

const TextBriefingWizard = ({ open, onClose, onSave, briefingData, onBriefingDataChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isRevising, setIsRevising] = useState(false);

  const wordInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const referenceInputRef = useRef(null);

  const handleNext = async () => {
    if (activeStep === 0) {
        if (!briefingData.baseText) {
            toast.error('O texto base do briefing não pode estar vazio.');
            return;
        }
        if (!briefingData.referenceText) {
            toast.error('É necessário importar um modelo de referência para continuar.');
            return;
        }

        if (!geminiAPI.isInitialized) {
            const apiKey = getGeminiApiKey();
            if (!apiKey) {
                toast.error('Chave de API do Gemini não configurada.');
                return;
            }
            geminiAPI.initialize(apiKey);
        }

        setIsRevising(true);
        setActiveStep((prev) => prev + 1);

        try {
            const result = await geminiAPI.reviseBriefing(briefingData.baseText, briefingData.referenceText);
            onBriefingDataChange(prev => ({
                ...prev,
                revisedText: result.revisedText,
                revisionNotes: result.revisionNotes,
            }));
            toast.success('Briefing revisado com sucesso pela IA.');
        } catch (error) {
            toast.error(`Erro na revisão com IA: ${error.message}`);
            setActiveStep((prev) => prev - 1);
        } finally {
            setIsRevising(false);
        }
    } else {
       setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
      if (activeStep === 1) {
          onBriefingDataChange(prev => ({ ...prev, revisedText: '', revisionNotes: '' }));
      }
      setActiveStep((prev) => prev - 1);
  };

  const handleTextChange = (htmlContent) => {
    onBriefingDataChange(prev => ({ ...prev, baseText: htmlContent }));
  };

  const handleRevisedDataChange = (e) => {
    const { name, value } = e.target;
    onBriefingDataChange(prev => ({ ...prev, [name]: value }));
  };

  const handleReferenceTextChange = (textContent) => {
    onBriefingDataChange(prev => ({ ...prev, referenceText: textContent }));
    toast.success('Modelo de referência carregado com sucesso.');
  };

  const handleNameChange = (event) => {
    onBriefingDataChange(prev => ({ ...prev, name: event.target.value }));
  };

  const handleFileImport = async (event, parser, contentSetter) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const content = await parser(file);
      contentSetter(content);
      toast.success(`${file.name} importado com sucesso!`);
    } catch (error) {
      toast.error(error.toString());
    } finally {
      setIsImporting(false);
      event.target.value = null;
    }
  };

  const readTextFile = (file) => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = (error) => reject(error);
          reader.readAsText(file);
      });
  };

  const renderStepContent = () => {
    if (activeStep === 0) {
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Editor de Briefing</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Cole ou escreva o texto base do seu briefing abaixo. Você pode usar as ferramentas de formatação e importar arquivos do Word ou PDF.
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <TextEditor
                value={briefingData.baseText}
                onChange={handleTextChange}
                html={true}
                placeholder="Digite ou cole o conteúdo do briefing aqui..."
              />
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <input type="file" ref={wordInputRef} hidden accept=".docx" onChange={(e) => handleFileImport(e, parseWordDocument, handleTextChange)} />
              <input type="file" ref={pdfInputRef} hidden accept=".pdf" onChange={(e) => handleFileImport(e, parsePdfDocument, handleTextChange)} />
              <input type="file" ref={referenceInputRef} hidden accept=".txt,.md" onChange={(e) => handleFileImport(e, readTextFile, handleReferenceTextChange)} />
              <Button variant="outlined" onClick={(e) => { e.stopPropagation(); wordInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isImporting || isRevising}>
                Importar Word (.docx)
              </Button>
              <Button variant="outlined" onClick={(e) => { e.stopPropagation(); pdfInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isImporting || isRevising}>
                Importar PDF
              </Button>
              <Button variant="outlined" onClick={(e) => { e.stopPropagation(); referenceInputRef.current.click(); }} startIcon={<UploadFile />} disabled={isImporting || isRevising} color={briefingData.referenceText ? "success" : "primary"}>
                {briefingData.referenceText ? "Modelo Carregado" : "Importar Modelo de Referência"}
              </Button>
            </Box>
        </Box>
      );
    }

    if (activeStep === 1) {
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <TextField name="name" label="Nome do Briefing" fullWidth value={briefingData.name || ''} onChange={handleNameChange} required helperText="Dê um nome para identificar facilmente este briefing no futuro." sx={{ mb: 2, flexShrink: 0 }}/>
            <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Briefing Revisado (Editável)</Typography>
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <TextEditor
                            value={briefingData.revisedText}
                            onChange={(content) => handleRevisedDataChange({ target: { name: 'revisedText', value: content } })}
                            html={true}
                        />
                    </Box>
                </Grid>
                <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Notas da Revisão (Editável)</Typography>
                     <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                        <TextEditor
                            value={briefingData.revisionNotes}
                            onChange={(content) => handleRevisedDataChange({ target: { name: 'revisionNotes', value: content } })}
                            html={true}
                        />
                    </Box>
                </Grid>
            </Grid>
        </Box>
      );
    }

    return null;
  };

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xl"
        fullScreen={isMobile}
        PaperProps={{ sx: { height: isMobile ? '100%' : '90vh' } }}
      >
        <DialogTitle>Novo Briefing a partir de Texto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
          <Stepper activeStep={activeStep} sx={{ mb: 2, flexShrink: 0 }}>
            {steps.map((label) => ( <Step key={label}><StepLabel>{label}</StepLabel></Step> ))}
          </Stepper>
          <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 1 }}>
            {isRevising ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>A IA está revisando seu briefing... Isso pode levar um momento.</Typography>
              </Box>
            ) : renderStepContent()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary">Cancelar</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<ArrowBack />}>
            Anterior
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button onClick={onSave} variant="contained" color="primary" sx={{ ml: 1 }}>
              Salvar Briefing
            </Button>
          ) : (
            <Button onClick={handleNext} endIcon={<ArrowForward />} sx={{ ml: 1 }}>
              Próximo
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 10 }}
        open={isImporting}
      >
        <CircularProgress color="inherit" />
        <Typography sx={{ ml: 2 }}>Importando arquivo...</Typography>
      </Backdrop>
    </>
  );
};

export default TextBriefingWizard;