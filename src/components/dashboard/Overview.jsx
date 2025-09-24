import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import {
  Visibility,
  AdsClick,
  ThumbUp,
  Comment,
  Share,
  TrendingUp,
  Percent
} from '@mui/icons-material';

const StatCard = ({ title, value, icon, loading }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      {loading ? (
        <>
          <Skeleton variant="rectangular" width={40} height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </>
      ) : (
        <>
          <Box sx={{ color: 'primary.main', mb: 1 }}>
            {icon}
          </Box>
          <Typography variant="h5" component="div">
            {value}
          </Typography>
          <Typography color="text.secondary">
            {title}
          </Typography>
        </>
      )}
    </CardContent>
  </Card>
);

const Overview = ({ data, loading }) => {
  // Adiciona um log para depuração, conforme solicitado.
  console.log({ overviewData: data });

  const {
    total_impressions,
    total_clicks,
    total_likes,
    total_comments,
    total_shares,
    avg_engagement_rate,
    avg_ctr
  } = data || {};

  const stats = [
    { title: "Total de Impressões", value: (Number(total_impressions) || 0).toLocaleString('pt-BR'), icon: <Visibility fontSize="large" />, loading },
    { title: "Total de Cliques", value: (Number(total_clicks) || 0).toLocaleString('pt-BR'), icon: <AdsClick fontSize="large" />, loading },
    { title: "Total de Likes", value: (Number(total_likes) || 0).toLocaleString('pt-BR'), icon: <ThumbUp fontSize="large" />, loading },
    { title: "Total de Comentários", value: (Number(total_comments) || 0).toLocaleString('pt-BR'), icon: <Comment fontSize="large" />, loading },
    { title: "Total de Compartilhamentos", value: (Number(total_shares) || 0).toLocaleString('pt-BR'), icon: <Share fontSize="large" />, loading },
    { title: "Taxa Média de Engajamento", value: `${(Number(avg_engagement_rate) * 100 || 0).toFixed(2)}%`, icon: <TrendingUp fontSize="large" />, loading },
    { title: "CTR Médio", value: `${(Number(avg_ctr) || 0).toFixed(2)}%`, icon: <Percent fontSize="large" />, loading },
  ];

  return (
    <Box>
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Overview;
