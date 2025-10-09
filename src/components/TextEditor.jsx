import React from 'react';
import AdvancedEditor from './AdvancedEditor';
import InlineEditor from './InlineEditor';
import { TextField, Box, Typography } from '@mui/material';

const TextEditor = ({ value, onChange, html = false, variant = 'full', ...props }) => {
  if (html) {
    if (variant === 'simple') {
      return <InlineEditor value={value} onChange={onChange} html={html} {...props} />;
    }
    return <AdvancedEditor value={value} onChange={onChange} html={html} {...props} />;
  }

  const characterCount = value ? value.length : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value)}
        multiline
        fullWidth
        variant="outlined"
        {...props}
        sx={{
          flexGrow: 1,
          '& .MuiInputBase-root': {
            height: '100%',
            alignItems: 'flex-start',
          },
          '& .MuiInputBase-input': {
            height: '100% !important',
            overflowY: 'auto !important',
          }
        }}
      />
      <Box sx={{ textAlign: 'right', py: 0.5, px: 1.5 }}>
        <Typography variant="caption" color="textSecondary">
          {characterCount} caracteres
        </Typography>
      </Box>
    </Box>
  );
};

export default TextEditor;