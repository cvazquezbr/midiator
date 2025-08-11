import React, { useRef, useEffect } from 'react';
import { Box, Typography, useTheme, Tooltip, IconButton } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';

const HtmlDisplayField = ({ title, htmlContent, onClick, placeholder, tooltip }) => {
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';
  const contentRef = useRef(null);

  const backgroundColor = darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  const decodeHtml = (html) => {
    if (typeof DOMParser === 'undefined') {
        // Fallback for environments without DOMParser (e.g., some server-side rendering)
        // This is a simple fallback and might not cover all cases.
        return html
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent;
  }

  useEffect(() => {
    if (contentRef.current) {
      const decodedContent = decodeHtml(htmlContent || '');
      contentRef.current.innerHTML = decodedContent;
    }
  }, [htmlContent]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        <Tooltip title={tooltip}>
          <IconButton size="small" sx={{ ml: 1 }}><InfoOutlined fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
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
          <div ref={contentRef} />
        ) : (
          <Typography color="textSecondary">{placeholder}</Typography>
        )}
      </Box>
    </Box>
  );
};

export default HtmlDisplayField;
