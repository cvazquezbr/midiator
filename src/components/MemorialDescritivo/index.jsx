import React from 'react';
import { Box, Container, Divider } from '@mui/material';
import Header from './Header';
import PersonaSection from './PersonaSection';
import AuthorSection from './AuthorSection';
import ContentSection from './ContentSection';
import ColorPalette from './ColorPalette';

const MemorialDescritivo = ({ campaignData }) => {
  if (!campaignData) {
    return <p>Carregando dados da campanha...</p>;
  }

  const {
    problema,
    solucao,
    campaignContent,
    personaFields,
    autor,
    formato,
    aspectRatio,
    followupPosts,
    colorPalette,
    campaignColors
  } = campaignData;

  const combinedColors = [...(colorPalette || []), ...(campaignColors || [])];
  const uniqueColors = [...new Set(combinedColors)];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Header title="Memorial Descritivo da Campanha" />

      <Box sx={{ my: 4 }}>
        <ContentSection
          problema={problema}
          solucao={solucao}
          campaignContent={campaignContent}
          formato={formato}
          aspectRatio={aspectRatio}
          followupPosts={followupPosts}
        />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <PersonaSection persona={personaFields} />
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
