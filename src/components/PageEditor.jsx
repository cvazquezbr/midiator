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

  // Initialize and synchronize state when the editor opens or pageData changes.
  useEffect(() => {
    if (open && pageData) {
      // The editor works with a copy, so the original is not mutated until save.
      const initialEditorState = {
        // Use the page's custom data, or fall back to the base template.
        pageTemplate: safeDeepClone(pageData.customPageTemplate || baseTemplate.pageTemplate),
        fieldPositions: safeDeepClone(pageData.customFieldPositions || baseTemplate.fieldPositions),
        fieldStyles: safeDeepClone(pageData.customFieldStyles || baseTemplate.fieldStyles),
        brandElements: safeDeepClone(pageData.customBrandElements || baseTemplate.brandElements),
        // The record is specific to this page.
        csvData: pageData.record ? [safeDeepClone(pageData.record)] : [],
        csvHeaders: pageData.record ? Object.keys(pageData.record) : [],
      };
      setEditorState(initialEditorState);
    } else {
      // When the dialog is closed, reset the state.
      setEditorState(null);
    }
  }, [open, pageData, baseTemplate]);

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
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Box sx={{ width: '100%', aspectRatio: aspectRatio ? String(aspectRatio).replace(':', ' / ') : '1 / 1' }}>
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
