import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Fab,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';
import CampaignCard from './CampaignCard';

const MyCampaignsStep = ({ onEditCampaign, onCreateNew }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [featuredCampaign, setFeaturedCampaign] = useState(null);
  const isMobile = useIsMobile();

  const fetchCampaigns = () => {
    setLoading(true);
    setError('');
    getCampaigns()
      .then(data => {
        if (Array.isArray(data)) {
          setCampaigns(data);
        } else {
          setCampaigns([]);
          setError("Received an invalid response from the server.");
        }
      })
      .catch(err => {
        setError(err.message || 'An unknown error occurred while fetching campaigns.');
        setCampaigns([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (campaigns.length > 0 && !featuredCampaign) {
      setFeaturedCampaign(campaigns[0]);
    }
  }, [campaigns, featuredCampaign]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the campaign "${name}"?`)) {
      try {
        await deleteCampaign(id);
        toast.success(`Campaign "${name}" deleted.`);
        fetchCampaigns(); // Refresh the list
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(to bottom, #444, #111)',
        padding: { xs: 2, md: 4 },
        minHeight: 'calc(100vh - 64px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" sx={{ color: '#fff' }}>
            Minhas Campanhas
          </Typography>
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateNew}
            >
              Nova Campanha
            </Button>
          )}
        </Box>
        <Typography variant="body1" sx={{ color: '#ccc', mb: 4 }}>
          Selecione uma campanha existente para carregar e continuar editando, ou crie uma nova.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress color="inherit" /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <Box>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center', color: '#fff' }}>
                Nenhuma campanha salva encontrada.
              </Typography>
            ) : isMobile ? (
              <Grid container spacing={2} justifyContent="center">
                {(campaigns || []).map((campaign) => (
                  <Grid item key={campaign.id} xs={6} sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CampaignCard
                      campaign={campaign}
                      onEditCampaign={onEditCampaign}
                      onDeleteCampaign={handleDelete}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  overflowX: 'auto',
                  gap: 4,
                  py: 2,
                  pb: 4,
                  '&::-webkit-scrollbar': { height: '8px' },
                  '&::-webkit-scrollbar-track': { background: '#222', borderRadius: '4px' },
                  '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' },
                  '&::-webkit-scrollbar-thumb:hover': { background: '#555' }
                }}
              >
                {(campaigns || []).map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onEditCampaign={onEditCampaign}
                    onDeleteCampaign={handleDelete}
                    onHover={setFeaturedCampaign}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={onCreateNew}
          >
            <AddIcon />
          </Fab>
        )}
      </Container>
      {!isMobile && featuredCampaign && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '60vh',
            backgroundImage: `url(${featuredCampaign.pageUrls?.[0] || ''})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1,
            transition: 'background-image 0.5s ease-in-out',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, #111 10%, rgba(17,17,17,0.7) 40%, rgba(17,17,17,0.3) 60%, transparent 100%)',
              zIndex: 2,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(8px)',
              zIndex: 1,
            }
          }}
        />
      )}
    </Box>
  );
};

export default MyCampaignsStep;