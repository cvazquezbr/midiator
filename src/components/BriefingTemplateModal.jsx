import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid, TextField
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import TextEditor from './TextEditor';

// Define the sections for the template as requested
const TEMPLATE_SECTIONS = [
    { id: 'titulo_missao', label: 'TÍTULO DA MISSÃO' },
    { id: 'saudacao', label: 'SAUDAÇÃO' },
    { id: 'entregas', label: 'ENTREGAS' },
    { id: 'mensagem_principal', label: 'MENSAGEM PRINCIPAL' },
    { id: 'cta', label: 'CTA' },
    { id: 'inspiracoes', label: 'INSPIRAÇÕES' },
    { id: 'proximos_passos', label: 'PRÓXIMOS PASSOS' },
    { id: 'dos', label: 'DOs' },
    { id: 'donts', label: 'DON\'Ts' },
    { id: 'hashtags', label: 'HASHTAGS' },
];

const BriefingTemplateModal = ({ open, onClose, onSave }) => {
  const [templateName, setTemplateName] = useState('Modelo Padrão');
  const [templateData, setTemplateData] = useState({});

  useEffect(() => {
    // Mock loading an existing template when the modal opens
    // In a real scenario, this would be an API call
    const fetchTemplate = async () => {
        // const response = await api.get('/api/briefing-template/default');
        // setTemplateData(response.data.template_data);
        // setTemplateName(response.data.name);

        // For now, initialize with empty strings
        const initialData = TEMPLATE_SECTIONS.reduce((acc, section) => {
            acc[section.id] = '';
            return acc;
        }, {});
        setTemplateData(initialData);
    };

    if (open) {
      fetchTemplate();
    }
  }, [open]);

  const handleContentChange = (sectionId, content) => {
    setTemplateData(prev => ({ ...prev, [sectionId]: content }));
  };

  const handleSave = () => {
    // Mock saving the template
    // In a real scenario, this would be a POST/PUT API call
    console.log('Saving template:', { name: templateName, data: templateData });
    toast.success('Modelo de briefing salvo com sucesso!');
    onSave(templateData); // Pass the data back to the wizard
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
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
        <Grid container spacing={3}>
          {TEMPLATE_SECTIONS.map(section => (
            <Grid item xs={12} key={section.id}>
              <Typography variant="h6" gutterBottom>{section.label}</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: '150px' }}>
                <TextEditor
                  content={templateData[section.id] || ''}
                  onUpdate={(newContent) => handleContentChange(section.id, newContent)}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} startIcon={<CloseIcon />}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color="primary" startIcon={<SaveIcon />}>
          Salvar Modelo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BriefingTemplateModal;