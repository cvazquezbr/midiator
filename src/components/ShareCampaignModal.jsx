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
  Chip,
  Box
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

      const successMessage = data.status === 'pending'
        ? `Invitation sent to ${data.email}.`
        : `Campaign shared with ${data.email}.`;
      toast.success(successMessage);

      // Use a more robust way to key the new item
      const newItem = { ...data, key: data.id || data.email };
      setSharedUsers([...sharedUsers, newItem]);
      setEmail('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (user) => {
    try {
      // Send `id` for accepted shares, `email` for pending ones
      const body = user.status === 'pending' ? { email: user.email } : { id: user.id };

      const response = await fetch(`/api/campaigns/${campaign.id}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke access.');
      }
      toast.success('Access revoked.');
      // Filter out the revoked user based on email (which is always present)
      setSharedUsers(sharedUsers.filter(u => u.email !== user.email));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share "{campaign?.name}"</DialogTitle>
      <DialogContent>
        <Box mb={3}>
          <Typography variant="h6">Share with a new user</Typography>
          <Typography variant="body2" color="textSecondary" mb={2}>
            If the user does not have an account, an invitation will be sent to their email.
          </Typography>
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
          <Button onClick={handleShare} color="primary" variant="contained" disabled={sharing} sx={{ mt: 1 }}>
            {sharing ? <CircularProgress size={24} /> : 'Share'}
          </Button>
        </Box>

        <Typography variant="h6" style={{ marginTop: '20px' }}>
          Already shared with
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <List>
            {sharedUsers.map((user) => (
              <ListItem key={user.email}> {/* Use email as key since it's always unique per campaign */}
                <ListItemText
                  primary={user.name || user.email}
                  secondary={user.name ? user.email : 'Invitation pending'}
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={user.status}
                    color={user.status === 'pending' ? 'warning' : 'success'}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRevoke(user)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {sharedUsers.length === 0 && (
                <Typography color="textSecondary">Not shared with anyone yet.</Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareCampaignModal;
