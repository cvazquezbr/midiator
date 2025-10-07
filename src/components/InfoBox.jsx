import React from 'react';
import { Tooltip, IconButton, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';

const InfoBox = ({ title, description }) => {
  const formattedDescription = (
    <div>
      <Typography variant="subtitle2" gutterBottom>{title}</Typography>
      {description.split('\n').map((line, index) => (
        <Typography key={index} variant="body2" paragraph sx={{ m: 0 }}>
          {line}
        </Typography>
      ))}
    </div>
  );

  return (
    <Tooltip title={formattedDescription} arrow placement="top">
      <IconButton size="small" sx={{ ml: 0.5 }}>
        <InfoOutlined fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default InfoBox;