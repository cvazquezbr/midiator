import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  CircularProgress,
  Alert,
  Box,
  Button,
  Typography,
  Divider,
  Container,
  Paper,
  Fab,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';
import CampaignCoverFlow from './CampaignCoverFlow';

const MyCampaignsStep = ({ onEditCampaign, onCreateNew }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState(null);

  useEffect(() => {
    if (swiperInstance && !swiperInstance.destroyed && swiperInstance.realIndex !== activeIndex) {
      swiperInstance.slideToLoop(activeIndex);
    }
  }, [activeIndex, swiperInstance]);

  const fetchCampaigns = () => {
    setLoading(true);
    setError('');
    getCampaigns()
      .then(data => {
        if (Array.isArray(data)) {
          setCampaigns(data);
        } else {
          console.error("MyCampaignsStep Error: API returned data, but it was not an array.", data);
          setCampaigns([]);
          setError("Received an invalid response from the server.");
        }
      })
      .catch(err => {
        console.error("MyCampaignsStep Error: Failed to fetch campaigns.", err);
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

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the campaign "${name}"?`)) {
      try {
        await deleteCampaign(id);
        toast.success(`Campaign "${name}" deleted.`);
        fetchCampaigns();
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <Container maxWidth={false} sx={{ maxWidth: '1200px', px: { xs: 1, sm: 2 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, mt: 4, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant={{ xs: 'h5', sm: 'h4' }} component="h1">
            Minhas Campanhas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateNew}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          >
            Nova Campanha
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Selecione uma campanha existente para carregar e continuar editando, ou crie uma nova.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <Box>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center' }}>
                Nenhuma campanha salva encontrada. Crie uma nova para começar.
              </Typography>
            ) : (
              <>
                <CampaignCoverFlow
                  campaigns={campaigns}
                  onEditCampaign={onEditCampaign}
                  onDeleteCampaign={handleDelete}
                  onSlideChange={setActiveIndex}
                  initialSlide={activeIndex}
                  onSwiper={setSwiperInstance}
                />
                <Divider sx={{ my: 4 }} />
                <Typography variant="h6" component="h3" sx={{ mb: 2, pl: { xs: 0, sm: 2 } }}>
                  Todas as Campanhas
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {campaigns.map((campaign, index) => (
                    <ListItemButton
                      key={campaign.id}
                      selected={index === activeIndex}
                      onClick={() => setActiveIndex(index)}
                    >
                      <ListItemText primary={campaign.name} secondary={`Atualizado em: ${new Date(campaign.updated_at).toLocaleDateString()}`} />
                      <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id, campaign.name); }}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={onCreateNew}
        >
          <AddIcon />
        </Fab>
      </Paper>
    </Container>
  );
};

export default MyCampaignsStep;
