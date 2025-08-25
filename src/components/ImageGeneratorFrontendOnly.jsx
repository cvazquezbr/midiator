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
  Share
} from '@mui/icons-material';
import GeneratedImageEditor from './GeneratedImageEditor';
import { createFolder, uploadFile, createSpreadsheet } from '../utils/googleApi';
import { composeImage } from '../utils/imageComposer';
import { useUserAuth } from '../context/UserAuthContext';

import { composeSingleImage } from '../utils/imageComposer';

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
  onBrandElementsChange
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

  const generateImages = async () => {
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
      })
      .then(imageData => {
        setProgress(p => p + 1);
        return imageData;
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

  const handleCancelGeneration = () => { isCancelledRef.current = true; };
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
    const { index: imageIndex, record: updatedCsvRecord, fieldPositions: newPositions, fieldStyles: newStyles, brandElements: editedBrandElements } = modifiedImageData;
    const updatedImages = generatedImages.map(img => (img.index === imageIndex) ? { ...img, record: updatedCsvRecord, customFieldPositions: newPositions, customFieldStyles: newStyles, customBrandElements: editedBrandElements } : img);
    setGeneratedImages(updatedImages);
    if (onThumbnailRecordTextUpdate) {
      onThumbnailRecordTextUpdate(imageIndex, updatedCsvRecord);
    }
    const imageToRegenerate = updatedImages.find(im => im.index === imageIndex);
    if (imageToRegenerate) {
      const bgToUse = imageToRegenerate.backgroundImage || backgroundImage;
      regenerateSingleImage(imageIndex, imageToRegenerate.record, bgToUse, newPositions, newStyles, null, editedBrandElements);
    }
    handleCloseGeneratedImageEditor();
  };

  const regenerateSingleImage = async (index, record, currentBackgroundImage, positionsToUse, stylesToUse, customSize = null, elementsToUse = brandElements) => {
    if (!currentBackgroundImage || !record || !positionsToUse || !stylesToUse || !fontsLoaded) {
      alert('Pré-requisitos para regeneração não atendidos. Fontes foram carregadas?');
      return;
    }
    try {
      const composedBackgroundImageUrl = await composeImage(currentBackgroundImage, imageFilters, elementsToUse);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (err) => reject(new Error('Failed to load composed background for regeneration.', { cause: err }));
        img.src = composedBackgroundImageUrl;
      });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.textRenderingOptimization = 'optimizeQuality';
      ctx.drawImage(img, 0, 0);
      for (const field of Object.keys(record)) {
        const position = positionsToUse[field];
        const style = stylesToUse[field];
        if (!position || !position.visible || !style) continue;
        const text = record[field] || "";
        if (!text) continue;
        ctx.save();
        const posPx = {
          x: Math.round((position.x / 100) * img.width),
          y: Math.round((position.y / 100) * img.height),
          width: Math.round((position.width / 100) * img.width),
          height: Math.round((position.height / 100) * img.height)
        };
        if (position.rotation) {
          const centerX = posPx.x + posPx.width / 2;
          const centerY = posPx.y + posPx.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(position.rotation * Math.PI / 180);
          ctx.translate(-centerX, -centerY);
        }
        const fontSize = style.fontSize || 24;
        applyTextEffects(ctx, { ...style, fontSize: fontSize });
        const fixedPadding = 8;
        const effectiveTextWidth = Math.max(0, posPx.width - (2 * fixedPadding));
        const effectiveTextHeight = Math.max(0, posPx.height - (2 * fixedPadding));
        const textContentStartX = posPx.x + fixedPadding;
        const textContentStartY = posPx.y + fixedPadding;
        const lines = wrapTextInArea(ctx, text, 0, 0, effectiveTextWidth, effectiveTextHeight, { ...style, fontSize: fontSize });
        const lineHeight = fontSize * (style.lineHeightMultiplier || 1.2);
        let currentLineRenderY = textContentStartY;
        if (style.verticalAlign === 'middle') {
          const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - fontSize) : 0);
          currentLineRenderY += (effectiveTextHeight - totalTextBlockHeight) / 2;
        } else if (style.verticalAlign === 'bottom') {
          const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - fontSize) : 0);
          currentLineRenderY += effectiveTextHeight - totalTextBlockHeight;
        }
        if (containsHtml(text)) {
          await drawTextWithEffects(ctx, text, textContentStartX, textContentStartY, { ...style, fontSize: fontSize }, effectiveTextWidth, effectiveTextHeight);
        } else {
          for (const line of lines) {
            let currentLineRenderX;
            if (style.textAlign === 'center') {
              currentLineRenderX = textContentStartX + effectiveTextWidth / 2;
            } else if (style.textAlign === 'right') {
              currentLineRenderX = textContentStartX + effectiveTextWidth;
            } else {
              currentLineRenderX = textContentStartX;
            }
            const finalLineY = currentLineRenderY + (lines.indexOf(line) * lineHeight);
            await drawTextWithEffects(ctx, line, currentLineRenderX, finalLineY, { ...style, fontSize: fontSize }, effectiveTextWidth, effectiveTextHeight);
          }
        }
        ctx.restore();
      }
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const blob = dataURLtoBlob(dataUrl);
      const newImageData = {
        url: dataUrl,
        dataUrl: dataUrl,
        blob,
        record,
        index,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        backgroundImage: currentBackgroundImage,
        customFieldPositions: positionsToUse,
        customFieldStyles: stylesToUse,
        customBrandElements: elementsToUse,
        customOriginalImageSize: customSize,
      };
      setGeneratedImages(prevImages => {
        const updatedImages = prevImages.map(img => {
          if (img.index === index) {
            // No need to revoke URL if it's a data URL
            return newImageData;
          }
          return img;
        });
        return updatedImages;
      });
    } catch (error) {
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
            regenerateSingleImage(replacingImageIndex, imageToUpdate.record, newBgUrl, imageToUpdate.customFieldPositions || fieldPositions, imageToUpdate.customFieldStyles || fieldStyles, newSize);
          };
          img.onerror = () => {
            console.error('Failed to load the new background image to get its dimensions.');
            regenerateSingleImage(replacingImageIndex, imageToUpdate.record, newBgUrl, imageToUpdate.customFieldPositions || fieldPositions, imageToUpdate.customFieldStyles || fieldStyles);
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
            Geração de Imagens
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
                {isGenerating ? 'Gerando...' : 'Gerar Imagens'}
              </Button>
            </Grid>

            {generatedImages.length > 0 && (
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  onClick={downloadAllImages}
                  startIcon={<Download />}
                  fullWidth
                >
                  Download Todas ({generatedImages.length})
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
                {generatedImages.map((imageData) => (
                  <Grid item xs={12} sm={6} md={4} key={imageData.index || imageData.filename}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip
                            label={`#${imageData.index + 1}`}
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
                            key={imageData.url}
                            src={imageData.url}
                            alt={`Preview ${imageData.index + 1}`}
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenGeneratedImageEditor(imageData, imageData.index)}
                            title="Editar Posições/Estilos"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleReplaceImageClick(imageData.index)}
                            title="Substituir Imagem de Fundo"
                          >
                            <SwapHoriz />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => downloadImage(imageData)}
                            title="Download"
                          >
                            <Download />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleShare(imageData)}
                            title="Compartilhar"
                          >
                            <Share />
                          </IconButton>
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

      {showGeneratedImageEditor && editingGeneratedImageIndex !== null && (() => {
        const imageToEdit = generatedImages.find(img => img.index === editingGeneratedImageIndex);
        if (!imageToEdit) {
          console.error(`[IGFO] Render: Could not find image with index ${editingGeneratedImageIndex} to edit.`);
          return null;
        }
        const positionsToLoad = imageToEdit.customFieldPositions !== undefined ? imageToEdit.customFieldPositions : fieldPositions;
        const stylesToLoad = imageToEdit.customFieldStyles !== undefined ? imageToEdit.customFieldStyles : fieldStyles;
        const brandElementsToLoad = imageToEdit.customBrandElements !== undefined ? imageToEdit.customBrandElements : brandElements;
        return (
          <GeneratedImageEditor
            open={showGeneratedImageEditor}
            onClose={handleCloseGeneratedImageEditor}
            imageData={imageToEdit}
            globalCsvHeaders={csvHeaders}
            initialFieldPositions={JSON.parse(JSON.stringify(positionsToLoad || {}))}
            initialFieldStyles={JSON.parse(JSON.stringify(stylesToLoad || {}))}
            onSave={handleSaveIndividualModifications}
            colorPalette={colorPalette}
            globalBackgroundImage={backgroundImage}
            originalImageSize={imageToEdit.customOriginalImageSize || originalImageSize}
            imageFilters={imageFilters}
            brandElements={brandElementsToLoad}
          />
        );
      })()}

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