import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, IconButton, Tooltip, Fab, CircularProgress,
} from '@mui/material';
import { Close, Edit, ContentCopy, ContentPaste } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer';
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
  if (!imageUrl) {
    paletteSetter([]);
    return;
  }
  let finalImageUrl = imageUrl.includes('blob.vercel-storage.com') ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}` : imageUrl;
  const img = new Image();
  if (!finalImageUrl.startsWith('/api/')) img.crossOrigin = 'Anonymous';
  const processImage = () => {
    try {
      const colorThief = new ColorThief();
      const palette = colorThief.getPalette(img, 5);
      paletteSetter(palette ? palette.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2])) : []);
    } catch (error) {
      paletteSetter([]);
    }
  };
  img.onload = processImage;
  img.onerror = () => paletteSetter([]);
  img.src = finalImageUrl;
  if (img.complete) processImage();
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
  originalImageSize,
  aspectRatio,
  onOpenImageGallery,
  addPendingAsset,
}) => {
  console.log('%c[PageEditor] Rendering with props:', 'color: red; font-weight: bold;', { open, pageData, aspectRatio });

  const { campaignState, isCampaignLoading } = useCampaign();
  const { csvHeaders, pageTemplate: globalPageTemplate, pendingAssets, colors: colorPalette } = campaignState;
  const pageDataFromHook = usePageData(pageData?.index);

  const [editedPositions, setEditedPositions] = useState(null);
  const [editedStyles, setEditedStyles] = useState(null);
  const [editedBrandElements, setEditedBrandElements] = useState(null);
  const [editedRecord, setEditedRecord] = useState(null);
  const [editedPageTemplate, setEditedPageTemplate] = useState(null);
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [imageSwatches, setImageSwatches] = useState([]);
  const isMobile = useIsMobile();
  const prevImagesRef = useRef();

  const handleInternalFieldSelection = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect);
  }, []);

  // Effect to initialize the editor's state when it's opened.
  // This runs once when the dialog is opened for a specific page, setting up the local editing state.
  useEffect(() => {
    if (open && pageDataFromHook.record) {
      const { effectiveFieldPositions, effectiveFieldStyles, effectiveBrandElements, record } = pageDataFromHook;

      // Initialize all local states for editing
      setEditedPositions(safeDeepClone(effectiveFieldPositions));
      setEditedBrandElements(safeDeepClone(effectiveBrandElements));
      setEditedRecord(safeDeepClone(record));

      // Use the page's custom template if it exists, otherwise fall back to the global one.
      setEditedPageTemplate(safeDeepClone(pageData.customPageTemplate || globalPageTemplate));

      // Initialize styles, ensuring all fields have a complete style object to prevent errors.
      const newEditedStyles = {};
      (csvHeaders || []).forEach(field => {
        newEditedStyles[field] = { ...COMPLETE_DEFAULT_STYLE, ...(effectiveFieldStyles[field] || {}) };
      });
      setEditedStyles(newEditedStyles);
    }

    // Cleanup: Reset all local state when the dialog is closed to ensure a clean slate.
    if (!open) {
      setEditedPositions(null);
      setEditedStyles(null);
      setEditedBrandElements(null);
      setEditedRecord(null);
      setEditedPageTemplate(null);
      setSelectedFieldInternal(null);
    }
    // This effect intentionally omits `globalPageTemplate` to prevent re-initialization on every external change.
  }, [open, pageData, pageDataFromHook, csvHeaders]);

  // Effect to sync with external changes to the global page template.
  // This allows changes made outside the editor (e.g., in ImageStep) to be reflected,
  // but ONLY if the user has not already started making custom changes to this page's template.
  useEffect(() => {
    if (open && !pageData.customPageTemplate && globalPageTemplate) {
      // If there is no custom template, it's safe to sync from the global state.
      setEditedPageTemplate(safeDeepClone(globalPageTemplate));
    }
  }, [globalPageTemplate, open, pageData.customPageTemplate]);

  useEffect(() => {
    const firstImage = editedPageTemplate?.images?.[0];
    extractColorPalette(firstImage?.src, setImageSwatches);
    const currentImages = editedPageTemplate?.images || [];
    const previousImages = prevImagesRef.current || [];
    if (currentImages.length > previousImages.length) {
      const newImage = currentImages.find(img => !previousImages.some(prevImg => prevImg.id === img.id));
      if (newImage) handleInternalFieldSelection(newImage.id);
    }
    prevImagesRef.current = currentImages;
  }, [editedPageTemplate?.images, handleInternalFieldSelection]);
  
  const handleOpenHtmlEditor = (fieldId) => setEditingField(fieldId);
  const handleCopyStyle = () => copyStyleToClipboard(editedStyles, editedPositions, editedBrandElements, editedPageTemplate);
  const handlePasteStyle = async () => pasteStyleFromClipboard(setEditedStyles, setEditedPositions, setEditedBrandElements, setEditedPageTemplate);

  const handleImageSelection = async (file) => {
    if (!file) return;
    const managedUrl = addPendingAsset(file);
    if (managedUrl) {
      const newImage = createNewImageElement(managedUrl);
      setEditedPageTemplate(prev => ({ ...prev, images: [...(prev.images || []), newImage] }));
      handleInternalFieldSelection(newImage.id);
    }
  };

  const handleLocalImageUpload = (event) => handleImageSelection(event.target.files[0]);

  const handleFieldPositionerCsvDataUpdate = useCallback((updatedDataArray) => {
    if (updatedDataArray?.length > 0) setEditedRecord(updatedDataArray[0]);
  }, []);

  if (!open) return null;

  const handleSave = () => {
    const savedData = {
      ...pageData,
      record: editedRecord,
      customFieldPositions: editedPositions,
      customFieldStyles: editedStyles,
      customBrandElements: editedBrandElements,
      customPageTemplate: editedPageTemplate,
    };
    onSave(savedData);
    onClose();
  };

  const editorCsvData = editedRecord ? [editedRecord] : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="paper" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Editar Página Gerada #{(pageData?.index ?? -1) + 1}</span>
          <Box>
            <Tooltip title="Copiar estilo"><IconButton onClick={handleCopyStyle}><ContentCopy /></IconButton></Tooltip>
            <Tooltip title="Colar estilo"><IconButton onClick={handlePasteStyle}><ContentPaste /></IconButton></Tooltip>
            <IconButton onClick={onClose} sx={{ ml: 2 }}><Close /></IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={2} sx={{ flexGrow: 1 }}>
          <Grid item xs={12} md={isMobile ? 12 : 8} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {editedPositions && editedStyles && editedRecord && editedPageTemplate && (
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
            )}
            </Grid>
            {!isMobile && (
              <Grid item xs={12} md={4}>
                <FormattingPanel
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
        open={editingField !== null && editedRecord && editedRecord[editingField] !== undefined}
        title={`Editar "${editingField || ''}"`}
        content={editedRecord?.[editingField] || ''}
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