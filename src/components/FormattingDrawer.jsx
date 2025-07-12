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
}) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 320, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Editar Campo</Typography>
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
        />
      </Box>
    </Drawer>
  );
};

export default FormattingDrawer;
