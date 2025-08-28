import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import { BarChart, Refresh, Info, Link as LinkIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { getCampaignPublications } from '../utils/campaignState';
import { getLinkedInShareStatistics, getLinkedInMemberPostStatistics } from '../utils/linkedinAPI';
import { useSettings } from '../context/SettingsContext';

const StatCard = ({ title, value, icon }) => (
  <Card sx={{ display: 'flex', alignItems: 'center', p: 2, height: '100%' }}>
    <Box sx={{ mr: 2, color: 'primary.main' }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="h6" component="div">
        {value}
      </Typography>
      <Typography color="text.secondary">
        {title}
      </Typography>
    </Box>
  </Card>
);

const Monitor = ({ currentCampaign }) => {
  const { settings } = useSettings();
  const [publications, setPublications] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPublications = useCallback(async () => {
    if (!currentCampaign?.id) {
      setError("Nenhuma campanha selecionada para monitorar.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const pubs = await getCampaignPublications(currentCampaign.id);
      setPublications(pubs);
      if (pubs.length === 0) {
        toast.info("Nenhuma publicação encontrada para esta campanha ainda.");
      }
    } catch (err) {
      toast.error(`Falha ao buscar publicações: ${err.message}`);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentCampaign]);

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  const handleFetchStats = async () => {
    if (publications.length === 0) {
      toast.warning("Nenhuma publicação para buscar estatísticas.");
      return;
    }

    const pubsByAuthor = publications.reduce((acc, pub) => {
      const authorUrn = pub.author_urn;
      if (authorUrn && pub.urn) {
        if (!acc[authorUrn]) {
          acc[authorUrn] = [];
        }
        acc[authorUrn].push(pub.urn);
      }
      return acc;
    }, {});

    if (Object.keys(pubsByAuthor).length === 0) {
      toast.info("Nenhuma publicação com autor válido encontrada para buscar estatísticas.");
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      let allStats = {};
      const fetchPromises = Object.entries(pubsByAuthor).map(async ([authorUrn, urns]) => {
        if (authorUrn.includes(':organization:')) {
          const results = await getLinkedInShareStatistics(settings.linkedin, authorUrn, urns);
          (results.elements || []).forEach(stat => {
            const urn = stat.share || stat.ugcPost || stat.carousel || stat.post;
            if (urn && stat.totalShareStatistics) {
              allStats[urn] = stat.totalShareStatistics;
            }
          });
        } else {
          // For personal authors, call the new endpoint for each post.
          const personalPostPromises = urns.map(async (urn) => {
            try {
              const result = await getLinkedInMemberPostStatistics(settings.linkedin, urn);
              // The response structure for member stats is different. We need to transform it.
              // This transformation is a best guess based on the API docs.
              if (result && result.elements && result.elements.length > 0) {
                const statsData = result.elements[0];
                allStats[result.urn] = {
                  impressionCount: statsData.totalImpressions?.count || 0,
                  likeCount: statsData.reactionSummaries?.LIKE || 0,
                  commentCount: statsData.totalComments?.count || 0,
                  shareCount: statsData.totalReshares?.count || 0,
                  clickCount: statsData.totalClicks?.count || 0,
                  engagement: statsData.engagementRate?.rate || 0,
                };
              }
            } catch (postError) {
                console.error(`Failed to fetch stats for personal post ${urn}:`, postError);
                toast.error(`Falha ao buscar estatísticas para o post ${urn.split(':').pop()}`);
            }
          });
          await Promise.all(personalPostPromises);
        }
      });

      await Promise.all(fetchPromises);

      setStats(allStats);
      toast.success("Estatísticas atualizadas com sucesso!");

    } catch (err) {
      toast.error(`Falha ao buscar estatísticas: ${err.message}`);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getAggregateStats = () => {
    const total = {
        clickCount: 0,
        commentCount: 0,
        impressionCount: 0,
        likeCount: 0,
        shareCount: 0,
    };
    Object.values(stats).forEach(stat => {
        total.clickCount += stat.clickCount || 0;
        total.commentCount += stat.commentCount || 0;
        total.impressionCount += stat.impressionCount || 0;
        total.likeCount += stat.likeCount || 0;
        total.shareCount += stat.shareCount || 0;
    });
    return total;
  };

  const aggregateStats = getAggregateStats();
  const selectedStats = selectedPublication ? stats[selectedPublication.urn] : null;

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart />
                Monitorar Campanha: {currentCampaign?.name || 'N/A'}
            </Typography>
            <Button
                variant="contained"
                onClick={handleFetchStats}
                disabled={isLoading || publications.length === 0}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            >
                {isLoading ? 'Atualizando...' : 'Atualizar Estatísticas'}
            </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={4}>
          {/* Coluna da Esquerda: Lista de Publicações */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Publicações</Typography>
            <Paper sx={{ height: '60vh', overflow: 'auto' }}>
              {isLoading && publications.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
              ) : (
                <List>
                  {publications.map((pub) => (
                    <ListItem
                      key={pub.id}
                      button
                      selected={selectedPublication?.id === pub.id}
                      onClick={() => setSelectedPublication(pub)}
                    >
                      <ListItemText
                        primary={pub.post_content?.titulo || 'Publicação sem título'}
                        secondary={`Agendado para: ${new Date(pub.scheduled_at).toLocaleString('pt-BR')}`}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            label={pub.status}
                            size="small"
                            color={
                                pub.status === 'published' ? 'success' :
                                pub.status === 'failed' ? 'error' :
                                'primary'
                            }
                            variant="outlined"
                        />
                        <Tooltip title={pub.linkedin_post_url ? "Ver no LinkedIn" : "Link indisponível"}>
                          <span>
                            <IconButton
                                component="a"
                                href={pub.linkedin_post_url || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                disabled={!pub.linkedin_post_url}
                                onClick={(e) => {
                                    if (!pub.linkedin_post_url) {
                                        e.preventDefault();
                                    }
                                    e.stopPropagation();
                                }}
                            >
                                <LinkIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Coluna da Direita: Estatísticas */}
          <Grid item xs={12} md={8}>
            <Box>
                <Typography variant="h6" gutterBottom>
                    {selectedPublication ? `Estatísticas de "${selectedPublication.post_content?.titulo}"` : 'Estatísticas Gerais da Campanha'}
                </Typography>

                {!selectedPublication && (
                    <Button size="small" onClick={() => setSelectedPublication(null)} disabled={!selectedPublication}>
                        Ver Totais da Campanha
                    </Button>
                )}

                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6} sm={4}><StatCard title="Impressões" value={selectedStats?.impressionCount ?? aggregateStats.impressionCount} /></Grid>
                    <Grid item xs={6} sm={4}><StatCard title="Cliques" value={selectedStats?.clickCount ?? aggregateStats.clickCount} /></Grid>
                    <Grid item xs={6} sm={4}><StatCard title="Likes" value={selectedStats?.likeCount ?? aggregateStats.likeCount} /></Grid>
                    <Grid item xs={6} sm={4}><StatCard title="Comentários" value={selectedStats?.commentCount ?? aggregateStats.commentCount} /></Grid>
                    <Grid item xs={6} sm={4}><StatCard title="Compart." value={selectedStats?.shareCount ?? aggregateStats.shareCount} /></Grid>
                    {selectedStats && (
                         <Grid item xs={6} sm={4}>
                            <StatCard title="Engajamento" value={`${((selectedStats.engagement || 0) * 100).toFixed(2)}%`} />
                        </Grid>
                    )}
                </Grid>

                {Object.keys(stats).length === 0 && !isLoading && (
                    <Alert severity="info" sx={{ mt: 3 }}>
                        Clique em "Atualizar Estatísticas" para carregar os dados de desempenho das publicações.
                    </Alert>
                )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default Monitor;
