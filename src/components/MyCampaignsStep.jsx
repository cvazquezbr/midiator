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
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import { getCampaigns, deleteCampaign, loadCampaign } from '../utils/campaignState';
import { toast } from 'sonner';

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
        setCampaigns(data);
      })
      .catch(err => {
        setError(err.message);
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
              campaigns.map((campaign) => (
                <Card key={campaign.id} sx={{ mb: 2 }}>
                  <ListItemButton onClick={() => onLoadCampaign(campaign.id)} sx={{ p: 0 }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div">
                        {campaign.name}
                      </Typography>
                      <Typography sx={{ mb: 1.5 }} color="text.secondary">
                        Atualizada em: {new Date(campaign.updated_at).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </ListItemButton>
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <IconButton aria-label="edit" onClick={() => onEditCampaign(campaign)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton aria-label="delete" onClick={() => handleDelete(campaign.id, campaign.name)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              ))
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
