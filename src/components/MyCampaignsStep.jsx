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
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, Image as ImageIcon } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';
import CampaignCard from './CampaignCard';

const MyCampaignsStep = ({ onEditCampaign, onCreateNew, autorList, personaList }) => {
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
              <Grid container spacing={4}>
                {(campaigns || []).map((campaign) => (
                  <Grid item key={campaign.id} xs={12} sm={6} md={4}>
                    <CampaignCard
                      campaign={campaign}
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
      </Paper>
    </Container>
  );
};

export default MyCampaignsStep;
