import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Fab,
  Stack
} from '@mui/material';
import {
  Add,
  CenterFocusStrong,
  SkipPrevious,
  ArrowLeft,
  ArrowRight,
  SkipNext,
  Edit
} from '@mui/icons-material';
import HtmlTextBox from './HtmlTextBox';
import FormattingDrawer from './FormattingDrawer'; // Import the new drawer

const COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  textAlign: 'left',
  verticalAlign: 'top',
  lineHeightMultiplier: 1.2,
  textStroke: false,
  strokeColor: '#ffffff',
  strokeWidth: 2,
  textShadow: false,
  shadowColor: '#000000',
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
};

import { composeImage } from '../utils/imageComposer';

// Helper function to find the best font size to fit text within a box
const findBestFitFontSize = (text, fontFamily, fontWeight, boxWidth, boxHeight) => {
  if (!text || !boxWidth || !boxHeight) {
    return 24; // Return a default size if inputs are invalid
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let minFontSize = 8;
  let maxFontSize = 300; // A reasonable max size
  let bestSize = minFontSize;

  // Use binary search to find the best font size efficiently
  while (minFontSize <= maxFontSize) {
    const currentSize = Math.floor((minFontSize + maxFontSize) / 2);
    if (currentSize <= minFontSize) break; // Avoid infinite loop

    ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);

    // A simple check: does it fit horizontally and vertically?
    // Add a small buffer for vertical fit.
    if (metrics.width < boxWidth && currentSize < boxHeight) {
      bestSize = currentSize; // This size is valid, try for a larger one
      minFontSize = currentSize + 1;
    } else {
      maxFontSize = currentSize - 1; // It's too big, try a smaller size
    }
  }
  return bestSize;
};


