import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography
} from '@mui/material';

const SaveCampaignModal = ({ open, onClose, onSave, campaignToEdit = null, isSaving }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.name);
    } else {
      setName('');
    }
  }, [campaignToEdit, open]);

  const handleSave = () => {
    if (name.trim() && !isSaving) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{campaignToEdit ? 'Rename Campaign' : 'Save New Campaign'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {campaignToEdit
            ? `Enter a new name for the campaign "${campaignToEdit.name}".`
            : 'Please enter a name for your new campaign.'
          }
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          id="campaign-name"
          label="Campaign Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSave()}
          disabled={isSaving}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name.trim() || isSaving} variant="contained">
          {isSaving ? 'Saving...' : (campaignToEdit ? 'Rename' : 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveCampaignModal;
