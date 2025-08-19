import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Grid, Card,
  CardActionArea, CardMedia
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import googleDriveAPI from '../utils/googleDriveAPI';

const BrandElementManager = ({ onElementSelect }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingImageId, setLoadingImageId] = useState(null);

  const fetchBrandElements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The new googleDriveAPI utility handles fetching the access token internally.
      // If it fails (e.g., user not authenticated, token revoked), it will throw an error.
      const midiatorFolder = await googleDriveAPI.findFolderByName('midiator');
      if (!midiatorFolder) {
        throw new Error("A pasta 'midiator' não foi encontrada no seu Google Drive.");
      }

      const elementosFolder = await googleDriveAPI.findFolderByName('elementos', midiatorFolder.id);
      if (!elementosFolder) {
        throw new Error("A subpasta 'elementos' não foi encontrada dentro da pasta 'midiator'.");
      }

      const fileList = await googleDriveAPI.listFiles(elementosFolder.id, 100);
      const imageFiles = fileList.files.filter(file => file.mimeType.startsWith('image/'));

      const imagesWithLinks = imageFiles.map(file => ({
        id: file.id,
        name: file.name,
        thumbnailLink: file.thumbnailLink,
      }));

      setImages(imagesWithLinks);
      if (imagesWithLinks.length === 0) {
        setError("Nenhuma imagem encontrada na pasta `midiator/elementos` do seu Google Drive.");
      }

    } catch (err) {
      // Catch errors, including auth errors from the new API utility
      setError(err.message || 'Ocorreu um erro desconhecido ao buscar os elementos.');
      console.error("Error fetching brand elements:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Attempt to fetch elements when the component mounts.
    fetchBrandElements();
  }, [fetchBrandElements]);

  const handleSelect = async (image) => {
    if (!onElementSelect) return;
    setLoadingImageId(image.id);
    setError(null);

    try {
      const blob = await googleDriveAPI.getFileAsBlob(image.id);
      const blobUrl = URL.createObjectURL(blob);

      const newElement = {
        id: `brand_${new Date().getTime()}`,
        gDriveId: image.id,
        url: blobUrl,
        x: 10, y: 10, width: 20, height: 20, rotation: 0,
        filters: {
          brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100,
        }
      };
      onElementSelect(newElement);

    } catch (err) {
      setError(`Falha ao carregar imagem: ${err.message}`);
    } finally {
      setLoadingImageId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button onClick={fetchBrandElements} disabled={isLoading} startIcon={<Refresh />} size="small">
          Atualizar
        </Button>
      </Box>

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}

      {error && <Alert severity="info">{error}</Alert>}

      {!isLoading && images.length > 0 && (
        <Grid container spacing={2}>
          {images.map((image) => (
            <Grid item xs={6} sm={4} key={image.id}>
              <Card>
                <CardActionArea onClick={() => handleSelect(image)} title={`Adicionar ${image.name}`} disabled={loadingImageId === image.id}>
                  {loadingImageId === image.id ? (
                    <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <CardMedia
                      component="img"
                      height="100"
                      image={image.thumbnailLink}
                      alt={image.name}
                      sx={{ objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <Typography variant="caption" display="block" sx={{ textAlign: 'center', p: 1 }} noWrap>
                    {image.name}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default BrandElementManager;
