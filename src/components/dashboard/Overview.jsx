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
  const {
    total_impressions = 0,
    total_clicks = 0,
    total_likes = 0,
    total_comments = 0,
    total_shares = 0,
    avg_engagement_rate = 0,
    avg_ctr = 0
  } = data || {};

  const stats = [
    { title: "Total de Impressões", value: (total_impressions || 0).toLocaleString('pt-BR'), icon: <Visibility fontSize="large" />, loading },
    { title: "Total de Cliques", value: (total_clicks || 0).toLocaleString('pt-BR'), icon: <AdsClick fontSize="large" />, loading },
    { title: "Total de Likes", value: (total_likes || 0).toLocaleString('pt-BR'), icon: <ThumbUp fontSize="large" />, loading },
    { title: "Total de Comentários", value: (total_comments || 0).toLocaleString('pt-BR'), icon: <Comment fontSize="large" />, loading },
    { title: "Total de Compartilhamentos", value: (total_shares || 0).toLocaleString('pt-BR'), icon: <Share fontSize="large" />, loading },
    { title: "Taxa Média de Engajamento", value: `${((avg_engagement_rate || 0) * 100).toFixed(2)}%`, icon: <TrendingUp fontSize="large" />, loading },
    { title: "CTR Médio", value: `${(avg_ctr || 0).toFixed(2)}%`, icon: <Percent fontSize="large" />, loading },
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
