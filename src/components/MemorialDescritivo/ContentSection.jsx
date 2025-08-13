import React from 'react';
import { Typography, Box, Paper } from '@mui/material';
import SectionCard from '../common/SectionCard';
import parse from 'html-react-parser';

const DetailItem = ({ title, value, isHtml = false, sx = {} }) => {
  if (!value) return null;
  return (
    <Box sx={{ mb: 3, ...sx }}>
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
        {isHtml && typeof value === 'string' ? <Typography component="div" variant="body1">{parse(value)}</Typography> : <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{value}</Typography>}
      </Box>
    </Box>
  );
};

const ContentSection = ({
  problema,
  solucao,
  campaignContent,
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
           {campaignContent.hashtags && campaignContent.hashtags.length > 0 &&
             <DetailItem title="Hashtags" value={campaignContent.hashtags.join(', ')} />
           }
        </SectionCard>
      )}

      {followupPosts && followupPosts.length > 0 && (
        <SectionCard>
          <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
            Posts de Acompanhamento
          </Typography>
          {followupPosts.map((post, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" component="h5" gutterBottom>
                    {post.titulo || `Post ${index + 1}`}
                </Typography>
                {post.conteudo && <Typography component="div" variant="body2" sx={{mb: 1}}>{parse(post.conteudo)}</Typography>}
                {post.cta && <Typography variant="caption" color="text.secondary">CTA: {post.cta}</Typography>}
            </Paper>
          ))}
        </SectionCard>
      )}
    </>
  );
};

export default ContentSection;
