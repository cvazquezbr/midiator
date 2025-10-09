import React from 'react';
import AdvancedEditor from './AdvancedEditor';
import InlineEditor from './InlineEditor';
import { TextField, Box, Typography } from '@mui/material';

// CORRECTED: The component now uses `content` and `onUpdate` as its primary props
// to avoid conflicts and align with a more explicit data flow.
// It internally maps these to the `value`/`onChange` props expected by the child editors.
const TextEditor = ({ content, onUpdate, html = false, variant = 'full', ...props }) => {
  if (html) {
    if (variant === 'simple') {
      // Pass the correct props down
      return <InlineEditor value={content} onChange={onUpdate} {...props} />;
    }
    // Pass the correct props down
    return <AdvancedEditor value={content} onChange={onUpdate} {...props} />;
  }

  const characterCount = content ? content.length : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TextField
        value={content}
        onChange={(e) => onUpdate(e.target.value)}
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