import React from 'react';
import { Box, Container, Divider, Typography } from '@mui/material';
import Header from './Header';
import PersonaSection from './PersonaSection';
import AuthorSection from './AuthorSection';
import ContentSection from './ContentSection';
import InstructionsSection from './InstructionsSection';
import ColorPalette from './ColorPalette';

const MemorialDescritivo = ({ campaignData }) => {
  if (!campaignData) {
    return <p>Carregando dados da campanha...</p>;
  }

  const {
    problema,
    solucao,
    campaignContent,
    persona,
    autor,
    formato,
    instrucoes,
    aspectRatio,
    followupPosts,
    colors,
  } = campaignData;

  // In the new structure, `colors` is the primary array of color objects.
  // The old `colorPalette` and `campaignColors` are deprecated.
  const uniqueColors = colors || [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Header title="Memorial Descritivo da Campanha" />

      <Typography variant="body1" sx={{ my: 4, fontStyle: 'italic', color: 'text.secondary' }}>
        Este documento serve como a pedra angular para a criação e execução de todas as peças de comunicação desta campanha. Ele garante consistência, alinhamento estratégico e uma base sólida para que a equipe criativa possa desenvolver materiais que ressoem com o público-alvo e alcancem os objetivos de marketing definidos.
      </Typography>

      <Box sx={{ my: 4 }}>
        <PersonaSection persona={persona} />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <AuthorSection author={autor} />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <ContentSection
          problema={problema}
          solucao={solucao}
          campaignContent={campaignContent}
          aspectRatio={aspectRatio}
          followupPosts={followupPosts}
        />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <InstructionsSection formato={formato} instrucoes={instrucoes} />
      </Box>

       <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <ColorPalette colors={uniqueColors} />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Typography variant="body1" sx={{ my: 4, fontStyle: 'italic', color: 'text.secondary', textAlign: 'center' }}>
        Com este memorial, a equipe possui todas as diretrizes necessárias para uma execução de campanha coesa e de alto impacto. O sucesso da nossa comunicação depende do alinhamento a estes pilares.
      </Typography>

    </Container>
  );
};

export default MemorialDescritivo;
