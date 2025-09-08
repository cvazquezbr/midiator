import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Fab,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Image as ImageIcon,
  Edit as EditIcon,
  SkipPrevious,
  ArrowLeft,
  ArrowRight,
  SkipNext,
} from '@mui/icons-material';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer';

const ImageStep = ({
  aspectRatio,
  steps,
  isDraggingOverImage,
  handleImageDrop,
  handleImageDragOver,
  handleImageDragEnter,
  handleImageDragLeave,
  imageInputRef,
  handleImageUpload,
  onChangeBackgroundImage,
  csvHeaders,
  fieldPositions,
  setFieldPositions,
  fieldStyles,
  initialFieldStyles,
  setFieldStyles,
  csvData,
  onImageDisplayedSizeChange,
  colorPalette,
  standardsColors,
  onCsvDataUpdate,
  originalImageSize,
  brandElements,
  setBrandElements,
  pageTemplate,
  setPageTemplate,
  onZIndexChange,
  isMobile,
  selectedField,
  setSelectedField,
  onDeselectField,
  onOpenHtmlEditor,
  isHtmlField,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  templateFieldStyles,
  activeStep,
}) => {
  console.log('[ImageStep] props:', { pageTemplate, fieldStyles });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [isCropping, setIsCropping] = useState(false);

  const handleNextPreview = () => {
    setCurrentPreviewIndex(prevIndex => Math.min(prevIndex + 1, csvData.length - 1));
  };

  const handlePreviousPreview = () => {
    setCurrentPreviewIndex(prevIndex => Math.max(prevIndex - 1, 0));
  };

  const handleFirstPreview = () => {
    setCurrentPreviewIndex(0);
  };

  const handleLastPreview = () => {
    setCurrentPreviewIndex(csvData.length - 1);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>

      {/* Main Content: Editor Area */}
      <Box sx={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0, // Crucial for flex child to shrink
        p: 1,
      }}>
        <Typography variant="h6" sx={{ flexShrink: 0, textAlign: 'center', mb: 2 }}>
          Editor de Página
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0, // Allow shrinking
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FieldPositioner
            aspectRatio={aspectRatio}
            csvHeaders={csvHeaders}
            fieldPositions={fieldPositions}
            setFieldPositions={setFieldPositions}
            fieldStyles={fieldStyles}
            setFieldStyles={setFieldStyles}
            csvData={csvData}
            onImageDisplayedSizeChange={onImageDisplayedSizeChange}
            colorPalette={colorPalette}
            standardsColors={standardsColors}
            onCsvDataUpdate={onCsvDataUpdate}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            originalImageSize={originalImageSize}
            brandElements={brandElements}
            setBrandElements={setBrandElements}
            pageTemplate={pageTemplate}
            setPageTemplate={setPageTemplate}
            onZIndexChange={onZIndexChange}
            onOpenHtmlEditor={onOpenHtmlEditor}
            currentPreviewIndex={currentPreviewIndex}
            setCurrentPreviewIndex={setCurrentPreviewIndex}
            onFontScaleChange={setFontScale}
            isCropping={isCropping}
            setIsCropping={setIsCropping}
          />
        </Box>
        {csvData && csvData.length > 1 && (
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ flexShrink: 0, mt: 2 }} flexWrap="wrap">
            <Tooltip title="Primeiro Registro"><span><IconButton onClick={handleFirstPreview} disabled={currentPreviewIndex === 0} size="small"><SkipPrevious /></IconButton></span></Tooltip>
            <Tooltip title="Registro Anterior"><span><IconButton onClick={handlePreviousPreview} disabled={currentPreviewIndex === 0} size="small"><ArrowLeft /></IconButton></span></Tooltip>
            <Typography variant="body2" sx={{ minWidth: '100px', textAlign: 'center' }}>Registro: {currentPreviewIndex + 1} / {csvData.length}</Typography>
            <Tooltip title="Próximo Registro"><span><IconButton onClick={handleNextPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><ArrowRight /></IconButton></span></Tooltip>
            <Tooltip title="Último Registro"><span><IconButton onClick={handleLastPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><SkipNext /></IconButton></span></Tooltip>
          </Stack>
        )}
      </Box>

      {/* Sidebar: Formatting Panel (Desktop Only) */}
      {!isMobile && (
        <Box sx={{
          flex: '0 0 320px', // Don't grow, don't shrink, base width 320px
          p: 1,
          borderLeft: 1,
          borderColor: 'divider',
          overflowY: 'auto'
        }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
              >
                Carregar
                <input type="file" accept=".png,.jpg,.jpeg" hidden ref={imageInputRef} onChange={handleImageUpload} />
              </Button>
              <Button
                variant="outlined"
                onClick={onChangeBackgroundImage}
                fullWidth
              >
                Galeria
              </Button>
            </Box>
            <FormattingPanel
              selectedField={selectedField}
              fieldStyles={fieldStyles}
              initialFieldStyles={initialFieldStyles}
              setFieldStyles={setFieldStyles}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              csvHeaders={csvHeaders}
              brandElements={brandElements}
              setBrandElements={setBrandElements}
              pageTemplate={pageTemplate}
              setPageTemplate={setPageTemplate}
              onZIndexChange={onZIndexChange}
              onDeselectField={onDeselectField}
              onOpenHtmlEditor={onOpenHtmlEditor}
              standardsColors={standardsColors}
              fontScale={fontScale}
              templateFieldStyles={templateFieldStyles}
              activeStep={activeStep}
              isCropping={isCropping}
              setIsCropping={setIsCropping}
            />
          </Stack>
        </Box>
      )}

      {/* Mobile FAB and Drawer */}
      {isMobile && (
        <>
          <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }} onClick={() => {
            if (!selectedField) {
              setSelectedField(pageTemplate.images[0]?.id || null);
            }
            setIsDrawerOpen(true);
          }}><EditIcon /></Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            selectedField={selectedField}
            fieldStyles={fieldStyles}
            initialFieldStyles={initialFieldStyles}
            setFieldStyles={setFieldStyles}
            fieldPositions={fieldPositions}
            setFieldPositions={setFieldPositions}
            csvHeaders={csvHeaders}
            brandElements={brandElements}
            setBrandElements={setBrandElements}
            pageTemplate={pageTemplate}
            setPageTemplate={setPageTemplate}
            onZIndexChange={onZIndexChange}
            onDeselectField={onDeselectField}
            onOpenHtmlEditor={onOpenHtmlEditor}
            standardsColors={standardsColors}
            fontScale={fontScale}
            templateFieldStyles={templateFieldStyles}
            activeStep={activeStep}
            isCropping={isCropping}
            setIsCropping={setIsCropping}
          />
        </>
      )}
    </Box>
  );
};

export default ImageStep;
