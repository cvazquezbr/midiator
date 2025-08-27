import React from 'react';
import InlineEditor from './InlineEditor';
import { TextField } from '@mui/material';

const TextEditor = ({ value, onChange, html = false, ...props }) => {
  if (html) {
    return <InlineEditor value={value} onChange={onChange} html={true} {...props} />;
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
