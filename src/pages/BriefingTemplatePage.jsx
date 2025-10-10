import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Grid, CircularProgress, TextField, Paper, Card, CardContent, CardActions, Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip, Container
} from '@mui/material';
import { Edit, Save, Download, ExpandMore as ExpandMoreIcon, Add } from '@mui/icons-material';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { Document, Paragraph, TextRun, HeadingLevel } from 'docx';

import { defaultBriefingTemplate } from '../utils/defaultBriefingTemplate';
import TextEditor from '../components/TextEditor';
import LoadingDialog from '../components/LoadingDialog';

const defaultBlockOrder = [
    'Título da Missão',
    'Saudação',
    'Entregas',
    'Mensagem Principal',
    'CTA',
    'DOs',
    "DON'Ts",
    'Hashtags',
    'Inspirações',
    'Premiação',
    'Próximos Passos'
];

const highlightOrderRule = (text) => {
    if (!text) return null;
    const pattern = /(EXATAMENTE nesta ordem:[\s\S]*?)(?=\n\n|\n*$)/i;
    const match = text.match(pattern);

    if (match && match[0]) {
        const parts = text.split(match[0]);
        return (
            <>
                {parts[0]}
                <span style={{ backgroundColor: 'yellow' }}>{match[0]}</span>
                {parts.slice(1).join(match[0])}
            </>
        );
    }

    return text;
};

