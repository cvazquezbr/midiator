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
  CircularProgress,
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
} from '@mui/icons-material';
import { useCampaign } from '../context/CampaignContext';
import BrandElementManager from './BrandElementManager';
import ImageManager from './ImageManager';
import TextFormatting from './formatting/TextFormatting';
import ImageFormatting from './formatting/ImageFormatting';
import BackgroundFormatting from './formatting/BackgroundFormatting';

const FormattingPanel = ({
  initialFieldStyles,
  onOpenHtmlEditor,
  standardsColors,
  templateFieldStyles,
  isCropping,
  setIsCropping,
  showImageLoaders = false,
  handleImageUpload,
  isUploading,
  onChangeBackgroundImage,
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

    // Create a unified list of all draggable elements
    let allElements = [
      ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, type: 'field' })),
      ...brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, type: 'brand' })),
      ...(pageTemplate.images || []).map(img => ({ id: img.id, zIndex: img.zIndex, type: 'image' })),
    ];

    // Sort elements by their current zIndex to establish a clear order
    allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const currentIndex = allElements.findIndex(el => el.id === elementId);
    if (currentIndex === -1) return; // Element not found

    // Remove the element to re-insert it
    const [currentElement] = allElements.splice(currentIndex, 1);

    // Re-insert the element based on the action
    switch (action) {
      case 'front':
        allElements.push(currentElement);
        break;
      case 'back':
        allElements.unshift(currentElement);
        break;
      case 'forward':
        allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement);
        break;
      case 'backward':
        allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement);
        break;
      default:
        allElements.splice(currentIndex, 0, currentElement); // Should not happen
        return;
    }

    // Create copies of state to modify
    const newPositions = { ...fieldPositions };
    const newBrandElements = [...brandElements];
    const newPageImages = [...(pageTemplate.images || [])];

    // Update zIndex for all elements based on their new order
    allElements.forEach((el, index) => {
      el.zIndex = index; // Assign the new zIndex

      if (el.type === 'field') {
        const field = newPositions[el.id];
        if (field) field.zIndex = index;
      } else if (el.type === 'brand') {
        const brandEl = newBrandElements.find(b => b.id === el.id);
        if (brandEl) brandEl.zIndex = index;
      } else if (el.type === 'image') {
        const imageEl = newPageImages.find(img => img.id === el.id);
        if (imageEl) imageEl.zIndex = index;
      }
    });

    // Update the states
    setFieldPositions(newPositions);
    setBrandElements(newBrandElements);
    setPageTemplate(prev => ({ ...prev, images: newPageImages }));
  };

  const isImageElement = isPageImage || isBrandElement;

  return (
    <Card>
      <CardContent>
        {showImageLoaders && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <ImageIcon />}
              fullWidth
              disabled={isUploading}
            >
              {isUploading ? 'Enviando...' : 'Carregar'}
              <input type="file" accept=".png,.jpg,.jpeg" hidden onChange={handleImageUpload} disabled={isUploading} />
            </Button>
            <Button variant="outlined" onClick={onChangeBackgroundImage} fullWidth disabled={isUploading}>
              Galeria
            </Button>
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
              <TextFormatting
                currentElement={currentElement}
                updateFieldStyle={updateFieldStyle}
                resetFieldStyle={resetFieldStyle}
                onOpenHtmlEditor={onOpenHtmlEditor}
                standardsColors={standardsColors}
                expandedPanel={expandedPanel}
                handleAccordionChange={handleAccordionChange}
                selectedField={selectedField}
              />
            )}

            {isImageElement && (
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
            )}

            {isPageBackground && (
              <BackgroundFormatting
                pageTemplate={pageTemplate}
                setPageTemplate={setPageTemplate}
                expandedPanel={expandedPanel}
                handleAccordionChange={handleAccordionChange}
              />
            )}

            {!isPageBackground && (
              <Accordion expanded={expandedPanel === 'positionSize'} onChange={handleAccordionChange('positionSize')}>
                <AccordionSummary expandIcon={<ExpandMore />}><Typography><AspectRatio sx={{ mr: 1, verticalAlign: 'middle' }} />Posição e Tamanho</Typography></AccordionSummary>
                <AccordionDetails><Grid container spacing={2}><Grid item xs={6}><TextField label="X (%)" type="number" size="small" value={currentElement.x?.toFixed(1) || '0.0'} onChange={(e) => updateElementProperty('x', parseFloat(e.target.value))} fullWidth /></Grid><Grid item xs={6}><TextField label="Y (%)" type="number" size="small" value={currentElement.y?.toFixed(1) || '0.0'} onChange={(e) => updateElementProperty('y', parseFloat(e.target.value))} fullWidth /></Grid><Grid item xs={6}><TextField label="Largura (%)" type="number" size="small" value={currentElement.width?.toFixed(1) || '20.0'} onChange={(e) => updateElementProperty('width', parseFloat(e.target.value))} fullWidth /></Grid><Grid item xs={6}><TextField label="Altura (%)" type="number" size="small" value={currentElement.height?.toFixed(1) || '10.0'} onChange={(e) => updateElementProperty('height', parseFloat(e.target.value))} fullWidth /></Grid><Grid item xs={12}><Typography gutterBottom>Rotação: {currentElement.rotation?.toFixed(0) || '0'}°</Typography><Slider value={currentElement.rotation || 0} onChange={(e, v) => updateElementProperty('rotation', v)} min={0} max={360} /></Grid><Grid item xs={12}><Typography variant="caption" display="block" gutterBottom>Ordem</Typography><ToggleButtonGroup size="small" fullWidth><Tooltip title="Enviar para Trás"><ToggleButton value="back" onClick={() => handleZIndexChange(selectedField, 'back')}><FlipToBack /></ToggleButton></Tooltip><Tooltip title="Recuar"><ToggleButton value="backward" onClick={() => handleZIndexChange(selectedField, 'backward')}><ArrowDownward /></ToggleButton></Tooltip><Tooltip title="Avançar"><ToggleButton value="forward" onClick={() => handleZIndexChange(selectedField, 'forward')}><ArrowUpward /></ToggleButton></Tooltip><Tooltip title="Trazer para Frente"><ToggleButton value="front" onClick={() => handleZIndexChange(selectedField, 'front')}><FlipToFront /></ToggleButton></Tooltip></ToggleButtonGroup></Grid></Grid></AccordionDetails>
              </Accordion>
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
