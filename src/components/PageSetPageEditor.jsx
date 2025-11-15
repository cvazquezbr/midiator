import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, IconButton, Fab,
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { useIsMobile } from '../hooks/use-mobile';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer';
import { safeDeepClone } from '../lib/utils';
import { COMPLETE_DEFAULT_STYLE } from '../utils/defaultStyles';
import { createNewImageElement } from '../utils/elementFactory';

const PLACEHOLDER_IMAGE_URL = 'https://as1.ftcdn.net/v2/jpg/07/12/27/56/1000_F_712275644_opOBN5SnauV92mW0tyELL5qUBKoucMqA.jpg';

const PageSetPageEditor = ({
  open,
  onClose,
  pageData,
  onSave,
  aspectRatio,
  pageSetFields,
  editorType,
  paletteColors,
}) => {
  const [editorState, setEditorState] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const isMobile = useIsMobile();
  const previewContainerRef = useRef(null);
  const fieldPositionerRef = useRef(null);
  const [previewSize, setPreviewSize] = useState({ width: '100%', height: 'auto' });

  const originalImageSize = useMemo(() => {
    if (!aspectRatio) return { width: 1080, height: 1080 };
    const [w, h] = aspectRatio.split(':').map(Number);
    const width = 1080;
    const height = (width / w) * h;
    return { width, height };
  }, [aspectRatio]);

  useEffect(() => {
    if (open && pageData) {
      const record = pageData.record ? safeDeepClone(pageData.record) : {};
      const basePageTemplate = safeDeepClone(pageData.pageTemplate || { backgroundColor: '#FFFFFF', elements: [] });

      const fieldPositions = {};
      const fieldStyles = {};
      const images = [];

      // If the new 'elements' structure exists, use it as the source of truth.
      if (basePageTemplate.elements) {
        basePageTemplate.elements.forEach(element => {
          const { id, type, src, ...styleProps } = element;
          fieldPositions[id] = {
            x: element.x, y: element.y, width: element.width, height: element.height,
            visible: element.visible !== false, zIndex: element.zIndex
          };
          fieldStyles[id] = styleProps;
          if (element.type === 'image' || src) { // Treat elements with 'src' as images
            images.push({ ...element });
          }
        });
      } else {
        // Fallback for old data structure (fieldPositions, fieldStyles, pageTemplate.images)
        Object.assign(fieldPositions, safeDeepClone(pageData.fieldPositions || {}));
        Object.assign(fieldStyles, safeDeepClone(pageData.fieldStyles || {}));
        images.push(...(basePageTemplate.images || []));
      }

      const pageTemplate = { ...basePageTemplate, images };

      // Get a set of fields that genuinely exist on this page.
      const existingFieldsOnPage = new Set(Object.keys(fieldPositions));

      // Iterate through the master list of fields for the entire PageSet.
      (pageSetFields || []).forEach(field => {
        const fieldName = field.name;

        // If a field from the master list does NOT exist on this specific page,
        // ensure it has a corresponding 'fieldPositions' entry but is marked as invisible.
        if (!existingFieldsOnPage.has(fieldName)) {
          fieldPositions[fieldName] = { x: 0, y: 0, width: 0, height: 0, visible: false, zIndex: 0 };
        }

        // For text fields that DO exist on this page, ensure they have placeholder text if empty.
        if (field.type === 'text' && existingFieldsOnPage.has(fieldName)) {
          if (!record[fieldName]) {
            const placeholder = 'no nono nooooo no... ';
            const repeatCount = Math.max(1, Math.ceil((field.size || 100) / placeholder.length));
            record[fieldName] = placeholder.repeat(repeatCount);
          }
        }

        // Ensure every field has a style object to prevent crashes.
        if (!fieldStyles[fieldName]) {
          fieldStyles[fieldName] = { ...COMPLETE_DEFAULT_STYLE };
        }

        // For image fields, ensure a placeholder image object exists in the pageTemplate if it's missing.
        if (field.type === 'image') {
          const imageExists = pageTemplate.images.some(img => img.id === fieldName);
          if (!imageExists) {
            const newImagePlaceholder = createNewImageElement(PLACEHOLDER_IMAGE_URL, fieldName);
            const pos = fieldPositions[fieldName];
            if (pos) { Object.assign(newImagePlaceholder, pos); }
            pageTemplate.images.push(newImagePlaceholder);
          }
        }
      });

      const csvHeaders = (pageSetFields || []).map(f => f.name);

      const initialState = {
        fieldPositions,
        fieldStyles,
        pageTemplate,
        csvData: [record],
        csvHeaders: csvHeaders,
      };
      setEditorState(initialState);
    } else if (!open) {
      setEditorState(null);
    }
  }, [open, pageData, pageSetFields]);


  useEffect(() => {
    const updatePreviewSize = () => {
      if (!previewContainerRef.current || !aspectRatio) return;
      const container = previewContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const [w, h] = aspectRatio.split(':').map(Number);
      const targetRatio = w / h;

      let finalWidth, finalHeight;
      if ((containerWidth / targetRatio) <= containerHeight) {
        finalWidth = containerWidth;
        finalHeight = containerWidth / targetRatio;
      } else {
        finalWidth = containerHeight * targetRatio;
        finalHeight = containerHeight;
      }
      setPreviewSize({ width: `${finalWidth}px`, height: `${finalHeight}px` });
    };

    const resizeObserver = new ResizeObserver(updatePreviewSize);
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    const timeoutId = setTimeout(updatePreviewSize, 100);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [aspectRatio, open]);

  if (!open || !editorState) {
    return null;
  }

  const handleSave = async () => {
    if (!fieldPositionerRef.current) {
      toast.error('Preview element not found for thumbnail generation.');
      return;
    }

    const canvas = await html2canvas(fieldPositionerRef.current, {
      allowTaint: true,
      useCORS: true,
      backgroundColor: editorState.pageTemplate.backgroundColor || '#FFFFFF',
      onclone: (clonedDoc) => {
        const elements = clonedDoc.querySelectorAll('[id]'); // Select all elements with an id
        const promises = [];

        elements.forEach(element => {
          const img = element.querySelector('img');
          if (!img) return;

          const elementId = element.id;
          const imageData = editorState.pageTemplate.images.find(i => i.id === elementId);
          if (!imageData) return;

          const objectFit = imageData.objectFit || 'fill';
          if (objectFit === 'fill') return; // html2canvas default is fill

          const promise = new Promise((resolve, reject) => {
            const canvas = clonedDoc.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const newImg = new Image();
            newImg.crossOrigin = 'anonymous';
            newImg.src = img.src;

            newImg.onload = () => {
              const { naturalWidth, naturalHeight } = newImg;
              const { width, height } = img.getBoundingClientRect();
              canvas.width = width;
              canvas.height = height;

              const hRatio = width / naturalWidth;
              const vRatio = height / naturalHeight;
              const ratio = objectFit === 'cover' ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);

              const centerShiftX = (width - naturalWidth * ratio) / 2;
              const centerShiftY = (height - naturalHeight * ratio) / 2;

              ctx.drawImage(newImg, 0, 0, naturalWidth, naturalHeight,
                            centerShiftX, centerShiftY, naturalWidth * ratio, naturalHeight * ratio);

              img.parentNode.replaceChild(canvas, img);
              resolve();
            };
            newImg.onerror = (err) => {
              console.error("Failed to load image for canvas replacement:", err);
              reject(err);
            };
          });
          promises.push(promise);
        });
        return Promise.all(promises);
      },
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    onSave({
      pageData: {
        ...pageData,
        fieldPositions: editorState.fieldPositions,
        fieldStyles: editorState.fieldStyles,
        pageTemplate: editorState.pageTemplate,
        record: editorState.csvData[0],
      },
      thumbnailBlob: blob,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="paper" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Editar Página do Conjunto</span>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
          <Box
            ref={previewContainerRef}
            sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
          >
            <Box sx={{ aspectRatio: aspectRatio.replace(':', ' / '), width: previewSize.width, height: previewSize.height }}>
              <FieldPositioner
                ref={fieldPositionerRef}
                editorState={editorState}
                setEditorState={setEditorState}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
                originalImageSize={originalImageSize}
                currentPreviewIndex={0}
                editorType={editorType}
                pageSetFields={pageSetFields}
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
                showImageLoaders={false}
                pageSetFields={pageSetFields}
                campaignSwatches={paletteColors}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar Página</Button>
      </DialogActions>

    </Dialog>
  );
};

export default PageSetPageEditor;
