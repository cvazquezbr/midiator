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
import { useCampaign } from '../context/CampaignContext';

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
  pageTemplate,
  setPageTemplate,
  onOpenHtmlEditor,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  onFontScaleChange,
  isCropping,
  setIsCropping,
}) => {
  console.log('[FieldPositioner] props:', { pageTemplate, fieldStyles });
  const [renderedImageMetrics, setRenderedImageMetrics] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [fontScale, setFontScale] = useState(1);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef(null);
  const { aspectRatio: aspectRatioFromContext } = useCampaign();

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

  const handlePositionChange = useCallback((id, newPosition) => {
    if (id === '__cropbox__') {
      setPageTemplate(prev => ({
        ...prev,
        images: prev.images.map(img =>
          img.id === selectedField
            ? { ...img, crop: { ...(img.crop || {}), ...newPosition } }
            : img
        )
      }));
    } else if (Object.prototype.hasOwnProperty.call(fieldPositions, id)) {
      setFieldPositions(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...newPosition
        }
      }));
    } else {
      const imageIndex = pageTemplate.images.findIndex(img => img.id === id);
      if (imageIndex > -1) {
        setPageTemplate(prev => {
          const newImages = [...prev.images];
          newImages[imageIndex] = { ...newImages[imageIndex], ...newPosition };
          return { ...prev, images: newImages };
        });
      } else {
        setBrandElements(prev => prev.map(el =>
          el.id === id ? { ...el, ...newPosition } : el
        ));
      }
    }
  }, [fieldPositions, pageTemplate, brandElements, selectedField, setPageTemplate, setFieldPositions, setBrandElements]);

  const handleSizeChange = useCallback((id, newSize) => {
    if (id === '__cropbox__') {
      setPageTemplate(prev => ({
        ...prev,
        images: prev.images.map(img =>
          img.id === selectedField
            ? { ...img, crop: { ...(img.crop || {}), ...newSize } }
            : img
        )
      }));
    } else if (Object.prototype.hasOwnProperty.call(fieldPositions, id)) {
      setFieldPositions(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...newSize
        }
      }));
    } else {
      const imageIndex = pageTemplate.images.findIndex(img => img.id === id);
      if (imageIndex > -1) {
        setPageTemplate(prev => {
          const newImages = [...prev.images];
          newImages[imageIndex] = { ...newImages[imageIndex], ...newSize };
          return { ...prev, images: newImages };
        });
      } else {
        setBrandElements(prev => prev.map(el =>
          el.id === id ? { ...el, ...newSize } : el
        ));
      }
    }
  }, [fieldPositions, pageTemplate, brandElements, selectedField, setPageTemplate, setFieldPositions, setBrandElements]);

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

  const aspectRatio = aspectRatioFromContext ? String(aspectRatioFromContext).replace(':', ' / ') : '1 / 1';

  useEffect(() => {
    if (renderedImageMetrics.width > 0 && effectiveImageSize?.width > 0) {
      const previewScale = renderedImageMetrics.width / effectiveImageSize.width;
      setFontScale(previewScale); // Local scale for preview rendering

      // The font scale for the final render should be 1 unless explicitly changed by the user.
      // The preview scaling is for display purposes only.
      if (onFontScaleChange) {
        // We are not passing any scale factor here, so it will use the default (1)
        // which is what we want for the final render unless the user changes it via a UI control.
        // For now, let's ensure it's always 1 from here.
        onFontScaleChange(1);
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
    const elements = [];

    // Add page images
    (pageTemplate.images || []).forEach(image => {
        if (image.visible === false || !image.src) return;
        // Normalize legacy 'background' type to 'image'
        const elementType = image.type === 'background' ? 'image' : image.type;

        elements.push({
            id: image.id,
            type: elementType,
            position: image,
            style: { ...image.filters, ...image },
            content: image.src || '',
            zIndex: image.zIndex || 0,
            rotation: image.rotation || 0,
            fontScale: 1,
            enableHtmlRendering: false,
        });
    });

    // Add cropbox if needed for the selected image.
    const selectedImage = isCropping && pageTemplate.images?.find(img => img.id === selectedField);
    if (selectedImage) {
        elements.push({
            id: '__cropbox__',
            type: 'cropbox',
            position: selectedImage.crop || { x: 10, y: 10, width: 80, height: 80 },
            style: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
            content: '',
            zIndex: 1000, // Should be on top of everything
            rotation: 0,
            fontScale: 1,
            enableHtmlRendering: false,
        });
    }

    const textElements = (csvHeaders || [])
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
      .filter(Boolean);

    const brandEls = (brandElements || [])
      .map(element => {
        if (element.visible === false || !element.url) return null;
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
      .filter(Boolean);

    elements.push(...textElements, ...brandEls);

    elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return elements;
  }, [pageTemplate, isCropping, csvHeaders, fieldPositions, fieldStyles, brandElements, csvData, currentPreviewIndex, fontScale]);

  const getGradientCss = (gradient) => {
    if (!gradient) return 'none';

    const colors = gradient.colors || ['#ffffff', '#000000'];
    const stops = colors.join(', ');

    if (gradient.type === 'linear') {
        const angle = gradient.angle || 90;
        return `linear-gradient(${angle}deg, ${stops})`;
    }
    if (gradient.type === 'radial') {
        return `radial-gradient(circle, ${stops})`;
    }
    return 'none';
  };

  const backgroundValue = pageTemplate.gradient
    ? getGradientCss(pageTemplate.gradient)
    : pageTemplate.backgroundColor || '#FFFFFF';

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2, width: '100%', height: 'auto', maxWidth: '100%', flexShrink: 0 }}>
        <Box
          ref={containerRef}
          className="text-container"
              sx={{
                border: '2px solid #ddd',
                background: backgroundValue,
                position: 'relative', // Needed for absolute positioning of children
                cursor: 'default',
                touchAction: 'pan-x pan-y',
                WebkitOverflowScrolling: 'touch',
                '&.interacting': {
                  touchAction: 'none'
                },
                aspectRatio: aspectRatio,
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
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
                        setSelectedField('__page_background__');
                      }
                    }}
                    onTouchStart={(e) => {
                      if (e.target === e.currentTarget) {
                        setSelectedField('__page_background__');
                      }
                    }}
                  >
                    {renderableElements.map(element => (
                      <DraggableElement
                        key={element.id}
                        element={{ ...element.position, type: element.type, id: element.id }}
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
