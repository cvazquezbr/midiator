import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { useCampaign } from '../context/CampaignContext';
import { useUserAuth } from '../context/UserAuthContext';
import Campaign from '../components/Campaign';
import { toast } from 'sonner';

function HomePage() {
  const { campaignState, setCampaignState, createCampaign, cloneCampaign, fetchCampaigns, campaigns, loading, error } = useCampaign();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserAuth();

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (campaignId && campaigns.length > 0) {
      const selectedCampaign = campaigns.find(c => c.id === campaignId);
      if (selectedCampaign) {
        setCampaignState(selectedCampaign.data);
      } else {
        toast.error('Campanha não encontrada.');
        navigate('/');
      }
    }
  }, [campaignId, campaigns, setCampaignState, navigate]);

  const handleCreateCampaign = async () => {
    const newCampaignId = await createCampaign();
    if (newCampaignId) {
      navigate(`/campaigns/${newCampaignId}`);
    }
  };

  const handleCloneCampaign = async (sourceCampaignId) => {
    const newCampaignId = await cloneCampaign(sourceCampaignId);
    if (newCampaignId) {
      navigate(`/campaigns/${newCampaignId}`);
      toast.success('Campanha clonada com sucesso!');
    }
  };

  const handleSelectCampaign = (selectedCampaignId) => {
    if (selectedCampaignId) {
      navigate(`/campaigns/${selectedCampaignId}`);
    } else {
      setCampaignState({}); // Reset campaign state
      navigate('/');
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  if (!campaignId || !campaignState) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Bem-vindo, {user?.name || 'Usuário'}</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Selecione uma campanha para editar ou crie uma nova para começar.
        </Typography>
        <Button variant="contained" onClick={handleCreateCampaign} sx={{ mb: 2 }}>
          Criar Nova Campanha
        </Button>
        <Grid container spacing={2}>
          {campaigns.map(campaign => (
            <Grid item xs={12} sm={6} md={4} key={campaign.id}>
              <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{campaign.data.name || 'Campanha sem nome'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Atualizada em: {new Date(campaign.data.updatedAt?.seconds * 1000).toLocaleString()}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={() => handleSelectCampaign(campaign.id)}>
                    Abrir
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => handleCloneCampaign(campaign.id)}>
                    Clonar
                  </Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Suspense fallback={<CircularProgress />}>
      <Campaign
        campaignId={campaignId}
        onSelectCampaign={handleSelectCampaign}
        campaigns={campaigns}
      />
    </Suspense>
  );
}

export default HomePage;
