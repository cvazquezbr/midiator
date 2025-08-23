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
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';

const MyCampaignsStep = ({ onLoadCampaign, onEditCampaign, onCreateNew }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <Paper sx={{ p: { xs: 2, md: 4 }, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Minhas Campanhas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateNew}
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
          <List>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center' }}>
                Nenhuma campanha salva encontrada. Crie uma nova para começar.
              </Typography>
            ) : (
              campaigns.map((campaign) => (
                <React.Fragment key={campaign.id}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton edge="end" aria-label="edit" onClick={() => onEditCampaign(campaign)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(campaign.id, campaign.name)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                    disablePadding
                  >
                    <ListItemButton onClick={() => onLoadCampaign(campaign.id)}>
                      <ListItemText
                        primary={campaign.name}
                        secondary={`Atualizada em: ${new Date(campaign.updated_at).toLocaleString()}`}
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default MyCampaignsStep;
