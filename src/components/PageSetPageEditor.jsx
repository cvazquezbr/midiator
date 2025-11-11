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

// This is the isolated editor for pages within a PageSet.
const PageSetPageEditor = ({
  open,
  onClose,
  pageData, // The page object from the PageSet's `pages` array
  onSave,
  aspectRatio,
  pageSetFields, // Now an array of field objects: { id, name, type, quantity, size }
}) => {
  const [editorState, setEditorState] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const previewContainerRef = useRef(null);
  const [previewSize, setPreviewSize] = useState({ width: '100%', height: 'auto' });

  useEffect(() => {
    if (open && pageData && !editorState) {
      // Create the initial state in the format FieldPositioner expects.
      const record = {};
      const fieldPositions = safeDeepClone(pageData.fieldPositions || {});
      const fieldStyles = safeDeepClone(pageData.fieldStyles || {});

      // Initialize fields, create placeholders based on size, and set default styles.
      (pageSetFields || []).forEach(field => {
        const fieldName = field.name;
        // Use placeholder text for text fields, respecting the defined size
        if (field.type === 'text') {
          const placeholder = 'no nono nooooo no... ';
          const repeatCount = Math.max(1, Math.ceil((field.size || 100) / placeholder.length));
          record[fieldName] = pageData.record?.[fieldName] || placeholder.repeat(repeatCount);
        } else {
          // For images, just ensure the record key exists
          record[fieldName] = pageData.record?.[fieldName] || null;
        }

        // Ensure default position and style exist for each field
        if (!fieldPositions[fieldName]) {
          fieldPositions[fieldName] = { x: 10, y: 10, width: 80, height: 10, visible: true, zIndex: 1 };
        }
        if (!fieldStyles[fieldName]) {
          fieldStyles[fieldName] = { ...COMPLETE_DEFAULT_STYLE };
        }
      });

      const expandedFieldNames = pageSetFields.map(f => f.name);

      const initialState = {
        fieldPositions,
        fieldStyles,
        pageTemplate: safeDeepClone(pageData.pageTemplate || { backgroundColor: '#FFFFFF', images: [] }),
        csvData: [record], // FieldPositioner expects csvData to be an array of records
        csvHeaders: expandedFieldNames,
      };
      setEditorState(initialState);
    } else if (!open && editorState) {
      // Reset state when the dialog closes
      setEditorState(null);
    }
  }, [open, pageData, pageSetFields, editorState]);


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
    // Save the data back in the simplified PageSet page format
    onSave({
      ...pageData, // Preserve index
      fieldPositions: editorState.fieldPositions,
      fieldStyles: editorState.fieldStyles,
      pageTemplate: editorState.pageTemplate,
      record: editorState.csvData[0], // Save the actual text content
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
                originalImageSize={{ width: 1080, height: 1080 }} // Standard size
                currentPreviewIndex={0}
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
                showImageLoaders={false} // IMPORTANT: No image uploads for PageSets
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar Página</Button>
      </DialogActions>

      {isMobile && (
        <>
          <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => setIsDrawerOpen(true)}>
            <Edit />
          </Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            editorState={editorState}
            setEditorState={setEditorState}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            showImageLoaders={false}
          />
        </>
      )}
    </Dialog>
  );
};

export default PageSetPageEditor;
