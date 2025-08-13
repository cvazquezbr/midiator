import React from 'react';
import { Chip } from '@mui/material';

const InfoChip = ({ label }) => {
  return (
    <Chip
      label={label}
      variant="outlined"
      size="small"
      sx={{ mr: 1, mb: 1 }}
    />
  );
};

export default InfoChip;
