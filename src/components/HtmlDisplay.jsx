import React from 'react';
import { Box, Paper } from '@mui/material';

const HtmlDisplay = ({ htmlContent }) => {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, height: '100%', overflowY: 'auto' }}>
      <Box
        className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </Paper>
  );
};

export default HtmlDisplay;