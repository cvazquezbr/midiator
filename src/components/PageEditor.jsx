import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Close, Edit, ContentCopy, ContentPaste } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer';
import { Fab } from '@mui/material';
import TextEditorDialog from './TextEditorDialog';
import { createNewImageElement } from '../utils/elementFactory';
import { usePageData } from '../hooks/usePageData';
import { useCampaign } from '../context/CampaignContext';
import { safeDeepClone } from '../lib/utils';
import { copyStyleToClipboard, pasteStyleFromClipboard } from '../utils/styleClipboard';
import ColorThief from 'colorthief';

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}).join('');

const extractColorPalette = (imageUrl, paletteSetter) => {
  let finalImageUrl = imageUrl;
  if (imageUrl && imageUrl.includes('blob.vercel-storage.com')) {
    finalImageUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  const img = new Image();
  if (!finalImageUrl.startsWith('/api/')) {
    img.crossOrigin = 'Anonymous';
  }

  const processImage = () => {
    try {
      const colorThief = new ColorThief();
      const palette = colorThief.getPalette(img, 5);
      if (palette) {
        const hexPalette = palette.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2]));
        paletteSetter(hexPalette);
      } else {
        paletteSetter([]);
      }
    } catch (error) {
      console.error("Error extracting color palette:", error);
      paletteSetter([]);
    }
  };

  img.onload = processImage;
  img.onerror = (err) => {
    console.error("Error loading image for color extraction:", err);
    paletteSetter([]);
  };
  img.src = finalImageUrl;

  if (img.complete) {
    processImage();
  }
};


const COMPLETE_DEFAULT_STYLE = {
  fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
  textDecoration: 'none', color: '#000000', textAlign: 'left', verticalAlign: 'top',
  lineHeightMultiplier: 1.2, textStroke: false, strokeColor: '#ffffff', strokeWidth: 2,
  textShadow: false, shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
  backgroundColor: 'rgba(0,0,0,0)', borderColor: '#000000', borderWidth: 0,
  borderRadius: 0, padding: 5, backgroundOpacity: 0,
};

