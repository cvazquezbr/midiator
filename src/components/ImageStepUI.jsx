import React from 'react';
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
import { useCampaign } from '../context/CampaignContext';

const ImageStepUI = ({
  handleImageUpload,
  onOpenImageGallery,
  initialFieldStyles,
  onImageDisplayedSizeChange,
  colorPalette,
  imagePalette,
  onCsvDataUpdate,
  originalImageSize,
  onZIndexChange,
  isMobile,
  onOpenHtmlEditor,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  templateFieldStyles,
  activeStep,
  isDrawerOpen,
  setIsDrawerOpen,
  isCropping,
  setIsCropping,
  onFontScaleChange,
}) => {
  const {
    csvData,
    csvHeaders,
    fieldPositions, setFieldPositions,
    fieldStyles, setFieldStyles,
    brandElements, setBrandElements,
    pageTemplate, setPageTemplate,
    selectedField, setSelectedField,
    imageColorPalette,
  } = useCampaign();

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
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' }, 
      gap: { xs: 1, md: 2 }, 
      height: { xs: 'calc(100dvh - 120px)', md: 'calc(100vh - 130px)' },
      overflow: 'hidden',
    }}>

      {/* Main Content: Editor Area */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            flexShrink: 0, 
            textAlign: 'center', 
            my: { xs: 1, md: 2 },
            fontSize: { xs: '1.1rem', md: '1.25rem' },
          }}
        >
          Editor de Página
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 0.5, md: 1 },
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              '& > *': {
                maxWidth: '100%',
                maxHeight: '100%',
              }
            }}
          >
            <FieldPositioner
              csvHeaders={csvHeaders}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              fieldStyles={fieldStyles}
              setFieldStyles={setFieldStyles}
              csvData={csvData}
              onImageDisplayedSizeChange={onImageDisplayedSizeChange}
              colorPalette={imageColorPalette}
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
              onFontScaleChange={onFontScaleChange}
              isCropping={isCropping}
              setIsCropping={setIsCropping}
            />
          </Box>
        </Box>
        {imageColorPalette && imageColorPalette.length > 0 && (
          <Box sx={{ flexShrink: 0, py: 1, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            {imageColorPalette.map((color, index) => (
              <Box
                key={index}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: '2px solid #fff',
                  boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                  touchAction: 'manipulation',
                  '&:active': { transform: 'scale(0.95)' }
                }}
                onClick={() => {
                  if (selectedField) {
                    setFieldStyles(prev => ({
                      ...prev,
                      [selectedField]: {
                        ...(prev[selectedField] || {}),
                        color: color
                      }
                    }));
                  }
                }}
              />
            ))}
          </Box>
        )}
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
            <FormattingPanel
              colorPalette={colorPalette}
              imagePalette={imagePalette}
              showImageLoaders={true}
              handleImageUpload={handleImageUpload}
              onOpenImageGallery={onOpenImageGallery}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
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
              onOpenHtmlEditor={onOpenHtmlEditor}
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
              // If nothing is selected, default to selecting the page background for editing.
              setSelectedField('__page_background__');
            }
            // Always open the drawer.
            setIsDrawerOpen(true);
          }}><EditIcon /></Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
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
            onOpenHtmlEditor={onOpenHtmlEditor}
            templateFieldStyles={templateFieldStyles}
            activeStep={activeStep}
            isCropping={isCropping}
            setIsCropping={setIsCropping}
            showImageLoaders={true}
            handleImageUpload={handleImageUpload}
            onOpenImageGallery={onOpenImageGallery}
          />
        </>
      )}
    </Box>
  );
};

export default ImageStepUI;
