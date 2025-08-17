import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Grid, Card,
  CardActionArea, CardMedia, Dialog, DialogTitle, DialogContent, IconButton
} from '@mui/material';
import { Refresh, Google, Close as CloseIcon } from '@mui/icons-material';
import googleDriveAPI from '../utils/googleDriveAPI';
import GoogleAuthSetup from './GoogleAuthSetup'; // Import the auth setup component

const BrandElementManager = ({ onElementSelect }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(googleDriveAPI.isUserSignedIn());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadingImageId, setLoadingImageId] = useState(null); // To show loader on specific image

  const fetchBrandElements = useCallback(async () => {
    if (!googleDriveAPI.isInitialized()) {
      setError("A API do Google Drive não foi inicializada. Por favor, configure-a na aba 'Google Drive' das configurações.");
      setIsConnected(false);
      return;
    }
    if (!googleDriveAPI.isUserSignedIn()) {
      setIsConnected(false);
      setError("Por favor, conecte-se ao Google Drive para ver os elementos da marca.");
      return;
    }
    setIsConnected(true);
    setIsLoading(true);
    setError(null);
    try {
      // 1. Find the 'midiator' folder
      const midiatorFolder = await googleDriveAPI.findFolderByName('midiator');
      if (!midiatorFolder) {
        throw new Error("A pasta 'midiator' não foi encontrada no seu Google Drive.");
      }

      // 2. Find the 'elementos' subfolder
      const elementosFolder = await googleDriveAPI.findFolderByName('elementos', midiatorFolder.id);
      if (!elementosFolder) {
        throw new Error("A subpasta 'elementos' não foi encontrada dentro da pasta 'midiator'.");
      }

      // 3. List image files in the 'elementos' folder
      const fileList = await googleDriveAPI.listFiles(elementosFolder.id, 100); // Fetch up to 100 items

      const imageFiles = fileList.files.filter(file => file.mimeType.startsWith('image/'));

      // 4. For each image, get a web-viewable link.
      const imagesWithLinks = imageFiles.map(file => ({
        id: file.id,
        name: file.name,
        // This is a direct download link, which might require CORS handling.
        // For display, webContentLink is often better if available, or construct a thumbnail link.
        url: `https://drive.google.com/uc?export=view&id=${file.id}`,
        thumbnailLink: file.thumbnailLink, // Google Drive API can provide this
      }));

      setImages(imagesWithLinks);

    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      console.error("Error fetching brand elements:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check connection status on mount
    setIsConnected(googleDriveAPI.isUserSignedIn());
    if (googleDriveAPI.isUserSignedIn()) {
      fetchBrandElements();
    } else {
      setError("Conecte-se ao Google Drive para carregar elementos da marca.");
    }
  }, [fetchBrandElements]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setIsConnected(true);
    setError(null);
    fetchBrandElements();
  };

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
      {isConnected && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button onClick={fetchBrandElements} disabled={isLoading} startIcon={<Refresh />} size="small">
            Atualizar
          </Button>
        </Box>
      )}

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}

      {error && <Alert severity={isConnected ? "error" : "info"}>{error}</Alert>}

      {!isConnected && !isLoading && (
        <Button
          variant="contained"
          startIcon={<Google />}
          onClick={() => setShowAuthModal(true)}
          fullWidth
        >
          Conectar ao Google Drive
        </Button>
      )}

      {isConnected && !isLoading && !error && images.length === 0 && (
        <Alert severity="info">Nenhuma imagem encontrada na pasta `midiator/elementos`.</Alert>
      )}

      {isConnected && !isLoading && images.length > 0 && (
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
                      image={image.thumbnailLink} // Always prefer thumbnailLink for previews
                      alt={image.name}
                      sx={{ objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }} // Hide if thumbnail fails
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

      <Dialog open={showAuthModal} onClose={() => setShowAuthModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Configuração Google Drive
          <IconButton onClick={() => setShowAuthModal(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <GoogleAuthSetup onAuthSuccess={handleAuthSuccess} onAuthError={(err) => setError(err.message)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BrandElementManager;
