import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, IconButton, Tooltip, Fab,
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer';
import TextEditorDialog from './TextEditorDialog';
import { createNewImageElement } from '../utils/elementFactory';
import { useCampaign } from '../context/CampaignContext';
import { safeDeepClone } from '../lib/utils';
import { toast } from 'sonner';

const PageEditor = ({
  open,
  onClose,
  pageData, // The specific page being edited
  baseTemplate, // The global/base template to fall back on
  onSave,
  aspectRatio,
  originalImageSize,
  addPendingAsset,
  onOpenImageGallery,
}) => {

  const { campaignState } = useCampaign();
  const { pendingAssets } = campaignState;

  const [editorState, setEditorState] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [imageSwatches, setImageSwatches] = useState([]);
  const isMobile = useIsMobile();
  const prevImagesRef = useRef();
  const containerRef = useRef(null);
  const [dynamicSize, setDynamicSize] = useState({ width: 0, height: 0 });


  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries && entries.length > 0) {
        const { width: containerWidth, height: containerHeight } = entries[0].contentRect;
        if (containerWidth === 0 || containerHeight === 0) return;

        const [aspectW, aspectH] = String(aspectRatio).split(':').map(Number);

        let newWidth = containerWidth;
        let newHeight = newWidth / (aspectW / aspectH);

        if (newHeight > containerHeight) {
          newHeight = containerHeight;
          newWidth = newHeight * (aspectW / aspectH);
        }

        setDynamicSize({ width: newWidth, height: newHeight });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [aspectRatio, open]);


  // Initialize and synchronize state when the editor opens or pageData changes.
  useEffect(() => {
    if (open && pageData) {
      // Heuristic to determine if a page is new. A new page, as created by the parent,
      // has a placeholder template but no actual elements or images.
      const isNewPage = (
        !pageData.customPageTemplate ||
        (
          (!pageData.customPageTemplate.elements || pageData.customPageTemplate.elements.length === 0) &&
          (!pageData.customPageTemplate.images || pageData.customPageTemplate.images.length === 0)
        )
      );

      let finalTemplate, finalPositions, finalStyles, finalBrand;

      if (isNewPage) {
        // For a NEW page, we construct its state by starting with a deep clone of the base template.
        // This ensures all the structural elements are present for the preview.
        finalTemplate = safeDeepClone(baseTemplate.pageTemplate);
        finalPositions = safeDeepClone(baseTemplate.fieldPositions);
        finalStyles = safeDeepClone(baseTemplate.fieldStyles);
        finalBrand = safeDeepClone(baseTemplate.brandElements);

        // We then clear any "content" from the template, like background images, for a clean slate.
        finalTemplate.images = [];

        // We can still respect certain overrides from the placeholder, like background color.
        if (pageData.customPageTemplate?.backgroundColor) {
          finalTemplate.backgroundColor = pageData.customPageTemplate.backgroundColor;
        }
      } else {
        // For an EXISTING page, its own stored data is the source of truth.
        // We still fall back to the base template for any missing top-level properties, just in case.
        finalTemplate = safeDeepClone(pageData.customPageTemplate || baseTemplate.pageTemplate);
        finalPositions = safeDeepClone(pageData.customFieldPositions || baseTemplate.fieldPositions);
        finalStyles = safeDeepClone(pageData.customFieldStyles || baseTemplate.fieldStyles);
        finalBrand = safeDeepClone(pageData.customBrandElements || baseTemplate.brandElements);
      }

      const initialEditorState = {
        pageTemplate: finalTemplate,
        fieldPositions: finalPositions,
        fieldStyles: finalStyles,
        brandElements: finalBrand,
        csvData: pageData.record ? [safeDeepClone(pageData.record)] : [],
        csvHeaders: pageData.record ? Object.keys(pageData.record) : [],
      };
      setEditorState(initialEditorState);
    } else {
      // When the dialog is closed, reset the state.
      setEditorState(null);
    }
  }, [open, pageData, baseTemplate]);

  const handleImageSelected = (image) => {
    if (!image || !image.url) {
      toast.error('A imagem selecionada é inválida.');
      return;
    }
    const newImage = createNewImageElement(image.url, originalImageSize);
    setEditorState((prev) => {
      const images = [...(prev.pageTemplate.images || []), newImage];
      return {
        ...prev,
        pageTemplate: {
          ...prev.pageTemplate,
          images,
        },
      };
    });
  };

  const handleOpenGalleryAndSelect = () => {
    if (onOpenImageGallery) {
      onOpenImageGallery(handleImageSelected);
    } else {
      toast.error('Image gallery handler not provided.');
    }
  };

  // Handle saving the changes
  const handleSave = () => {
    if (!editorState) return;
    // Return the modified page data to the parent component.
    onSave({
      ...pageData, // Preserve original index and other metadata
      customPageTemplate: editorState.pageTemplate,
      customFieldPositions: editorState.fieldPositions,
      customFieldStyles: editorState.fieldStyles,
      customBrandElements: editorState.brandElements,
      record: editorState.csvData[0],
    });
    onClose();
  };

  // O resto do componente (UI e manipulação de estado interno) permanece muito semelhante...
  // Apenas garantimos que tudo use `editorState` e `setEditorState`.

  if (!open || !editorState) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="paper" fullScreen={isMobile}>
      <DialogTitle>
        Editar Página #{(pageData?.index ?? -1) + 1}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box ref={containerRef} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, overflow: 'hidden' }}>
          <Box sx={{ width: dynamicSize.width, height: dynamicSize.height }}>
            <FieldPositioner
              editorState={editorState}
              setEditorState={setEditorState}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              originalImageSize={originalImageSize}
              currentPreviewIndex={0}
              pendingAssets={pendingAssets}
            />
          </Box>
        </Box>
        {!isMobile && (
          <Box sx={{ flex: '0 0 320px', borderLeft: 1, borderColor: 'divider', overflowY: 'auto' }}>
            <FormattingPanel
              editorState={editorState}
              setEditorState={setEditorState}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              onOpenImageGallery={handleOpenGalleryAndSelect}
              // ... outras props
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PageEditor;
