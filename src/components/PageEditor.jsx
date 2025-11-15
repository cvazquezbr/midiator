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
import { usePrevious } from '../hooks/usePrevious';
import { useCampaign } from '../context/CampaignContext';
import { useUserAuth } from '../context/UserAuthContext';
import { safeDeepClone } from '../lib/utils';
import GoogleDriveFolderPicker from './GoogleDriveFolderPicker';
import { uploadImageToDrive, getOrCreateBackgroundsFolderId } from '../utils/googleApi';
import { toast } from 'sonner';
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
  baseTemplate,
  onSave,
  originalImageSize,
  aspectRatio,
  onOpenImageGallery,
  addPendingAsset,
  csvData: fullCsvData,
  currentPreviewIndex,
  palettes, // Receive the list of standard palettes
}) => {
  console.log('%c[PageEditor] Rendering with props:', 'color: red; font-weight: bold;', { open, pageData, aspectRatio });

  const { campaignState, isCampaignLoading } = useCampaign();
  const { csvHeaders, pageTemplate: globalPageTemplate, pendingAssets } = campaignState;
  const { googleAccessToken, setGoogleAccessToken } = useUserAuth();

  const [editorState, setEditorState] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [imageSwatches, setImageSwatches] = useState([]);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const isMobile = useIsMobile();
  const prevOpen = usePrevious(open);


  useEffect(() => {
    // This effect now acts as the single source of truth for the editor's state.
    // It runs when the editor opens or if the underlying pageData prop changes while it's open.
    if (open && pageData) {
      // If the editor is just opening, or if the page being edited has changed,
      // we rebuild the entire state from props. This prevents stale state.
      if (!prevOpen || editorState?.index !== pageData.index) {
        const initialState = {
          index: pageData.index,
          // Prioritize custom data from the page, fall back to the base template
          pageTemplate: safeDeepClone(pageData.customPageTemplate || baseTemplate.pageTemplate),
          fieldPositions: safeDeepClone(pageData.customFieldPositions || baseTemplate.fieldPositions),
          fieldStyles: safeDeepClone(pageData.customFieldStyles || baseTemplate.fieldStyles),
          brandElements: safeDeepClone(pageData.customBrandElements || baseTemplate.brandElements),
          // The record for this specific page is what we care about
          csvData: [safeDeepClone(pageData.record)],
          csvHeaders: baseTemplate.csvHeaders || [], // Headers from base
        };
        setEditorState(initialState);
      }
    }
  }, [open, pageData, baseTemplate, prevOpen, editorState?.index]);


  // This separate effect is ONLY for deriving data from the editorState,
  // like extracting the color palette. It doesn't set the main state.
  useEffect(() => {
    const firstImage = editorState?.pageTemplate?.images?.[0];
    if (firstImage) {
      extractColorPalette(firstImage.src, setImageSwatches);
    }
  }, [editorState?.pageTemplate?.images]);

  const prevPageData = usePrevious(pageData);
  // This separate effect syncs externally added images into the local state
  // without overwriting all other local changes.
  useEffect(() => {
    // We only want this effect to run when the component is open and has state.
    if (!open || !editorState) {
      return;
    }

    // Get images from current and previous props
    const currentImagesProp = pageData?.customPageTemplate?.images || [];
    const prevImagesProp = prevPageData?.customPageTemplate?.images || [];

    // Check if an image was added
    if (currentImagesProp.length > prevImagesProp.length) {
        // Find the new image(s) by comparing the current props with the previous props
        const newImages = currentImagesProp.filter(
            (currentImg) => !prevImagesProp.some((prevImg) => prevImg.id === currentImg.id)
        );

        if (newImages.length > 0) {
            // Update the local state by adding only the new images
            setEditorState(prev => ({
                ...prev,
                pageTemplate: {
                    ...prev.pageTemplate,
                    images: [...(prev.pageTemplate.images || []), ...newImages],
                },
            }));
            // Select the last added image for better UX
            setSelectedField(newImages[newImages.length - 1].id);
        }
    }
  }, [pageData, open, editorState, prevPageData]);

  const [previewSize, setPreviewSize] = useState({ width: '100%', height: 'auto' });
  const previewContainerRef = useRef(null);

  // No PageEditor.jsx, atualize o useEffect:

  useEffect(() => {
    console.log('%c[PREVIEW SIZE] useEffect triggered', 'color: blue; font-weight: bold', { aspectRatio, open });

    const updatePreviewSize = () => {
      if (!previewContainerRef.current || !aspectRatio) {
        console.log('%c[PREVIEW SIZE] Skipped - no ref or aspectRatio', 'color: orange', {
          hasRef: !!previewContainerRef.current,
          aspectRatio
        });
        return;
      }

      const container = previewContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      console.log('%c[PREVIEW SIZE] Container dimensions:', 'color: green', {
        containerWidth,
        containerHeight
      });

      const ratioStr = aspectRatio.toString().replace(/\s/g, '');
      const [w, h] = ratioStr.split(/[:/]/).map(n => parseFloat(n));

      if (!w || !h) {
        console.error('[PREVIEW SIZE] Invalid aspect ratio:', aspectRatio);
        return;
      }

      const targetRatio = w / h;

      // Calcula ambas as possibilidades
      const widthBasedHeight = containerWidth / targetRatio;
      const heightBasedWidth = containerHeight * targetRatio;

      let finalWidth, finalHeight;

      // Escolhe o que cabe melhor
      if (widthBasedHeight <= containerHeight) {
        // Cabe limitando pela largura
        finalWidth = containerWidth;
        finalHeight = widthBasedHeight;
        console.log('%c[PREVIEW SIZE] Limited by WIDTH', 'color: blue; font-weight: bold');
      } else {
        // Não cabe pela largura, limita pela altura
        finalWidth = heightBasedWidth;
        finalHeight = containerHeight;
        console.log('%c[PREVIEW SIZE] Limited by HEIGHT', 'color: red; font-weight: bold');
      }

      console.log('%c[PREVIEW SIZE] Final dimensions:', 'color: green; font-weight: bold', {
        width: `${finalWidth}px`,
        height: `${finalHeight}px`,
        ratio: finalWidth / finalHeight,
        targetRatio
      });

      setPreviewSize({
        width: `${finalWidth}px`,
        height: `${finalHeight}px`
      });
    };

    const timeoutId = setTimeout(updatePreviewSize, 100);
    const resizeObserver = new ResizeObserver(() => {
      console.log('%c[PREVIEW SIZE] ResizeObserver triggered', 'color: cyan');
      updatePreviewSize();
    });

    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [aspectRatio, open]);

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

  const handleSaveToDriveClick = () => {
    if (!googleAccessToken) {
      toast.error('Você precisa estar logado com o Google para salvar no Drive.');
      return;
    }
    setIsDrivePickerOpen(true);
  };

  const handleFolderSelectForUpload = async (folder) => {
    if (!folder) {
      toast.warn('Nenhuma pasta selecionada.');
      return;
    }
    toast.info(`Salvando imagem na pasta "${folder.name}"...`);
    try {
      let imageBlob = null;
      const imageUrl = pageData?.url;

      if (!imageUrl) {
        toast.error('Não há imagem gerada para esta página.');
        return;
      }

      if (imageUrl.startsWith('blob:')) {
        imageBlob = pendingAssets[imageUrl];
      } else if (imageUrl.startsWith('data:')) {
        imageBlob = dataURLtoBlob(imageUrl);
      } else {
        const response = await fetch(`/api/asset-proxy?url=${encodeURIComponent(imageUrl)}`);
        if (!response.ok) throw new Error(`Falha ao buscar o recurso: ${response.statusText}`);
        imageBlob = await response.blob();
      }

      if (!imageBlob) {
        toast.error('Não foi possível carregar os dados da imagem para o upload.');
        return;
      }

      await uploadImageToDrive(imageBlob, folder.id);

    } catch (error) {
      console.error('Erro ao salvar imagem no Google Drive:', error);
      toast.error(`Falha ao salvar no Drive: ${error.message}`);
    }
  };

  if (!open || !editorState) return null;

  // Derive campaignSwatches from the editor's current state, applying the correct logic.
  const campaignSwatches = React.useMemo(() => {
    const { pageTemplate } = editorState;
    if (pageTemplate?.customPalette?.colors?.length > 0) {
      return pageTemplate.customPalette.colors;
    }
    if (pageTemplate?.paletteId && palettes) {
      const standardPalette = palettes.find(p => p.id === pageTemplate.paletteId);
      return standardPalette?.colors || [];
    }
    return [];
  }, [editorState, palettes]);

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
            <IconButton onClick={onClose} sx={{ ml: 2 }}><Close /></IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row', // importante!
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {/* --- Preview central --- */}
          <Box
            ref={previewContainerRef}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              minHeight: '80vh',
              overflow: 'hidden',
              position: 'relative',
              padding: 1,
            }}
          >
            <Box
              sx={{
                aspectRatio: aspectRatio || '1 / 1',
                width: previewSize.width,
                height: previewSize.height,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
              onClick={() => console.log('Current preview size:', previewSize, 'Aspect ratio:', aspectRatio)}
            >
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
          </Box>

          {/* --- Painel lateral --- */}
          {!isMobile && (
            <Box
              sx={{
                flex: '0 0 320px',
                borderLeft: 1,
                borderColor: 'divider',
                overflowY: 'auto',
              }}
            >
              <FormattingPanel
                editorState={editorState}
                setEditorState={setEditorState}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
                onOpenHtmlEditor={handleOpenHtmlEditor}
                showImageLoaders={true}
                handleImageUpload={handleLocalImageUpload}
                onOpenImageGallery={() => onOpenImageGallery(handleImageSelection)}
                onSaveToDrive={handleSaveToDriveClick}
                campaignSwatches={campaignState.colors}
                imageSwatches={imageSwatches}
              />
            </Box>
          )}
        </Box>
      </DialogContent >

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar Edições</Button>
      </DialogActions>
      {
        isMobile && (
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
              onSaveToDrive={handleSaveToDriveClick}
              campaignSwatches={campaignState.colors}
              imageSwatches={imageSwatches}
            />
          </>
        )
      }
      <GoogleDriveFolderPicker
        open={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelectFolder={handleFolderSelectForUpload}
        googleAccessToken={googleAccessToken}
        setGoogleAccessToken={setGoogleAccessToken}
      />
      <TextEditorDialog
        open={editingField !== null}
        title={`Editar "${editingField || ''}"`}
        content={(editorState.csvData && editorState.csvData[0]) ? editorState.csvData[0][editingField] || '' : ''}
        onSave={handleSaveHtmlContent}
        onClose={() => setEditingField(null)}
      />
    </Dialog >
  );
};

export default PageEditor;