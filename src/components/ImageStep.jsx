import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  Fab,
} from '@mui/material';
import {
  Image as ImageIcon,
  Visibility,
  Edit as EditIcon,
  SkipPrevious,
  ArrowLeft,
  ArrowRight,
  SkipNext,
} from '@mui/icons-material';
import {
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
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
  backgroundElement,
  setBackgroundElement,
  pageStyle,
  setPageStyle,
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
  console.log('[ImageStep] props:', { backgroundElement, fieldStyles });
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
    <Box>
      <Grid container spacing={isMobile ? 2 : 4} sx={{ height: '100%' }}>
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="h6" sx={{ flexShrink: 0, textAlign: 'center' }}>
            Editor de Página
          </Typography>
          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0, // Allow shrinking
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              my: 2,
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
              backgroundElement={backgroundElement}
              setBackgroundElement={setBackgroundElement}
              pageStyle={pageStyle}
              setPageStyle={setPageStyle}
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
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ flexShrink: 0 }} flexWrap="wrap">
              <Tooltip title="Primeiro Registro"><span><IconButton onClick={handleFirstPreview} disabled={currentPreviewIndex === 0} size="small"><SkipPrevious /></IconButton></span></Tooltip>
              <Tooltip title="Registro Anterior"><span><IconButton onClick={handlePreviousPreview} disabled={currentPreviewIndex === 0} size="small"><ArrowLeft /></IconButton></span></Tooltip>
              <Typography variant="body2" sx={{ minWidth: '100px', textAlign: 'center' }}>Registro: {currentPreviewIndex + 1} / {csvData.length}</Typography>
              <Tooltip title="Próximo Registro"><span><IconButton onClick={handleNextPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><ArrowRight /></IconButton></span></Tooltip>
              <Tooltip title="Último Registro"><span><IconButton onClick={handleLastPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><SkipNext /></IconButton></span></Tooltip>
            </Stack>
          )}

        </Grid>

        {!isMobile ? (
          <Grid item xs={12} md={4}>
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
                backgroundElement={backgroundElement}
                setBackgroundElement={setBackgroundElement}
                onZIndexChange={onZIndexChange}
                onDeselectField={onDeselectField}
                onOpenHtmlEditor={onOpenHtmlEditor}
                standardsColors={standardsColors}
                pageStyle={pageStyle}
                setPageStyle={setPageStyle}
                fontScale={fontScale}
                templateFieldStyles={templateFieldStyles}
                activeStep={activeStep}
                isCropping={isCropping}
                setIsCropping={setIsCropping}
              />
            </Stack>
          </Grid>
        ) : (
          <>
            <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }} onClick={() => {
              if (!selectedField) {
                setSelectedField('__background__');
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
              backgroundElement={backgroundElement}
              setBackgroundElement={setBackgroundElement}
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
      </Grid>
    </Box>
  );
};

export default ImageStep;
