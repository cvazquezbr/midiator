import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  VisibilityOff,
  BrandingWatermark,
  ContentCopy,
  ContentPaste,
} from '@mui/icons-material';
import ImageIcon from '@mui/icons-material/Image';
import { useCampaign } from '../context/CampaignContext';
import { copyStyleToClipboard, pasteStyleFromClipboard } from '../utils/styleClipboard';
import BrandElementManager from './BrandElementManager';
import ImageManager from './ImageManager';
import TextFormatting from './formatting/TextFormatting';
import ImageFormatting from './formatting/ImageFormatting';
import BackgroundFormatting from './formatting/BackgroundFormatting';
import PositionSizeFormatting from './formatting/PositionSizeFormatting';
import { v4 as uuidv4 } from 'uuid';

const FormattingPanel = ({
  editorState,
  setEditorState,
  onOpenHtmlEditor,
  isCropping,
  setIsCropping,
  showImageLoaders = false,
  handleImageUpload,
  onOpenImageGallery,
  onSaveToDrive,
  selectedField,
  setSelectedField,
  campaignSwatches,
  imageSwatches,
}) => {
  const {
    fieldStyles,
    fieldPositions,
    brandElements,
    pageTemplate
  } = editorState;

  const [expandedPanel, setExpandedPanel] = useState(false);

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

    // Prioritize checking for image types (Page Image or Brand Element) before text fields.
    // This resolves the ambiguity in PageSet contexts where an element ID can exist both as an image and a field position.
    const pageImg = pageTemplate?.images?.find(img => img.id === selectedField);
    if (pageImg) {
      return { currentElement: pageImg, isTextField: false, isPageImage: true, isBrandElement: false, isPageBackground: false };
    }

    const brandEl = brandElements?.find(el => el.id === selectedField);
    if (brandEl) {
      return { currentElement: brandEl, isTextField: false, isPageImage: false, isBrandElement: true, isPageBackground: false };
    }

    // Fallback to check for a text field.
    if (fieldPositions && fieldPositions[selectedField]) {
      const element = {
        ...fieldPositions[selectedField],
        style: fieldStyles[selectedField] || {},
      };
      return { currentElement: element, isTextField: true, isPageImage: false, isBrandElement: false, isPageBackground: false };
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
    setEditorState(prev => ({
      ...prev,
      fieldStyles: {
        ...prev.fieldStyles,
        [selectedField]: {
          ...(prev.fieldStyles[selectedField] || {}),
          [property]: value
        }
      }
    }));
  };

  const updateElementProperty = (property, value) => {
    setEditorState(prev => {
      if (isTextField) {
        return {
          ...prev,
          fieldPositions: {
            ...prev.fieldPositions,
            [selectedField]: { ...prev.fieldPositions[selectedField], [property]: value }
          }
        };
      }
      if (isPageImage) {
        return {
          ...prev,
          pageTemplate: {
            ...prev.pageTemplate,
            images: prev.pageTemplate.images.map(img => img.id === selectedField ? { ...img, [property]: value } : img)
          }
        };
      }
      if (isBrandElement) {
        return {
          ...prev,
          brandElements: prev.brandElements.map(el => el.id === selectedField ? { ...el, [property]: value } : el)
        };
      }
      return prev;
    });
  };

  const updateElementFilter = (filterProperty, value) => {
    const updater = (element) => ({ ...element, filters: { ...(element.filters || {}), [filterProperty]: value } });
    setEditorState(prev => {
      if (isPageImage) {
        return {
          ...prev,
          pageTemplate: {
            ...prev.pageTemplate,
            images: prev.pageTemplate.images.map(img => img.id === selectedField ? updater(img) : img)
          }
        };
      }
      if (isBrandElement) {
        return {
          ...prev,
          brandElements: prev.brandElements.map(el => el.id === selectedField ? updater(el) : el)
        };
      }
      return prev;
    });
  };

  const handleDeleteElement = () => {
    setEditorState(prev => {
      let newState = { ...prev };
      if (isPageImage) {
        newState.pageTemplate = {
          ...prev.pageTemplate,
          images: prev.pageTemplate.images.filter(img => img.id !== selectedField)
        };
      } else if (isBrandElement) {
        newState.brandElements = prev.brandElements.filter(el => el.id !== selectedField);
      }
      return newState;
    });
    setSelectedField(null);
  };

  const resetFieldStyle = () => {
    // This function might need access to initial/template styles, which are no longer direct props.
    // For now, we'll keep it simple or it has to be re-thought.
    // Let's assume for now it does nothing in the new architecture until a clear need arises.
  };

  const handleZIndexChange = (elementId, action) => {
    setEditorState(prev => {
        if (!elementId) return prev;

        const { fieldPositions, brandElements, pageTemplate } = prev;

        let allElements = [
            ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, type: 'text' })),
            ...(brandElements || []).map(el => ({ id: el.id, zIndex: el.zIndex, type: 'brand' })),
            ...(pageTemplate.images || []).map(img => ({ id: img.id, zIndex: img.zIndex, type: 'pageImage' })),
        ];

        allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        const currentIndex = allElements.findIndex(el => el.id === elementId);
        if (currentIndex === -1) return prev;

        const [currentItem] = allElements.splice(currentIndex, 1);
        switch (action) {
            case 'front': allElements.push(currentItem); break;
            case 'back': allElements.unshift(currentItem); break;
            case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentItem); break;
            case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentItem); break;
            default: allElements.splice(currentIndex, 0, currentItem); return prev;
        }

        const newFieldPositions = { ...fieldPositions };
        const newBrandElements = [...(brandElements || [])];
        const newImages = [...(pageTemplate.images || [])];

        allElements.forEach((el, index) => {
            el.zIndex = index;
            if (el.type === 'text' && newFieldPositions[el.id]) {
                newFieldPositions[el.id].zIndex = index;
            } else if (el.type === 'brand') {
                const brandEl = newBrandElements.find(b => b.id === el.id);
                if (brandEl) brandEl.zIndex = index;
            } else if (el.type === 'pageImage') {
                const imgEl = newImages.find(i => i.id === el.id);
                if (imgEl) imgEl.zIndex = index;
            }
        });

        return {
            ...prev,
            fieldPositions: newFieldPositions,
            brandElements: newBrandElements,
            pageTemplate: { ...pageTemplate, images: newImages },
        };
    });
};

  const isImageElement = isPageImage || isBrandElement;

  const handleCopy = () => {
    copyStyleToClipboard({
        fieldStyles: editorState.fieldStyles,
        fieldPositions: editorState.fieldPositions,
        brandElements: editorState.brandElements,
        pageTemplate: editorState.pageTemplate,
    });
  };

  const handlePaste = () => {
      pasteStyleFromClipboard((newStyles) => {
          setEditorState(prev => ({
              ...prev,
              fieldStyles: newStyles.fieldStyles ?? prev.fieldStyles,
              fieldPositions: newStyles.fieldPositions ?? prev.fieldPositions,
              brandElements: newStyles.brandElements ?? prev.brandElements,
              pageTemplate: newStyles.pageTemplate ?? prev.pageTemplate,
          }));
      });
  };

  const handleSetPageTemplate = (updater) => {
    setEditorState(prev => {
        const newPageTemplate = typeof updater === 'function' ? updater(prev.pageTemplate) : updater;
        return {
            ...prev,
            pageTemplate: newPageTemplate
        };
    });
  };

  const handleSetBrandElements = (updater) => {
    setEditorState(prev => {
      const newBrandElements = typeof updater === 'function' ? updater(prev.brandElements) : updater;
      return {
        ...prev,
        brandElements: newBrandElements
      };
    })
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ maxHeight: '80vh', overflowY: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button variant="contained" component="label" startIcon={<ImageIcon />} sx={{ flex: 1 }}>
              Carregar <input type="file" accept=".png,.jpg,.jpeg" hidden onChange={handleImageUpload} />
            </Button>
            <Button variant="outlined" onClick={() => onOpenImageGallery()} sx={{ flex: 1 }}> Galeria </Button>
            <Button variant="outlined" onClick={onSaveToDrive} sx={{ flex: 1 }}> Drive </Button>
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
                  currentElement={currentElement}
                  updateFieldStyle={updateFieldStyle}
                  resetFieldStyle={resetFieldStyle}
                  onOpenHtmlEditor={onOpenHtmlEditor}
                  expandedPanel={expandedPanel}
                  handleAccordionChange={handleAccordionChange}
                  selectedField={selectedField}
                  campaignSwatches={campaignSwatches}
                  imageSwatches={imageSwatches}
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
                setPageTemplate={handleSetPageTemplate}
                expandedPanel={expandedPanel}
                handleAccordionChange={handleAccordionChange}
                campaignSwatches={campaignSwatches}
                imagePalette={imageSwatches}
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
              setPageTemplate={handleSetPageTemplate}
              setSelectedField={setSelectedField}
              selectedField={selectedField}
              onImageUpload={handleImageUpload}
            />
            <Button sx={{mt: 2}} fullWidth variant="outlined" onClick={() => setSelectedField('__page_background__')}>Editar Fundo da Página</Button>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedPanel === 'brandElements'} onChange={handleAccordionChange('brandElements')}>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography><BrandingWatermark sx={{ mr: 1, verticalAlign: 'middle' }} />Elementos da Marca</Typography></AccordionSummary>
          <AccordionDetails>
            <BrandElementManager
              onElementSelect={(newElement) => handleSetBrandElements(prev => [...(prev || []), newElement])}
            />
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FormattingPanel;
