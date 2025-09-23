import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Grid,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  VisibilityOff,
  FlipToFront,
  FlipToBack,
  ArrowUpward,
  ArrowDownward,
  AspectRatio,
  Image as ImageIcon,
  BrandingWatermark,
  ContentCopy,
  ContentPaste,
} from '@mui/icons-material';
import { useCampaign } from '../context/CampaignContext';
import { copyStyleToClipboard, pasteStyleFromClipboard } from '../utils/styleClipboard';
import BrandElementManager from './BrandElementManager';
import ImageManager from './ImageManager';
import TextFormatting from './formatting/TextFormatting';
import ImageFormatting from './formatting/ImageFormatting';
import BackgroundFormatting from './formatting/BackgroundFormatting';
import PositionSizeFormatting from './formatting/PositionSizeFormatting';

const FormattingPanel = ({
  colorPalette,
  initialFieldStyles,
  onOpenHtmlEditor,
  templateFieldStyles,
  isCropping,
  setIsCropping,
  showImageLoaders = false,
  handleImageUpload,
  onOpenImageGallery,
  // Props for controlled state (from PageEditor)
  fieldStyles: fieldStylesProp,
  setFieldStyles: setFieldStylesProp,
  fieldPositions: fieldPositionsProp,
  setFieldPositions: setFieldPositionsProp,
  brandElements: brandElementsProp,
  setBrandElements: setBrandElementsProp,
  pageTemplate: pageTemplateProp,
  setPageTemplate: setPageTemplateProp,
  selectedField: selectedFieldProp,
  setSelectedField: setSelectedFieldProp,
}) => {
  const context = useCampaign();
  const { imageColorPalette: imagePalette } = context; // Get image palette from context

  // Use props if provided (controlled mode), otherwise use context (standalone mode)
  const fieldStyles = fieldStylesProp ?? context.fieldStyles;
  const setFieldStyles = setFieldStylesProp ?? context.setFieldStyles;
  const fieldPositions = fieldPositionsProp ?? context.fieldPositions;
  const setFieldPositions = setFieldPositionsProp ?? context.setFieldPositions;
  const brandElements = brandElementsProp ?? context.brandElements;
  const setBrandElements = setBrandElementsProp ?? context.setBrandElements;
  const pageTemplate = pageTemplateProp ?? context.pageTemplate;
  const setPageTemplate = setPageTemplateProp ?? context.setPageTemplate;
  const selectedField = selectedFieldProp ?? context.selectedField;
  const setSelectedField = setSelectedFieldProp ?? context.setSelectedField;

  const [expandedPanel, setExpandedPanel] = React.useState(false);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const { currentElement, isTextField, isPageImage, isBrandElement, isPageBackground } = React.useMemo(() => {
    if (!selectedField) {
      return { currentElement: null, isTextField: false, isPageImage: false, isBrandElement: false, isPageBackground: false };
    }
    if (selectedField === '__page_background__') {
      return { currentElement: pageTemplate, isTextField: false, isPageImage: false, isBrandElement: false, isPageBackground: true };
    }
    if (fieldPositions[selectedField]) {
      const element = {
        ...fieldPositions[selectedField],
        style: fieldStyles[selectedField] || {},
      };
      return { currentElement: element, isTextField: true, isPageImage: false, isBrandElement: false, isPageBackground: false };
    }
    const pageImg = pageTemplate?.images?.find(img => img.id === selectedField);
    if (pageImg) {
      return { currentElement: pageImg, isTextField: false, isPageImage: true, isBrandElement: false, isPageBackground: false };
    }
    const brandEl = brandElements?.find(el => el.id === selectedField);
    if (brandEl) {
      return { currentElement: brandEl, isTextField: false, isPageImage: false, isBrandElement: true, isPageBackground: false };
    }
    return { currentElement: null, isTextField: false, isPageImage: false, isBrandElement: false, isPageBackground: false };
  }, [selectedField, fieldPositions, fieldStyles, brandElements, pageTemplate]);

  React.useEffect(() => {
    if (!selectedField) {
      setExpandedPanel(false);
      return;
    }
    if (selectedField === '__page_background__') setExpandedPanel('backgroundColor');
    else if (isTextField) setExpandedPanel('fontStyle');
    else if (isPageImage || isBrandElement) setExpandedPanel('imageStyle');
  }, [selectedField, isTextField, isPageImage, isBrandElement]);

  const updateFieldStyle = (property, value) => {
    if (!isTextField) return;
    setFieldStyles(prev => ({ ...prev, [selectedField]: { ...(prev[selectedField] || {}), [property]: value } }));
  };

  const updateElementProperty = (property, value) => {
    if (isTextField) {
      setFieldPositions(prev => ({ ...prev, [selectedField]: { ...prev[selectedField], [property]: value } }));
    } else if (isPageImage) {
      setPageTemplate(prev => ({ ...prev, images: prev.images.map(img => img.id === selectedField ? { ...img, [property]: value } : img) }));
    } else if (isBrandElement) {
      setBrandElements(prev => prev.map(el => el.id === selectedField ? { ...el, [property]: value } : el));
    }
  };

  const updateElementFilter = (filterProperty, value) => {
    const updater = (element) => ({ ...element, filters: { ...(element.filters || {}), [filterProperty]: value } });
    if (isPageImage) {
      setPageTemplate(prev => ({ ...prev, images: prev.images.map(img => img.id === selectedField ? updater(img) : img) }));
    } else if (isBrandElement) {
      setBrandElements(prev => prev.map(el => el.id === selectedField ? updater(el) : el));
    }
  };

  const handleDeleteElement = () => {
    if (isPageImage) {
      setPageTemplate(prev => ({ ...prev, images: prev.images.filter(img => img.id !== selectedField) }));
    } else if (isBrandElement) {
      setBrandElements(prev => prev.filter(el => el.id !== selectedField));
    }
    setSelectedField(null);
  };

  const resetFieldStyle = () => {
    if (!isTextField) return;
    let styleToApply = templateFieldStyles?.[selectedField] || initialFieldStyles?.[selectedField];
    if (styleToApply) {
      setFieldStyles(prev => ({ ...prev, [selectedField]: styleToApply }));
    }
  };

  const handleZIndexChange = (elementId, action) => {
    if (!elementId) return;

    // Gather all element types into one array
    let allElements = [
        ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, type: 'text' })),
        ...brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, type: 'brand' })),
        ...(pageTemplate.images || []).map(img => ({ id: img.id, zIndex: img.zIndex, type: 'pageImage' })),
    ];

    allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const currentIndex = allElements.findIndex(el => el.id === elementId);
    if (currentIndex === -1) return;

    const [currentElement] = allElements.splice(currentIndex, 1);
    switch (action) {
        case 'front': allElements.push(currentElement); break;
        case 'back': allElements.unshift(currentElement); break;
        case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement); break;
        case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement); break;
        default: allElements.splice(currentIndex, 0, currentElement); return;
    }

    // Create copies of the state to modify
    const newPositions = { ...fieldPositions };
    const newBrandElements = [...brandElements];
    const newImages = [...(pageTemplate.images || [])];

    // Re-assign z-index based on the new order
    allElements.forEach((el, index) => {
        el.zIndex = index;
        if (el.type === 'text') {
            if (newPositions[el.id]) {
                newPositions[el.id].zIndex = index;
            }
        } else if (el.type === 'brand') {
            const brandEl = newBrandElements.find(b => b.id === el.id);
            if (brandEl) brandEl.zIndex = index;
        } else if (el.type === 'pageImage') {
            const imgEl = newImages.find(i => i.id === el.id);
            if (imgEl) imgEl.zIndex = index;
        }
    });

    // Update the state
    setFieldPositions(newPositions);
    setBrandElements(newBrandElements);
    setPageTemplate(prev => ({ ...prev, images: newImages }));
  };

  const isImageElement = isPageImage || isBrandElement;

  const handleCopy = () => {
    copyStyleToClipboard(fieldStyles, fieldPositions, brandElements, pageTemplate);
  };

  const handlePaste = () => {
    pasteStyleFromClipboard(setFieldStyles, setFieldPositions, setBrandElements, setPageTemplate);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            Formatação
          </Typography>
          <Box>
            <Tooltip title="Copiar Estilo da Página">
              <IconButton onClick={handleCopy} size="small">
                <ContentCopy />
              </IconButton>
            </Tooltip>
            <Tooltip title="Colar Estilo na Página">
              <IconButton onClick={handlePaste} size="small">
                <ContentPaste />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {showImageLoaders && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button variant="contained" component="label" startIcon={<ImageIcon />} fullWidth>
              Carregar <input type="file" accept=".png,.jpg,.jpeg" hidden onChange={handleImageUpload} />
            </Button>
            <Button variant="outlined" onClick={() => onOpenImageGallery()} fullWidth> Galeria </Button>
          </Box>
        )}
        {!currentElement ? (
          <Typography variant="h6" color="textSecondary" align="center" gutterBottom sx={{ mt: 4 }}>Selecione um elemento para editar</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip label={selectedField} color="primary" sx={{ mr: 2 }} />
              {!isPageBackground && (
                <FormControlLabel
                  control={<Switch checked={currentElement.visible !== false} onChange={(e) => updateElementProperty('visible', e.target.checked)} size="small" />}
                  label={<Box sx={{ display: 'flex', alignItems: 'center' }}>{currentElement.visible !== false ? <Visibility /> : <VisibilityOff />}</Box>}
                />
              )}
            </Box>

            {isTextField && (
              <>
                <TextFormatting
                  colorPalette={colorPalette}
                  imagePalette={imagePalette}
                  currentElement={currentElement}
                  updateFieldStyle={updateFieldStyle}
                  resetFieldStyle={resetFieldStyle}
                  onOpenHtmlEditor={onOpenHtmlEditor}
                  expandedPanel={expandedPanel}
                  handleAccordionChange={handleAccordionChange}
                  selectedField={selectedField}
                />
                <PositionSizeFormatting
                  expandedPanel={expandedPanel}
                  handleAccordionChange={handleAccordionChange}
                  currentElement={currentElement}
                  updateElementProperty={updateElementProperty}
                  handleZIndexChange={handleZIndexChange}
                  selectedField={selectedField}
                />
              </>
            )}

            {isImageElement && (
              <>
                <ImageFormatting
                  currentElement={currentElement}
                  updateElementProperty={updateElementProperty}
                  updateElementFilter={updateElementFilter}
                  handleDeleteElement={handleDeleteElement}
                  isCropping={isCropping}
                  setIsCropping={setIsCropping}
                  expandedPanel={expandedPanel}
                  handleAccordionChange={handleAccordionChange}
                />
                <PositionSizeFormatting
                  expandedPanel={expandedPanel}
                  handleAccordionChange={handleAccordionChange}
                  currentElement={currentElement}
                  updateElementProperty={updateElementProperty}
                  handleZIndexChange={handleZIndexChange}
                  selectedField={selectedField}
                />
              </>
            )}

            {isPageBackground && (
              <BackgroundFormatting
                pageTemplate={pageTemplate}
                setPageTemplate={setPageTemplate}
                expandedPanel={expandedPanel}
                handleAccordionChange={handleAccordionChange}
              />
            )}
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Accordion expanded={expandedPanel === 'pageImages'} onChange={handleAccordionChange('pageImages')}>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography><ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Imagens da Página</Typography></AccordionSummary>
          <AccordionDetails>
            <ImageManager
              pageTemplate={pageTemplate}
              setPageTemplate={setPageTemplate}
              setSelectedField={setSelectedField}
              selectedField={selectedField}
              onImageUpload={handleImageUpload}
            />
            <Button sx={{mt: 2}} fullWidth variant="outlined" onClick={() => setSelectedField('__page_background__')}>Editar Fundo da Página</Button>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedPanel === 'brandElements'} onChange={handleAccordionChange('brandElements')}>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography><BrandingWatermark sx={{ mr: 1, verticalAlign: 'middle' }} />Elementos da Marca</Typography></AccordionSummary>
          <AccordionDetails><BrandElementManager onElementSelect={(newElement) => setBrandElements(prev => [...prev, newElement])} /></AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FormattingPanel;
