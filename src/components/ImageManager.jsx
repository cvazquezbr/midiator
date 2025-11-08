import React from 'react';
import { Box, List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton, Typography, Tooltip, Button } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

const ImageManager = ({ pageTemplate, setPageTemplate, setSelectedField, selectedField, onImageUpload }) => {
  const handleSelectImage = (imageId) => {
    setSelectedField(imageId);
  };

  const handleDeleteImage = (imageId) => {
    setPageTemplate(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId),
    }));
    // If the deleted image was selected, deselect it.
    if (selectedField === imageId) {
      setSelectedField(null);
    }
  };

  if (!pageTemplate?.images || pageTemplate.images.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary" align="center">
        Nenhuma imagem na página.
      </Typography>
    );
  }

  return (
    <Box>
      <List dense>
        {pageTemplate?.images.map((image, index) => (
          <ListItem
            key={image.id}
            secondaryAction={
              <Box>
                <Tooltip title="Editar">
                  <IconButton edge="end" aria-label="edit" onClick={() => handleSelectImage(image.id)}>
                    <Edit />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteImage(image.id)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
              </Box>
            }
            selected={selectedField === image.id}
            sx={{
              border: selectedField === image.id ? '2px solid' : '1px solid',
              borderColor: selectedField === image.id ? 'primary.main' : 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemAvatar>
              <Avatar src={image.src} variant="rounded" />
            </ListItemAvatar>
            <ListItemText primary={`Imagem ${index + 1}`} secondary={`ID: ${image.id.substring(0, 8)}...`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ImageManager;
