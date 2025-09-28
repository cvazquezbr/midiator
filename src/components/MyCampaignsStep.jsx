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
  Card,
  CardContent,
  CardActions,
  Fab,
  CardMedia,
  Grid,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, Image as ImageIcon } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';
import CampaignCard from './CampaignCard';

const MyCampaignsStep = ({ onLoadCampaign, onEditCampaign, onCreateNew, autorList, personaList }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

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
    <Box
      sx={{
        background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
        minHeight: 'calc(100vh - 64px)', // Adjust based on AppBar height
        py: 5,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" sx={{ color: 'white' }}>
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <Box>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center', color: 'white' }}>
                Nenhuma campanha salva encontrada. Crie uma nova para começar.
              </Typography>
            ) : (
              <Grid container spacing={{ xs: 2, md: 3 }}>
                {(campaigns || []).map((campaign) => (
                  <Grid item key={campaign.id} xs={4} sm={3} md={2}>
                    <CampaignCard
                      campaign={campaign}
                      onLoadCampaign={onLoadCampaign}
                      onEditCampaign={onEditCampaign}
                      onDeleteCampaign={handleDelete}
                    />
                  </Grid>
                ))}
              </Grid>
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
      </Container>
    </Box>
  );
};

export default MyCampaignsStep;
