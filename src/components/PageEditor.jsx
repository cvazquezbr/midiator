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

  useEffect(() => {
    // This effect now exclusively handles the initialization and reset of the editor's state.
    if (open) {
      // Only initialize if the state is not already set.
      if (pageData && !editedPositions) {
        const { effectiveFieldPositions, effectiveFieldStyles, effectiveBrandElements, record } = pageDataFromHook;

        // CRITICAL CHECK: Do not proceed with initialization if the core `record` object is missing.
        // This prevents the editor from opening in a broken or inconsistent state.
        if (!record || typeof record !== 'object') {
          console.warn("PageEditor: `record` from usePageData is not ready. Waiting for data.", { pageData, pageDataFromHook });
          return; // Abort initialization for this render cycle.
        }

        console.log("PageEditor: Initializing state with valid data.", { pageDataFromHook });
        const templateToEdit = safeDeepClone(pageData.customPageTemplate || globalPageTemplate);
        setEditedPositions(safeDeepClone(effectiveFieldPositions));
        setEditedBrandElements(safeDeepClone(effectiveBrandElements));

        const sanitizedRecord = {
          ...record,
          Título: record.Título || `Página ${pageData.index + 1}`,
        };
        setEditedRecord(safeDeepClone(sanitizedRecord));

        setEditedPageTemplate(templateToEdit);

        const newEditedStyles = {};
        (csvHeaders || []).forEach(field => {
          newEditedStyles[field] = { ...COMPLETE_DEFAULT_STYLE, ...(effectiveFieldStyles[field] || {}) };
        });
        setEditedStyles(newEditedStyles);
      }
    } else {
      // Reset state when the dialog is closed.
      setEditedPositions(null);
      setEditedStyles(null);
      setEditedBrandElements(null);
      setEditedRecord(null);
      setEditedPageTemplate(null);
      setSelectedFieldInternal(null);
    }
  }, [open, pageData, pageDataFromHook, csvHeaders, globalPageTemplate, editedPositions]);

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

  const isLoading = isCampaignLoading || !pageData || !editedPageTemplate || !editedRecord || !editedPositions;

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
            <Tooltip title="Copiar estilo"><IconButton onClick={handleCopyStyle} disabled={isLoading}><ContentCopy /></IconButton></Tooltip>
            <Tooltip title="Colar estilo"><IconButton onClick={handlePasteStyle} disabled={isLoading}><ContentPaste /></IconButton></Tooltip>
            <IconButton onClick={onClose} sx={{ ml: 2 }}><Close /></IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
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
                pendingAssets={pendingAssets}
              />
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained" disabled={isLoading}>Salvar Alterações</Button>
      </DialogActions>
      {!isLoading && isMobile && (
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
        open={!isLoading && editingField !== null && editedRecord && editedRecord[editingField] !== undefined}
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