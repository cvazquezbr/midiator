import React from 'react';
import AdvancedEditor from './AdvancedEditor';
import { TextField } from '@mui/material';

const TextEditor = ({ value, onChange, html = false, ...props }) => {
  if (html) {
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
