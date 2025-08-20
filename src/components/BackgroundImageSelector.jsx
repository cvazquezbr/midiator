import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  CircularProgress, Alert, Grid, Card, CardActionArea, CardMedia, Tabs, Tab, Divider
} from '@mui/material';
import { Refresh, Upload, CloudQueue } from '@mui/icons-material';
import { useUserAuth } from '../context/UserAuthContext';
import { findFolderByName, listFiles, getFileAsBlob, createFolder } from '../utils/googleApi';
import { toast } from 'sonner';

const BackgroundImageSelector = ({ open, onClose, onSelect, onLocalUpload }) => {
  const [tab, setTab] = useState(0);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingImageId, setLoadingImageId] = useState(null);
  const { googleAccessToken } = useUserAuth();
  const fileInputRef = useRef(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fetchBackgrounds = useCallback(async () => {
    if (!googleAccessToken) {
      setError("Por favor, conecte-se com o Google para ver os backgrounds.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let midiatorFolder = await findFolderByName('midiator', null, googleAccessToken);
      if (!midiatorFolder) {
        midiatorFolder = await createFolder('midiator', null, googleAccessToken);
      }

      let backgroundsFolder = await findFolderByName('backgrounds', midiatorFolder.id, googleAccessToken);
      if (!backgroundsFolder) {
        backgroundsFolder = await createFolder('backgrounds', midiatorFolder.id, googleAccessToken);
      }

      const fileList = await listFiles(backgroundsFolder.id, googleAccessToken);
      const imageFiles = fileList.files.filter(file => file.mimeType.startsWith('image/'));

      const imagesWithLinks = imageFiles.map(file => ({
        id: file.id,
        name: file.name,
        thumbnailLink: file.thumbnailLink,
      }));

      setImages(imagesWithLinks);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      console.error("Error fetching backgrounds:", err);
    } finally {
      setIsLoading(false);
    }
  }, [googleAccessToken]);

  useEffect(() => {
    if (open && tab === 0) { // Only fetch when the dialog is open and the Drive tab is active
      fetchBackgrounds();
    }
  }, [open, tab, fetchBackgrounds]);

  const handleSelect = async (image) => {
    if (!onSelect) return;
    setLoadingImageId(image.id);
    setError(null);
    try {
      const blob = await getFileAsBlob(image.id, googleAccessToken);
      const blobUrl = URL.createObjectURL(blob);
      onSelect(blobUrl);
      onClose(); // Close dialog on selection
    } catch (err) {
      setError(`Falha ao carregar imagem: ${err.message}`);
      toast.error(`Falha ao carregar imagem: ${err.message}`);
    } finally {
      setLoadingImageId(null);
    }
  };

  const handleLocalFileSelect = (file) => {
    if (!file) return;
    if (!onLocalUpload) return;

    onLocalUpload(file);
    onClose();
  };

  const handleFileChange = (event) => {
    handleLocalFileSelect(event.target.files[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    handleLocalFileSelect(event.dataTransfer.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Selecionar Imagem de Fundo</DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} centered>
            <Tab label="Google Drive" icon={<CloudQueue />} iconPosition="start" />
            <Tab label="Fazer Upload" icon={<Upload />} iconPosition="start" />
          </Tabs>
        </Box>
        <Divider />

        {/* Google Drive Tab */}
        <Box hidden={tab !== 0} sx={{ p: 3 }}>
          <Button onClick={fetchBackgrounds} disabled={isLoading || !googleAccessToken} startIcon={<Refresh />} size="small" sx={{ mb: 2 }}>
            Atualizar
          </Button>
          {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
          {error && <Alert severity="error">{error}</Alert>}
          {!googleAccessToken && !isLoading && <Alert severity="info">Conecte-se com sua conta Google para carregar imagens de fundo.</Alert>}
          {googleAccessToken && !isLoading && !error && images.length === 0 && (
            <Alert severity="info">Nenhuma imagem encontrada na pasta `midiator/backgrounds` do seu Google Drive.</Alert>
          )}
          {googleAccessToken && !isLoading && images.length > 0 && (
            <Grid container spacing={2}>
              {images.map((image) => (
                <Grid item xs={6} sm={4} md={3} key={image.id}>
                  <Card>
                    <CardActionArea onClick={() => handleSelect(image)} title={`Selecionar ${image.name}`} disabled={loadingImageId === image.id}>
                      {loadingImageId === image.id ? (
                        <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
                      ) : (
                        <CardMedia component="img" height="120" image={image.thumbnailLink} alt={image.name} sx={{ objectFit: 'cover' }} />
                      )}
                      <Typography variant="caption" display="block" sx={{ textAlign: 'center', p: 1 }} noWrap>{image.name}</Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Upload Tab */}
        <Box hidden={tab !== 1} sx={{ p: 3 }}>
            <Card
                sx={{
                  border: isDraggingOver ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                  backgroundColor: isDraggingOver ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  textAlign: 'center', p: 4, cursor: 'pointer', transition: 'all 0.3s ease',
                  '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(139, 92, 246, 0.05)' }
                }}
                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
              >
                <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Arraste e solte ou clique para Upload</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>PNG, JPG ou JPEG</Typography>
                <Button variant="contained" component="label">
                  Selecionar Arquivo
                  <input type="file" accept=".png,.jpg,.jpeg" hidden ref={fileInputRef} onChange={handleFileChange} />
                </Button>
            </Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BackgroundImageSelector;
