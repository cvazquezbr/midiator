import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';

const Swatch = ({ color, onClick }) => (
  <Tooltip title={color.name || color.hex || color} placement="top">
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: color.hex || color,
        border: '1px solid #ddd',
        cursor: 'pointer',
        '&:hover': {
          transform: 'scale(1.1)',
          boxShadow: '0px 0px 5px rgba(0,0,0,0.3)',
        },
        transition: 'transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out',
      }}
      onClick={() => onClick(color.hex || color)}
    />
  </Tooltip>
);

const ColorSwatches = ({ title, palette, onColorSelect }) => {
  if (!palette || palette.length === 0) {
    return null;
  }

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="caption" display="block" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-start', mt: 1 }}>
        {palette.map((color, index) => (
          <Swatch key={index} color={color} onClick={onColorSelect} />
        ))}
      </Box>
    </Box>
  );
};

export default ColorSwatches;