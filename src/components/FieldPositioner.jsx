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
  pendingAssets,
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
      setPageTemplate(prev => {
        const imageIndex = prev.images.findIndex(img => img.id === id);
        if (imageIndex > -1) {
          const newImages = [...prev.images];
          newImages[imageIndex] = { ...newImages[imageIndex], ...newPosition };
          return { ...prev, images: newImages };
        }
        return prev;
      });
      setBrandElements(prev => prev.map(el =>
        el.id === id ? { ...el, ...newPosition } : el
      ));
    }
  }, [selectedField, setPageTemplate, setFieldPositions, setBrandElements]);

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
      setPageTemplate(prev => {
        const imageIndex = prev.images.findIndex(img => img.id === id);
        if (imageIndex > -1) {
          const newImages = [...prev.images];
          newImages[imageIndex] = { ...newImages[imageIndex], ...newSize };
          return { ...prev, images: newImages };
        }
        return prev;
      });
      setBrandElements(prev => prev.map(el =>
        el.id === id ? { ...el, ...newSize } : el
      ));
    }
  }, [selectedField, setPageTemplate, setFieldPositions, setBrandElements]);

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
      currentPreviewIndex,
    });
    setFieldPositions(newPositions);
    setFieldStyles(newStyles);
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

      if (onFontScaleChange) {
        onFontScaleChange(previewScale);
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
    if (!fieldStyles) {
        // If fieldStyles is null, just return default styles for all headers
        safeHeaders.forEach(header => {
            styles[header] = { ...COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER };
        });
        return styles;
    }
    safeHeaders.forEach(header => {
      styles[header] = {
        ...COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER,
        ...(fieldStyles[header] || {}),
      };
    });
    return styles;
  }, [csvHeaders, fieldStyles]);

  const renderableElements = React.useMemo(() => {
    const elements = [];

    // Add page images
    (pageTemplate.images || []).forEach(image => {
        const imageUrl = image.src || image.imageUrl;
        if (image.visible === false || !imageUrl) return;
        const elementType = image.type === 'background' ? 'image' : image.type;

        elements.push({
            id: image.id,
            type: elementType,
            position: { ...image, zIndex: Math.max(image.zIndex || 0, 0) },
            style: { ...image.filters, ...image },
            content: imageUrl,
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
          position: { ...element, zIndex: Math.max(element.zIndex || 0, 0) },
          style: { ...element.filters, ...element },
          content: element.url,
          rotation: element.rotation,
          fontScale: 1,
          enableHtmlRendering: false,
        };
      })
      .filter(Boolean);

    elements.push(...textElements, ...brandEls);

    elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return elements;
  }, [pageTemplate, isCropping, csvHeaders, fieldPositions, completeFieldStyles, brandElements, csvData, currentPreviewIndex, fontScale]);

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
    <Box
      ref={containerRef}
      className="text-container"
      sx={{
        position: 'relative',
        margin: 'auto',
        background: backgroundValue,
        aspectRatio: aspectRatio,
        width: '100%',
        maxWidth: '100%',
        maxHeight: '80vh', 
        border: '2px solid #ddd',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'default',
        touchAction: 'pan-x pan-y',
        WebkitOverflowScrolling: 'touch',
        '&.interacting': {
          touchAction: 'none'
        },
      }}
      onTouchStart={handleContainerTouchStart}
      onTouchEnd={handleContainerTouchEnd}
    >
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
            pendingAssets={pendingAssets}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FieldPositioner;
