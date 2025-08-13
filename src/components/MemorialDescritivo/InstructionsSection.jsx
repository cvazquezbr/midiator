import React from 'react';
import { Typography, Box } from '@mui/material';
import parse from 'html-react-parser';

const DetailItem = ({ title, value, isHtml = false }) => {
  if (!value) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" component="h4" color="primary.main" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{
        borderLeft: '3px solid',
        borderColor: 'primary.light',
        pl: 2,
        '& p, & li': { mb: 1.5 },
        '& ul, & ol': { pl: 2.5 },
        whiteSpace: 'pre-wrap'
      }}>
        {isHtml && typeof value === 'string' ? <Typography component="div" variant="body1">{parse(value)}</Typography> : <Typography variant="body1">{value}</Typography>}
      </Box>
    </Box>
  );
};


const InstructionsSection = ({ formato, instrucoes }) => {
  if (!formato && !instrucoes) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        Diretrizes de Geração
      </Typography>
      <DetailItem title="Formato do Conteúdo" value={formato} isHtml={true} />
      <DetailItem title="Instruções para a IA" value={instrucoes} isHtml={true} />
    </Box>
  );
};

export default InstructionsSection;
