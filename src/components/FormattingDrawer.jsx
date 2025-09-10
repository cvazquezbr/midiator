import React from 'react';
import { Drawer, Box, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import FormattingPanel from './FormattingPanel';

const FormattingDrawer = ({
  open,
  onClose,
  selectedField,
  setSelectedField, // <-- Add this
  fieldStyles,
  initialFieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders,
  brandElements,
  setBrandElements,
  pageTemplate, // <-- Add this
  setPageTemplate, // <-- Add this
  onZIndexChange,
  onOpenHtmlEditor,
  standardsColors,
  templateFieldStyles,
  activeStep,
  isCropping,
  setIsCropping,
  showImageLoaders,
  handleImageUpload,
  isUploading,
  onChangeBackgroundImage,
}) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1400 }}>
      <Box sx={{ width: 320, p: 2, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Editar Propriedades</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
        <FormattingPanel
          selectedField={selectedField}
          setSelectedField={setSelectedField} // <-- Pass it down
          fieldStyles={fieldStyles}
          initialFieldStyles={initialFieldStyles}
          setFieldStyles={setFieldStyles}
          fieldPositions={fieldPositions}
          setFieldPositions={setFieldPositions}
          csvHeaders={csvHeaders}
          brandElements={brandElements}
          setBrandElements={setBrandElements}
          pageTemplate={pageTemplate} // <-- Pass it down
          setPageTemplate={setPageTemplate} // <-- Pass it down
          onZIndexChange={onZIndexChange}
          onOpenHtmlEditor={onOpenHtmlEditor}
          standardsColors={standardsColors}
          templateFieldStyles={templateFieldStyles}
          activeStep={activeStep}
          isCropping={isCropping}
          setIsCropping={setIsCropping}
          showImageLoaders={showImageLoaders}
          handleImageUpload={handleImageUpload}
          isUploading={isUploading}
          onChangeBackgroundImage={onChangeBackgroundImage}
        />
      </Box>
    </Drawer>
  );
};

export default FormattingDrawer;
