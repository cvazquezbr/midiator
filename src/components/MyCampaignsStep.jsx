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
  Typography,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Launch as LaunchIcon } from '@mui/icons-material';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';

const MyCampaignsStep = ({ onLoadCampaign, onEditCampaign }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCampaigns = () => {
    setLoading(true);
    setError('');
    getCampaigns()
      .then(data => {
        const sortedData = data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        setCampaigns(sortedData);
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
    if (window.confirm(`Tem certeza que deseja deletar a campanha "${name}"?`)) {
      try {
        await deleteCampaign(id);
        toast.success(`Campanha "${name}" deletada.`);
        fetchCampaigns(); // Refresh the list
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Minhas Campanhas
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <List>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center' }}>
                Nenhuma campanha salva encontrada. Comece criando uma nova campanha na próxima etapa!
              </Typography>
            ) : (
              campaigns.map((campaign) => (
                <React.Fragment key={campaign.id}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton edge="end" aria-label="load" onClick={() => onLoadCampaign(campaign.id)} title="Carregar Campanha">
                          <LaunchIcon />
                        </IconButton>
                        <IconButton edge="end" aria-label="edit" onClick={() => onEditCampaign(campaign)} title="Renomear Campanha">
                          <EditIcon />
                        </IconButton>
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(campaign.id, campaign.name)} title="Deletar Campanha">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                    disablePadding
                  >
                    <ListItemButton onClick={() => onLoadCampaign(campaign.id)}>
                      <ListItemText
                        primary={campaign.name}
                        secondary={`Última atualização: ${new Date(campaign.updated_at).toLocaleString()}`}
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default MyCampaignsStep;
