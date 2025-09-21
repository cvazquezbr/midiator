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


const InstructionsSection = ({ instrucoes }) => {
  if (!instrucoes) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Diretrizes de Geração
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        Aqui estão as regras técnicas e de estilo para a criação do conteúdo. Seguir estas diretrizes garante que a produção seja eficiente e que o resultado final esteja alinhado com a nossa estratégia de comunicação e com os requisitos da plataforma.
      </Typography>
      <DetailItem title="Instruções para a IA" value={instrucoes} isHtml={true} />
    </Box>
  );
};

export default InstructionsSection;
