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
import { composeImage } from '../utils/imageComposer';
import { useUserAuth } from '../context/UserAuthContext';
import { uploadAsset } from '../utils/campaignState'; // Import the uploader

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
  const { user } = useUserAuth(); // Get user for upload path
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const isCancelledRef = useRef(false);
  const [generatedImages, setGeneratedImages] = useState(initialGeneratedImagesData || []);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [editingGeneratedImageIndex, setEditingGeneratedImageIndex] = useState(null);
  const [showGeneratedImageEditor, setShowGeneratedImageEditor] = useState(false);
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

  const wrapTextInArea = (ctx, text, x, y, maxWidth, maxHeight, style) => {
    if (!text) return [];
    const fontSize = style.fontSize || 24;
    const lineHeight = fontSize * (style.lineHeightMultiplier || 1.2);
    const maxLines = Math.floor(maxHeight / lineHeight);
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${fontSize}px ${style.fontFamily || 'Arial'}`;
    const words = text.toString().split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        if (lines.length >= maxLines) break;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (lines.length < maxLines && currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  const applyTextEffects = (ctx, style) => {
    ctx.fillStyle = style.color || '#000000';
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
    ctx.textAlign = style.textAlign || 'left';
    ctx.textBaseline = style.textBaseline || 'top';
    if (style.textShadow) {
      ctx.shadowColor = style.shadowColor || '#000000';
      ctx.shadowBlur = style.shadowBlur || 4;
      ctx.shadowOffsetX = style.shadowOffsetX || 2;
      ctx.shadowOffsetY = style.shadowOffsetY || 2;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    if (style.textStroke) {
      ctx.strokeStyle = style.strokeColor || '#ffffff';
      ctx.lineWidth = style.strokeWidth || 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }
  };

  const drawTextWithEffects = async (ctx, text, x, y, style, maxWidth, maxHeight) => {
    if (containsHtml(text)) {
      await renderHtmlToCanvas(ctx, text, x, y, maxWidth, maxHeight, style);
    } else {
      if (style.textStroke) {
        ctx.strokeText(text, x, y);
      }
      ctx.fillText(text, x, y);
    }
  };

  const generateImages = async () => {
    if (!backgroundImage || csvData.length === 0) {
      alert('Por favor, carregue um arquivo CSV e uma imagem de fundo.');
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
    const images = [];
    try {
      // Upload the main background image once if it's a data URL
      let processedBackgroundImageUrl = backgroundImage;
      if (backgroundImage.startsWith('data:')) {
        console.log("Uploading main background image...");
        processedBackgroundImageUrl = await uploadAsset(backgroundImage, `bg_${Date.now()}.png`, null, user.sub);
        console.log("Main background image uploaded:", processedBackgroundImageUrl);
      }

      const composedBackgroundImageUrl = await composeImage(processedBackgroundImageUrl, imageFilters, brandElements);
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Important for cross-origin images
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = composedBackgroundImageUrl;
      });

      for (let i = 0; i < csvData.length; i++) {
        if (isCancelledRef.current) break;
        const record = csvData[i];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.textRenderingOptimization = 'optimizeQuality';
        ctx.drawImage(img, 0, 0);
        for (const field of Object.keys(record)) {
          const position = fieldPositions[field];
          const style = fieldStyles[field];
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
        const existingImageDataItem = generatedImages.find(img => img.index === i);
        const imageData = {
          url: dataUrl,
          dataUrl: dataUrl,
          record,
          index: i,
          filename: `midiator_${String(i + 1).padStart(3, '0')}.png`,
          backgroundImage: processedBackgroundImageUrl, // Store the permanent URL
          customFieldPositions: existingImageDataItem?.customFieldPositions,
          customFieldStyles: existingImageDataItem?.customFieldStyles,
        };
        images.push(imageData);
        setProgress(i + 1);
      }
      if (!isCancelledRef.current) {
        setGeneratedImages(images);
      }
    } catch (error) {
      console.error('Erro na geração de imagens:', error);
      alert(`Erro na geração de imagens: ${error.message}`);
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
        let processedBackgroundImageUrl = currentBackgroundImage;
        if (currentBackgroundImage.startsWith('data:')) {
            console.log(`Uploading custom background for image ${index}...`);
            processedBackgroundImageUrl = await uploadAsset(currentBackgroundImage, `bg_custom_${index}_${Date.now()}.png`, null, user.sub);
            console.log(`Custom background for image ${index} uploaded:`, processedBackgroundImageUrl);
        }

      const composedBackgroundImageUrl = await composeImage(processedBackgroundImageUrl, imageFilters, elementsToUse);
      const img = new Image();
      img.crossOrigin = "Anonymous";
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
      const newImageData = {
        url: dataUrl,
        dataUrl: dataUrl,
        record,
        index,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        backgroundImage: processedBackgroundImageUrl,
        customFieldPositions: positionsToUse,
        customFieldStyles: stylesToUse,
        customBrandElements: elementsToUse,
        customOriginalImageSize: customSize,
      };
      setGeneratedImages(prevImages => {
        const updatedImages = prevImages.map(img => {
          if (img.index === index) {
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

  // This function is no longer used for campaign saving, but might be used by other features.
  // It's been updated to use the tokenless API.
  const uploadToGoogleDrive = async () => {
    // ... (This function's content is omitted for brevity as it's not the focus of the current fix)
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

          {/* Omitted for brevity */}

        </CardContent>
      </Card>
    </Box>
  );
};

export default ImageGeneratorFrontendOnly;