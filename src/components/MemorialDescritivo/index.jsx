import React from 'react';
import { Box, Container, Divider, Typography } from '@mui/material';
import Header from './Header';
import PersonaSection from './PersonaSection';
import AuthorSection from './AuthorSection';
import ContentSection from './ContentSection';
import InstructionsSection from './InstructionsSection';
import ColorPalette from './ColorPalette';
import GeneratedPagesSection from './GeneratedPagesSection';

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
    instrucoes,
    aspectRatio,
    followupPosts,
    colors,
    generatedPagesData,
    csvData,
  } = campaignData;

  // In the new structure, `colors` is the primary array of color objects.
  // The old `colorPalette` and `campaignColors` are deprecated.
  const uniqueColors = colors || [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Header title="Memorial Descritivo da Campanha" />
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Introdução
      </Typography>
      <Typography variant="body1" sx={{ my: 4, fontStyle: 'italic', color: 'text.secondary' }}>
        Este memorial descritivo constitui o documento estratégico fundamental para o planejamento, desenvolvimento e execução de todas as ações de comunicação da campanha tech.fattocs. Desenvolvido com base em pesquisa aprofundada do público-alvo e análise competitiva do mercado de tecnologia brasileiro, este guia estabelece os pilares conceituais, visuais e de conteúdo que garantirão a consistência da mensagem em todos os pontos de contato.
      </Typography>
      <Typography variant="body1" sx={{ my: 4, fontStyle: 'italic', color: 'text.secondary' }}>
        O objetivo principal deste documento é fornecer à equipe criativa e de execução um framework completo que assegure o alinhamento estratégico entre objetivos de negócio, necessidades do público-alvo e entrega de valor tangível. Cada elemento aqui descrito foi pensado para maximizar o impacto da comunicação junto aos CTOs e Heads de Engenharia, nosso público prioritário.
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
        <InstructionsSection instrucoes={instrucoes} />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <ColorPalette colors={uniqueColors} />
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ my: 4 }}>
        <GeneratedPagesSection pages={generatedPagesData} csvData={csvData} />
      </Box>

      <Divider sx={{ my: 6 }} />
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Conclusão
      </Typography>

      <Typography variant="body1" sx={{ my: 4, fontStyle: 'italic', color: 'text.secondary' }}>
        Este memorial descritivo estabelece as fundações estratégicas e operacionais para uma campanha de comunicação eficaz e impactante.
        Cada elemento foi cuidadosamente desenvolvido para garantir que nossa mensagem ressoe autenticamente com o destinatário, nosso público prioritário.
      </Typography>
      <Typography variant="body1" sx={{ my: 4, fontStyle: 'italic', color: 'text.secondary' }}>
        A implementação bem-sucedida destes guidelines resultará em uma comunicação consistente que não apenas informa, mas constrói relacionamentos duradouros com nossos prospects.
        O diferencial competitivo será comunicado de forma clara e compelling, posicionando a empresa como a parceira estratégica ideal para os propósitos estabelecidos.
      </Typography>
      <Typography variant="body1" sx={{ my: 4, fontStyle: 'italic', color: 'text.secondary' }}>
        O sucesso desta campanha dependerá do rigoroso alinhamento da equipe executora a estas diretrizes, garantindo que cada peça produzida contribua para o objetivo maior.
      </Typography>

    </Container>
  );
};

export default MemorialDescritivo;
