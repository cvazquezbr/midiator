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
  backgroundElement,
  setBackgroundElement,
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

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<ImageIcon />}
        >
          Carregar Imagem
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            hidden
            ref={imageInputRef}
            onChange={handleImageUpload}
          />
        </Button>
        <Button
          variant="outlined"
          onClick={onChangeBackgroundImage}
        >
          Escolher da Galeria
        </Button>
      </Box>
      <Grid container spacing={isMobile ? 0 : 2}>
        <Grid item xs={12} md={8}>
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
            onZIndexChange={onZIndexChange}
            onOpenHtmlEditor={onOpenHtmlEditor}
            currentPreviewIndex={currentPreviewIndex}
            setCurrentPreviewIndex={setCurrentPreviewIndex}
            onFontScaleChange={setFontScale}
            isCropping={isCropping}
            setIsCropping={setIsCropping}
          />
        </Grid>
        {!isMobile ? (
          <Grid item xs={12} md={4}>
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
              fontScale={fontScale}
              templateFieldStyles={templateFieldStyles}
              activeStep={activeStep}
              isCropping={isCropping}
              setIsCropping={setIsCropping}
            />
          </Grid>
        ) : (
          <>
            <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => setIsDrawerOpen(true)}><EditIcon /></Fab>
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
