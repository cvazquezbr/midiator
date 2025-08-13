import React from 'react';
import { Box, Container, Divider } from '@mui/material';
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
        <PersonaSection persona={persona} />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <AuthorSection author={autor} />
      </Box>

       <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <ColorPalette colors={uniqueColors} />
      </Box>

    </Container>
  );
};

export default MemorialDescritivo;
