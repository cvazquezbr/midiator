import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const HtmlDisplayField = ({ title, htmlContent, onClick, placeholder }) => {
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';

  const backgroundColor = darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Box
        onClick={onClick}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          cursor: 'pointer',
          minHeight: '100px',
          backgroundColor: backgroundColor,
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
      >
        {htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : (
          <Typography color="textSecondary">{placeholder}</Typography>
        )}
      </Box>
    </Box>
  );
};

export default HtmlDisplayField;
