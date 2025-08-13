import React from 'react';
import { Card, CardContent } from '@mui/material';

const SectionCard = ({ children, elevation = 1, sx = {} }) => {
  return (
    <Card elevation={elevation} sx={{ mb: 4, borderRadius: 2, ...sx }}>
      <CardContent sx={{ p: 3 }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default SectionCard;
