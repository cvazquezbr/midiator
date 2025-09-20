import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../hooks/use-mobile.js';
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
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import TextEditor from './TextEditor';
import {
  Close as CloseIcon,
  TextFields as TextFieldsIcon,
  Palette as PaletteIcon,
  InfoOutlined as InfoOutlinedIcon,
  UploadFile as UploadFileIcon,
  Link as LinkIcon,
  AutoAwesome as AutoAwesomeIcon,
  Description as DescriptionIcon,
  Add,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import ColorThief from 'colorthief';

import TextEditorDialog from './TextEditorDialog';
import HtmlDisplayField from './HtmlDisplayField';
import PaletteWizard from './PaletteWizard';
import MemorialDescritivoModal from './MemorialDescritivoModal';
import geminiAPI from '../utils/geminiAPI';
import { useSettings } from '../context/SettingsContext';
import { useCampaign } from '../context/CampaignContext';
import { getPalettes } from '../utils/paletteState';
import isEqual from 'lodash.isequal';

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
        <Box sx={{ p: 3, width: '100%', overflowY: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CampaignStandardsModal = ({ open, onClose }) => {
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const { formato, setFormato, colors, setColors, currentCampaign, setCurrentCampaign } = useCampaign();
  const [value, setValue] = useState(0);

  // Other states
  const [editingField, setEditingField] = useState(null);
  const imageInputRef = useRef(null);
  const [initialState, setInitialState] = useState(null);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaletteWizard, setShowPaletteWizard] = useState(false);
  const [palettes, setPalettes] = useState([]);
  const [selectedPalette, setSelectedPalette] = useState('');

  useEffect(() => {
    if (open) {
      getPalettes().then(setPalettes).catch(err => toast.error('Failed to fetch palettes.'));
      // The API is now initialized in a central place (e.g., HomePage)
      // via initializeGenerationHandlers based on settings.
      // So, no need to initialize it here.
    }
  }, [open]);

  const handleChange = (event, newValue) => setValue(newValue);

  const handleSave = () => {
    setCurrentCampaign({ ...currentCampaign, formato, palette_id: selectedPalette });
    toast.success('Padrões de campanha salvos com sucesso!');
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleOpenEditor = (field) => setEditingField(field);
  const handleCloseEditor = () => setEditingField(null);

  const handleSaveEditor = (newContent) => {
    if (editingField === 'formato') setFormato(newContent);
    setEditingField(null);
  };

  const getCurrentContent = () => {
    if (!editingField) return '';
    if (editingField === 'formato') return formato;
    return '';
  };

  const getEditorTitle = () => {
    if (editingField === 'formato') return 'Editar Formato';
    return 'Editar';
  };

  const handleColorChange = (index, newColor) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], hex: newColor, rgb: `RGB(${parseInt(newColor.substr(1, 2), 16)}, ${parseInt(newColor.substr(3, 2), 16)}, ${parseInt(newColor.substr(5, 2), 16)})` };
    setColors(newColors);
  };

  const addColor = () => {
    if (colors.length < 5) setColors([...colors, { hex: '#000000', rgb: 'RGB(0, 0, 0)', name: 'Nova Cor', role: 'Manual', justification: 'Adicionada manualmente' }]);
  };

  const removeColor = (index) => setColors(colors.filter((_, i) => i !== index));

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const colorThief = new ColorThief();
            const palette = colorThief.getPalette(img, 5);
            const newColors = palette.map((rgb, index) => ({ hex: `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`, rgb: `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`, name: `Cor Extraída ${index + 1}`, role: 'Extraída', justification: 'Extraída da imagem de referência.' }));
            setColors(newColors);
            toast.success('Paleta de cores extraída com sucesso!');
          } catch (error) {
            console.error("Erro ao extrair paleta:", error);
            toast.error('Não foi possível extrair as cores. Tente outra imagem.');
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const a11yProps = (index) => ({ id: `vertical-tab-${index}`, 'aria-controls': `vertical-tabpanel-${index}` });

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" fullScreen={isMobile}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Padrões de Campanha
          <IconButton onClick={handleClose}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs orientation="horizontal" variant="scrollable" value={value} onChange={handleChange}>
              <Tab icon={<TextFieldsIcon />} iconPosition="start" label="Formato" {...a11yProps(0)} />
              <Tab icon={<PaletteIcon />} iconPosition="start" label="Cores" {...a11yProps(1)} />
            </Tabs>
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <TabPanel value={value} index={0}>
              <HtmlDisplayField title="Formato" htmlContent={formato} onClick={() => handleOpenEditor('formato')} />
            </TabPanel>
            <TabPanel value={value} index={1}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Paleta de Cores</InputLabel>
                <Select
                  value={selectedPalette}
                  onChange={(e) => {
                    const paletteId = e.target.value;
                    setSelectedPalette(paletteId);
                    const selected = palettes.find(p => p.id === paletteId);
                    if (selected) {
                      setColors(selected.colors.map(hex => ({ hex, name: `Cor (${hex})`, role: 'Salva', justification: '' })));
                    } else {
                      setColors([]);
                    }
                  }}
                  label="Paleta de Cores"
                >
                  <MenuItem value="">
                    <em>Nenhuma</em>
                  </MenuItem>
                  {palettes.map(palette => (
                    <MenuItem key={palette.id} value={palette.id}>
                      {palette.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => setShowPaletteWizard(true)} sx={{ alignSelf: 'flex-start' }}>Assistente de Paleta</Button>
              </Stack>
              <Divider />
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Cores da Campanha</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                {colors.map((color, index) => (
                  <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input type="color" value={color.hex} onChange={(e) => handleColorChange(index, e.target.value)} style={{ width: '50px', height: '50px', border: 'none', cursor: 'pointer' }} />
                    <Typography variant="caption">{color.name || color.hex}</Typography>
                    <Button size="small" onClick={() => removeColor(index)}>Remover</Button>
                  </Box>
                ))}
                {colors.length < 5 && <Button variant="outlined" onClick={addColor}>Adicionar Cor</Button>}
              </Box>
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6">Extrair Cores de Imagem</Typography>
                <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => imageInputRef.current.click()}>Upload</Button>
                <input type="file" hidden accept="image/*" ref={imageInputRef} onChange={handleImageUpload} />
              </Box>
            </TabPanel>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Salvar Padrões</Button>
        </DialogActions>
      </Dialog>
      <TextEditorDialog open={editingField !== null} title={getEditorTitle()} content={getCurrentContent()} onSave={handleSaveEditor} onClose={handleCloseEditor} html={true} />
      <PaletteWizard open={showPaletteWizard} onClose={() => setShowPaletteWizard(false)} onSave={(newPalette) => { setColors(newPalette); toast.success('Paleta de cores aplicada!'); }} onGenerate={async (briefing, callback) => { setIsGenerating(true); try { const result = await onGeneratePalette(briefing); callback(result); } catch (error) { toast.error('Erro ao gerar paleta.'); } finally { setIsGenerating(false); } }} isGenerating={isGenerating} />
    </>
  );
};

export default CampaignStandardsModal;
