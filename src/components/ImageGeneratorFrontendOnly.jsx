import React, { useState, useRef, useEffect } from 'react';
import ProgressModal from './ProgressModal';
import { containsHtml, renderHtmlToCanvas } from '../utils/htmlRenderer';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Download,
  Close,
  GetApp,
  Image as ImageIcon,
  CloudUpload,
  FolderOpen,
  TableChart,
  Google,
  Edit,
  SwapHoriz,
  Share,
  AutoAwesomeOutlined as GeminiIcon,
  SettingsBackupRestore,
} from '@mui/icons-material';
import GeneratedImageEditor from './GeneratedImageEditor';
import MemoizedGeneratedImageEditor from './MemoizedGeneratedImageEditor';
import { createFolder, uploadFile, createSpreadsheet } from '../utils/googleApi';
import { composeImage, composeSingleImage, dataURLtoBlob, wrapTextInArea, applyTextEffects, drawTextWithEffects } from '../utils/imageComposer';
import { useUserAuth } from '../context/UserAuthContext';

const ImageGeneratorFrontendOnly = ({
  csvData,
  backgroundImage,
  fieldPositions,
  fieldStyles,
  csvHeaders,
  colorPalette,
  setGeneratedImagesData,
  initialGeneratedImagesData,
  onThumbnailRecordTextUpdate,
  originalImageSize,
  imageFilters,
  brandElements,
  onBrandElementsChange,
  fontScale = 1,
  standardsColors,
  handleGenerateSingleImage, // Nova prop
  aspectRatio,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const isCancelledRef = useRef(false);
  const [generatedImages, setGeneratedImages] = useState(initialGeneratedImagesData || []);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [editingGeneratedImageIndex, setEditingGeneratedImageIndex] = useState(null);
  const [showGeneratedImageEditor, setShowGeneratedImageEditor] = useState(false);
  const { googleAccessToken } = useUserAuth();
  const isGoogleDriveConnected = !!googleAccessToken;
  const [projectName, setProjectName] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [replacingImageIndex, setReplacingImageIndex] = useState(null);
  const individualImageInputRef = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Erro ao carregar fontes:', error);
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    if (setGeneratedImagesData) {
      setGeneratedImagesData(generatedImages);
    }
  }, [generatedImages, setGeneratedImagesData]);

  useEffect(() => {
    if (initialGeneratedImagesData) {
      if (initialGeneratedImagesData !== generatedImages) {
         setGeneratedImages(initialGeneratedImagesData);
      }
    } else {
      if (generatedImages.length > 0) {
        setGeneratedImages([]);
      }
    }
  }, [initialGeneratedImagesData]);

  // Effect for regenerating thumbnails on load
  useEffect(() => {
    if (initialGeneratedImagesData && initialGeneratedImagesData.length > 0 && fontsLoaded) {
      const regenerateMissingThumbnails = async () => {
        const imagesToRegenerate = initialGeneratedImagesData.filter(img => img.record && img.backgroundImage && !img.url);

        if (imagesToRegenerate.length === 0) return;

        console.log(`[Thumbnail-Regen] Found ${imagesToRegenerate.length} images missing thumbnails. Regenerating...`);

        const imagePromises = initialGeneratedImagesData.map(imgData => {
          // If the URL already exists, or it's not an image we should regenerate, return it as is.
          if (imgData.url || !imagesToRegenerate.some(r => r.index === imgData.index)) {
            return Promise.resolve(imgData);
          }

          // Define parameters for regeneration, falling back to global props.
          const positionsToUse = imgData.customFieldPositions || fieldPositions;
          const stylesToUse = imgData.customFieldStyles || fieldStyles;
          const elementsToUse = imgData.customBrandElements !== undefined ? imgData.customBrandElements : brandElements;

          // Call the composition function to regenerate the merged image
          return composeSingleImage({
            record: imgData.record,
            index: imgData.index,
            itemBackgroundImage: imgData.backgroundImage,
            imageFilters: imgData.customImageFilters || imageFilters, // Use custom filters if available
            brandElements: elementsToUse,
            fieldPositions: positionsToUse,
            fieldStyles: stylesToUse,
            fontScale: imgData.fontScale || 1, // Use custom font scale if available
          }).catch(error => {
            console.error(`[Thumbnail-Regen] Failed to regenerate thumbnail for index ${imgData.index}:`, error);
            return imgData; // On error, return the original data to not lose it
          });
        });

        const regeneratedImages = await Promise.all(imagePromises.map(async (promise, index) => {
          const newImageData = await promise;
          const originalImageData = initialGeneratedImagesData[index];
          // If regeneration failed, newImageData might be the original data already.
          if (newImageData === originalImageData) {
            return originalImageData;
          }
          // Merge new data (url, blob) with old data (custom styles/positions)
          return { ...originalImageData, ...newImageData };
        }));

        // Update state only if there are actual changes
        if (JSON.stringify(regeneratedImages) !== JSON.stringify(generatedImages)) {
          setGeneratedImages(regeneratedImages);
          console.log('[Thumbnail-Regen] Successfully regenerated thumbnails and updated state.');
        }
      };

      regenerateMissingThumbnails();
    }
  }, [initialGeneratedImagesData, fontsLoaded, fieldPositions, fieldStyles, imageFilters, brandElements]);


  const generateImages = async () => {
    if (isGenerating) return;

    // Se já existem imagens, o botão funciona como "Regerar Tudo"
    if (generatedImages.some(img => img.url)) {
      handleRegenerateAll();
      return;
    }

    // Lógica original para gerar pela primeira vez
    if ((!backgroundImage && initialGeneratedImagesData.some(img => !img.backgroundImage)) || csvData.length === 0) {
      alert('Por favor, carregue um arquivo CSV e uma imagem de fundo global, ou garanta que todas as imagens tenham um fundo individual.');
      return;
    }
    if (!fontsLoaded) {
      alert('Aguardando carregamento das fontes. Tente novamente em alguns segundos.');
      return;
    }
    setIsGenerating(true);
    setShowProgressModal(true);
    setProgress(0);
    isCancelledRef.current = false;

    const imagePromises = csvData.map((record, i) => {
      if (isCancelledRef.current) return Promise.resolve(null);

      const initialImageDataItem = initialGeneratedImagesData.find(img => img.index === i);
      const itemBackgroundImage = initialImageDataItem?.backgroundImage || backgroundImage;

      return composeSingleImage({
        record,
        index: i,
        itemBackgroundImage,
        imageFilters,
        brandElements,
        fieldPositions,
        fieldStyles,
        fontScale,
        aspectRatio,
        backgroundElement,
      })
      .then(imageData => {
        setProgress(p => p + 1);
        // Persist the styles used for generation with the image data
        return {
          ...imageData,
          customFieldStyles: fieldStyles,
          customFieldPositions: fieldPositions,
        };
      })
      .catch(error => {
        console.error(`Erro ao gerar imagem para o registro ${i}:`, error);
        alert(`Erro ao gerar imagem para o registro ${i}: ${error.message}`);
        return null; // Retorna nulo para este item em caso de erro
      });
    });

    try {
      const images = (await Promise.all(imagePromises)).filter(Boolean); // Filtra os nulos de erros ou cancelamentos
      if (!isCancelledRef.current) {
        setGeneratedImages(images);
      }
    } catch (error) {
      console.error('Erro geral durante a geração de imagens em lote:', error);
      alert(`Ocorreu um erro geral durante a geração das imagens: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setShowProgressModal(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!handleGenerateSingleImage) {
      alert("A função de regeneração não está disponível.");
      return;
    }
    setShowProgressModal(true);
    setIsGenerating(true);
    setProgress(0);
    isCancelledRef.current = false;

    for (let i = 0; i < csvData.length; i++) {
      if (isCancelledRef.current) break;
      const record = csvData[i];
      await handleGenerateSingleImage(record, i);
      setProgress(p => p + 1);
    }

    setIsGenerating(false);
    setShowProgressModal(false);
  };

  const handleCancelGeneration = () => { isCancelledRef.current = true; };

  const handleResetImage = (index) => {
    const imageToReset = generatedImages.find(img => img.index === index);
    if (imageToReset && backgroundImage) {
      // Use a cópia mais recente dos estilos/posições globais, não os customizados.
      regenerateSingleImage(
        index,
        imageToReset.record,
        backgroundImage, // Usando a imagem de fundo global
        fieldPositions, // Usando as posições de campo globais
        fieldStyles, // Usando os estilos de campo globais
        originalImageSize,
        brandElements,
        fontScale,
        imageFilters
      );
    } else {
      alert("Não foi possível resetar a imagem. A imagem de fundo principal não está disponível.");
    }
  };

  const downloadImage = (imageData) => {
    const link = document.createElement('a');
    link.href = imageData.url;
    link.download = imageData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (imageData) => {
    if (!imageData || !imageData.url) {
      alert('A imagem não está disponível para compartilhamento.');
      return;
    }
    try {
      const response = await fetch(imageData.url);
      const blob = await response.blob();
      const file = new File([blob], imageData.filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Compartilhar Imagem', text: `Confira a imagem: ${imageData.filename}` });
      } else {
        alert('Seu navegador não suporta o compartilhamento de arquivos.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Ocorreu um erro ao tentar compartilhar a imagem.');
        console.error("Share error:", error);
      }
    }
  };

  const downloadAllImages = () => {
    generatedImages.forEach((imageData, index) => {
      setTimeout(() => downloadImage(imageData), index * 100);
    });
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedPreview(null);
  };

  const handleOpenGeneratedImageEditor = (imageFromClosure, index) => {
    setEditingGeneratedImageIndex(index);
    const imageToEdit = generatedImages.find(img => img.index === index);
    if (!imageToEdit) {
      console.error(`[IGFO] handleOpenGeneratedImageEditor: Could not find image in local 'generatedImages' state with index: ${index}.`);
      setShowGeneratedImageEditor(true);
      return;
    }
    setShowGeneratedImageEditor(true);
  };

  const handleCloseGeneratedImageEditor = () => {
    setShowGeneratedImageEditor(false);
    setEditingGeneratedImageIndex(null);
  };

  const handleSaveIndividualModifications = (modifiedImageData) => {
    const { index: imageIndex } = modifiedImageData;

    const updatedImages = generatedImages.map(img => {
      if (img.index !== imageIndex) {
        return img;
      }
      // BUG FIX: The root of the "disappearing background" bug on save was here.
      // `modifiedImageData` comes from the editor and does NOT have a `backgroundImage` property.
      // The spread `{ ...img, ...modifiedImageData }` was overwriting `img.backgroundImage`
      // with `undefined`.
      // The fix is to manually construct the new object, EXPLICITLY preserving the
      // `backgroundImage` from the existing state (`img`).
      return {
        ...img, // Keep blob, url, etc.
        record: modifiedImageData.record,
        backgroundImage: img.backgroundImage, // Keep the original background!
        // Apply modifications from the editor
        customFieldPositions: modifiedImageData.fieldPositions,
        customFieldStyles: modifiedImageData.fieldStyles,
        customBrandElements: modifiedImageData.brandElements,
        fontScale: modifiedImageData.fontScale,
      };
    });

    setGeneratedImages(updatedImages);

    if (onThumbnailRecordTextUpdate) {
      onThumbnailRecordTextUpdate(imageIndex, modifiedImageData.record);
    }

    const imageToRegenerate = updatedImages.find(im => im.index === imageIndex);

    if (imageToRegenerate) {
      // Explicitly define the parameters to be used for regeneration,
      // falling back to global props if custom ones don't exist.
      const bgToUse = imageToRegenerate.backgroundImage || backgroundImage;
      const positionsToUse = imageToRegenerate.customFieldPositions || fieldPositions;
      const stylesToUse = imageToRegenerate.customFieldStyles || fieldStyles;
      const elementsToUse = imageToRegenerate.customBrandElements !== undefined ? imageToRegenerate.customBrandElements : brandElements;
      const sizeToUse = imageToRegenerate.customOriginalImageSize || originalImageSize;

      regenerateSingleImage(
        imageIndex,
        imageToRegenerate.record,
        bgToUse,
        positionsToUse,
        stylesToUse,
        sizeToUse,
        elementsToUse,
        modifiedImageData.fontScale || 1,
        modifiedImageData.imageFilters || imageFilters
      );
    }
    handleCloseGeneratedImageEditor();
  };

  const regenerateSingleImage = async (index, record, currentBackgroundImage, positionsToUse, stylesToUse, customSize = null, elementsToUse = brandElements, fontScale = 1, customImageFilters = imageFilters) => {
    if (!currentBackgroundImage || !record || !positionsToUse || !stylesToUse || !fontsLoaded) {
      alert('Pré-requisitos para regeneração não atendidos. Fontes, dados ou configurações faltando.');
      return;
    }
    try {
      const newImageData = await composeSingleImage({
        record,
        index,
        itemBackgroundImage: currentBackgroundImage,
        imageFilters: customImageFilters,
        brandElements: elementsToUse,
        fieldPositions: positionsToUse,
        fieldStyles: stylesToUse,
        fontScale,
        aspectRatio,
      });

      setGeneratedImages(prevImages => {
        const updatedImages = prevImages.map(img => {
          if (img.index === index) {
            // The new object from composeSingleImage contains the new url, blob, etc.
            // We merge it with the existing `img` data to preserve all fields,
            // especially the `backgroundImage` which might be lost otherwise.
            return {
              ...img,
              ...newImageData,
              customFieldPositions: positionsToUse,
              customFieldStyles: stylesToUse, // Persist the styles used for regeneration
              customBrandElements: elementsToUse,
              customOriginalImageSize: customSize,
              backgroundImage: currentBackgroundImage, // Explicitly preserve the background used for regeneration
            };
          }
          return img;
        });
        return updatedImages;
      });
    } catch (error) {
      console.error(`Erro na regeneração da imagem (índice ${index}):`, error);
      alert(`Erro na regeneração da imagem (índice ${index}): ${error.message}`);
    }
  };

  const handleReplaceImageClick = (index) => {
    setReplacingImageIndex(index);
    if (individualImageInputRef.current) {
      individualImageInputRef.current.click();
    }
  };

  const handleIndividualImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && replacingImageIndex !== null) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newBgUrl = e.target.result;
        const imageToUpdate = generatedImages.find(img => img.index === replacingImageIndex);
        if (imageToUpdate) {
          const img = new Image();
          img.onload = () => {
            const newSize = { width: img.width, height: img.height };
            regenerateSingleImage(replacingImageIndex, imageToUpdate.record, newBgUrl, imageToUpdate.customFieldPositions || fieldPositions, imageToUpdate.customFieldStyles || fieldStyles, newSize, imageToUpdate.customBrandElements || brandElements, fontScale);
          };
          img.onerror = () => {
            console.error('Failed to load the new background image to get its dimensions.');
            regenerateSingleImage(replacingImageIndex, imageToUpdate.record, newBgUrl, imageToUpdate.customFieldPositions || fieldPositions, imageToUpdate.customFieldStyles || fieldStyles, null, imageToUpdate.customBrandElements || brandElements, fontScale);
          };
          img.src = newBgUrl;
        }
      };
      reader.readAsDataURL(file);
    }
    if (individualImageInputRef.current) {
      individualImageInputRef.current.value = "";
    }
    setReplacingImageIndex(null);
  };

  const uploadToGoogleDrive = async () => {
    if (!projectName.trim()) {
      alert('Por favor, digite um nome para o projeto.');
      return;
    }
    if (generatedImages.length === 0) {
      alert('Nenhuma imagem foi gerada ainda.');
      return;
    }
    if (!googleAccessToken) {
      alert('Conexão com Google não está ativa. Por favor, faça login.');
      return;
    }
    if (isUploadingToDrive) return;

    setIsUploadingToDrive(true);
    setDriveResult(null);

    try {
      const folder = await createFolder(projectName, null, googleAccessToken);
      const contentFolder = await createFolder('Conteúdo', folder.id, googleAccessToken);

      const uploadResults = [];
      const sheetData = [];
      const allHeaders = Array.from(new Set(generatedImages.flatMap(img => Object.keys(img.record))));

      for (let i = 0; i < generatedImages.length; i++) {
        const imageData = generatedImages[i];
        try {
          const response = await fetch(imageData.dataUrl);
          const blob = await response.blob();
          const result = await uploadFile(blob, imageData.filename, contentFolder.id, googleAccessToken);
          uploadResults.push({ filename: imageData.filename, success: true, fileId: result.id });
          const row = [i + 1, `https://drive.google.com/file/d/${result.id}/view?usp=sharing`, ...allHeaders.map(header => imageData.record[header] || '')];
          sheetData.push(row);
        } catch (error) {
          uploadResults.push({ filename: imageData.filename, success: false, error: error.message });
        }
      }

      if (sheetData.length > 0) {
        const headers = ['Nº', 'Link do Arquivo', ...allHeaders];
        await createSpreadsheet(
          `Relação de Arquivos - ${projectName}`,
          [headers, ...sheetData],
          googleAccessToken,
          contentFolder.id
        );
      }

      setDriveResult({
        folderId: folder.id,
        folderName: projectName,
        uploads: uploadResults,
        successCount: uploadResults.filter(r => r.success).length,
        totalCount: uploadResults.length,
        contentFolderId: contentFolder.id
      });
    } catch (error) {
      console.error('Erro no upload para Google Drive:', error);
      alert(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Geração de Páginas
          </Typography>

          {!fontsLoaded && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Carregando fontes... Aguarde antes de gerar as imagens.
            </Alert>
          )}

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                color="primary"
                onClick={generateImages}
                disabled={isGenerating || !fontsLoaded}
                startIcon={<ImageIcon />}
                fullWidth
              >
                {generatedImages.some(img => img.url) ? 'Regerar imagens' : 'Gerar Imagens'}
              </Button>
            </Grid>

            {generatedImages.some(img => img.url) && (
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  onClick={downloadAllImages}
                  startIcon={<Download />}
                  fullWidth
                >
                  Download Todas ({generatedImages.filter(img => img.url).length})
                </Button>
              </Grid>
            )}
          </Grid>

          {isGenerating && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Gerando imagens...
              </Typography>
            </Box>
          )}

          {generatedImages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                <Google sx={{ mr: 1, verticalAlign: 'middle' }} />
                Integração Google Drive
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome do Projeto"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Certificados 2024"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Tooltip title={!isGoogleDriveConnected ? "Conecte-se ao Google Drive nas configurações para ativar esta opção" : ""}>
                    <span>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={uploadToGoogleDrive}
                        disabled={isUploadingToDrive || !isGoogleDriveConnected}
                        startIcon={<CloudUpload />}
                        fullWidth
                      >
                        {isUploadingToDrive ? 'Enviando...' : 'Enviar para Google Drive'}
                      </Button>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>

              {isUploadingToDrive && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Enviando para Google Drive...
                  </Typography>
                </Box>
              )}

              {driveResult && (
                <Alert
                  severity={driveResult.successCount === driveResult.totalCount ? "success" : "warning"}
                  sx={{ mt: 2 }}
                >
                  Upload concluído: {driveResult.successCount}/{driveResult.totalCount} arquivos enviados com sucesso.
                  {driveResult.successCount < driveResult.totalCount && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Alguns arquivos falharam no upload. Verifique sua conexão e tente novamente.
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>
          )}

          {generatedImages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Imagens Geradas ({generatedImages.length})
              </Typography>

              <Grid container spacing={2}>
                {generatedImages.map((imageData, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                            {imageData.filename}
                          </Typography>
                        </Box>

<Box sx={{
                          width: '100%',
                          maxWidth: '100%',
                          height: 'auto',
                          maxHeight: '180px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '10px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          mb: 1,
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2), 0 6px 20px rgba(0, 0, 0, 0.19)',
                          cursor: 'pointer',
                          '&:hover img': {
                            transform: 'scale(1.03)',
                          },
                          '&:hover': {
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25), 0 10px 25px rgba(0, 0, 0, 0.22)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
                        }}
                        onClick={() => handleOpenGeneratedImageEditor(imageData, imageData.index)}
                        >
                          <img
                            key={index}
                            src={imageData.url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              display: 'block',
                              maxWidth: '100%',
                              maxHeight: '150px',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              transition: 'transform 0.3s ease-in-out',
                              boxShadow: 'inset 0 0 2px rgba(0,0,0,0.1)',
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
                           <Tooltip title="Regerar com IA">
                                <IconButton
                                    size="small"
                                    onClick={() => handleGenerateSingleImage(imageData.record, imageData.index)}
                                >
                                    <GeminiIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Resetar para Fundo Padrão">
                                <IconButton
                                    size="small"
                                    onClick={() => handleResetImage(imageData.index)}
                                >
                                    <SettingsBackupRestore />
                                </IconButton>
                            </Tooltip>
                          <Tooltip title="Editar Posições/Estilos">
                            <IconButton
                                size="small"
                                onClick={() => handleOpenGeneratedImageEditor(imageData, imageData.index)}
                            >
                                <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Substituir Fundo">
                            <IconButton
                                size="small"
                                onClick={() => handleReplaceImageClick(imageData.index)}
                            >
                                <SwapHoriz />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                                size="small"
                                onClick={() => downloadImage(imageData)}
                            >
                                <Download />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Compartilhar">
                            <IconButton
                                size="small"
                                onClick={() => handleShare(imageData)}
                            >
                                <Share />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onClose={closePreview} maxWidth="lg" fullWidth>
        <DialogTitle>
          Preview - {selectedPreview?.filename}
          <IconButton onClick={closePreview} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedPreview && (
            <Box sx={{ textAlign: 'center' }}>
              <img src={selectedPreview.url} alt={selectedPreview.filename} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => downloadImage(selectedPreview)} startIcon={<Download />}>Download</Button>
          <Button onClick={closePreview}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <MemoizedGeneratedImageEditor
        showGeneratedImageEditor={showGeneratedImageEditor}
        handleCloseGeneratedImageEditor={handleCloseGeneratedImageEditor}
        generatedImages={generatedImages}
        editingGeneratedImageIndex={editingGeneratedImageIndex}
        csvHeaders={csvHeaders}
        fieldPositions={fieldPositions}
        fieldStyles={fieldStyles}
        brandElements={brandElements}
        handleSaveIndividualModifications={handleSaveIndividualModifications}
        colorPalette={colorPalette}
        backgroundImage={backgroundImage}
        originalImageSize={originalImageSize}
        imageFilters={imageFilters}
        standardsColors={standardsColors}
      />

      <input
        type="file"
        accept="image/png, image/jpeg"
        style={{ display: 'none' }}
        ref={individualImageInputRef}
        onChange={handleIndividualImageUpload}
      />
      <ProgressModal
        open={showProgressModal}
        progress={progress}
        total={csvData.length}
        onCancel={handleCancelGeneration}
        title="Gerando Imagens"
        progressText={`Gerando imagem ${progress} de ${csvData.length}...`}
      />
    </Box>
  );
};

export default ImageGeneratorFrontendOnly;
