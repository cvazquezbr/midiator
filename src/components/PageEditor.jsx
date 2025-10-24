import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, IconButton, Tooltip, Fab,
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
  const { csvHeaders, pageTemplate: globalPageTemplate } = campaignState;
  const pageDataFromHook = usePageData(pageData?.index);

  const [editorState, setEditorState] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [imageSwatches, setImageSwatches] = useState([]);
  const isMobile = useIsMobile();
  const prevImagesRef = useRef();

  useEffect(() => {
    // The check for `pageData` is critical. It's the source of truth for the specific item.
    if (open && pageData && pageDataFromHook) {
      const {
        effectiveFieldPositions,
        effectiveFieldStyles,
        effectiveBrandElements,
        effectivePageTemplate,
        csvHeaders: headersFromHook,
        record,
      } = pageDataFromHook;

      // Construct the initial state by prioritizing the specific page's custom data
      // (`pageData.custom...`) and falling back to the effective/global data from the hook.
      const initialEditorState = {
        fieldPositions: safeDeepClone(pageData.customFieldPositions || effectiveFieldPositions || {}),
        fieldStyles: safeDeepClone(pageData.customFieldStyles || effectiveFieldStyles || {}),
        brandElements: safeDeepClone(pageData.customBrandElements || effectiveBrandElements || []),
        pageTemplate: safeDeepClone(pageData.customPageTemplate || effectivePageTemplate || {}),
        csvHeaders: headersFromHook || [],
        csvData: record ? [safeDeepClone(record)] : [], // The record should be consistent
      };

      setEditorState(initialEditorState);
    } else if (!open) {
      setEditorState(null);
      setSelectedField(null);
    }
    // Add pageData to the dependency array as it's now used for initialization.
  }, [open, pageData, pageDataFromHook]);

  useEffect(() => {
    const firstImage = editorState?.pageTemplate?.images?.[0];
    if (firstImage) {
      extractColorPalette(firstImage.src, setImageSwatches);
    }
    const currentImages = editorState?.pageTemplate?.images || [];
    const previousImages = prevImagesRef.current || [];
    if (currentImages.length > previousImages.length) {
      const newImage = currentImages.find(img => !previousImages.some(prevImg => prevImg.id === img.id));
      if (newImage) setSelectedField(newImage.id);
    }
    prevImagesRef.current = currentImages;
  }, [editorState?.pageTemplate?.images]);
  
  const handleOpenHtmlEditor = (fieldId) => setEditingField(fieldId);
  const handleCopyStyle = () => copyStyleToClipboard(editorState);

  const handlePasteStyle = () => {
    pasteStyleFromClipboard((pastedData) => {
        setEditorState(prev => ({
            ...prev,
            ...pastedData,
        }));
    });
  };

  const handleImageSelection = async (file) => {
    if (!file) return;
    const managedUrl = addPendingAsset(file);
    if (managedUrl) {
      const newImage = createNewImageElement(managedUrl);
      setEditorState(prev => ({
        ...prev,
        pageTemplate: {
          ...prev.pageTemplate,
          images: [...(prev.pageTemplate?.images || []), newImage]
        }
      }));
      setSelectedField(newImage.id);
    }
  };

  const handleLocalImageUpload = (event) => handleImageSelection(event.target.files[0]);

  if (!open || !editorState) return null;

  const handleSave = () => {
    onSave({
      index: pageData.index,
      ...editorState
    });
    onClose();
  };

  const handleSaveHtmlContent = (newContent) => {
    if (editorState.csvData && editingField) {
        setEditorState(prev => {
            const newCsvData = [...prev.csvData];
            if (newCsvData[0]) {
                newCsvData[0] = { ...newCsvData[0], [editingField]: newContent };
            }
            return { ...prev, csvData: newCsvData };
        });
    }
    setEditingField(null);
  };

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
      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'row', height: '100%' }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <FieldPositioner
            editorState={editorState}
            setEditorState={setEditorState}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            originalImageSize={originalImageSize}
            onOpenHtmlEditor={handleOpenHtmlEditor}
            currentPreviewIndex={0}
          />
        </Box>
        {!isMobile && (
          <Box sx={{ flex: '0 0 320px', borderLeft: 1, borderColor: 'divider', overflowY: 'auto' }}>
            <FormattingPanel
              editorState={editorState}
              setEditorState={setEditorState}
                  selectedField={selectedField}
                  setSelectedField={setSelectedField}
                  onOpenHtmlEditor={handleOpenHtmlEditor}
                  showImageLoaders={true}
                  handleImageUpload={handleLocalImageUpload}
                  onOpenImageGallery={() => onOpenImageGallery(handleImageSelection)}
                  campaignSwatches={campaignState.colors}
                  imageSwatches={imageSwatches}
                />
              </Grid>
            )}
          </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar Edições</Button>
      </DialogActions>
      {isMobile && (
        <>
          <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => setIsDrawerOpen(true)}><Edit /></Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            editorState={editorState}
            setEditorState={setEditorState}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            onOpenHtmlEditor={handleOpenHtmlEditor}
            showImageLoaders={true}
            handleImageUpload={handleLocalImageUpload}
            onOpenImageGallery={() => onOpenImageGallery(handleImageSelection)}
            campaignSwatches={campaignState.colors}
            imageSwatches={imageSwatches}
          />
        </>
      )}
      <TextEditorDialog
        open={editingField !== null}
        title={`Editar "${editingField || ''}"`}
        content={(editorState.csvData && editorState.csvData[0]) ? editorState.csvData[0][editingField] || '' : ''}
        onSave={handleSaveHtmlContent}
        onClose={() => setEditingField(null)}
      />
    </Dialog>
  );
};

export default PageEditor;