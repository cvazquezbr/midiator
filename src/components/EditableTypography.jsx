import React, { useState, useRef, useEffect } from 'react';
import { Typography, TextField, IconButton } from '@mui/material';
import { Edit, Save } from '@mui/icons-material';

const EditableTypography = ({ initialValue, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    onSave(value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      setIsEditing(false);
      setValue(initialValue);
    }
  };

  if (isEditing) {
    return (
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        variant="standard"
        size="small"
        sx={{ width: '100%' }}
      />
    );
  }

  return (
    <Typography
      variant="body1"
      sx={{ color: 'text.primary', cursor: 'pointer', width: '100%' }}
      onClick={() => setIsEditing(true)}
    >
      {value}
    </Typography>
  );
};

export default EditableTypography;
