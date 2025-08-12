import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
} from '@mui/material';
import {
  ImageIcon,
  Visibility,
} from '@mui/icons-material';

const ImageUploadStep = ({
  steps,
  isDraggingOverImage,
  handleImageDrop,
  handleImageDragOver,
  handleImageDragEnter,
  handleImageDragLeave,
  imageInputRef,
  handleImageUpload,
  backgroundImage,
}) => {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
        <Typography variant="h5" gutterBottom sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 3
        }}>
          <ImageIcon />
          {steps[3].label}
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} lg={6}>
            <Card
              sx={{
                border: isDraggingOverImage ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                backgroundColor: isDraggingOverImage ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                textAlign: 'center',
                p: { xs: 1.5, sm: 2, md: 4 },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(139, 92, 246, 0.05)'
                }
              }}
              onDrop={handleImageDrop}
              onDragOver={handleImageDragOver}
              onDragEnter={handleImageDragEnter}
              onDragLeave={handleImageDragLeave}
            >
              <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>Arraste e solte ou clique para Upload de Imagem</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                PNG, JPG ou JPEG
              </Typography>
              <Button
                variant="contained"
                component="label"
                sx={{ borderRadius: 2 }}
              >
                Selecionar Imagem
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  hidden
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                />
              </Button>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card sx={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'grey.100',
              border: backgroundImage ? 'none' : '2px dashed #d1d5db'
            }}>
              {backgroundImage ? (
                <img
                  src={backgroundImage}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 8
                  }}
                />
              ) : (
                <Box sx={{ textAlign: 'center' }}>
                  <Visibility sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography color="text.secondary">Preview do Template</Typography>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ImageUploadStep;
