import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

const PageHeader = ({ title, children }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <Box>
          {children}
        </Box>
      </Box>
      <Divider />
    </Box>
  );
};

export default PageHeader;
