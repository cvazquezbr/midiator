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
  Stack,
  CircularProgress
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
import DraggableElement from './DraggableElement';
import TextEditorDialog from './TextEditorDialog';

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
  backgroundColor: '#000000',
  backgroundOpacity: 0,
};

import { isHtmlField } from '../lib/utils';
import { autoArrangeFields as autoArrangeFieldsUtil } from '../utils/autoArrange';


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
  standardsColors,
  onSelectFieldExternal,
  onCsvDataUpdate, // New prop to notify App.jsx of changes
  originalImageSize,
  darkMode,
  brandElements,
  setBrandElements,
  backgroundElement,
  setBackgroundElement,
  onOpenHtmlEditor,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  onFontScaleChange,
  isCropping,
  setIsCropping,
}) => {
  console.log('[FieldPositioner] props:', { backgroundImage, backgroundElement, fieldStyles });
  const [selectedField, setSelectedField] = useState(null);
  const [renderedImageMetrics, setRenderedImageMetrics] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [fontScale, setFontScale] = useState(1);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef(null);
  const [internalImageSize, setInternalImageSize] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (backgroundImage) {
      setIsImageLoading(true);
      setImageError(false);
      const img = new Image();
      img.onload = () => {
        setInternalImageSize({ width: img.width, height: img.height });
        setIsImageLoading(false);
      };
      img.onerror = () => {
        console.error("Error loading background image.");
        setImageError(true);
        setIsImageLoading(false);
        setInternalImageSize(null); // Reset size on error
      };
      img.src = backgroundImage;
    } else {
      setInternalImageSize(null);
      setIsImageLoading(false);
      setImageError(false);
    }
  }, [backgroundImage]);

  // Use the verified internal size for all calculations, falling back to the prop if not yet loaded.
  const effectiveImageSize = internalImageSize || originalImageSize;

  // The backgroundImage prop is now assumed to be the final, composed background for the editor preview.
  // No further composition is needed here.

  const handleFieldSelectInternal = useCallback((fieldToSelect) => {
    setSelectedField(fieldToSelect);
    if (onSelectFieldExternal) {
      onSelectFieldExternal(fieldToSelect);
    }
  }, [onSelectFieldExternal]);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Since the container has the correct aspect ratio and the image has object-fit: fill,
        // the rendered metrics are simply the container's dimensions.
        setRenderedImageMetrics({ width, height, x: 0, y: 0 });

        if (onImageDisplayedSizeChange) {
          onImageDisplayedSizeChange({ width, height });
        }
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [onImageDisplayedSizeChange, backgroundImage]);

  // This component should not be responsible for initializing or updating the parent's state.
  // It should just render the props it receives. The parent (HomePage) is responsible for
  // ensuring the fieldPositions and fieldStyles objects are complete.
  // The previous useEffect was causing state conflicts and loops. It has been removed.

  const handlePositionChange = (id, newPosition) => {
    if (id === '__background__') {
      setBackgroundElement(prev => ({ ...prev, ...newPosition }));
    } else if (id === '__cropbox__') {
      setBackgroundElement(prev => ({ ...prev, crop: { ...prev.crop, ...newPosition } }));
    } else if (Object.prototype.hasOwnProperty.call(fieldPositions, id)) {
      setFieldPositions(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...newPosition
        }
      }));
    } else {
      setBrandElements(prev => prev.map(el =>
        el.id === id ? { ...el, ...newPosition } : el
      ));
    }
  };

  const handleSizeChange = (id, newSize) => {
    if (id === '__background__') {
      setBackgroundElement(prev => ({ ...prev, ...newSize }));
    } else if (id === '__cropbox__') {
      setBackgroundElement(prev => ({ ...prev, crop: { ...prev.crop, ...newSize } }));
    } else if (Object.prototype.hasOwnProperty.call(fieldPositions, id)) {
      setFieldPositions(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...newSize
        }
      }));
    } else {
      setBrandElements(prev => prev.map(el =>
        el.id === id ? { ...el, ...newSize } : el
      ));
    }
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
    const { newPositions, newStyles } = autoArrangeFieldsUtil({
      csvHeaders,
      fieldPositions,
      fieldStyles,
      csvData,
      effectiveImageSize,
      standardsColors,
      currentPreviewIndex,
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

  const aspectRatio = (effectiveImageSize?.width && effectiveImageSize?.height)
    ? `${effectiveImageSize.width} / ${effectiveImageSize.height}`
    : '16 / 9';

  // Effect to calculate font scale based on the actual rendered image size
  useEffect(() => {
    if (renderedImageMetrics.width > 0 && effectiveImageSize?.width > 0) {
      // The scale is uniform, so we can just use the width ratio.
      const scale = renderedImageMetrics.width / effectiveImageSize.width;
      setFontScale(scale);
      if (onFontScaleChange) {
        onFontScaleChange(scale);
      }
    } else {
      setFontScale(1);
      if (onFontScaleChange) {
        onFontScaleChange(1);
      }
    }
  }, [renderedImageMetrics, effectiveImageSize, onFontScaleChange]);

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

  const completeFieldStyles = React.useMemo(() => {
    const safeHeaders = Array.isArray(csvHeaders) ? csvHeaders : [];
    const styles = {};
    safeHeaders.forEach(header => {
      styles[header] = {
        ...COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER,
        ...(fieldStyles?.[header] || {}),
      };
    });
    return styles;
  }, [csvHeaders, fieldStyles]);

  const renderableElements = React.useMemo(() => {
    const elements = [
      // Add background element first so it's at the bottom
      ...(backgroundElement ? [{
        id: '__background__',
        type: 'background',
        position: backgroundElement,
        style: backgroundElement.filters,
        content: backgroundImage,
        zIndex: -1, // Ensure it's always at the back
        rotation: backgroundElement.rotation,
        fontScale: 1,
        enableHtmlRendering: false,
      }] : []),
      ...(isCropping && backgroundElement ? [{
        id: '__cropbox__',
        type: 'cropbox',
        position: backgroundElement.crop || { x: 10, y: 10, width: 80, height: 80 },
        style: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        content: '',
        zIndex: 1000,
        rotation: 0,
        fontScale: 1,
        enableHtmlRendering: false,
      }] : []),
      ...(csvHeaders || [])
        .map(header => {
          const position = fieldPositions[header];
          const style = completeFieldStyles[header]; // Use the guaranteed complete style object
          if (!position || !position.visible) return null;

          const record = csvData[currentPreviewIndex] || {};
          const sampleData = record[header] !== undefined ? record[header] : `[${header}]`;

          return {
            id: header,
            type: 'text',
            position,
            style,
            content: sampleData,
            zIndex: position.zIndex || 0,
            rotation: position.rotation,
            fontScale: fontScale,
            enableHtmlRendering: isHtmlField(header),
          };
        })
        .filter(Boolean),
      ...(brandElements || [])
        .map(element => {
          if (element.visible === false) return null;
          return {
            id: element.id,
            type: 'image',
            position: element,
            style: { ...element.filters },
            content: element.url,
            zIndex: element.zIndex || 0,
            rotation: element.rotation,
            fontScale: 1,
            enableHtmlRendering: false,
          };
        })
        .filter(Boolean)
    ];

    elements.sort((a, b) => a.zIndex - b.zIndex);
    return elements;
  }, [backgroundElement, backgroundImage, isCropping, csvHeaders, fieldPositions, fieldStyles, brandElements, csvData, currentPreviewIndex, fontScale]);

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
      <Grid item xs={12} lg={9}>
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
                },
                aspectRatio: aspectRatio,
                maxWidth: '800px',
                maxHeight: '85vh',
                mx: 'auto',
              }}
              onTouchStart={handleContainerTouchStart}
              onTouchEnd={handleContainerTouchEnd}
            >
              {isImageLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                  <CircularProgress />
                </Box>
              ) : imageError ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                  <Alert severity="error">Falha ao carregar a imagem.</Alert>
                </Box>
              ) : (
                <>
                  <Box
                    className="elements-wrapper"
                    sx={{
                      position: 'absolute',
                      left: `${renderedImageMetrics.x}px`,
                      top: `${renderedImageMetrics.y}px`,
                      width: `${renderedImageMetrics.width}px`,
                      height: `${renderedImageMetrics.height}px`,
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        handleFieldSelectInternal('__background__');
                      }
                    }}
                    onTouchStart={(e) => {
                      if (e.target === e.currentTarget) {
                        handleFieldSelectInternal('__background__');
                      }
                    }}
                  >
                    {renderedImageMetrics.width > 0 && renderableElements.map(element => (
                      <DraggableElement
                        key={element.id}
                        element={element.type === 'image' || element.type === 'background' || element.type === 'cropbox' ? { ...element.position, type: element.type } : { id: element.id, type: 'text' }}
                        position={element.position}
                        style={element.style}
                        content={element.content}
                        isSelected={selectedField === element.id}
                        onSelect={handleFieldSelectInternal}
                        onPositionChange={handlePositionChange}
                        onSizeChange={handleSizeChange}
                        containerSize={renderedImageMetrics}
                        onContentChange={element.type === 'text' ? handleContentChange : undefined}
                        onDoubleClick={() => {
                          if (element.type === 'text' && isHtmlField(element.id)) {
                            onOpenHtmlEditor(element.id);
                          }
                        }}
                        rotation={element.rotation}
                        originalImageSize={effectiveImageSize}
                        fontScale={element.fontScale}
                        enableHtmlRendering={element.enableHtmlRendering}
                        darkMode={darkMode}
                      />
                    ))}
                  </Box>
                </>
              )}
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
