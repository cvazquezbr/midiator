import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
} from '@mui/material';
import DraggableElement from './DraggableElement';
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
  editorState,
  setEditorState,
  onImageDisplayedSizeChange,
  selectedField,
  setSelectedField,
  originalImageSize,
  darkMode,
  onOpenHtmlEditor,
  currentPreviewIndex,
  onFontScaleChange,
  isCropping,
  mockRecordForPreview,
}) => {
  const {
    fieldPositions,
    fieldStyles,
    csvData,
    brandElements,
    pageTemplate
  } = editorState;

  // Derive csvHeaders from csvData to make the component more robust
  const csvHeaders = useMemo(() => {
    if (csvData && csvData.length > 0 && csvData[0]) {
      return Object.keys(csvData[0]);
    }
    return [];
  }, [csvData]);

  const [renderedImageMetrics, setRenderedImageMetrics] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [dynamicSize, setDynamicSize] = useState({ width: 0, height: 0 });
  const [fontScale, setFontScale] = useState(1);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef(null);
  const { campaignState } = useCampaign();
  const { aspectRatio: aspectRatioFromContext, pendingAssets } = campaignState;

  const effectiveImageSize = originalImageSize;

  const aspectRatio = aspectRatioFromContext ? String(aspectRatioFromContext).replace(':', ' / ') : '1 / 1';

  const handleContentChange = useCallback((field, newText) => {
    setEditorState(prevState => {
      if (!prevState.csvData || prevState.csvData.length === 0) return prevState;

      const updatedCsvData = prevState.csvData.filter(Boolean).map((row, index) => {
        if (index === currentPreviewIndex) {
          return {
            ...row,
            [field]: newText,
          };
        }
        return row;
      });

      return {
        ...prevState,
        csvData: updatedCsvData,
      };
    });
  }, [currentPreviewIndex, setEditorState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      if (entries && entries.length > 0) {
        const { width: containerWidth, height: containerHeight } = entries[0].contentRect;
        const [aspectWidth, aspectHeight] = aspectRatio.split(' / ').map(Number);

        let newWidth = containerWidth;
        let newHeight = newWidth / (aspectWidth / aspectHeight);

        if (newHeight > containerHeight) {
          newHeight = containerHeight;
          newWidth = newHeight * (aspectWidth / aspectHeight);
        }

        setDynamicSize({ width: newWidth, height: newHeight });
        setRenderedImageMetrics({ width: newWidth, height: newHeight, x: 0, y: 0 });

        if (onImageDisplayedSizeChange) {
          onImageDisplayedSizeChange({ width: newWidth, height: newHeight });
        }
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [onImageDisplayedSizeChange, aspectRatio]);

  const handlePositionChange = useCallback((id, newPosition) => {
    setEditorState(prevState => {
      const { fieldPositions, pageTemplate, brandElements } = prevState;

      // Handle cropbox
      if (id === '__cropbox__') {
        const newImages = pageTemplate.images.map(img =>
          img.id === selectedField
            ? { ...img, crop: { ...(img.crop || {}), ...newPosition } }
            : img
        );
        return { ...prevState, pageTemplate: { ...pageTemplate, images: newImages } };
      }

      // Handle text fields
      if (fieldPositions && Object.prototype.hasOwnProperty.call(fieldPositions, id)) {
        return {
          ...prevState,
          fieldPositions: {
            ...fieldPositions,
            [id]: { ...fieldPositions[id], ...newPosition }
          }
        };
      }

      // Handle images
      const imageIndex = pageTemplate.images?.findIndex(img => img.id === id);
      if (imageIndex > -1) {
        const newImages = [...pageTemplate.images];
        newImages[imageIndex] = { ...newImages[imageIndex], ...newPosition };
        return { ...prevState, pageTemplate: { ...pageTemplate, images: newImages } };
      }

      // Handle brand elements
      const brandElementIndex = (brandElements || []).findIndex(el => el.id === id);
      if (brandElementIndex > -1) {
        const newBrandElements = [...brandElements];
        newBrandElements[brandElementIndex] = { ...newBrandElements[brandElementIndex], ...newPosition };
        return { ...prevState, brandElements: newBrandElements };
      }

      return prevState;
    });
  }, [selectedField, setEditorState]);

  const handleSizeChange = useCallback((id, newSize) => {
    setEditorState(prevState => {
      const { fieldPositions, pageTemplate, brandElements } = prevState;

      // Handle cropbox
      if (id === '__cropbox__') {
        const newImages = pageTemplate.images.map(img =>
          img.id === selectedField
            ? { ...img, crop: { ...(img.crop || {}), ...newSize } }
            : img
        );
        return { ...prevState, pageTemplate: { ...pageTemplate, images: newImages } };
      }

      // Handle text fields
      if (fieldPositions && Object.prototype.hasOwnProperty.call(fieldPositions, id)) {
        return {
          ...prevState,
          fieldPositions: {
            ...fieldPositions,
            [id]: { ...fieldPositions[id], ...newSize }
          }
        };
      }

      // Handle images
      const imageIndex = pageTemplate.images?.findIndex(img => img.id === id);
      if (imageIndex > -1) {
        const newImages = [...pageTemplate.images];
        newImages[imageIndex] = { ...newImages[imageIndex], ...newSize };
        return { ...prevState, pageTemplate: { ...pageTemplate, images: newImages } };
      }

      // Handle brand elements
      const brandElementIndex = (brandElements || []).findIndex(el => el.id === id);
      if (brandElementIndex > -1) {
        const newBrandElements = [...brandElements];
        newBrandElements[brandElementIndex] = { ...newBrandElements[brandElementIndex], ...newSize };
        return { ...prevState, brandElements: newBrandElements };
      }

      return prevState;
    });
  }, [selectedField, setEditorState]);

  const handleContainerTouchStart = (e) => {
    if (!e.target.closest('.text-box')) {
      setIsInteracting(true);
    }
  };

  const handleContainerTouchEnd = () => {
    setIsInteracting(false);
  };

  useEffect(() => {
    if (renderedImageMetrics.width > 0 && effectiveImageSize?.width > 0) {
      const previewScale = renderedImageMetrics.width / effectiveImageSize.width;
      setFontScale(previewScale);

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
        const position = fieldPositions ? fieldPositions[header] : undefined;
        const style = completeFieldStyles[header];
        if (!position || !position.visible) return null;

        const record = mockRecordForPreview || (csvData?.filter(Boolean) || [])[currentPreviewIndex] || {};
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
  }, [pageTemplate, isCropping, csvHeaders, fieldPositions, completeFieldStyles, brandElements, csvData, currentPreviewIndex, fontScale, selectedField]);

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

  const backgroundValue = pageTemplate?.gradient
    ? getGradientCss(pageTemplate.gradient)
    : pageTemplate?.backgroundColor || '#FFFFFF';

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <Box
        className="text-container"
        sx={{
          position: 'relative',
          background: backgroundValue,
          width: dynamicSize.width,
          height: dynamicSize.height,
          border: '2px solid #ddd',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'block',
          margin: 'auto',
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
    </Box>
  );
};

export default FieldPositioner;
