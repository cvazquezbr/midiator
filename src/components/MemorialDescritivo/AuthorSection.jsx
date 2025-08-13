import React from 'react';
import { Typography, Box } from '@mui/material';
import SectionCard from '../common/SectionCard';
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
        {isHtml && typeof value === 'string' ? <Typography component="div" variant="body1">{parse(value)}</Typography> : <Typography variant="body1">{value}</Typography>}
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
    <SectionCard>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        Definições do Autor
      </Typography>

      <DetailItem title="Identidade / Quem está falando?" value={identidade} />
      <DetailItem title="Descrição" value={descricao} isHtml={true} />
      <DetailItem title="Tipo de Autor" value={tipo} />
      <DetailItem title="Objetivo Estratégico" value={objetivoEstrategico} isHtml={true} />
      <DetailItem title="Objetivo de Engajamento" value={objetivoEngajamento} isHtml={true} />
      <DetailItem title="Domínio de Referência" value={dominioReferencia} />
      <DetailItem title="Site para Exclusão de Referência" value={siteExclusao} />

    </SectionCard>
  );
};

export default AuthorSection;
