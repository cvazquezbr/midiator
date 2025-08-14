import React from 'react';
import { Drawer, Box, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import FormattingPanel from './FormattingPanel';

const FormattingDrawer = ({
  open,
  onClose,
  selectedField,
  fieldStyles,
  setFieldStyles,
  fieldPositions,
  setFieldPositions,
  csvHeaders,
  imageFilters,
  setImageFilters,
  includeLogo,
  setIncludeLogo,
  includeEmpresa,
  setIncludeEmpresa,
  brandElements,
  setBrandElements
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
          setFieldStyles={setFieldStyles}
          fieldPositions={fieldPositions}
          setFieldPositions={setFieldPositions}
          csvHeaders={csvHeaders}
          imageFilters={imageFilters}
          setImageFilters={setImageFilters}
          includeLogo={includeLogo}
          setIncludeLogo={setIncludeLogo}
          includeEmpresa={includeEmpresa}
          setIncludeEmpresa={setIncludeEmpresa}
          brandElements={brandElements}
          setBrandElements={setBrandElements}
        />
      </Box>
    </Drawer>
  );
};

export default FormattingDrawer;
