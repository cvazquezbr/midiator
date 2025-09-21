import React from 'react';
import { Typography, Box } from '@mui/material';
import parse from 'html-react-parser';

const DetailItem = ({ title, value, isHtml = false }) => {
  if (!value) return null;

  const renderContent = () => {
    if (isHtml && typeof value === 'string') {
      return <Typography component="div" variant="body1">{parse(value)}</Typography>;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <pre style={{ fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</Typography>;
  };

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
        {renderContent()}
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
    descricaoGeral,
  } = author;

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Definições do Autor: {identidade}
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        O autor representa a voz da nossa marca. Definir quem está falando, qual o seu tom e seus objetivos é crucial para construir uma identidade consistente e gerar confiança. Esta seção estabelece a personalidade da nossa comunicação.
      </Typography>

      <DetailItem title="Descrição da Empresa" value={descricao} isHtml={true} />
      <DetailItem title="Tipo de Organização" value={tipo} />
      <DetailItem title="Objetivo Estratégico" value={objetivoEstrategico} isHtml={true} />
      <DetailItem title="Objetivo de Engajamento" value={objetivoEngajamento} isHtml={true} />
      <DetailItem title="Domínio de Referência" value={dominioReferencia} />
      <DetailItem title="Site para Exclusão de Referência" value={siteExclusao} />
      {descricaoGeral && <DetailItem title="Descrição Geral (gerada por IA)" value={descricaoGeral} />}
    </Box>
  );
};

export default AuthorSection;
