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
  aspectRatio: aspectRatioProp,
  csvHeaders,
  fieldPositions,
  setFieldPositions,
  fieldStyles,
  setFieldStyles,
  csvData,
  onImageDisplayedSizeChange,
  colorPalette,
  standardsColors,
  selectedField, // Use prop from parent
  setSelectedField, // Use prop from parent
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
  pageState,
}) => {
  console.log('[FieldPositioner] props:', { backgroundElement, fieldStyles, pageState });
  const [renderedImageMetrics, setRenderedImageMetrics] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [fontScale, setFontScale] = useState(1);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef(null);

  const effectiveImageSize = originalImageSize;

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
        setRenderedImageMetrics({ width, height, x: 0, y: 0 });

        if (onImageDisplayedSizeChange) {
          onImageDisplayedSizeChange({ width, height });
        }
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [onImageDisplayedSizeChange]);

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
        const fieldWidth = newPositions[header].width || 25;
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
          ...(prev[selectedField] || {}),
          color: color
        }
      }));
    }
  };

  const handleContainerTouchStart = (e) => {
    if (!e.target.closest('.text-box')) {
      setIsInteracting(true);
    }
  };

  const handleContainerTouchEnd = () => {
    setIsInteracting(false);
  };

  const aspectRatio = aspectRatioProp ? String(aspectRatioProp).replace(':', ' / ') : '16 / 9';

  useEffect(() => {
    if (renderedImageMetrics.width > 0 && effectiveImageSize?.width > 0) {
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

  useEffect(() => {
    if (isInteracting) {
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
      ...(backgroundElement ? [{
        id: '__background__',
        type: 'background',
        position: backgroundElement,
        style: { ...backgroundElement.filters, shadow: backgroundElement.shadow, shadowColor: backgroundElement.shadowColor, shadowBlur: backgroundElement.shadowBlur, shadowOffsetX: backgroundElement.shadowOffsetX, shadowOffsetY: backgroundElement.shadowOffsetY },
        content: backgroundElement.src,
        zIndex: -1,
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
          const style = completeFieldStyles[header];
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
            style: { ...element.filters, ...element },
            content: element.url,
            zIndex: element.zIndex || 0,
            rotation: element.rotation,
            fontScale: 1,
            enableHtmlRendering: false,
          };
        })
        .filter(Boolean)
    ];

    elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return elements;
  }, [backgroundElement, isCropping, csvHeaders, fieldPositions, fieldStyles, brandElements, csvData, currentPreviewIndex, fontScale]);

  return (
    <Box>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
        <Box
          ref={containerRef}
          className="text-container"
              sx={{
                border: '2px solid #ddd',
                backgroundColor: pageState?.backgroundColor || '#FFFFFF',
                position: 'relative', // Needed for absolute positioning of children
                cursor: 'default',
                touchAction: 'pan-x pan-y',
                WebkitOverflowScrolling: 'touch',
                '&.interacting': {
                  touchAction: 'none'
                },
                aspectRatio: aspectRatio,
                width: '100%',
              }}
              onTouchStart={handleContainerTouchStart}
              onTouchEnd={handleContainerTouchEnd}
            >
                <>
                  <Box
                    className="elements-wrapper"
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setSelectedField('__background__');
                      }
                    }}
                    onTouchStart={(e) => {
                      if (e.target === e.currentTarget) {
                        setSelectedField('__background__');
                      }
                    }}
                  >
                    {renderableElements.map(element => (
                      <DraggableElement
                        key={element.id}
                        element={element.type === 'image' || element.type === 'background' || element.type === 'cropbox' ? { ...element.position, type: element.type } : { id: element.id, type: 'text' }}
                        position={element.position}
                        style={element.style}
                        content={element.content}
                        isSelected={selectedField === element.id}
                        onSelect={setSelectedField}
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
            </Box>
        </Box>

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
    </Box>
  );
};

export default FieldPositioner;
