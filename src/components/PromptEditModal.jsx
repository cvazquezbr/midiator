import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import { toast } from 'sonner';
import fetchWithAuth from '../utils/fetchWithAuth';

const PromptEditModal = ({ open, onClose, onSave, prompt }) => {
  const [formData, setFormData] = useState({ name: '', description: '', prompt_text: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name || '',
        description: prompt.description || '',
        prompt_text: prompt.prompt_text || '',
      });
    } else {
      setFormData({ name: '', description: '', prompt_text: '' });
    }
    // Clear errors when modal opens or prompt changes
    setErrors({});
  }, [prompt, open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!formData.prompt_text.trim()) {
      newErrors.prompt_text = 'Prompt text is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    const isEditing = prompt && prompt.id;
    const url = isEditing ? `/api/prompts/${prompt.id}` : '/api/prompts';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      await fetchWithAuth(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      toast.success(`Prompt ${isEditing ? 'updated' : 'created'} successfully!`);
      onSave(); // This will trigger a refresh in the parent
      onClose(); // Close the modal
    } catch (error) {
      toast.error(`Failed to save prompt: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{prompt ? 'Edit Prompt' : 'Add New Prompt'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            disabled={loading}
          />
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            margin="dense"
            id="prompt_text"
            name="prompt_text"
            label="Prompt Text"
            type="text"
            fullWidth
            multiline
            rows={15}
            variant="outlined"
            value={formData.prompt_text}
            onChange={handleChange}
            error={!!errors.prompt_text}
            helperText={errors.prompt_text}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} color="secondary" disabled={loading}>
            Cancel
          </Button>
          <Box sx={{ position: 'relative' }}>
            <Button type="submit" variant="contained" disabled={loading}>
              Save
            </Button>
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
};

PromptEditModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  prompt: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    description: PropTypes.string,
    prompt_text: PropTypes.string,
  }),
};

PromptEditModal.defaultProps = {
  prompt: null,
};

export default PromptEditModal;
