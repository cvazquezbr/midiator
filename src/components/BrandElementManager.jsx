import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Grid, Card,
  CardActionArea, CardMedia
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useUserAuth } from '../context/UserAuthContext';
import { findFolderByName, listFiles, getFileAsBlob } from '../utils/googleApi';

const BrandElementManager = ({ onElementSelect }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingImageId, setLoadingImageId] = useState(null);
  const { googleAccessToken } = useUserAuth();

  const fetchBrandElements = useCallback(async () => {
    if (!googleAccessToken) {
      setError("Por favor, conecte-se com o Google para ver os elementos da marca.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const midiatorFolder = await findFolderByName('midiator', null, googleAccessToken);
      if (!midiatorFolder) {
        throw new Error("A pasta 'midiator' não foi encontrada no seu Google Drive.");
      }

      const elementosFolder = await findFolderByName('elementos', midiatorFolder.id, googleAccessToken);
      if (!elementosFolder) {
        throw new Error("A subpasta 'elementos' não foi encontrada dentro da pasta 'midiator'.");
      }

      const fileList = await listFiles(elementosFolder.id, googleAccessToken, 100);
      const imageFiles = fileList.files.filter(file => file.mimeType.startsWith('image/'));

      const imagesWithLinks = imageFiles.map(file => ({
        id: file.id,
        name: file.name,
        url: `https://drive.google.com/uc?export=view&id=${file.id}`,
        thumbnailLink: file.thumbnailLink,
      }));

      setImages(imagesWithLinks);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      console.error("Error fetching brand elements:", err);
    } finally {
      setIsLoading(false);
    }
  }, [googleAccessToken]);

  useEffect(() => {
    fetchBrandElements();
  }, [fetchBrandElements]);

  const handleSelect = async (image) => {
    if (!onElementSelect) return;
    setLoadingImageId(image.id);
    setError(null);

    try {
      const blob = await getFileAsBlob(image.id, googleAccessToken);
      const blobUrl = URL.createObjectURL(blob);

      const newElement = {
        id: `brand_${new Date().getTime()}`,
        gDriveId: image.id,
        url: blobUrl, // Use the blob URL
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
        <Button onClick={fetchBrandElements} disabled={isLoading || !googleAccessToken} startIcon={<Refresh />} size="small">
          Atualizar
        </Button>
      </Box>

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}

      {error && <Alert severity="error">{error}</Alert>}

      {!googleAccessToken && !isLoading && (
         <Alert severity="info">Conecte-se com sua conta Google para carregar os elementos da marca.</Alert>
      )}

      {googleAccessToken && !isLoading && !error && images.length === 0 && (
        <Alert severity="info">Nenhuma imagem encontrada na pasta `midiator/elementos` do seu Google Drive.</Alert>
      )}

      {googleAccessToken && !isLoading && images.length > 0 && (
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
