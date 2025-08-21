import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Grid, Card,
  CardActionArea, CardMedia
} from '@mui/material';
import { Refresh, Upload } from '@mui/icons-material';
import { useUserAuth } from '../context/UserAuthContext';
import { findFolderByName, listFiles, getFileAsBlob, uploadFile, createFolder } from '../utils/googleApi';
import { toast } from 'sonner';

const BrandElementManager = ({ onElementSelect }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingImageId, setLoadingImageId] = useState(null);
  const { googleAccessToken } = useUserAuth(); // Only used to check for connection status
  const fileInputRef = React.useRef(null);

  const fetchBrandElements = useCallback(async () => {
    if (!googleAccessToken) {
      setError("Por favor, conecte-se com o Google para ver os elementos da marca.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const midiatorFolder = await findFolderByName('midiator');
      if (!midiatorFolder) {
        throw new Error("A pasta 'midiator' não foi encontrada no seu Google Drive.");
      }

      const elementosFolder = await findFolderByName('elementos', midiatorFolder.id);
      if (!elementosFolder) {
        // This is not an error, it just means there are no elements yet.
        setImages([]);
        console.log("Pasta 'elementos' não encontrada. Nenhum elemento para carregar.");
        return [];
      }

      const fileList = await listFiles(elementosFolder.id); // Corrected call
      const imageFiles = fileList.files.filter(file => file.mimeType.startsWith('image/'));

      const imagesWithLinks = imageFiles.map(file => ({
        id: file.id,
        name: file.name,
        url: `https://drive.google.com/uc?export=view&id=${file.id}`,
        thumbnailLink: file.thumbnailLink,
      }));

      setImages(imagesWithLinks);
      return imagesWithLinks;
    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      console.error("Error fetching brand elements:", err);
      return [];
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
      const blob = await getFileAsBlob(image.id); // Corrected call
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem (PNG, JPG).');
        return;
    }
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`O arquivo é muito grande. O tamanho máximo é de ${MAX_SIZE_MB}MB.`);
        return;
    }

    setIsLoading(true);
    setError(null);
    const toastId = toast.loading('Fazendo upload da imagem...');

    try {
        let midiatorFolder = await findFolderByName('midiator');
        if (!midiatorFolder) {
            toast.info("Criando pasta 'midiator' no seu Google Drive...");
            midiatorFolder = await createFolder('midiator');
        }

        let elementosFolder = await findFolderByName('elementos', midiatorFolder.id);
        if (!elementosFolder) {
            toast.info("Criando pasta 'elementos' no seu Google Drive...");
            elementosFolder = await createFolder('elementos', midiatorFolder.id);
        }

        const uploadedFile = await uploadFile(file, file.name, elementosFolder.id);
        if (!uploadedFile) {
            throw new Error("Falha no upload do arquivo.");
        }
        toast.success(`'${file.name}' foi enviado com sucesso!`, { id: toastId });

        const refreshedImages = await fetchBrandElements();

        const newImage = refreshedImages.find(img => img.id === uploadedFile.id);
        if (newImage) {
            setTimeout(() => handleSelect(newImage), 100);
        }

    } catch (err) {
        setError(`Falha no upload: ${err.message}`);
        toast.error(`Falha no upload: ${err.message}`, { id: toastId });
        console.error("Upload failed:", err);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          startIcon={<Upload />}
          size="small"
          variant="contained"
        >
          Upload
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept="image/png, image/jpeg"
            onChange={handleFileUpload}
          />
        </Button>
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
