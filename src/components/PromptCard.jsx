import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const PromptCard = ({ prompt, onEdit, onDelete }) => {
  return (
    <Card sx={{ mb: 2, width: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" component="div" sx={{ wordBreak: 'break-word' }}>
              {prompt.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, wordBreak: 'break-word' }}>
              {prompt.description}
            </Typography>
          </Box>
          <CardActions sx={{ p: 0, pl: 1 }}>
            <IconButton onClick={() => onEdit(prompt)} aria-label="edit">
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => onDelete(prompt.id, prompt.name)} aria-label="delete">
              <DeleteIcon />
            </IconButton>
          </CardActions>
        </Box>
      </CardContent>
    </Card>
  );
};

PromptCard.propTypes = {
  prompt: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default PromptCard;
