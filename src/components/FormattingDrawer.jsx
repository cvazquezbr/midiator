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
  backgroundElement,
  setBackgroundElement,
  brandElements,
  setBrandElements,
  onZIndexChange,
  onDeselectField,
  onOpenHtmlEditor,
  isHtmlField,
  standardsColors,
  templateFieldStyles,
  activeStep,
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
          backgroundElement={backgroundElement}
          setBackgroundElement={setBackgroundElement}
          brandElements={brandElements}
          setBrandElements={setBrandElements}
          onZIndexChange={onZIndexChange}
          onDeselectField={onDeselectField}
          onOpenHtmlEditor={onOpenHtmlEditor}
          isHtmlField={isHtmlField}
          standardsColors={standardsColors}
          templateFieldStyles={templateFieldStyles}
          activeStep={activeStep}
        />
      </Box>
    </Drawer>
  );
};

export default FormattingDrawer;
