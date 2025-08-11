import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Link as MuiLink,
} from '@mui/material';
import {
  Close as CloseIcon,
  TextFields as TextFieldsIcon,
  Palette as PaletteIcon,
  InfoOutlined as InfoOutlinedIcon,
  UploadFile as UploadFileIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import ColorThief from 'colorthief';

import TextEditorDialog from './TextEditorDialog';
import HtmlDisplayField from './HtmlDisplayField';
import { getCampaignPrompt, saveCampaignPrompt } from '../utils/campaignPrompt';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, width: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CampaignStandardsModal = ({ open, onClose }) => {
  const [value, setValue] = useState(0);
  const [hasStoredPrompt, setHasStoredPrompt] = useState(false);
  const [persona, setPersona] = useState('');
  const [autor, setAutor] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [formato, setFormato] = useState('');
  const [colors, setColors] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const { persona, autor, instrucoes, formato, colors } = getCampaignPrompt();
      setPersona(persona);
      setAutor(autor);
      setInstrucoes(instrucoes);
      setFormato(formato);
      setColors(colors || []);
      setHasStoredPrompt(!!(persona || autor || instrucoes || formato || (colors && colors.length > 0)));
    }
  }, [open]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSave = () => {
    saveCampaignPrompt({ persona, autor, instrucoes, formato, colors });
    setHasStoredPrompt(true);
    toast.success('Padrões de campanha salvos com sucesso!');
    onClose();
  };

  const handleOpenEditor = (field) => {
    setEditingField(field);
  };

  const handleCloseEditor = () => {
    setEditingField(null);
  };

  const handleSaveEditor = (newContent) => {
    if (editingField === 'persona') {
      setPersona(newContent);
    } else if (editingField === 'autor') {
      setAutor(newContent);
    } else if (editingField === 'instrucoes') {
      setInstrucoes(newContent);
    } else if (editingField === 'formato') {
      setFormato(newContent);
    }
    setEditingField(null);
  };

  const getCurrentContent = () => {
    if (editingField === 'persona') return persona;
    if (editingField === 'autor') return autor;
    if (editingField === 'instrucoes') return instrucoes;
    if (editingField === 'formato') return formato;
    return '';
  };

  const getEditorTitle = () => {
      if (editingField === 'persona') return 'Editar Persona';
      if (editingField === 'autor') return 'Editar Autor';
      if (editingField === 'instrucoes') return 'Editar Instruções';
      if (editingField === 'formato') return 'Editar Formato';
      return 'Editar';
  };

  const handleColorChange = (index, newColor) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    setColors(newColors);
  };

  const addColor = () => {
    if (colors.length < 5) {
      setColors([...colors, '#000000']);
    }
  };

  const removeColor = (index) => {
    const newColors = colors.filter((_, i) => i !== index);
    setColors(newColors);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(img, 5);
          setColors(palette.map(rgb => `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const a11yProps = (index) => {
    return {
      id: `vertical-tab-${index}`,
      'aria-controls': `vertical-tabpanel-${index}`,
    };
  };

  const colorPalettes = [
    { name: 'Coolors', url: 'https://coolors.co/' },
    { name: 'Adobe Color', url: 'https://color.adobe.com/' },
    { name: 'Color Hunt', url: 'https://colorhunt.co/' },
    { name: 'Paletton', url: 'https://paletton.com/' },
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Padrões de Campanha
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', p: 0, minHeight: '500px' }}>
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={value}
            onChange={handleChange}
            aria-label="Padrões de Campanha"
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              minWidth: 200,
            }}
          >
            <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Persona" sx={{ justifyContent: 'flex-start' }} {...a11yProps(0)} />
            <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Autor" sx={{ justifyContent: 'flex-start' }} {...a11yProps(1)} />
            <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Formato" sx={{ justifyContent: 'flex-start' }} {...a11yProps(2)} />
            <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Instruções" sx={{ justifyContent: 'flex-start' }} {...a11yProps(3)} />
            <Tab icon={<PaletteIcon />} iconPosition="start" label="Cores" sx={{ justifyContent: 'flex-start' }} {...a11yProps(4)} />
          </Tabs>

          <TabPanel value={value} index={0}>
            <HtmlDisplayField
              title="Persona"
              tooltip="Descreva a persona para quem o conteúdo se destina. Inclua detalhes demográficos, interesses e dores."
              htmlContent={persona}
              onClick={() => handleOpenEditor('persona')}
              placeholder="Clique para editar a persona..."
            />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <HtmlDisplayField
              title="Autor"
              tooltip="Descreva o autor ou a voz da marca que está criando o conteúdo. Qual o tom, estilo e perspectiva?"
              htmlContent={autor}
              onClick={() => handleOpenEditor('autor')}
              placeholder="Clique para editar o autor..."
            />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <HtmlDisplayField
              title="Formato"
              tooltip="Descreva a estrutura do conteúdo. É uma lista? Um passo-a-passo? Uma história? Dê exemplos se possível."
              htmlContent={formato}
              onClick={() => handleOpenEditor('formato')}
              placeholder="Clique para editar o formato..."
            />
          </TabPanel>
          <TabPanel value={value} index={3}>
            <HtmlDisplayField
              title="Instruções"
              tooltip="Forneça instruções detalhadas para a IA. Inclua o que fazer e o que não fazer, palavras-chave, e o objetivo do conteúdo."
              htmlContent={instrucoes}
              onClick={() => handleOpenEditor('instrucoes')}
              placeholder="Clique para editar as instruções..."
            />
          </TabPanel>

          <TabPanel value={value} index={4}>
            <Typography variant="h6" gutterBottom>Cores da Campanha</Typography>
            <Typography variant="body2" gutterBottom>
              Defina até 5 cores de referência para a campanha.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
              {colors.map((color, index) => (
                <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    style={{ width: '50px', height: '50px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <Button size="small" onClick={() => removeColor(index)}>Remover</Button>
                </Box>
              ))}
              {colors.length < 5 && (
                <Button variant="outlined" onClick={addColor}>Adicionar Cor</Button>
              )}
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Extrair Cores de Imagem</Typography>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => imageInputRef.current.click()}
              >
                Upload de Imagem
              </Button>
              <input
                type="file"
                hidden
                accept="image/*"
                ref={imageInputRef}
                onChange={handleImageUpload}
              />
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Inspiração de Paletas de Cores</Typography>
              {colorPalettes.map((palette) => (
                <Chip
                  key={palette.name}
                  icon={<LinkIcon />}
                  label={palette.name}
                  component="a"
                  href={palette.url}
                  target="_blank"
                  clickable
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Salvar Padrões</Button>
        </DialogActions>
      </Dialog>

      <TextEditorDialog
        open={editingField !== null}
        title={getEditorTitle()}
        content={getCurrentContent()}
        onSave={handleSaveEditor}
        onClose={handleCloseEditor}
      />
    </>
  );
};

export default CampaignStandardsModal;
