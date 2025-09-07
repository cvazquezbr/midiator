import React from 'react';
import { Drawer, Box, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import FormattingPanel from './FormattingPanel';

const FormattingDrawer = ({
  open,
  onClose,
  selectedField,
  fieldStyles,
  initialFieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders,
  brandElements,
  setBrandElements,
  onZIndexChange,
  onDeselectField,
  onOpenHtmlEditor,
  standardsColors,
  templateFieldStyles,
  activeStep,
  isCropping,
  setIsCropping,
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
          fieldStyles={fieldStyles}
          initialFieldStyles={initialFieldStyles}
          setFieldStyles={setFieldStyles}
          fieldPositions={fieldPositions}
          setFieldPositions={setFieldPositions}
          csvHeaders={csvHeaders}
          brandElements={brandElements}
          setBrandElements={setBrandElements}
          onZIndexChange={onZIndexChange}
          onDeselectField={onDeselectField}
          onOpenHtmlEditor={onOpenHtmlEditor}
          standardsColors={standardsColors}
          templateFieldStyles={templateFieldStyles}
          activeStep={activeStep}
          isCropping={isCropping}
          setIsCropping={setIsCropping}
        />
      </Box>
    </Drawer>
  );
};

export default FormattingDrawer;