const PageEditor = ({
  open,
  onClose,
  pageData,
  onSave,
  colorPalette,
  imagePalette,
  originalImageSize,
  aspectRatio,
  onOpenImageGallery,
  editedPageTemplate,
  setEditedPageTemplate,
}) => {
  const { csvHeaders } = useCampaign();
  const pageDataFromHook = usePageData(pageData?.index);

  const [editedPositions, setEditedPositions] = useState(null);
  const [editedStyles, setEditedStyles] = useState(null);
  const [editedBrandElements, setEditedBrandElements] = useState(null);
  const [editedRecord, setEditedRecord] = useState(null);
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [imageSwatches, setImageSwatches] = useState([]);
  const isMobile = useIsMobile();
  const prevImagesRef = useRef();

  const handleInternalFieldSelection = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect);
  }, []);

  useEffect(() => {
    // Sincronizar paleta de cores da imagem
    const firstImage = editedPageTemplate?.images?.[0];
    if (firstImage?.src) {
      extractColorPalette(firstImage.src, setImageSwatches);
    } else {
      setImageSwatches(colorPalette || []);
    }

    // Lógica para detectar e selecionar a nova imagem
    const currentImages = editedPageTemplate?.images || [];
    const previousImages = prevImagesRef.current || [];

    if (currentImages.length > previousImages.length) {
      const newImage = currentImages.find(
        (img) => !previousImages.some((prevImg) => prevImg.id === img.id)
      );
      if (newImage) {
        handleInternalFieldSelection(newImage.id);
      }
    }

    // Atualizar a referência para o próximo render
    prevImagesRef.current = currentImages;
  }, [editedPageTemplate?.images, colorPalette, handleInternalFieldSelection]);


  const handleOpenHtmlEditor = (fieldId) => {
    setEditingField(fieldId);
  };

  const handleCopyStyle = () => {
    copyStyleToClipboard(editedStyles, editedPositions, editedBrandElements, editedPageTemplate);
  };

  const handlePasteStyle = async () => {
    await pasteStyleFromClipboard(
      setEditedStyles,
      setEditedPositions,
      setEditedBrandElements,
      setEditedPageTemplate
    );
  };

  const handleImageSelection = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        const newImage = createNewImageElement(imageUrl);
        setEditedPageTemplate(prevTemplate => ({
            ...prevTemplate,
            images: [...(prevTemplate.images || []), newImage],
        }));
        handleInternalFieldSelection(newImage.id);
    };
    reader.readAsDataURL(file);
  };

  const handleLocalImageUpload = (event) => {
    handleImageSelection(event.target.files[0]);
  };

  const handleFieldPositionerCsvDataUpdate = useCallback((updatedDataArray) => {
    if (updatedDataArray && updatedDataArray.length > 0) {
      setEditedRecord(updatedDataArray[0]);
    }
  }, []);

  useEffect(() => {
    // Only initialize state if the dialog is opening and the state is not already populated
    if (open && pageData && !editedPositions) {
      const {
        effectiveFieldPositions,
        effectiveFieldStyles,
        effectiveBrandElements,
        record,
      } = pageDataFromHook;

      setEditedPositions(JSON.parse(JSON.stringify(effectiveFieldPositions)));
      setEditedBrandElements(safeDeepClone(effectiveBrandElements));
      setEditedRecord(JSON.parse(JSON.stringify(record)));

      const newEditedStyles = {};
      (csvHeaders || []).forEach(field => {
        newEditedStyles[field] = { ...COMPLETE_DEFAULT_STYLE, ...(effectiveFieldStyles[field] || {}) };
      });
      setEditedStyles(newEditedStyles);
    } else if (!open) {
      // Reset state when dialog is closed to ensure it's fresh on next open
      setEditedPositions(null);
      setEditedStyles(null);
      setEditedBrandElements(null);
      setEditedRecord(null);
      setSelectedFieldInternal(null);
    }
  }, [open, pageData, pageDataFromHook, csvHeaders, editedPositions]);

  if (!open || !pageData || !editedPageTemplate) {
    // Render nothing or a loader until the state is initialized by the effect
    return null;
  }

  const handleSave = () => {
    const savedData = {
      ...pageData,
      record: editedRecord,
      customFieldPositions: editedPositions,
      customFieldStyles: editedStyles,
      customBrandElements: editedBrandElements,
      customPageTemplate: editedPageTemplate,
    };
    console.log('[PageEditor] handleSave called. Data being passed up:', savedData);
    console.log('[PageEditor] Images before save:', editedPageTemplate.images);
    onSave(savedData);
    onClose();
  };

  const editorCsvData = editedRecord ? [editedRecord] : (pageData && pageData.record ? [pageData.record] : []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="paper" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Editar Página Gerada #{pageData.index + 1}</span>
          <Box>
            <Tooltip title="Copiar estilo">
              <IconButton onClick={handleCopyStyle}>
                <ContentCopy />
              </IconButton>
            </Tooltip>
            <Tooltip title="Colar estilo">
              <IconButton onClick={handlePasteStyle}>
                <ContentPaste />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} sx={{ ml: 2 }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={2} sx={{ flexGrow: 1 }}>
          <Grid item xs={12} md={isMobile ? 12 : 8} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FieldPositioner
              aspectRatio={aspectRatio}
              csvHeaders={csvHeaders}
              fieldPositions={editedPositions}
              setFieldPositions={setEditedPositions}
              fieldStyles={editedStyles}
              setFieldStyles={setEditedStyles}
              csvData={editorCsvData}
              colorPalette={imageSwatches}
              selectedField={selectedFieldInternal}
              setSelectedField={handleInternalFieldSelection}
              onCsvDataUpdate={handleFieldPositionerCsvDataUpdate}
              originalImageSize={originalImageSize}
              brandElements={editedBrandElements}
              setBrandElements={setEditedBrandElements}
              pageTemplate={editedPageTemplate}
              setPageTemplate={setEditedPageTemplate}
              currentPreviewIndex={0}
            />
          </Grid>
          {!isMobile && (
            <Grid item xs={12} md={4}>
              <FormattingPanel
                colorPalette={colorPalette}
                imagePalette={imageSwatches}
                selectedField={selectedFieldInternal}
                setSelectedField={setSelectedFieldInternal}
                fieldStyles={editedStyles}
                setFieldStyles={setEditedStyles}
                fieldPositions={editedPositions}
                setFieldPositions={setEditedPositions}
                csvHeaders={csvHeaders}
                pageTemplate={editedPageTemplate}
                setPageTemplate={setEditedPageTemplate}
                brandElements={editedBrandElements}
                setBrandElements={setEditedBrandElements}
                onOpenHtmlEditor={handleOpenHtmlEditor}
                showImageLoaders={true}
                handleImageUpload={handleLocalImageUpload}
                onOpenImageGallery={() => onOpenImageGallery(handleImageSelection)}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar Alterações</Button>
      </DialogActions>
      {isMobile && (
        <>
          <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => setIsDrawerOpen(true)}><Edit /></Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            colorPalette={colorPalette}
            imagePalette={imageSwatches}
            selectedField={selectedFieldInternal}
            setSelectedField={setSelectedFieldInternal}
            fieldStyles={editedStyles}
            setFieldStyles={setEditedStyles}
            fieldPositions={editedPositions}
            setFieldPositions={setEditedPositions}
            csvHeaders={csvHeaders}
            onOpenHtmlEditor={handleOpenHtmlEditor}
            pageTemplate={editedPageTemplate}
            setPageTemplate={setEditedPageTemplate}
            brandElements={editedBrandElements}
            setBrandElements={setEditedBrandElements}
            showImageLoaders={true}
            handleImageUpload={handleLocalImageUpload}
            onOpenImageGallery={() => onOpenImageGallery(handleImageSelection)}
          />
        </>
      )}
      <TextEditorDialog
        open={editingField !== null}
        title={`Editar "${editingField}"`}
        content={editedRecord && editingField ? editedRecord[editingField] : ''}
        onSave={(newContent) => {
          if (editedRecord && editingField) {
            setEditedRecord(prev => ({ ...prev, [editingField]: newContent }));
          }
          setEditingField(null);
        }}
        onClose={() => setEditingField(null)}
      />
    </Dialog>
  );
};

export default PageEditor;
