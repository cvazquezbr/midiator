import React, { useState, useEffect, useRef } from 'react';
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
  // State for controlled components
  const [formData, setFormData] = useState({ name: '', description: '' });
  // Ref for the uncontrolled prompt_text field
  const promptTextRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (prompt) {
        setFormData({
          name: prompt.name || '',
          description: prompt.description || '',
        });
        // The defaultValue prop will handle setting the initial text for the ref'd component
      } else {
        setFormData({ name: '', description: '' });
      }
      // Clear errors when modal opens or prompt changes
      setErrors({});
    }
  }, [prompt, open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    // Get the value from the ref for validation
    if (!promptTextRef.current || !promptTextRef.current.value.trim()) {
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

    // Combine data from state (controlled fields) and ref (uncontrolled field)
    const finalFormData = {
      ...formData,
      prompt_text: promptTextRef.current.value,
    };

    try {
      await fetchWithAuth(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalFormData),
      });
      toast.success(`Prompt ${isEditing ? 'updated' : 'created'} successfully!`);
      onSave();
      onClose();
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
            // Use defaultValue to make it uncontrolled after initial render
            // The key forces a re-mount when a different prompt is opened
            key={prompt ? prompt.id : 'new'}
            defaultValue={prompt ? prompt.prompt_text : ''}
            inputRef={promptTextRef}
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
