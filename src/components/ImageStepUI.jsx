import React, { useState } from 'react';
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
  onCsvDataUpdate,
  originalImageSize,
  onZIndexChange,
  isMobile,
  onOpenHtmlEditor,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  activeStep,
  handleImageUpload,
}) => {
  const { campaignState, setCampaignState, isCampaignLoading } = useCampaign();

  console.log('%c[ImageStepUI] Rendering with campaignState:', 'color: brown; font-weight: bold;', { campaignState });

  const {
    csvData,
    csvHeaders,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    selectedField,
    imageColorPalette,
    initialFieldStyles,
    templateFieldStyles,
    fontScale,
  } = campaignState;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  if (isLoading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>
                Carregando...
            </Typography>
        </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, height: { xs: 'calc(100dvh - 140px)', md: 'calc(100vh - 150px)' } }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography variant="h6" sx={{ flexShrink: 0, textAlign: 'center', my: 2 }}>
          Editor de Página
        </Typography>
        {csvData && csvData.length > 0 && pageTemplate && fieldPositions && fieldStyles ? (
          <>
            <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', p: 1 }}>
              <FieldPositioner
                csvHeaders={csvHeaders}
                fieldPositions={fieldPositions}
                setFieldPositions={(value) => setCampaignState({ fieldPositions: value })}
                fieldStyles={fieldStyles}
                setFieldStyles={(value) => setCampaignState({ fieldStyles: value })}
                csvData={csvData}
                onImageDisplayedSizeChange={onImageDisplayedSizeChange}
                colorPalette={imageColorPalette}
                onCsvDataUpdate={onCsvDataUpdate}
                selectedField={selectedField}
                setSelectedField={(value) => setCampaignState({ selectedField: value })}
                originalImageSize={originalImageSize}
                brandElements={brandElements}
                setBrandElements={(value) => setCampaignState({ brandElements: value })}
                pageTemplate={pageTemplate}
                setPageTemplate={(value) => setCampaignState({ pageTemplate: value })}
                onZIndexChange={onZIndexChange}
                onOpenHtmlEditor={onOpenHtmlEditor}
                currentPreviewIndex={currentPreviewIndex}
                setCurrentPreviewIndex={setCurrentPreviewIndex}
                onFontScaleChange={(value) => setCampaignState({ fontScale: value })}
                isCropping={isCropping}
                setIsCropping={setIsCropping}
              />
            </Box>
            {imageColorPalette && imageColorPalette.length > 0 && (
              <Box sx={{ flexShrink: 0, py: 1, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                {imageColorPalette.map((color, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 28, height: 28, borderRadius: '50%', backgroundColor: color, cursor: 'pointer',
                      border: '2px solid #fff', boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                    }}
                    onClick={() => {
                      if (selectedField) {
                        setCampaignState({
                          fieldStyles: {
                            ...fieldStyles,
                            [selectedField]: { ...(fieldStyles[selectedField] || {}), color: color }
                          }
                        });
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
              showImageLoaders={true}
              handleImageUpload={handleImageUpload}
              onOpenImageGallery={onOpenImageGallery}
              selectedField={selectedField}
              setSelectedField={(value) => setCampaignState({ selectedField: value })}
              fieldStyles={fieldStyles}
              initialFieldStyles={initialFieldStyles}
              setFieldStyles={(value) => setCampaignState({ fieldStyles: value })}
              fieldPositions={fieldPositions}
              setFieldPositions={(value) => setCampaignState({ fieldPositions: value })}
              csvHeaders={csvHeaders}
              brandElements={brandElements}
              setBrandElements={(value) => setCampaignState({ brandElements: value })}
              pageTemplate={pageTemplate}
              setPageTemplate={(value) => setCampaignState({ pageTemplate: value })}
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

      {isMobile && (
        <>
          <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }} onClick={() => {
            if (!selectedField) {
              setCampaignState({ selectedField: '__page_background__' });
            }
            setIsDrawerOpen(true);
          }}><EditIcon /></Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            selectedField={selectedField}
            setSelectedField={(value) => setCampaignState({ selectedField: value })}
            fieldStyles={fieldStyles}
            initialFieldStyles={initialFieldStyles}
            setFieldStyles={(value) => setCampaignState({ fieldStyles: value })}
            fieldPositions={fieldPositions}
            setFieldPositions={(value) => setCampaignState({ fieldPositions: value })}
            csvHeaders={csvHeaders}
            brandElements={brandElements}
            setBrandElements={(value) => setCampaignState({ brandElements: value })}
            pageTemplate={pageTemplate}
            setPageTemplate={(value) => setCampaignState({ pageTemplate: value })}
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