const FieldPositioner = ({
  backgroundImage,
  csvHeaders,
  fieldPositions,
  setFieldPositions,
  fieldStyles,
  setFieldStyles,
  csvData,
  onImageDisplayedSizeChange,
  colorPalette,
  onSelectFieldExternal,
  onCsvDataUpdate, // New prop to notify App.jsx of changes
  originalImageSize,
  darkMode,
  imageFilters,
  includeLogo,
  includeEmpresa
}) => {
  const [selectedField, setSelectedField] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [composedImageUrl, setComposedImageUrl] = useState(null);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!backgroundImage) {
      setComposedImageUrl(null);
      return;
    }

    const generateComposedImage = async () => {
      setIsComposing(true);
      try {
        const composedUrl = await composeImage(
          backgroundImage,
          '/logo.png',
          '/empresa.png',
          imageFilters,
          includeLogo,
          includeEmpresa
        );
        setComposedImageUrl(composedUrl);
      } catch (error) {
        console.error("Error composing image in FieldPositioner:", error);
        setComposedImageUrl(backgroundImage); // Fallback to original image
      } finally {
        setIsComposing(false);
      }
    };

    generateComposedImage();
  }, [backgroundImage, imageFilters, includeLogo, includeEmpresa]);

  // Campos que devem usar renderização HTML
  const htmlFields = ['mensagem', 'texto principal', 'descrição', 'conteúdo', 'texto'];

  const isHtmlField = (fieldName) => {
    return htmlFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  };

  const handleFieldSelectInternal = useCallback((fieldToSelect) => {
    setSelectedField(fieldToSelect);
    if (onSelectFieldExternal) {
      onSelectFieldExternal(fieldToSelect);
    }
  }, [onSelectFieldExternal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setImageSize({ width, height });
        if (onImageDisplayedSizeChange) {
          onImageDisplayedSizeChange({ width, height });
        }
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [onImageDisplayedSizeChange]);

  // Effect to initialize or update field positions and styles based on csvHeaders and props.
  // This ensures that every field in csvHeaders has a corresponding position and a complete style object.
  useEffect(() => {
    // Diagnostic logs removed.

    if (csvHeaders.length > 0) {
      const newCombinedPositions = {};
      const newCombinedStyles = {};
      let positionsHaveChanged = false;
      let stylesHaveChanged = false;

      csvHeaders.forEach((header, index) => {
        // Logic for positions: use existing if available, else default.
        const existingPosition = fieldPositions[header];
        const defaultPosition = {
          x: 10 + (index % 3) * 30,
          y: 10 + Math.floor(index / 3) * 25,
          width: 25,
          height: 15,
          visible: true,
          rotation: 0 // Initialize rotation
        };
        // Ensure all default keys are present if existingPosition is only partial
        newCombinedPositions[header] = existingPosition
          ? { ...defaultPosition, ...existingPosition, rotation: existingPosition.rotation || 0 }
          : defaultPosition;

        // Logic for styles: merge existing styles with a complete default set.
        // Custom styles from fieldStyles[header] (from parent) override the defaults.
        newCombinedStyles[header] = {
          ...COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER,
          ...(fieldStyles[header] || {}),
        };
      });

      // Check if the newly combined positions are different from the current prop
      if (JSON.stringify(newCombinedPositions) !== JSON.stringify(fieldPositions)) {
        positionsHaveChanged = true;
      }

      // Check if the newly combined styles are different from the current prop
      if (JSON.stringify(newCombinedStyles) !== JSON.stringify(fieldStyles)) {
        stylesHaveChanged = true;
      }

      // Call parent setters only if there's an actual change.
      if (positionsHaveChanged) {
        setFieldPositions(newCombinedPositions);
      }
      if (stylesHaveChanged) {
        setFieldStyles(newCombinedStyles);
      }
    }
    // This effect depends on the content of fieldPositions and fieldStyles objects, not just their references.
    // Stringifying them for the dependency array is a common way to track changes in object content,
    // though it can be performance-intensive for very large/complex objects.
    // For this use case, it's likely acceptable.
  }, [csvHeaders, fieldPositions, fieldStyles, setFieldPositions, setFieldStyles]);

  const handlePositionChange = (field, newPosition) => {
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...newPosition
      }
    }));
  };

  const handleSizeChange = (field, newSize) => {
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...newSize
      }
    }));
  };

  const centerAllFields = () => {
    const newPositions = { ...fieldPositions };
    csvHeaders.forEach((header) => {
      if (newPositions[header]) {
        const fieldWidth = newPositions[header].width || 25; // Usa 25 como padrão se a largura não estiver definida
        newPositions[header] = {
          ...newPositions[header],
          x: 50 - (fieldWidth / 2),
        };
      }
    });
    setFieldPositions(newPositions);
  };

  const autoArrangeFields = () => {
    // 1. Define Safe Zone and Field Roles
    const safeZoneMargins = {
      top: 10, // 10%
      bottom: 10, // 10%
      left: 5, // 5%
      right: 5, // 5%
    };

    const titleField = csvHeaders.length > 0 ? csvHeaders[0] : null;
    const subtitleField = csvHeaders.length > 1 ? csvHeaders[1] : null;
    const sideLabelField = csvHeaders.length > 2 ? csvHeaders[2] : null;

    const newPositions = { ...fieldPositions };
    const newStyles = { ...fieldStyles };

    // 2. Calculate Safe Zone and Bands
    const safeZone = {
      x: safeZoneMargins.left,
      y: safeZoneMargins.top,
      width: 100 - safeZoneMargins.left - safeZoneMargins.right,
      height: 100 - safeZoneMargins.top - safeZoneMargins.bottom,
    };

    const bandHeight = safeZone.height / 3;
    const innerMargin = 2; // 2% margin inside bands/safezone

    // Rule for Title Field (Top Band)
    if (titleField) {
      const titleHeight = bandHeight - (innerMargin * 2);
      const titleWidth = safeZone.width - (innerMargin * 2);

      newPositions[titleField] = {
        ...(newPositions[titleField] || {}),
        x: safeZone.x + innerMargin,
        y: safeZone.y + innerMargin,
        width: titleWidth,
        height: titleHeight,
        rotation: 0,
        visible: true,
      };

      const titleBoxWidthPx = (titleWidth / 100) * (originalImageSize?.width || imageSize.width);
      const titleBoxHeightPx = (titleHeight / 100) * (originalImageSize?.height || imageSize.height);
      const titleText = csvData[currentPreviewIndex]?.[titleField] || `[${titleField}]`;

      const bestFontSize = findBestFitFontSize(
        titleText,
        'Anton',
        'normal',
        titleBoxWidthPx,
        titleBoxHeightPx
      );

      newStyles[titleField] = {
        ...(newStyles[titleField] || {}),
        fontFamily: 'Anton',
        fontSize: bestFontSize,
        textAlign: 'center',
        verticalAlign: 'middle',
        textShadow: true,
        shadowColor: '#000000',
        shadowBlur: 5,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
      };
    }

    // Rule for Subtitle Field (Third Band)
    if (subtitleField) {
      const subtitleHeight = bandHeight - (innerMargin * 2);
      const subtitleWidth = safeZone.width - (innerMargin * 2);
      newPositions[subtitleField] = {
        ...(newPositions[subtitleField] || {}),
        x: safeZone.x + innerMargin,
        y: safeZone.y + (bandHeight * 2) + innerMargin,
        width: subtitleWidth,
        height: subtitleHeight,
        rotation: 0,
        visible: true,
      };
      newStyles[subtitleField] = {
        ...(newStyles[subtitleField] || {}),
        textAlign: 'center',
        verticalAlign: 'middle',
      };
    }

    // Rule for Side Label Field (Right Side, Vertical)
    if (sideLabelField) {
      const sideLabelStyle = newStyles[sideLabelField] || COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER;
      const fontSizePx = sideLabelStyle.fontSize || 24;

      // A altura da caixa (que se torna a largura do texto após rotação) é baseada na altura da fonte.
      const labelHeight = (fontSizePx / (originalImageSize?.height || imageSize.height || 1)) * 100 * 1.5;
      // A largura da caixa (que se torna a altura do texto) é uma grande parte da altura da zona segura.
      const labelWidth = safeZone.height * 0.7;

      // Posicionar a caixa de texto no lado direito, centralizada verticalmente.
      // O 'x' é calculado para que a borda direita da caixa de texto encoste na borda direita da safeZone.
      const x = safeZone.x + safeZone.width - labelWidth - innerMargin;
      // O 'y' é calculado para centralizar a caixa verticalmente.
      const y = safeZone.y + (safeZone.height - labelHeight) / 2;

      newPositions[sideLabelField] = {
        ...(newPositions[sideLabelField] || {}),
        x: x,
        y: y,
        width: labelWidth,
        height: labelHeight,
        rotation: 270,
        visible: true,
      };
      newStyles[sideLabelField] = {
        ...(newStyles[sideLabelField] || {}),
        textAlign: 'center',
        verticalAlign: 'middle',
      };
    }

    // Hide other fields
    csvHeaders.forEach((header, index) => {
      if (index > 2) {
        if (newPositions[header]) {
          newPositions[header].visible = false;
        }
      }
    });

    setFieldPositions(newPositions);
    setFieldStyles(newStyles);
  };

  const handleColorCircleClick = (color) => {
    if (selectedField) {
      setFieldStyles(prev => ({
        ...prev,
        [selectedField]: {
          ...prev[selectedField],
          color: color
        }
      }));
    }
  };

  // Handler para prevenir scroll durante interações
  const handleContainerTouchStart = (e) => {
    // Só prevenir se não estiver clicando em um TextBox
    if (!e.target.closest('.text-box')) {
      setIsInteracting(true);
    }
  };

  const handleContainerTouchEnd = () => {
    setIsInteracting(false);
  };

  const handleContentChange = useCallback((field, newText) => {
    if (!csvData || csvData.length === 0) return;

    const updatedCsvData = csvData.map((row, index) => {
      if (index === currentPreviewIndex) {
        return {
          ...row,
          [field]: newText,
        };
      }
      return row;
    });

    // Propagate change upwards
    if (onCsvDataUpdate) {
      onCsvDataUpdate(updatedCsvData);
    }
  }, [csvData, currentPreviewIndex, onCsvDataUpdate]);

  // Navigation handlers
  const handleNextPreview = () => {
    setCurrentPreviewIndex(prevIndex => Math.min(prevIndex + 1, csvData.length - 1));
  };

  const handlePreviousPreview = () => {
    setCurrentPreviewIndex(prevIndex => Math.max(prevIndex - 1, 0));
  };

  const handleFirstPreview = () => {
    setCurrentPreviewIndex(0);
  };

  const handleLastPreview = () => {
    setCurrentPreviewIndex(csvData.length - 1);
  };

  // Efeito para gerenciar scroll durante interações
  useEffect(() => {
    if (isInteracting) {
      // Prevenir scroll apenas durante interações ativas
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };
    }
  }, [isInteracting]);

  if (!backgroundImage) {
    return (
      <Box
        sx={{
          height: 400,
          border: '2px dashed #ccc',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}
      >
        <Typography color="textSecondary" variant="h6">
          Carregue uma imagem de fundo para posicionar os campos
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={12}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Editor de Campos
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={centerAllFields}
                  startIcon={<CenterFocusStrong />}
                >
                  Centralizar
                </Button>
                <Button
                  size="small"
                  onClick={autoArrangeFields}
                  startIcon={<Add />}
                >
                  Auto Organizar
                </Button>
              </Stack>
            </Stack>

            {csvData.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Carregue um arquivo CSV para ver o preview dos dados
              </Alert>
            )}

            <Box
              ref={containerRef}
              className="text-container"
              sx={{
                position: 'relative',
                border: '2px solid #ddd',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#fff',
                cursor: 'default',
                touchAction: 'pan-x pan-y',
                WebkitOverflowScrolling: 'touch',
                '&.interacting': {
                  touchAction: 'none'
                }
              }}
              onMouseDown={(e) => {
                if (e.target.closest('.text-box')) return;
                handleFieldSelectInternal(null)
              }}
              onTouchStart={handleContainerTouchStart}
              onTouchEnd={handleContainerTouchEnd}
            >
              {isComposing && (
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px' }}>
                  <Typography>Atualizando...</Typography>
                </Box>
              )}
              <img
                src={composedImageUrl || backgroundImage}
                alt="Background"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                  opacity: isComposing ? 0.5 : 1,
                  transition: 'opacity 0.3s',
                }}
                draggable={false}
              />

              {csvHeaders && csvHeaders.length > 0
                ? csvHeaders.map(header => {
                  const position = fieldPositions[header];
                  const style = fieldStyles[header];
                  if (!position || !position.visible) return null;
                  const record = csvData[currentPreviewIndex] || {};
                  const sampleData = record[header] !== undefined ? record[header] : `[${header}]`;

                  return (
                    <HtmlTextBox
                      key={header}
                      field={header}
                      position={position}
                      style={style}
                      content={sampleData}
                      isSelected={selectedField === header}
                      onSelect={handleFieldSelectInternal}
                      onPositionChange={handlePositionChange}
                      onSizeChange={handleSizeChange}
                      containerSize={imageSize}
                      onContentChange={handleContentChange}
                      rotation={position.rotation}
                      originalImageSize={originalImageSize}
                      fontScale={(imageSize.width && originalImageSize?.width) ? imageSize.width / originalImageSize.width : 1}
                      enableHtmlRendering={isHtmlField(header)}
                      darkMode={darkMode}
                    />
                  );
                })
                : null
              }
            </Box>

            {csvData && csvData.length > 1 && (
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 2 }} flexWrap="wrap">
                <Tooltip title="Primeiro Registro"><span><IconButton onClick={handleFirstPreview} disabled={currentPreviewIndex === 0} size="small"><SkipPrevious /></IconButton></span></Tooltip>
                <Tooltip title="Registro Anterior"><span><IconButton onClick={handlePreviousPreview} disabled={currentPreviewIndex === 0} size="small"><ArrowLeft /></IconButton></span></Tooltip>
                <Typography variant="body2" sx={{ minWidth: '100px', textAlign: 'center' }}>Registro: {currentPreviewIndex + 1} / {csvData.length}</Typography>
                <Tooltip title="Próximo Registro"><span><IconButton onClick={handleNextPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><ArrowRight /></IconButton></span></Tooltip>
                <Tooltip title="Último Registro"><span><IconButton onClick={handleLastPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><SkipNext /></IconButton></span></Tooltip>
              </Stack>
            )}

            {colorPalette && colorPalette.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                {colorPalette.map((color, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: '2px solid #fff',
                      boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                      touchAction: 'manipulation',
                      '&:active': { transform: 'scale(0.95)' }
                    }}
                    onClick={() => handleColorCircleClick(color)}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

    </Grid>
  );
};

export default FieldPositioner;

