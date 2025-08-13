import React from 'react';
import { Typography, Box, Divider } from '@mui/material';
import SectionCard from '../common/SectionCard';
import CategoryAccordion from '../common/CategoryAccordion';
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
        '& p': { mb: 1.5 },
        '& ul, & ol': { pl: 2.5 },
      }}>
        {isHtml ? <Typography component="div" variant="body1">{parse(value)}</Typography> : <Typography variant="body1">{value}</Typography>}
      </Box>
    </Box>
  );
};

const ContentSection = ({
  problema,
  solucao,
  campaignContent,
  formato,
  aspectRatio,
  followupPosts
}) => {
  const hasCampaignContent = campaignContent && (campaignContent.titulo || campaignContent.conteudo || campaignContent.cta);

  return (
    <>
      <SectionCard>
        <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
          Diretrizes da Campanha
        </Typography>
        <DetailItem title="Problema / Dor" value={problema} />
        <DetailItem title="Solução / Proposta" value={solucao} />
        <DetailItem title="Formato" value={formato} />
        <DetailItem title="Proporção" value={aspectRatio} />
      </SectionCard>

      {hasCampaignContent && (
        <SectionCard>
          <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
            Conteúdo Principal Gerado
          </Typography>
          <DetailItem title="Título" value={campaignContent.titulo} />
          <DetailItem title="Conteúdo" value={campaignContent.conteudo} isHtml={true} />
          <DetailItem title="Call to Action (CTA)" value={campaignContent.cta} />
        </SectionCard>
      )}

      {followupPosts && followupPosts.length > 0 && (
        <SectionCard>
          <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
            Posts de Acompanhamento
          </Typography>
          {followupPosts.map((post, index) => (
            <CategoryAccordion key={index} title={post.titulo || `Post ${index + 1}`}>
              <Box>
                {post.conteudo && <Typography component="div">{parse(post.conteudo)}</Typography>}
              </Box>
            </CategoryAccordion>
          ))}
        </SectionCard>
      )}
    </>
  );
};

export default ContentSection;
