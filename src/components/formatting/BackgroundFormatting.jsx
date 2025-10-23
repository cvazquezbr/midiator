import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore,
  Gradient,
} from '@mui/icons-material';
import BackgroundColorEditor from '../BackgroundColorEditor';


const BackgroundFormatting = ({
  pageTemplate,
  setPageTemplate,
  expandedPanel,
  handleAccordionChange,
  campaignSwatches,
  imagePalette,
}) => {
  return (
    <Accordion expanded={expandedPanel === 'backgroundColor'} onChange={handleAccordionChange('backgroundColor')}>
      <AccordionSummary expandIcon={<ExpandMore />}><Typography><Gradient sx={{ mr: 1, verticalAlign: 'middle' }} />Fundo da Página</Typography></AccordionSummary>
      <AccordionDetails>
        <BackgroundColorEditor
          pageTemplate={pageTemplate}
          onUpdate={setPageTemplate}
          colorPalette={campaignSwatches}
          imagePalette={imagePalette}
        />
      </AccordionDetails>
    </Accordion>
  );
};

export default BackgroundFormatting;
