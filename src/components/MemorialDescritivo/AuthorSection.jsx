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
      }}>
        {isHtml && typeof value === 'string' ? <Typography component="div" variant="body1">{parse(value)}</Typography> : <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</Typography>}
      </Box>
    </Box>
  );
};

const AuthorSection = ({ author }) => {
  if (!author) {
    return null;
  }

  const {
    identidade,
    descricao,
    tipo,
    objetivoEstrategico,
    objetivoEngajamento,
    dominioReferencia,
    siteExclusao,
  } = author;

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Definições do Autor
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        O autor representa a voz da nossa marca. Definir quem está falando, qual o seu tom e seus objetivos é crucial para construir uma identidade consistente e gerar confiança. Esta seção estabelece a personalidade da nossa comunicação.
      </Typography>

      <DetailItem title="Identidade / Quem está falando?" value={identidade} />
      <DetailItem title="Descrição" value={descricao} isHtml={true} />
      <DetailItem title="Tipo de Autor" value={tipo} />
      <DetailItem title="Objetivo Estratégico" value={objetivoEstrategico} isHtml={true} />
      <DetailItem title="Objetivo de Engajamento" value={objetivoEngajamento} isHtml={true} />
      <DetailItem title="Domínio de Referência" value={dominioReferencia} />
      <DetailItem title="Site para Exclusão de Referência" value={siteExclusao} />

    </Box>
  );
};

export default AuthorSection;