const BriefingTemplatePage = () => {
  const [template, setTemplate] = useState(defaultBriefingTemplate);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null); // For the block editing dialog
  const [focusModeTarget, setFocusModeTarget] = useState(null); // For the general rules dialog
  const isInitialMount = useRef(true);

  // Debounced auto-save for the template
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      const saveTemplate = async () => {
        setIsSaving(true);
        try {
          const response = await fetch('/api/briefing-template', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template_data: template }),
          });
          if (!response.ok) throw new Error('Falha ao salvar o modelo.');
          // Use a success toast for explicit saves, but maybe just a console log for auto-saves
          console.log("Template auto-saved successfully.");
        } catch (error) {
          toast.error(`Erro ao salvar o modelo: ${error.message}`);
          setError(error.message);
        } finally {
          setIsSaving(false);
        }
      };
      saveTemplate();
    }, 2000); // Debounce delay of 2 seconds

    return () => {
      clearTimeout(handler);
    };
  }, [template]);

  // Fetch template on component mount
  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/briefing-template');
        let templateData;

        if (response.ok) {
          templateData = await response.json();
        } else if (response.status === 404) {
          templateData = defaultBriefingTemplate;
          console.log('Nenhum modelo salvo encontrado, usando o padrão.');
        } else {
          throw new Error(`Falha ao buscar o modelo: ${response.statusText}`);
        }

        // Ensure all default blocks exist, adding any that are missing.
        const existingBlockTitles = new Set(templateData.blocks.map(b => b.title));
        const updatedBlocks = [...templateData.blocks];

        defaultBlockOrder.forEach(title => {
          if (!existingBlockTitles.has(title)) {
            updatedBlocks.push({
              id: uuidv4(),
              title: title,
              content: '',
              rules: ''
            });
          }
        });

        setTemplate({ ...templateData, blocks: updatedBlocks });
        if (response.ok) {
            toast.info('Seu modelo de briefing foi carregado e atualizado.');
        }

      } catch (error) {
        toast.error(`Erro ao carregar seu modelo de briefing: ${error.message}`);
        setError(error.message);
        setTemplate(defaultBriefingTemplate); // Fallback on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, []);

  const handleTemplateChange = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const handleBlockChange = (blockId, field, value) => {
    setTemplate(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === blockId ? { ...b, [field]: value } : b
      )
    }));
  };

  const handleAddNewBlock = () => {
    const newBlock = {
      id: uuidv4(),
      title: 'Novo Bloco',
      content: 'Exemplo de conteúdo...',
      rules: 'Regras para a IA...'
    };
    setTemplate(prev => ({
        ...prev,
        blocks: [...prev.blocks, newBlock]
    }));
    toast.success('Novo bloco adicionado. Clique em "Editar" para customizá-lo.');
  };

  const handleExportToWord = () => {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "Modelo de Briefing", heading: HeadingLevel.TITLE }),
                new Paragraph({ text: "Regras Gerais para a IA:", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ text: template.generalRules, style: "Normal" }),
                ...template.blocks.flatMap(block => [
                    new Paragraph({ text: block.title, heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
                    new Paragraph({ text: "Conteúdo do Exemplo:", style: "Normal" }),
                    ...block.content.split('\n').map(line => new Paragraph({ text: line })),
                    new Paragraph({ text: "Instruções para a IA:", style: "Normal", spacing: { before: 200 } }),
                    ...block.rules.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, italics: true, color: "000080", size: 20 })] })),
                ]),
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, "modelo_de_briefing.docx");
        toast.success("Modelo exportado para Word com sucesso!");
    }).catch(err => {
        toast.error(`Erro ao exportar para Word: ${err.message}`);
    });
  };

  if (isLoading) {
    return <LoadingDialog open={true} title="Carregando Modelo de Briefing..." />;
  }

  if (error) {
    return <Typography color="error">Erro ao carregar o modelo: {error}</Typography>;
  }

  const sortedBlocks = [...template.blocks].sort((a, b) => {
    const indexA = defaultBlockOrder.indexOf(a.title);
    const indexB = defaultBlockOrder.indexOf(b.title);

    // Handle cases where a title might not be in the default order list
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" component="h1">
                    Editor de Modelo de Briefing
                </Typography>
                <Box>
                    <Button
                        startIcon={<Download />}
                        onClick={handleExportToWord}
                    >
                        Exportar para Word
                    </Button>
                </Box>
            </Box>

            {/* General Rules Section */}
            <Typography variant="h6" gutterBottom>Regras Gerais para a IA</Typography>
            <Paper
              variant="outlined"
              onClick={() => setFocusModeTarget('generalRules')}
              sx={{ p: 2, mb: 4, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {highlightOrderRule(template.generalRules) || 'Clique para editar...'}
              </Typography>
            </Paper>

            {/* Blocks Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Blocos do Modelo</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleAddNewBlock}>
                    Adicionar Bloco
                </Button>
            </Box>

            {sortedBlocks.map((block) => (
                <Accordion key={block.id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ flexGrow: 1 }}>{block.title}</Typography>
                        <Button size="small" startIcon={<Edit />} onClick={(e) => { e.stopPropagation(); setEditingBlock(block); }}>
                            Editar
                        </Button>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>Conteúdo do Exemplo</Typography>
                                <Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-wrap', backgroundColor: 'grey.100', minHeight: '100px' }}>
                                    {block.content}
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>Instruções para a IA</Typography>
                                <Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-wrap', backgroundColor: 'grey.100', minHeight: '100px' }}>
                                    {block.rules}
                                </Paper>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            ))}

        </Paper>

        {/* Editing Dialog for Blocks */}
        {editingBlock && (
            <Dialog open={Boolean(editingBlock)} onClose={() => setEditingBlock(null)} fullWidth maxWidth="lg">
                <DialogTitle>Editando Bloco: "{editingBlock.title}"</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Título do Bloco"
                        fullWidth
                        variant="outlined"
                        value={editingBlock.title}
                        onChange={(e) => setEditingBlock(prev => ({ ...prev, title: e.target.value }))}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>Conteúdo do Bloco (Exemplo)</Typography>
                            <Box sx={{ height: 400, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <TextEditor
                                    value={editingBlock.content}
                                    onChange={(val) => setEditingBlock(prev => ({ ...prev, content: val }))}
                                    html={false}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>Instruções para a IA (Regras)</Typography>
                            <Box sx={{ height: 400, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <TextEditor
                                    value={editingBlock.rules}
                                    onChange={(val) => setEditingBlock(prev => ({ ...prev, rules: val }))}
                                    html={false}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingBlock(null)}>Cancelar</Button>
                    <Button
                        onClick={() => {
                            handleBlockChange(editingBlock.id, 'title', editingBlock.title);
                            handleBlockChange(editingBlock.id, 'content', editingBlock.content);
                            handleBlockChange(editingBlock.id, 'rules', editingBlock.rules);
                            setEditingBlock(null);
                            toast.success(`Bloco "${editingBlock.title}" atualizado.`);
                        }}
                        variant="contained"
                    >
                        Salvar Alterações
                    </Button>
                </DialogActions>
            </Dialog>
        )}

        {/* Editing Dialog for General Rules */}
        {focusModeTarget === 'generalRules' && (
            <Dialog open={true} onClose={() => setFocusModeTarget(null)} fullWidth maxWidth="md">
                <DialogTitle>Editar Regras Gerais</DialogTitle>
                <DialogContent>
                    <Box sx={{ height: 500, mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <TextEditor
                            value={template.generalRules}
                            onChange={(val) => handleTemplateChange('generalRules', val)}
                            html={false}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFocusModeTarget(null)}>Fechar</Button>
                </DialogActions>
            </Dialog>
        )}
    </Container>
  );
};

export default BriefingTemplatePage;