import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid, TextField
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import TextEditor from './TextEditor';

const TEMPLATE_SECTIONS = [
    { id: 'titulo_missao', label: 'TÍTULO DA MISSÃO' },
    { id: 'saudacao', label: 'SAUDAÇÃO' },
    { id: 'entregas', label: 'ENTREGAS' },
    { id: 'mensagem_principal', label: 'MENSAGEM PRINCIPAL' },
    { id: 'cta', label: 'CTA' },
    { id: 'inspiracoes', label: 'INSPIRAÇÕES' },
    { id: 'proximos_passos', label: 'PRÓXIMOS PASSOS' },
    { id: 'dos', label: 'DOs' },
    { id: 'donts', label: "DON'Ts" },
    { id: 'hashtags', label: 'HASHTAGS' },
];

const sectionsToMarkdown = (sections) => {
    return Object.entries(sections)
        .map(([title, content]) => {
            const sectionTitle = TEMPLATE_SECTIONS.find(s => s.id === title)?.label || title;
            return `## ${sectionTitle}\n\n${content}`;
        })
        .join('\n\n---\n\n');
};

const BriefingTemplateModal = ({ open, onClose, onSave }) => {
  const [templateName, setTemplateName] = useState('Modelo Padrão');
  const [templateData, setTemplateData] = useState({});

  useEffect(() => {
    const initialData = TEMPLATE_SECTIONS.reduce((acc, section) => {
        acc[section.id] = `<p>Defina o conteúdo para <strong>${section.label}</strong> aqui.</p>`;
        return acc;
    }, {});
    setTemplateData(initialData);
  }, []);

  const handleContentChange = (sectionId, content) => {
    setTemplateData(prev => ({ ...prev, [sectionId]: content }));
  };

  const handleSave = () => {
    const markdownOutput = sectionsToMarkdown(templateData);
    toast.success('Modelo de briefing salvo com sucesso!');
    onSave(markdownOutput);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { height: '90vh' } }}>
      <DialogTitle>Gerenciar Modelo de Briefing</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
            <TextField
                label="Nome do Modelo"
                fullWidth
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                variant="outlined"
            />
        </Box>
        <Grid container spacing={3} sx={{ height: 'calc(100% - 80px)', overflowY: 'auto' }}>
          {TEMPLATE_SECTIONS.map(section => (
            <Grid item xs={12} key={section.id}>
              <Typography variant="h6" gutterBottom>{section.label}</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: '200px' }}>
                <TextEditor
                  value={templateData[section.id] || ''}
                  onChange={(newContent) => handleContentChange(section.id, newContent)}
                  html={true}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} startIcon={<CloseIcon />}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color="primary" startIcon={<SaveIcon />}>
          Salvar e Usar Modelo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BriefingTemplateModal;