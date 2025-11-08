import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Typography, Box, Stack, TextField } from '@mui/material';
import { toast } from 'sonner';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import { createNewImageElement } from '../utils/elementFactory';

const MOCK_RECORD_FOR_PREVIEW = {
  'Título': 'Título da Página de Exemplo',
  'Conteúdo': 'Este é um parágrafo de exemplo para preencher o conteúdo da página e visualizar a formatação.',
  'CTA': 'Clique Aqui',
};

const PageSetEditor = ({ name, pageSetData, onNameChange, onPageSetDataChange, pendingAssets, onPendingAssetsChange }) => {
  const [editorState, setEditorState] = useState(() => {
    const data = pageSetData || {};
    return {
      pageTemplate: data.pageTemplate || { texts: [], images: [], shapes: [] },
      fieldPositions: data.fieldPositions || {},
      fieldStyles: data.fieldStyles || {},
      brandElements: data.brandElements || [],
      csvHeaders: Object.keys(data.fieldPositions || {}).length > 0 ? Object.keys(data.fieldPositions) : Object.keys(MOCK_RECORD_FOR_PREVIEW),
    };
  });
  const [selectedField, setSelectedField] = useState(null);

  useEffect(() => {
    const data = pageSetData || {};
    setEditorState({
      pageTemplate: data.pageTemplate || { texts: [], images: [], shapes: [] },
      fieldPositions: data.fieldPositions || {},
      fieldStyles: data.fieldStyles || {},
      brandElements: data.brandElements || [],
      csvHeaders: Object.keys(data.fieldPositions || {}).length > 0 ? Object.keys(data.fieldPositions) : Object.keys(MOCK_RECORD_FOR_PREVIEW),
    });
  }, [pageSetData]);

  // This effect is now removed as it was causing the issue.
  // The parent `PageSetsPage` will now be responsible for updating its state
  // via the `setEditorState` prop passed to the children.

  const addPendingAsset = useCallback((file) => {
    if (!file) return null;
    const blobUrl = URL.createObjectURL(file);
    onPendingAssetsChange(prev => ({ ...prev, [blobUrl]: file }));
    return blobUrl;
  }, [onPendingAssetsChange]);

  const handleImageUpload = useCallback((file) => {
    const managedUrl = addPendingAsset(file);
    if (!managedUrl) {
      toast.error("Houve um erro ao registrar a imagem.");
      return;
    }
    const newImage = { ...createNewImageElement(managedUrl), zIndex: -1 };

    const newEditorState = {
        ...editorState,
        pageTemplate: {
            ...editorState.pageTemplate,
            images: [...(editorState.pageTemplate.images || []), newImage]
        }
    };
    onPageSetDataChange(newEditorState);
    toast.success('Imagem adicionada ao modelo.');
  }, [addPendingAsset, editorState, onPageSetDataChange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, height: 'calc(100vh - 220px)' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TextField
          label="Nome do Conjunto de Páginas"
          value={name || ''}
          onChange={(e) => onNameChange(e.target.value)}
          variant="outlined"
          fullWidth
          sx={{ mb: 2, flexShrink: 0 }}
        />
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Box sx={{ aspectRatio: '1 / 1', width: '100%', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}>
            <FieldPositioner
              editorState={editorState}
              setEditorState={onPageSetDataChange} // Pass the parent's state setter directly
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              originalImageSize={{ width: 1080, height: 1080 }}
              currentPreviewIndex={0}
              isCropping={false}
              mockRecordForPreview={MOCK_RECORD_FOR_PREVIEW}
              pendingAssets={pendingAssets}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: '0 0 320px', p: 1, borderLeft: 1, borderColor: 'divider', overflowY: 'auto' }}>
        <Stack spacing={2}>
          <FormattingPanel
            editorState={editorState}
            setEditorState={onPageSetDataChange} // Pass the parent's state setter directly
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            isCropping={false}
            setIsCropping={() => {}}
            showImageLoaders={true}
            handleImageUpload={(e) => handleImageUpload(e.target.files[0])}
            onOpenImageGallery={() => toast.info('Galeria ainda não disponível para PageSets.')}
          />
        </Stack>
      </Box>
    </Box>
  );
};

export default PageSetEditor;
