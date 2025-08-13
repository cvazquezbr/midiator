import React from 'react';
import { Typography, Box } from '@mui/material';
import SectionCard from '../common/SectionCard';

const DetailItem = ({ title, value }) => {
  if (!value) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body1">
        {value}
      </Typography>
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
      <DetailItem title="Descrição" value={descricao} />
      <DetailItem title="Tipo de Autor" value={tipo} />
      <DetailItem title="Objetivo Estratégico" value={objetivoEstrategico} />
      <DetailItem title="Objetivo de Engajamento" value={objetivoEngajamento} />
      <DetailItem title="Domínio de Referência" value={dominioReferencia} />
      <DetailItem title="Site para Exclusão de Referência" value={siteExclusao} />

    </SectionCard>
  );
};

export default AuthorSection;
