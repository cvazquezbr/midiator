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
  steps,
  isDraggingOverImage,
  handleImageDrop,
  handleImageDragOver,
  handleImageDragEnter,
  handleImageDragLeave,
  imageInputRef,
  handleImageUpload,
  backgroundImage,
  onChangeBackgroundImage,
  csvHeaders,
  fieldPositions,
  setFieldPositions,
  fieldStyles,
  setFieldStyles,
  csvData,
  onImageDisplayedSizeChange,
  colorPalette,
  standardsColors,
  onCsvDataUpdate,
  originalImageSize,
  imageFilters,
  setImageFilters,
  brandElements,
  setBrandElements,
  onZIndexChange,
  isMobile,
  selectedField,
  setSelectedField,
  onDeselectField,
  onOpenHtmlEditor,
  isHtmlField,
  currentPreviewIndex,
  setCurrentPreviewIndex,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!backgroundImage) {
    return (
      <Card>
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
          <Typography variant="h5" gutterBottom sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 3
          }}>
            <ImageIcon />
            Imagem e Formatação
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} lg={6}>
              <Card
                sx={{
                  border: isDraggingOverImage ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                  backgroundColor: isDraggingOverImage ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  textAlign: 'center',
                  p: { xs: 1.5, sm: 2, md: 4 },
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)'
                  }
                }}
                onDrop={handleImageDrop}
                onDragOver={handleImageDragOver}
                onDragEnter={handleImageDragEnter}
                onDragLeave={handleImageDragLeave}
              >
                <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Arraste e solte ou clique para Upload de Imagem</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  PNG, JPG ou JPEG
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    component="label"
                    sx={{ borderRadius: 2 }}
                  >
                    Selecionar Imagem
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
                    sx={{ borderRadius: 2 }}
                    onClick={onChangeBackgroundImage}
                  >
                    Escolher da Galeria
                  </Button>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card sx={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.100',
                border: '2px dashed #d1d5db'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Visibility sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography color="text.secondary">Preview do Template</Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Button onClick={onChangeBackgroundImage} sx={{ mb: 2 }}>
        &larr; Alterar Imagem de Fundo
      </Button>
      <Grid container spacing={isMobile ? 0 : 2}>
        <Grid item xs={12} md={8}>
          <FieldPositioner
            backgroundImage={backgroundImage}
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
            onSelectFieldExternal={setSelectedField}
            originalImageSize={originalImageSize}
            imageFilters={imageFilters}
            setImageFilters={setImageFilters}
            brandElements={brandElements}
            setBrandElements={setBrandElements}
            onZIndexChange={onZIndexChange}
            onOpenHtmlEditor={onOpenHtmlEditor}
            currentPreviewIndex={currentPreviewIndex}
            setCurrentPreviewIndex={setCurrentPreviewIndex}
          />
        </Grid>
        {!isMobile ? (
          <Grid item xs={12} md={4}>
            <FormattingPanel
              selectedField={selectedField}
              fieldStyles={fieldStyles}
              setFieldStyles={setFieldStyles}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              csvHeaders={csvHeaders}
              imageFilters={imageFilters}
              setImageFilters={setImageFilters}
              brandElements={brandElements}
              setBrandElements={setBrandElements}
              onZIndexChange={onZIndexChange}
              onDeselectField={onDeselectField}
              onOpenHtmlEditor={onOpenHtmlEditor}
              isHtmlField={isHtmlField}
              standardsColors={standardsColors}
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
              setFieldStyles={setFieldStyles}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              csvHeaders={csvHeaders}
              imageFilters={imageFilters}
              setImageFilters={setImageFilters}
              brandElements={brandElements}
              setBrandElements={setBrandElements}
              onZIndexChange={onZIndexChange}
              onDeselectField={onDeselectField}
              onOpenHtmlEditor={onOpenHtmlEditor}
              isHtmlField={isHtmlField}
              standardsColors={standardsColors}
            />
          </>
        )}
      </Grid>
    </Box>
  );
};

export default ImageStep;
