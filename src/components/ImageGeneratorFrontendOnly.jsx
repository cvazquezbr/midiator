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
  Divider
} from '@mui/material';
import {
  Download,
  // Visibility, // Removed as unused
  Close,
  GetApp,
  Image as ImageIcon,
  CloudUpload,
  FolderOpen,
  TableChart,
  Google,
  Edit,
  SwapHoriz,
  Share // <-- Adicionar ícone de compartilhamento
} from '@mui/icons-material';
import GoogleAuthSetup from './GoogleAuthSetup';
import GeneratedImageEditor from './GeneratedImageEditor'; // Importar o novo editor
import googleDriveAPI from '../utils/googleDriveAPI';

const ImageGeneratorFrontendOnly = ({
  csvData,
  backgroundImage, // Imagem de fundo global/template
  fieldPositions, // Posições globais/template
  fieldStyles, // Estilos globais/template
  displayedImageSize, // Tamanho da imagem exibida no editor principal
  csvHeaders, // Todos os cabeçalhos CSV possíveis (para GeneratedImageEditor)
  colorPalette, // Paleta de cores global (para GeneratedImageEditor)
  setGeneratedImagesData, // Setter para atualizar o estado em App.jsx
  initialGeneratedImagesData, // Dados iniciais carregados do JSON
  onThumbnailRecordTextUpdate, // <-- ADICIONADO: Callback para atualizar o CSV em App.jsx
  originalImageSize
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const isCancelledRef = useRef(false);
  // O estado local `generatedImages` será inicializado com `initialGeneratedImagesData`
  // e depois atualizado. Ele também chamará `setGeneratedImagesData` para sincronizar com App.jsx.
  const [generatedImages, setGeneratedImages] = useState(initialGeneratedImagesData || []);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  
  // REMOVED: Old CSV text editing states
  // const [editingImageTextData, setEditingImageTextData] = useState(null);
  // const [editedCsvFields, setEditedCsvFields] = useState({});

  // Novos estados para o editor WYSIWYG de imagens geradas
  const [editingGeneratedImageIndex, setEditingGeneratedImageIndex] = useState(null);
  const [showGeneratedImageEditor, setShowGeneratedImageEditor] = useState(false);


  // Estados para integração Google Drive
  const [driveIntegration, setDriveIntegration] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [showAuthSetup, setShowAuthSetup] = useState(false);
  const [replacingImageIndex, setReplacingImageIndex] = useState(null);

  // Removed: const canvasRef = useRef(null);
  const individualImageInputRef = useRef(null);
  const uploadLock = useRef(false); // Lock síncrono para prevenir dupla execução

  // Estado para controle de fontes carregadas
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Efeito para garantir que as fontes estejam carregadas
  useEffect(() => {
    const loadFonts = async () => {
      try {
        // Aguarda todas as fontes do documento estarem carregadas
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Erro ao carregar fontes:', error);
        setFontsLoaded(true); // Continua mesmo com erro
      }
    };

    loadFonts();
  }, []);

  // Efeito para atualizar o estado pai (App.jsx) quando generatedImages local mudar
  useEffect(() => {
    if (setGeneratedImagesData) {
      setGeneratedImagesData(generatedImages);
    }
  }, [generatedImages]);

  // Efeito para sincronizar com initialGeneratedImagesData se ele mudar externamente
  // Isso é útil se o usuário carregar um novo arquivo JSON enquanto este componente já está montado.
  useEffect(() => {
    if (initialGeneratedImagesData) {
      // More direct update: if the prop reference is different.
      // This relies on App.jsx providing new references for meaningful changes.
      // Avoids issues with JSON.stringify for complex objects or undefined properties.
      // We also check if generatedImages is empty and initial is not, for initial population.
      if (initialGeneratedImagesData !== generatedImages) {
         setGeneratedImages(initialGeneratedImagesData);
      }
    } else {
      // If initialGeneratedImagesData is null or undefined (e.g., data cleared in App.jsx),
      // reset local state only if it's not already empty, to avoid needless update.
      if (generatedImages.length > 0) {
        setGeneratedImages([]);
      }
    }
    // Note: `generatedImages` is intentionally not in the dependency array here.
    // This effect is meant to react to changes in the *prop* `initialGeneratedImagesData`.
    // If `generatedImages` were included, and `setGeneratedImages` was called, it could lead to
    // loops if `App.jsx` passes the same reference back. The `initialGeneratedImagesData !== generatedImages`
    // check helps, but keeping dependencies minimal for prop-driven effects is often clearer.
  }, [initialGeneratedImagesData]);

  // Função para quebrar texto em linhas dentro de uma área retangular
  const wrapTextInArea = (ctx, text, x, y, maxWidth, maxHeight, style) => {
    if (!text) return [];

    const fontSize = style.fontSize || 24;
    const lineHeight = fontSize * (style.lineHeightMultiplier || 1.2);
    const maxLines = Math.floor(maxHeight / lineHeight);

    // Aplica a fonte antes de medir o texto
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

  // Função para aplicar efeitos de texto
  const applyTextEffects = (ctx, style) => {
    ctx.fillStyle = style.color || '#000000';
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
    ctx.textAlign = style.textAlign || 'left';
    ctx.textBaseline = style.textBaseline || 'top';

    // Configurar sombra
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

    // Configurar contorno
    if (style.textStroke) {
      ctx.strokeStyle = style.strokeColor || '#ffffff';
      ctx.lineWidth = style.strokeWidth || 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }
  };

  // Função para desenhar texto com efeitos (com suporte a HTML)
  const drawTextWithEffects = async (ctx, text, x, y, style, maxWidth, maxHeight) => {
    // Verificar se o texto contém HTML
    if (containsHtml(text)) {
      // Renderizar HTML usando html2canvas
      await renderHtmlToCanvas(ctx, text, x, y, maxWidth, maxHeight, style);
    } else {
      // Renderização de texto simples (comportamento original)
      if (style.textStroke) {
        ctx.strokeText(text, x, y);
      }
      ctx.fillText(text, x, y);
    }
  };


  // Função principal para gerar imagens
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
      // Carregar imagem de fundo uma vez
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = backgroundImage;
      });

      for (let i = 0; i < csvData.length; i++) {
        if (isCancelledRef.current) {
          break;
        }
        const record = csvData[i];

        // Criar canvas para cada registro
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Configurar canvas com alta qualidade
        canvas.width = img.width;
        canvas.height = img.height;

        // Melhorar qualidade de renderização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.textRenderingOptimization = 'optimizeQuality';

        // Desenhar imagem de fundo
        ctx.drawImage(img, 0, 0);

          // Desenhar campos do CSV com estilos individuais
          for (const field of Object.keys(record)) {
            const position = fieldPositions[field];
            const style = fieldStyles[field];

            if (!position || !position.visible || !style) continue;

            const text = record[field] || "";
            if (!text) continue;

            ctx.save(); // Salvar o estado do canvas ANTES da rotação e translação

            // Calcular posições precisas da caixa de texto na imagem final
            const posPx = {
              x: Math.round((position.x / 100) * img.width),
              y: Math.round((position.y / 100) * img.height),
              width: Math.round((position.width / 100) * img.width),
              height: Math.round((position.height / 100) * img.height)
            };

            // Aplicar rotação
            if (position.rotation) {
              const centerX = posPx.x + posPx.width / 2;
              const centerY = posPx.y + posPx.height / 2;
              ctx.translate(centerX, centerY);
              ctx.rotate(position.rotation * Math.PI / 180);
              ctx.translate(-centerX, -centerY);
            }

            // O tamanho da fonte agora é fixo, baseado no estilo, pois estamos renderizando no canvas de tamanho original.
            const fontSize = style.fontSize || 24;

            // Aplicar configurações de texto
            applyTextEffects(ctx, { ...style, fontSize: fontSize });

            const fixedPadding = 8; // Padding fixo de 8px, igual ao do CSS no TextBox

            // Área efetiva para o texto dentro da caixa, subtraindo o padding
            const effectiveTextWidth = Math.max(0, posPx.width - (2 * fixedPadding));
            const effectiveTextHeight = Math.max(0, posPx.height - (2 * fixedPadding));

            // Posição inicial do conteúdo do texto (canto superior esquerdo da área de texto)
            const textContentStartX = posPx.x + fixedPadding;
            const textContentStartY = posPx.y + fixedPadding;

            // Quebrar texto em linhas
            const lines = wrapTextInArea(ctx, text, 0, 0, effectiveTextWidth, effectiveTextHeight, { ...style, fontSize: fontSize });

            // Desenhar cada linha
            const lineHeight = fontSize * (style.lineHeightMultiplier || 1.2);
            let currentLineRenderY = textContentStartY;

            // Ajuste de alinhamento vertical
            if (style.verticalAlign === 'middle') {
              const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - fontSize) : 0);
              currentLineRenderY += (effectiveTextHeight - totalTextBlockHeight) / 2;
            } else if (style.verticalAlign === 'bottom') {
              const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - fontSize) : 0);
              currentLineRenderY += effectiveTextHeight - totalTextBlockHeight;
            }

            // Verificar se o texto contém HTML para usar renderização especial
            if (containsHtml(text)) {
              // Para HTML, renderizar diretamente na área completa
              await drawTextWithEffects(ctx, text, textContentStartX, textContentStartY, { ...style, fontSize: fontSize }, effectiveTextWidth, effectiveTextHeight);
            } else {
              // Renderização de texto simples linha por linha (comportamento original)
              for (const line of lines) {
                let currentLineRenderX = textContentStartX;
                const textMetrics = ctx.measureText(line);
                const currentTextWidth = textMetrics.width;

                // Ajuste de alinhamento horizontal
                if (style.textAlign === 'center') {
                  currentLineRenderX += (effectiveTextWidth - currentTextWidth) / 2;
                } else if (style.textAlign === 'right') {
                  currentLineRenderX += effectiveTextWidth - currentTextWidth;
                }

                const finalLineY = currentLineRenderY + (lines.indexOf(line) * lineHeight);

                // Desenhar o texto com efeitos
                await drawTextWithEffects(ctx, line, currentLineRenderX, finalLineY, { ...style, fontSize: fontSize }, effectiveTextWidth, effectiveTextHeight);
              }
            }
            ctx.restore(); // Restaurar o estado do canvas para o próximo campo
          }

        // Converter canvas para blob com alta qualidade
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', 1.0);
        });

        // Try to find existing custom data for this index to preserve it
        const existingImageDataItem = generatedImages.find(img => img.index === i);

        const imageData = {
          blob: blob,
          url: URL.createObjectURL(blob),
          record: record,
          index: i,
          filename: `midiator_${String(i + 1).padStart(3, '0')}.png`,
          // Preserve existing custom properties if they exist
          // AQUI A MUDANÇA PRINCIPAL:
          // Sempre usar o 'backgroundImage' da prop (o modelo global atual)
          // quando estivermos na função 'generateImages' (geração/regeneração global).
          // As customizações de 'customFieldPositions' e 'customFieldStyles' podem ser mantidas.
          backgroundImage: backgroundImage, // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< ESTA LINHA
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

  const handleCancelGeneration = () => {
    isCancelledRef.current = true;
  };

  // Função para fazer download de uma imagem
  const downloadImage = (imageData) => {
    const link = document.createElement('a');
    link.href = imageData.url;
    link.download = imageData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para compartilhar uma imagem
  const handleShare = async (imageData) => {
    if (!imageData || !imageData.blob) {
      alert('A imagem não está disponível para compartilhamento.');
      return;
    }

    const file = new File([imageData.blob], imageData.filename, { type: imageData.blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Compartilhar Imagem',
          text: `Confira a imagem: ${imageData.filename}`,
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
        // Não mostrar alerta para erro "AbortError", que ocorre quando o usuário fecha o diálogo de compartilhamento
        if (error.name !== 'AbortError') {
          alert('Ocorreu um erro ao tentar compartilhar a imagem.');
        }
      }
    } else {
      alert('Seu navegador não suporta o compartilhamento de arquivos.');
    }
  };

  // Função para fazer download de todas as imagens
  const downloadAllImages = () => {
    generatedImages.forEach((imageData, index) => {
      setTimeout(() => {
        downloadImage(imageData);
      }, index * 100); // Pequeno delay entre downloads
    });
  };


  // Função para fechar preview
  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedPreview(null);
  };

  // REMOVED: Old CSV text editing functions: handleEditTextCsv, handleSaveTextCsvEdit, handleCancelTextCsvEdit, handleCsvFieldChange

  // Novas funções para o editor WYSIWYG de imagem gerada
  const handleOpenGeneratedImageEditor = (imageFromClosure, index) => { // Renamed first param for clarity
    setEditingGeneratedImageIndex(index);

    // Fetch the most current version from state using the index, to avoid potential stale closure issues.
    const imageToEdit = generatedImages.find(img => img.index === index);

    if (!imageToEdit) {
      console.error(`[IGFO] handleOpenGeneratedImageEditor: Could not find image in local 'generatedImages' state with index: ${index}. imageFromClosure was:`, imageFromClosure);
      // Fallback or error handling if imageToEdit is not found, though this should ideally not happen
      // if 'index' is always valid and 'generatedImages' is properly synced.
      // For now, let's try to proceed with imageFromClosure if imageToEdit is missing,
      // though this indicates a deeper state inconsistency.
      setShowGeneratedImageEditor(true);
      return;
    }

    // console.log('[handleOpenGeneratedImageEditor] imageToEdit (freshly fetched) object:', imageToEdit);
    // console.log('[handleOpenGeneratedImageEditor] imageToEdit.customFieldPositions:', imageToEdit.customFieldPositions);
    // console.log('[handleOpenGeneratedImageEditor] imageToEdit.customFieldStyles:', imageToEdit.customFieldStyles);


    // Removed: setIndividualFieldPositions(JSON.parse(JSON.stringify(positionsToLoad)));
    // Removed: setIndividualFieldStyles(JSON.parse(JSON.stringify(stylesToLoad)));
    setShowGeneratedImageEditor(true);
  };

  const handleCloseGeneratedImageEditor = () => {
    setShowGeneratedImageEditor(false);
    setEditingGeneratedImageIndex(null);
  };

  const handleSaveIndividualModifications = (modifiedImageData) => {
    // modifiedImageData contém: index, record (potencialmente atualizado), fieldPositions (editados), fieldStyles (editados)

    const { index: imageIndex, record: updatedCsvRecord, fieldPositions: newPositions, fieldStyles: newStyles } = modifiedImageData;

    // Atualizar a imagem em generatedImages com as novas posições/estilos customizados e o record atualizado
    const updatedImages = generatedImages.map(img => {
      if (img.index === imageIndex) {
        return {
          ...img,
          record: updatedCsvRecord, // Usar o record que veio do editor
          customFieldPositions: newPositions,
          customFieldStyles: newStyles,
        };
      }
      return img;
    });
    setGeneratedImages(updatedImages); // Atualiza o estado local de IGFO

    // Informar App.jsx sobre a mudança no texto do registro para atualizar o csvData principal
    if (onThumbnailRecordTextUpdate) {
      onThumbnailRecordTextUpdate(imageIndex, updatedCsvRecord);
    }

    // Regerar a imagem específica com as novas posições/estilos e o record atualizado
    // imageToRegenerate já terá o record atualizado devido ao map acima
    const imageToRegenerate = updatedImages.find(im => im.index === imageIndex);
    if (imageToRegenerate) {
      const bgToUse = imageToRegenerate.backgroundImage || backgroundImage;
      regenerateSingleImage(
        imageIndex,
        imageToRegenerate.record, // Passar o record atualizado de imageToRegenerate
        bgToUse,
        newPositions,
        newStyles
      );
    }
    handleCloseGeneratedImageEditor(); // Fecha o editor
  };


  const regenerateSingleImage = async (index, record, currentBackgroundImage, positionsToUse, stylesToUse) => {
    // console.log('[regenerateSingleImage] Called for index:', index,
    //             'currentBackgroundImage (first 100 chars):', currentBackgroundImage ? currentBackgroundImage.substring(0, 100) : 'null',
    //             'record:', record);


    if (!currentBackgroundImage || !record) {
      // console.error('[regenerateSingleImage] Background image or record not found for regeneration.');
      return;
    }
    if (!positionsToUse || !stylesToUse) {
      // console.error('[regenerateSingleImage] Field positions or styles not provided for regeneration.');
      return;
    }

    if (!fontsLoaded) {
      alert('Aguardando carregamento das fontes. Tente novamente em alguns segundos.');
      // console.warn('[regenerateSingleImage] Fonts not loaded, aborting.');
      return;
    }

    try {
      const img = new Image();
      // console.log('[regenerateSingleImage] Attempting to load currentBackgroundImage:', currentBackgroundImage ? currentBackgroundImage.substring(0,100) + "..." : "null");
      await new Promise((resolve, reject) => {
        img.onload = () => {
          // console.log('[regenerateSingleImage] currentBackgroundImage loaded successfully. Dimensions:', img.width, 'x', img.height);
          resolve();
        };
        img.onerror = (err) => {
          // console.error('[regenerateSingleImage] Error loading currentBackgroundImage:', err, 'src:', currentBackgroundImage ? currentBackgroundImage.substring(0,100) + "..." : "null");
          reject(err);
        };
        img.src = currentBackgroundImage;
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

        ctx.save(); // Salvar o estado do canvas ANTES da rotação e translação

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

        const fixedPadding = 8; // Padding fixo de 8px, igual ao do CSS no TextBox

        // Área efetiva para o texto dentro da caixa, subtraindo o padding
        const effectiveTextWidth = Math.max(0, posPx.width - (2 * fixedPadding));
        const effectiveTextHeight = Math.max(0, posPx.height - (2 * fixedPadding));

        // Posição inicial do conteúdo do texto (canto superior esquerdo da área de texto)
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
            let currentLineRenderX = textContentStartX;
            const textMetrics = ctx.measureText(line);
            const currentTextWidth = textMetrics.width;

            if (style.textAlign === 'center') {
              currentLineRenderX += (effectiveTextWidth - currentTextWidth) / 2;
            } else if (style.textAlign === 'right') {
              currentLineRenderX += effectiveTextWidth - currentTextWidth;
            }
            
            const finalLineY = currentLineRenderY + (lines.indexOf(line) * lineHeight);
            await drawTextWithEffects(ctx, line, currentLineRenderX, finalLineY, { ...style, fontSize: fontSize }, effectiveTextWidth, effectiveTextHeight);
          }
        }
        ctx.restore(); // Restaurar o estado do canvas para o próximo campo
      }

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      // console.log('[regenerateSingleImage] Blob created. Size:', blob ? blob.size : 'null', 'Type:', blob ? blob.type : 'null');
      const newImageUrl = URL.createObjectURL(blob);
      // console.log('[regenerateSingleImage] New object URL created:', newImageUrl);

      const newImageData = {
        blob: blob,
        url: newImageUrl,
        record: record,
        index: index,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        backgroundImage: currentBackgroundImage, // Store the background image used for this specific image
        customFieldPositions: positionsToUse,   // Preserve the positions used for this regeneration
        customFieldStyles: stylesToUse          // Preserve the styles used for this regeneration
      };

      setGeneratedImages(prevImages => {
        const updatedImages = prevImages.map(img => {
          if (img.index === index) {
            if (img.url && img.url !== newImageUrl) { // Avoid revoking if it's somehow the same URL
              // console.log(`[regenerateSingleImage setGeneratedImages] Revoking old object URL for index ${index}: ${img.url}`);
              URL.revokeObjectURL(img.url);
            }
            return newImageData;
          }
          return img;
        });
        // const finalUpdatedImg = updatedImages.find(im => im.index === index);
        // console.log(`[regenerateSingleImage setGeneratedImages callback] Image index ${index} in new state. URL: ${finalUpdatedImg ? finalUpdatedImg.url : 'not found'}, BG: ${finalUpdatedImg && finalUpdatedImg.backgroundImage ? finalUpdatedImg.backgroundImage.substring(0,100) + '...' : 'undefined'}`);
        return updatedImages;
      });

    } catch (error) {
      alert(`Erro na regeneração da imagem (índice ${index}): ${error.message}`);
    }
  };

  const handleReplaceImageClick = (index) => {
    // console.log('[handleReplaceImageClick] Called with index:', index);
    setReplacingImageIndex(index);
    if (individualImageInputRef.current) {
      individualImageInputRef.current.click();
    } else {
      // console.error('[handleReplaceImageClick] individualImageInputRef.current is null');
    }
  };

  const handleIndividualImageUpload = (event) => {
    const file = event.target.files[0];
    // console.log('[handleIndividualImageUpload] Called. File:', file ? file.name : 'No file', 'replacingImageIndex:', replacingImageIndex);

    if (file && replacingImageIndex !== null) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newBgUrl = e.target.result;
        // console.log('[handleIndividualImageUpload reader.onload] newBgUrl (first 100 chars):', newBgUrl ? newBgUrl.substring(0, 100) : 'null');

        const imageToUpdate = generatedImages.find(img => img.index === replacingImageIndex);
        // console.log('[handleIndividualImageUpload reader.onload] imageToUpdate (found by index ' + replacingImageIndex + '):', imageToUpdate ? `Index: ${imageToUpdate.index}, Filename: ${imageToUpdate.filename}`: 'null');

        if (imageToUpdate) {
          // console.log('[handleIndividualImageUpload reader.onload] Calling regenerateSingleImage for index:', replacingImageIndex);
          // Passar as posições e estilos corretos (customizados da imagem ou globais)
          regenerateSingleImage(
            replacingImageIndex,
            imageToUpdate.record,
            newBgUrl, // This is the new individual background
            imageToUpdate.customFieldPositions || fieldPositions, // Use custom if available, else global
            imageToUpdate.customFieldStyles || fieldStyles     // Use custom if available, else global
          );
        } else {
          // console.error('[handleIndividualImageUpload reader.onload] Could not find imageToUpdate for index:', replacingImageIndex);
        }
      };
      reader.onerror = () => {
        // console.error('[handleIndividualImageUpload reader.onerror] FileReader error:', error);
      };
      reader.readAsDataURL(file);
    } else {
      // console.warn('[handleIndividualImageUpload] No file selected or replacingImageIndex is null.');
    }

    // Reset the input value to allow uploading the same file again if needed
    if (individualImageInputRef.current) {
      individualImageInputRef.current.value = "";
    }
    setReplacingImageIndex(null); // Reset after upload attempt
  };


  // Função para upload para Google Drive
  const uploadToGoogleDrive = async () => {
    if (!authConfigured) {
      setShowAuthSetup(true);
      return;
    }

    if (!projectName.trim()) {
      alert('Por favor, digite um nome para o projeto.');
      return;
    }

    if (generatedImages.length === 0) {
      alert('Nenhuma imagem foi gerada ainda.');
      return;
    }

  // Lock síncrono com useRef para prevenir dupla execução imediata
  if (uploadLock.current) {
    console.warn(`[${new Date().toISOString()}] uploadToGoogleDrive: Upload já em progresso (detectado pelo uploadLock). Abortando.`);
    return;
  }
  uploadLock.current = true; // Define o lock imediatamente

  // Salvaguarda original com useState (ainda útil para desabilitar UI e como fallback)
  if (isUploadingToDrive) {
    console.warn(`[${new Date().toISOString()}] uploadToGoogleDrive: Upload já em progresso (detectado pelo isUploadingToDrive). Abortando. (uploadLock deveria ter pego isso)`);
    uploadLock.current = false; // Resetar o lock se esta guarda pegar (improvável se o lock funcionar)
    return;
  }

  setIsUploadingToDrive(true); // Para desabilitar UI e lógica dependente de estado
  console.log(`[${new Date().toISOString()}] uploadToGoogleDrive: Iniciando upload. Project: ${projectName}. isUploadingToDrive set to TRUE. uploadLock set to TRUE.`);
  setDriveResult(null);

  try {
    // 1. Criar pasta principal do projeto (ou obter existente)
    console.log(`[${new Date().toISOString()}] Tentando criar/obter pasta do projeto: ${projectName}`);
    const folder = await googleDriveAPI.createFolder(projectName); // createFolder agora é idempotente por nome na raiz
    console.log(`[${new Date().toISOString()}] Pasta do projeto obtida/criada ID: ${folder.id}`);

      // 2. Criar subpasta para as imagens (agora vamos usar essa para tudo)
    // Para a subpasta, queremos que ela seja sempre criada dentro da pasta do projeto,
    // mesmo que uma com nome 'Conteúdo' já exista em outro projeto.
    // A versão atual de createFolder em googleDriveAPI.js já lida com parentId.
    // Se quisermos que a subpasta 'Conteúdo' também seja idempotente *dentro* da pasta do projeto:
    console.log(`[${new Date().toISOString()}] Tentando criar/obter subpasta 'Conteúdo' dentro de ${folder.id}`);
    const contentFolder = await googleDriveAPI.createFolder('Conteúdo', folder.id); // Passando folder.id como parentId
    console.log(`[${new Date().toISOString()}] Subpasta 'Conteúdo' obtida/criada ID: ${contentFolder.id}`);
    // A linha duplicada "const contentFolder = await googleDriveAPI.createFolder('Conteúdo', folder.id);" foi removida.

      const uploadResults = [];
      const sheetData = [];

      // Obter todos os cabeçalhos únicos de todas as linhas do CSV
      const allHeaders = Array.from(new Set(
        generatedImages.flatMap(img => Object.keys(img.record))
      ));

      // 3. Upload de cada imagem para a pasta de conteúdo
      for (let i = 0; i < generatedImages.length; i++) {
        const imageData = generatedImages[i];

        try {
          const result = await googleDriveAPI.uploadFile(
            imageData.blob,
            imageData.filename,
            contentFolder.id // Enviando para a pasta de conteúdo
          );

          uploadResults.push({
            filename: imageData.filename,
            success: true,
            fileId: result.id
          });

          // Preparar dados para a planilha
          const row = [
            i + 1,
            `https://drive.google.com/file/d/${result.id}/view?usp=sharing`,
            ...allHeaders.map(header => imageData.record[header] || '')
          ];

          sheetData.push(row);

        } catch (error) {
          uploadResults.push({
            filename: imageData.filename,
            success: false,
            error: error.message
          });
        }
      }

      // 4. Criar planilha na MESMA pasta das imagens
      if (sheetData.length > 0) {
        const headers = [
          'Nº',
          'Link do Arquivo',
          ...allHeaders
        ];

        // Agora criando na pasta de conteúdo
        await googleDriveAPI.createSpreadsheet(
          `Relação de Arquivos - ${projectName}`,
          [headers, ...sheetData],
          contentFolder.id // <-- Aqui está a mudança principal
        );
      }

      // 5. Atualizar estado com resultados
      setDriveResult({
        folderId: folder.id,
        folderName: projectName,
        uploads: uploadResults,
        successCount: uploadResults.filter(r => r.success).length,
        totalCount: uploadResults.length,
        contentFolderId: contentFolder.id // Adicionando para referência
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Erro no upload para Google Drive:`, error);
      alert(`Erro no upload: ${error.message}`);
    } finally {
      console.log(`[${new Date().toISOString()}] FINALLY block: Resetando uploadLock e isUploadingToDrive.`);
      uploadLock.current = false; // Libera o lock síncrono
      setIsUploadingToDrive(false); // Libera o estado da UI
    }
  };
  // Callback para quando a autenticação for bem-sucedida
  const handleAuthSuccess = () => {
    setAuthConfigured(true);
    setShowAuthSetup(false);
  };

  // Callback para quando houver erro na autenticação
  const handleAuthError = (error) => {
    console.error('Erro na autenticação:', error);
    setAuthConfigured(false);
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

          {/* Integração Google Drive */}
          {generatedImages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                <Google sx={{ mr: 1, verticalAlign: 'middle' }} />
                Integração Google Drive
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={driveIntegration}
                        onChange={(e) => setDriveIntegration(e.target.checked)}
                      />
                    }
                    label="Ativar integração com Google Drive"
                  />
                </Grid>

                {driveIntegration && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nome do Projeto"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Ex: Certificados 2024"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={uploadToGoogleDrive}
                        disabled={isUploadingToDrive}
                        startIcon={<CloudUpload />}
                        fullWidth
                      >
                        {isUploadingToDrive ? 'Enviando...' : 'Enviar para Google Drive'}
                      </Button>
                    </Grid>
                  </>
                )}
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

          {/* Lista de imagens geradas */}
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
                          width: 'auto', // Permitir que a largura se ajuste ao conteúdo + padding
                          maxWidth: '100%', // Não exceder o contêiner do card
                          height: 'auto', // Permitir que a altura se ajuste
                          maxHeight: '180px', // Altura máxima total (incluindo padding da borda)
                          display: 'inline-flex', // Para que o Box se ajuste ao tamanho da imagem + padding
                          flexDirection: 'column', // Para centralizar se necessário
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '10px', // Espaçamento para a "borda branca" da foto
                          backgroundColor: 'white', // Cor da borda da foto
                          borderRadius: '4px', // Leve arredondamento nas bordas externas
                          mb: 1,
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2), 0 6px 20px rgba(0, 0, 0, 0.19)', // Efeito de sombra
                          cursor: 'pointer', // Add cursor pointer to indicate it's clickable
                          '&:hover img': {
                            transform: 'scale(1.03)', // Zoom um pouco mais sutil na imagem interna
                          },
                          '&:hover': { // Sutil levantamento do card no hover
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25), 0 10px 25px rgba(0, 0, 0, 0.22)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out', // Transição suave para o hover do Box
                        }}
                        onClick={() => handleOpenGeneratedImageEditor(imageData, imageData.index)} // Add onClick handler here
                        >
                          <img
                            key={imageData.url} // Força a recriação da tag img quando a URL muda
                            src={imageData.url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              display: 'block',
                              maxWidth: '100%',
                              maxHeight: '150px', // Altura máxima da imagem em si, para caber no padding
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              transition: 'transform 0.3s ease-in-out',
                              // Adicionar uma pequena sombra interna na imagem para separá-la da borda branca
                              boxShadow: 'inset 0 0 2px rgba(0,0,0,0.1)',
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          {/* O IconButton de Visualizar foi removido assumindo que o clique na imagem já chama openPreview,
                               ou para resolver a questão de "duas opções de visualizar". 
                               Se o clique na imagem não abre o preview, este botão deveria ser restaurado. */}
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
                          {/* Botão de Compartilhar */}
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

      {/* Dialog de Preview */}
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

      {/* Dialog de Configuração de Autenticação */}
      <Dialog open={showAuthSetup} onClose={() => setShowAuthSetup(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Configuração Google Drive
          <IconButton onClick={() => setShowAuthSetup(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <GoogleAuthSetup onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} />
        </DialogContent>
      </Dialog>

      {/* Removed: <canvas ref={canvasRef} style={{ display: 'none' }} /> */}

      {/* REMOVED: Old CSV text editing Dialog */}

      {showGeneratedImageEditor && editingGeneratedImageIndex !== null && (() => {
        const imageToEdit = generatedImages.find(img => img.index === editingGeneratedImageIndex);
        if (!imageToEdit) {
          console.error(`[IGFO] Render: Could not find image with index ${editingGeneratedImageIndex} to edit.`);
          return null;
        }

        const positionsToLoad = imageToEdit.customFieldPositions !== undefined
          ? imageToEdit.customFieldPositions
          : fieldPositions; // global fieldPositions prop from App.jsx

        const stylesToLoad = imageToEdit.customFieldStyles !== undefined
          ? imageToEdit.customFieldStyles
          : fieldStyles;    // global fieldStyles prop from App.jsx

        return (
          <GeneratedImageEditor
            open={showGeneratedImageEditor}
            onClose={handleCloseGeneratedImageEditor}
            imageData={imageToEdit} // Pass the full, most current image object
            globalCsvHeaders={csvHeaders}
            initialFieldPositions={JSON.parse(JSON.stringify(positionsToLoad || {}))}
            initialFieldStyles={JSON.parse(JSON.stringify(stylesToLoad || {}))}
            onSave={handleSaveIndividualModifications}
            colorPalette={colorPalette}
            globalBackgroundImage={backgroundImage}
            originalImageSize={originalImageSize} // Pass the prop here
          />
        );
      })()}

      {/* Hidden file input for individual image replacement */}
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