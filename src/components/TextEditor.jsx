import React from 'react';
import AdvancedEditor from './AdvancedEditor';
import InlineEditor from './InlineEditor';
import { TextField } from '@mui/material';

const TextEditor = ({ value, onChange, html = false, variant = 'full', ...props }) => {
  if (html) {
    if (variant === 'simple') {
      return <InlineEditor value={value} onChange={onChange} html={html} {...props} />;
    }
    return <AdvancedEditor value={value} onChange={onChange} html={html} {...props} />;
  }

  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      multiline
      rows={10}
      fullWidth
      variant="outlined"
      {...props}
    />
  );
};

export default TextEditor;
