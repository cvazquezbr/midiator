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
  Card,
  CardContent,
  CardActions,
  Fab,
  CardMedia,
  Grid,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';
import CampaignCoverFlow from './CampaignCoverFlow'; // Import the new component
import CampaignCard from './CampaignCard'; // Keep for the list view or future use

const MyCampaignsStep = ({ onEditCampaign, onCreateNew }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0); // State for the active slide
  const [swiperInstance, setSwiperInstance] = useState(null); // State for Swiper instance
  const isMobile = useIsMobile();

  // Effect to sync list clicks to the Swiper instance
  useEffect(() => {
    if (swiperInstance && swiperInstance.realIndex !== activeIndex) {
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
          // This case handles successful requests that return non-array data, which is unexpected.
          console.error("MyCampaignsStep Error: API returned data, but it was not an array.", data);
          // Set campaigns to an empty array to prevent the .map() call from crashing.
          setCampaigns([]);
          // Inform the user that something went wrong.
          setError("Received an invalid response from the server.");
        }
      })
      .catch(err => {
        // This case handles failed requests (e.g., network errors, 500 status codes).
        console.error("MyCampaignsStep Error: Failed to fetch campaigns.", err);
        setError(err.message || 'An unknown error occurred while fetching campaigns.');
        // Ensure campaigns is an empty array on error to prevent crashes.
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
        fetchCampaigns(); // Refresh the list
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: { xs: 2, md: 4 }, mt: 4, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} component="h1">
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
                  isMobile={isMobile}
                />
                <Divider sx={{ my: 4 }} />
                <Typography variant="h6" component="h3" sx={{ mb: 2, pl: 2 }}>
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
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(campaign.id, campaign.name)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="add"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
            onClick={onCreateNew}
          >
            <AddIcon />
          </Fab>
        )}
      </Paper>
    </Container>
  );
};

export default MyCampaignsStep;
