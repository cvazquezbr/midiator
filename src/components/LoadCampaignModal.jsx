import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';

const LoadCampaignModal = ({ open, onClose, onLoad, onEdit }) => {
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
    if (open) {
      fetchCampaigns();
    }
  }, [open]);

  const handleLoad = (id) => {
    onLoad(id);
    onClose();
  };

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

  const handleEdit = (campaign) => {
    onEdit(campaign);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Load Campaign
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <List>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center' }}>
                No saved campaigns found.
              </Typography>
            ) : (
              campaigns.map((campaign) => (
                <React.Fragment key={campaign.id}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(campaign)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(campaign.id, campaign.name)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                    disablePadding
                  >
                    <ListItemButton onClick={() => handleLoad(campaign.id)}>
                      <ListItemText
                        primary={campaign.name}
                        secondary={`Last updated: ${new Date(campaign.updated_at).toLocaleString()}`}
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadCampaignModal;
