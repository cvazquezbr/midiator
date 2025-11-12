import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, IconButton, Fab,
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
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
}) => {
  const [editorState, setEditorState] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const isMobile = useIsMobile();
  const previewContainerRef = useRef(null);
  const [previewSize, setPreviewSize] = useState({ width: '100%', height: 'auto' });

  useEffect(() => {
    if (open && pageData) {
      const record = {};
      const fieldPositions = safeDeepClone(pageData.fieldPositions || {});
      const fieldStyles = safeDeepClone(pageData.fieldStyles || {});
      const pageTemplate = safeDeepClone(pageData.pageTemplate || { backgroundColor: '#FFFFFF', images: [] });

      const definedImageFields = new Set((pageSetFields || []).filter(f => f.type === 'image').map(f => f.name));

      // Ensure all fields from the PageSet definition are present in the editor state
      (pageSetFields || []).forEach(field => {
        const fieldName = field.name;

        if (field.type === 'text') {
          const placeholder = 'no nono nooooo no... ';
          const repeatCount = Math.max(1, Math.ceil((field.size || 100) / placeholder.length));
          record[fieldName] = pageData.record?.[fieldName] || placeholder.repeat(repeatCount);
        } else {
          record[fieldName] = pageData.record?.[fieldName] || null;
        }

        if (!fieldPositions[fieldName]) {
          fieldPositions[fieldName] = { x: 10, y: 10, width: 80, height: 10, visible: true, zIndex: 1 };
        }
        if (!fieldStyles[fieldName]) {
          fieldStyles[fieldName] = { ...COMPLETE_DEFAULT_STYLE };
        }

        // For image fields, ensure a placeholder image object exists in the pageTemplate
        if (field.type === 'image') {
          const imageExists = pageTemplate.images.some(img => img.id === fieldName);
          if (!imageExists) {
            const newImagePlaceholder = createNewImageElement(PLACEHOLDER_IMAGE_URL, fieldName);
            // Sync position and dimensions from fieldPositions
            const pos = fieldPositions[fieldName];
            if (pos) {
              newImagePlaceholder.x = pos.x;
              newImagePlaceholder.y = pos.y;
              newImagePlaceholder.width = pos.width;
              newImagePlaceholder.height = pos.height;
              newImagePlaceholder.zIndex = pos.zIndex ?? 1;
            }
            pageTemplate.images.push(newImagePlaceholder);
          }
        }
      });

      // Remove image objects that are no longer in the field definition
      pageTemplate.images = pageTemplate.images.filter(img => definedImageFields.has(img.id));

      const expandedFieldNames = (pageSetFields || []).map(f => f.name);

      const initialState = {
        fieldPositions,
        fieldStyles,
        pageTemplate,
        csvData: [record],
        csvHeaders: expandedFieldNames,
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

  const handleSave = () => {
    onSave({
      ...pageData,
      fieldPositions: editorState.fieldPositions,
      fieldStyles: editorState.fieldStyles,
      pageTemplate: editorState.pageTemplate,
      record: editorState.csvData[0],
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
                editorState={editorState}
                setEditorState={setEditorState}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
                originalImageSize={{ width: 1080, height: 1080 }}
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
