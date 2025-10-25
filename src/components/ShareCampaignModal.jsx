import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'sonner';

const ShareCampaignModal = ({ open, onClose, campaign }) => {
  const [email, setEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (open && campaign) {
      fetchSharedUsers();
    }
  }, [open, campaign]);

  const fetchSharedUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/share`);
      if (!response.ok) throw new Error('Failed to fetch shared users.');
      const data = await response.json();
      setSharedUsers(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!email) {
      toast.error('Please enter an email address.');
      return;
    }
    setSharing(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to share campaign.');
      toast.success(`Campaign shared with ${data.email}.`);
      setSharedUsers([...sharedUsers, data]);
      setEmail('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (userId) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_user_id: userId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke access.');
      }
      toast.success('Access revoked.');
      setSharedUsers(sharedUsers.filter(user => user.id !== userId));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share "{campaign?.name}"</DialogTitle>
      <DialogContent>
        <Typography variant="h6">Share with new user</Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Email Address"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sharing}
        />
        <Button onClick={handleShare} color="primary" disabled={sharing}>
          {sharing ? <CircularProgress size={24} /> : 'Share'}
        </Button>

        <Typography variant="h6" style={{ marginTop: '20px' }}>
          Shared with
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <List>
            {sharedUsers.map((user) => (
              <ListItem key={user.id}>
                <ListItemText primary={user.name} secondary={user.email} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRevoke(user.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareCampaignModal;
