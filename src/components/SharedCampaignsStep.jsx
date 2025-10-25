import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Paper,
} from '@mui/material';
import { toast } from 'sonner';

const SharedCampaignsStep = ({ onEditCampaign }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSharedCampaigns = () => {
    setLoading(true);
    setError('');
    fetch('/api/campaigns/shared-with-me')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch shared campaigns.');
        }
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setCampaigns(data);
        } else {
          setCampaigns([]);
          setError("Received an invalid response from the server.");
        }
      })
      .catch(err => {
        setError(err.message || 'An unknown error occurred.');
        setCampaigns([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSharedCampaigns();
  }, []);

  return (
    <Box>
      <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, mt: 4 }}>
        <Typography variant={{ xs: 'h5', sm: 'h4' }} component="h1" gutterBottom>
          Campanhas Compartilhadas Comigo
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Estas são as campanhas que outros usuários compartilharam com você.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <Box>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center' }}>
                Nenhuma campanha foi compartilhada com você ainda.
              </Typography>
            ) : (
              <List>
                {campaigns.map((campaign) => (
                  <ListItemButton key={campaign.id} onClick={() => onEditCampaign(campaign)}>
                    <ListItemText
                      primary={campaign.name}
                      secondary={`Compartilhado por: ${campaign.owner_email} - Atualizado em: ${new Date(campaign.updated_at).toLocaleDateString()}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SharedCampaignsStep;
