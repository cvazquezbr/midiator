import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Typography,
  Box,
  Fab,
  Stack,
  Tooltip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  SkipPrevious,
  ArrowLeft,
  ArrowRight,
  SkipNext,
} from '@mui/icons-material';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer';
import { useCampaign } from '../context/CampaignContext';

const ImageStepUI = ({
  isLoading,
  onOpenImageGallery,
  onImageDisplayedSizeChange,
  originalImageSize,
  isMobile,
  onOpenHtmlEditor,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  activeStep,
  handleImageUpload,
}) => {
  const { campaignState, setCampaignState } = useCampaign();

  // Destructure all needed properties from the global campaignState
  const {
    csvData,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    selectedField,
    imageColorPalette,
    initialFieldStyles,
    templateFieldStyles,
    aspectRatio,
  } = campaignState;

  const [previewSize, setPreviewSize] = useState({ width: '100%', height: 'auto' });
  const previewContainerRef = useRef(null);

  useEffect(() => {
    const updatePreviewSize = () => {
      if (!previewContainerRef.current || !aspectRatio) {
        return;
      }

      const container = previewContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const ratioStr = aspectRatio.toString().replace(/\s/g, '');
      const [w, h] = ratioStr.split(/[:/]/).map(n => parseFloat(n));

      if (!w || !h) {
        return;
      }

      const targetRatio = w / h;
      const widthBasedHeight = containerWidth / targetRatio;
      const heightBasedWidth = containerHeight * targetRatio;

      let finalWidth, finalHeight;

      if (widthBasedHeight <= containerHeight) {
        finalWidth = containerWidth;
        finalHeight = widthBasedHeight;
      } else {
        finalWidth = heightBasedWidth;
        finalHeight = containerHeight;
      }

      setPreviewSize({
        width: `${finalWidth}px`,
        height: `${finalHeight}px`
      });
    };

    const timeoutId = setTimeout(updatePreviewSize, 100);
    const resizeObserver = new ResizeObserver(updatePreviewSize);

    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [aspectRatio]);


  // This is the CRITICAL FIX:
  // We assemble the `editorState` object that the refactored child components (`FieldPositioner`, `FormattingPanel`) now expect.
  // This bridges the gap between the global `campaignState` and the local `editorState` used by the editor components.
  const editorState = useMemo(() => ({
    csvData,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    // We derive csvHeaders here to ensure robustness
    csvHeaders: (csvData && csvData.length > 0 && csvData[0]) ? Object.keys(csvData[0]) : [],
  }), [csvData, fieldPositions, fieldStyles, brandElements, pageTemplate]);


  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  const handleNextPreview = () => setCurrentPreviewIndex(prev => Math.min(prev + 1, csvData.length - 1));
  const handlePreviousPreview = () => setCurrentPreviewIndex(prev => Math.max(prev - 1, 0));
  const handleFirstPreview = () => setCurrentPreviewIndex(0);
  const handleLastPreview = () => setCurrentPreviewIndex(csvData.length - 1);

  // This function acts as a translator from the child components' `setEditorState` calls
  // back to the global `setCampaignState`.
  const handleEditorStateChange = (updater) => {
    // We need to be careful here. The `updater` function from the children will return a complete
    // `editorState` object. We must destructure it and update the global state accordingly.
    setCampaignState(prevState => {
      const newEditorState = typeof updater === 'function' ? updater(prevState) : updater;

      // We only update the parts of the global state that the editor is responsible for.
      return {
        fieldPositions: newEditorState.fieldPositions,
        fieldStyles: newEditorState.fieldStyles,
        brandElements: newEditorState.brandElements,
        pageTemplate: newEditorState.pageTemplate,
        csvData: newEditorState.csvData,
      };
    });
  };


  if (isLoading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>Carregando...</Typography>
        </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, height: { xs: 'calc(100dvh - 140px)', md: 'calc(100vh - 150px)' } }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography variant="h6" sx={{ flexShrink: 0, textAlign: 'center', my: 2 }}>
          Editor de Modelo
        </Typography>
        {csvData && csvData.length > 0 && pageTemplate && fieldPositions && fieldStyles ? (
          <>
            <Box
              ref={previewContainerRef}
              sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative',
                padding: 2,
              }}
            >
              <Box
                sx={{
                  aspectRatio: (aspectRatio || '1:1').replace(':', ' / '),
                  width: previewSize.width,
                  height: previewSize.height,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                <FieldPositioner
                  editorState={editorState}
                  setEditorState={handleEditorStateChange} // Pass the translator function
                  selectedField={selectedField}
                  setSelectedField={(value) => setCampaignState({ selectedField: value })}
                  originalImageSize={originalImageSize}
                  onOpenHtmlEditor={onOpenHtmlEditor}
                  currentPreviewIndex={currentPreviewIndex}
                  onImageDisplayedSizeChange={onImageDisplayedSizeChange}
                  isCropping={isCropping}
                />
              </Box>
            </Box>
            {csvData && csvData.length > 1 && (
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ flexShrink: 0, mt: 2 }} flexWrap="wrap">
                <Tooltip title="Primeiro"><span><IconButton onClick={handleFirstPreview} disabled={currentPreviewIndex === 0} size="small"><SkipPrevious /></IconButton></span></Tooltip>
                <Tooltip title="Anterior"><span><IconButton onClick={handlePreviousPreview} disabled={currentPreviewIndex === 0} size="small"><ArrowLeft /></IconButton></span></Tooltip>
                <Typography variant="body2" sx={{ minWidth: '100px', textAlign: 'center' }}>{currentPreviewIndex + 1} / {csvData.length}</Typography>
                <Tooltip title="Próximo"><span><IconButton onClick={handleNextPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><ArrowRight /></IconButton></span></Tooltip>
                <Tooltip title="Último"><span><IconButton onClick={handleLastPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><SkipNext /></IconButton></span></Tooltip>
              </Stack>
            )}
          </>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Por favor, carregue os dados na etapa "Posts Curtos" para começar a editar o modelo.
            </Typography>
          </Box>
        )}
      </Box>

      {!isMobile && (
        <Box sx={{ flex: '0 0 320px', p: 1, borderLeft: 1, borderColor: 'divider', overflowY: 'auto' }}>
          <Stack spacing={2}>
            <FormattingPanel
              editorState={editorState}
              setEditorState={handleEditorStateChange} // Pass the translator function
              selectedField={selectedField}
              setSelectedField={(value) => setCampaignState({ selectedField: value })}
              onOpenHtmlEditor={onOpenHtmlEditor}
              isCropping={isCropping}
              setIsCropping={setIsCropping}
              showImageLoaders={true}
              handleImageUpload={handleImageUpload}
              onOpenImageGallery={onOpenImageGallery}
              campaignSwatches={campaignState.colors}
              imageSwatches={imageColorPalette}
            />
          </Stack>
        </Box>
      )}

      {isMobile && (
        <>
          <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }} onClick={() => {
            if (!selectedField) setCampaignState({ selectedField: '__page_background__' });
            setIsDrawerOpen(true);
          }}><EditIcon /></Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            editorState={editorState}
            setEditorState={handleEditorStateChange} // Pass the translator function
            selectedField={selectedField}
            setSelectedField={(value) => setCampaignState({ selectedField: value })}
            onOpenHtmlEditor={onOpenHtmlEditor}
            isCropping={isCropping}
            setIsCropping={setIsCropping}
            showImageLoaders={true}
            handleImageUpload={handleImageUpload}
            onOpenImageGallery={onOpenImageGallery}
            campaignSwatches={campaignState.colors}
            imageSwatches={imageColorPalette}
          />
        </>
      )}
    </Box>
  );
};

export default ImageStepUI;
