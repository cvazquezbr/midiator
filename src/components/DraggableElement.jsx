import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useCampaign } from '../context/CampaignContext';
import styles from './DraggableElement.module.css';
import { wrapTextInArea } from '../utils/imageComposer';
import { applyColorHighlight } from '../utils/filterUtils';

const hexToRgba = (hex, alpha) => {
  if (!hex || hex.length < 4) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const DraggableElementInternal = ({
  element, // Combined object for field/element data
  position,
  style,
  content,
  isSelected,
  onSelect,
  onPositionChange,
  onSizeChange,
  onStyleChange,
  containerSize,
  onContentChange,
  rotation,
  setIsMoving,
  originalImageSize,
  fontScale: fontScaleProp,
  enableHtmlRendering = false,
  darkMode,
  onDoubleClick,
}) => {
  const { campaignState } = useCampaign();
  const { pendingAssets } = campaignState;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [displayUrl, setDisplayUrl] = useState(content);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialRotation, setInitialRotation] = useState(0);
  // const [isCanvasLoading, setIsCanvasLoading] = useState(true); // Removido

  const textBoxRef = useRef(null);
  const textareaRef = useRef(null);
  const htmlContentRef = useRef(null);


  // Função para sanitizar HTML básico
  const sanitizeHtml = (html) => {
    if (!enableHtmlRendering) return html;
    
    // Lista de tags permitidas para formatação básica
    // const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'ul', 'ol', 'li'];
    // const allowedAttributes = ['style'];
    
    // Remover scripts e outras tags perigosas
    let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
    
    return sanitized;
  };

  const getFilterString = (filters) => {
    if (!filters) return 'none';
    const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = filters;
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`;
  };

  useEffect(() => {
    // This robust logic ensures that we only display valid image URLs, whether they
    // are permanent or temporary blob URLs currently managed by the CampaignContext.
    if (element.type !== 'image') {
      setDisplayUrl(content);
      return;
    }

    const url = content;
    if (!url) {
      setDisplayUrl(null);
      return;
    }

    // If the URL is a blob URL, it must exist as a key in our pendingAssets map
    // to be considered valid. This prevents rendering revoked/stale blob URLs.
    if (url.startsWith('blob:')) {
      if (pendingAssets[url]) {
        setDisplayUrl(url);
      } else {
        // This is a blob URL that we don't manage. It's stale/revoked.
        setDisplayUrl(null);
      }
    } else {
      // If it's not a blob URL, we assume it's a permanent and valid URL.
      setDisplayUrl(url);
    }
  }, [content, pendingAssets, element.type]);


  // Função para renderizar conteúdo HTML ou texto simples
  const renderContent = () => {
    // A lógica de renderização do fundo foi movida para o estilo do Box principal.
    if (element.type === 'background') {
      return null;
    }
    if (element.type === 'image') {
      const isLoading = !displayUrl; // Consider loading if displayUrl is not yet resolved.
      if (isLoading) {
        return <Box sx={{ width: '100%', height: '100%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={24} /></Box>;
      }
      if (!displayUrl) {
        return <Box sx={{ width: '100%', height: '100%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" color="error">Imagem Inválida</Typography></Box>;
      }
      return <img src={displayUrl} alt="Elemento de imagem" style={{ objectFit: style.objectFit || 'fill' }} />;
    }

    if (element.type === 'cropbox') {
      return (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '2px dashed rgba(255, 255, 255, 0.7)',
            boxSizing: 'border-box',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        />
      );
    }

    // Default to text rendering
    if (!enableHtmlRendering) {
      // Render the calculated lines to respect wrapping
      return (
        <div style={textContentStyle}>
          {textLines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      );
    }

    const sanitizedContent = sanitizeHtml(content);
    return (
      <div
        ref={htmlContentRef}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          wordWrap: 'break-word',
          pointerEvents: 'none',
          ...textContentStyle,
          fontSize: `${(style.fontSize || 24) * fontScale}px`, // Use fontScale directly on fontSize
        }}
      />
    );
  };

  const getRotatedBoundingBox = useCallback((widthPercent, heightPercent, rotationDegrees) => {
    const cWidth = containerSize.width || 1;
    const cHeight = containerSize.height || 1;

    const width = (widthPercent / 100) * cWidth;
    const height = (heightPercent / 100) * cHeight;
    const radians = rotationDegrees * (Math.PI / 180);
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    const newWidth = width * cos + height * sin;
    const newHeight = width * sin + height * cos;
    return {
      width: (newWidth / cWidth) * 100,
      height: (newHeight / cHeight) * 100,
    };
  }, [containerSize.width, containerSize.height]);

  const calculateResizedDimensionsAndPosition = (initialPosition, initialSize, deltaXPercent, deltaYPercent, handleName, rotationDegrees) => {
    const rad = rotationDegrees * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotatedDeltaX = deltaXPercent * cos + deltaYPercent * sin;
    const rotatedDeltaY = -deltaXPercent * sin + deltaYPercent * cos;

    let { width: newWidth, height: newHeight } = initialSize;
    const initialCenterX = initialPosition.x + initialSize.width / 2;
    const initialCenterY = initialPosition.y + initialSize.height / 2;

    let dw = 0; // change in width
    let dh = 0; // change in height

    // Determine change in width based on handle
    if (handleName.includes('e')) {
      dw = rotatedDeltaX;
    } else if (handleName.includes('w')) {
      dw = -rotatedDeltaX;
    }

    // Determine change in height based on handle
    if (handleName.includes('s')) {
      dh = rotatedDeltaY;
    } else if (handleName.includes('n')) {
      dh = -rotatedDeltaY;
    }

    // Apply the size changes
    newWidth += dw;
    newHeight += dh;

    // Adjust center based on which handle is being dragged to keep the opposite side anchored.
    // If 'w' or 'n' is in the handle name, the shift should be negative for that axis.
    const xFactor = handleName.includes('w') ? -1 : 1;
    const yFactor = handleName.includes('n') ? -1 : 1;

    // The center of the element moves by half the change in size.
    // The direction of movement depends on which handle is being dragged.
    const centerXShift = (dw / 2) * xFactor;
    const centerYShift = (dh / 2) * yFactor;

    // Rotate the center shift to align with the element's rotation and apply it.
    let newCenterX = initialCenterX + (centerXShift * cos - centerYShift * sin);
    let newCenterY = initialCenterY + (centerXShift * sin + centerYShift * cos);

    newWidth = Math.max(5, newWidth);
    newHeight = Math.max(3, newHeight);

    // New Rotation-Aware Boundary Checks
    const halfW = newWidth / 2;
    const halfH = newHeight / 2;

    const corners = [
      { x: newCenterX - halfW, y: newCenterY - halfH }, // nw
      { x: newCenterX + halfW, y: newCenterY - halfH }, // ne
      { x: newCenterX + halfW, y: newCenterY + halfH }, // se
      { x: newCenterX - halfW, y: newCenterY + halfH }, // sw
    ];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    corners.forEach(corner => {
      const rotatedX = (corner.x - newCenterX) * cos - (corner.y - newCenterY) * sin + newCenterX;
      const rotatedY = (corner.x - newCenterX) * sin + (corner.y - newCenterY) * cos + newCenterY;

      minX = Math.min(minX, rotatedX);
      maxX = Math.max(maxX, rotatedX);
      minY = Math.min(minY, rotatedY);
      maxY = Math.max(maxY, rotatedY);
    });

    if (minX < 0) {
      newCenterX -= minX;
    }
    if (maxX > 100) {
      newCenterX -= (maxX - 100);
    }
    if (minY < 0) {
      newCenterY -= minY;
    }
    if (maxY > 100) {
      newCenterY -= (maxY - 100);
    }

    // Recalculate final unrotated top-left position from the adjusted center
    let newX = newCenterX - newWidth / 2;
    let newY = newCenterY - newHeight / 2;

    return { newX, newY, newWidth, newHeight };
  };

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const pixelPosition = {
    x: (position.x / 100) * (containerSize.width || 1),
    y: (position.y / 100) * (containerSize.height || 1),
    width: (position.width / 100) * (containerSize.width || 1),
    height: (position.height / 100) * (containerSize.height || 1)
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);

  const resizeHandles = [
    { name: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
    { name: 'n', cursor: 'n-resize', x: 0.5, y: 0 },
    { name: 'ne', cursor: 'ne-resize', x: 1, y: 0 },
    { name: 'e', cursor: 'e-resize', x: 1, y: 0.5 },
    { name: 'se', cursor: 'se-resize', x: 1, y: 1 },
    { name: 's', cursor: 's-resize', x: 0.5, y: 1 },
    { name: 'sw', cursor: 'sw-resize', x: 0, y: 1 },
    { name: 'w', cursor: 'w-resize', x: 0, y: 0.5 }
  ];

  const doHandleMouseDown = (e, type, handle = null) => {
    e.stopPropagation();

    if (setIsMoving) setIsMoving(true);

    onSelect(element.id);
    setDragStart({ x: e.clientX, y: e.clientY });

    if (type === 'drag') {
      setIsDragging(true);
      setInitialPosition({ x: position.x, y: position.y });
    } else if (type === 'resize') {
      setIsResizing(true);
      setResizeHandle(handle);
      setInitialPosition({ x: position.x, y: position.y });
      setInitialSize({ width: position.width, height: position.height });
    } else if (type === 'rotate') {
      setIsRotating(true);
      setInitialRotation(rotation || 0);
      const rect = textBoxRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX, y: e.clientY,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
    }
  };

  const handleTouchStart = (e, type, handle = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (setIsMoving) setIsMoving(true);
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    onSelect(element.id);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });

    if (type === 'drag') {
      setIsDragging(true);
      setInitialPosition({ x: position.x, y: position.y });
    } else if (type === 'resize') {
      setIsResizing(true);
      setResizeHandle(handle);
      setInitialPosition({ x: position.x, y: position.y });
      setInitialSize({ width: position.width, height: position.height });
    } else if (type === 'rotate') {
      setIsRotating(true);
      setInitialRotation(rotation || 0);
      const rect = textBoxRef.current.getBoundingClientRect();
      setDragStart({
        x: touch.clientX, y: touch.clientY,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing && !isRotating) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    if (isRotating) {
      const angle = Math.atan2(currentY - dragStart.centerY, currentX - dragStart.centerX) * (180 / Math.PI);
      const startAngle = Math.atan2(dragStart.y - dragStart.centerY, dragStart.x - dragStart.centerX) * (180 / Math.PI);
      let newRotation = initialRotation + (angle - startAngle);

      newRotation = (newRotation % 360 + 360) % 360;

      onPositionChange(element.id, { ...position, rotation: newRotation });
      return;
    }

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    const deltaXPercent = (deltaX / (containerSize.width || 1)) * 100;
    const deltaYPercent = (deltaY / (containerSize.height || 1)) * 100;

    if (isDragging) {
      const currentRotation = position.rotation || 0;
      const rotatedBoundingBox = getRotatedBoundingBox(position.width, position.height, currentRotation);

      const initialCenterX = initialPosition.x + position.width / 2;
      const initialCenterY = initialPosition.y + position.height / 2;
      let newCenterX = initialCenterX + deltaXPercent;
      let newCenterY = initialCenterY + deltaYPercent;

      const minCenterX = rotatedBoundingBox.width / 2;
      const maxCenterX = 100 - rotatedBoundingBox.width / 2;
      newCenterX = Math.max(minCenterX, Math.min(maxCenterX, newCenterX));

      const minCenterY = rotatedBoundingBox.height / 2;
      const maxCenterY = 100 - rotatedBoundingBox.height / 2;
      newCenterY = Math.max(minCenterY, Math.min(maxCenterY, newCenterY));

      const finalNewDragX = newCenterX - position.width / 2;
      const finalNewDragY = newCenterY - position.height / 2;

      onPositionChange(element.id, { ...position, x: finalNewDragX, y: finalNewDragY });

    } else if (isResizing && resizeHandle) {
      const rotationDegrees = position.rotation || 0;
      const { newX, newY, newWidth, newHeight } = calculateResizedDimensionsAndPosition(
        initialPosition,
        initialSize,
        deltaXPercent,
        deltaYPercent,
        resizeHandle.name,
        rotationDegrees
      );
      
      if (element.type === 'cropbox') {
        onPositionChange(element.id, { x: newX, y: newY });
      } else {
        onPositionChange(element.id, { ...position, x: newX, y: newY, rotation: rotationDegrees });
      }
      onSizeChange(element.id, { width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, isRotating, dragStart, initialRotation, element, position, containerSize, initialPosition, initialSize, resizeHandle, onPositionChange, onSizeChange, getRotatedBoundingBox]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging && !isResizing && !isRotating) return;
    
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    if (isRotating) {
      const angle = Math.atan2(currentY - dragStart.centerY, currentX - dragStart.centerX) * (180 / Math.PI);
      const startAngle = Math.atan2(dragStart.y - dragStart.centerY, dragStart.x - dragStart.centerX) * (180 / Math.PI);
      let newRotation = initialRotation + (angle - startAngle);
      newRotation = (newRotation % 360 + 360) % 360;
      onPositionChange(element.id, { ...position, rotation: newRotation });
      return;
    }

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    const deltaXPercent = (deltaX / (containerSize.width || 1)) * 100;
    const deltaYPercent = (deltaY / (containerSize.height || 1)) * 100;

    if (isDragging) {
      const currentFieldRotation = position.rotation || 0;
      const rotatedBoundingBox = getRotatedBoundingBox(position.width, position.height, currentFieldRotation);
      const initialCenterX = initialPosition.x + position.width / 2;
      const initialCenterY = initialPosition.y + position.height / 2;
      let newCenterX = initialCenterX + deltaXPercent;
      let newCenterY = initialCenterY + deltaYPercent;

      const minCenterX = rotatedBoundingBox.width / 2;
      const maxCenterX = 100 - rotatedBoundingBox.width / 2;
      newCenterX = Math.max(minCenterX, Math.min(maxCenterX, newCenterX));

      const minCenterY = rotatedBoundingBox.height / 2;
      const maxCenterY = 100 - rotatedBoundingBox.height / 2;
      newCenterY = Math.max(minCenterY, Math.min(maxCenterY, newCenterY));

      const finalNewDragX = newCenterX - position.width / 2;
      const finalNewDragY = newCenterY - position.height / 2;

      onPositionChange(element.id, { ...position, x: finalNewDragX, y: finalNewDragY });

    } else if (isResizing && resizeHandle) {
      const rotationDegrees = position.rotation || 0;
      const { newX, newY, newWidth, newHeight } = calculateResizedDimensionsAndPosition(
        initialPosition,
        initialSize,
        deltaXPercent,
        deltaYPercent,
        resizeHandle.name,
        rotationDegrees
      );

      if (element.type === 'cropbox') {
        onPositionChange(element.id, { x: newX, y: newY });
      } else {
        onPositionChange(element.id, { ...position, x: newX, y: newY, rotation: rotationDegrees });
      }
      onSizeChange(element.id, { width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, isRotating, dragStart, initialRotation, element, position, containerSize, initialPosition, initialSize, resizeHandle, onPositionChange, onSizeChange, getRotatedBoundingBox]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false); setIsResizing(false); setIsRotating(false);
    setResizeHandle(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    setIsDragging(false); setIsResizing(false); setIsRotating(false);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing || isRotating) {
      const options = { passive: false, capture: true };
      document.addEventListener('mousemove', handleMouseMove, options);
      document.addEventListener('mouseup', handleMouseUp, options);
      document.addEventListener('touchmove', handleTouchMove, options);
      document.addEventListener('touchend', handleTouchEnd, options);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove, options);
        document.removeEventListener('mouseup', handleMouseUp, options);
        document.removeEventListener('touchmove', handleTouchMove, options);
        document.removeEventListener('touchend', handleTouchEnd, options);
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };
    }
  }, [isDragging, isResizing, isRotating, dragStart, initialPosition, initialSize, initialRotation, handleMouseMove, handleMouseUp, handleTouchEnd, handleTouchMove]);

  const fontScale = fontScaleProp || 1;

  const baseFontSize = style.fontSize || 24;
  const scaledFontSize = baseFontSize * fontScale;
  const lineHeight = baseFontSize * (style.lineHeightMultiplier || 1.2);
  const scaledLineHeight = lineHeight * fontScale;

  const textLines = React.useMemo(() => {
    if (enableHtmlRendering) {
      return [content];
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // CRITICAL FIX: To ensure the preview's text wrapping matches the final
    // rendered image from imageComposer, we must calculate the wrapping based
    // on the full, original dimensions of the element, not the scaled-down
    // preview dimensions. The visual scaling is handled by CSS transforms,
    // but the wrapping logic must be identical in both places.

    // 1. Get the element's dimensions in the final image's coordinate space.
    const fullSizeWidth = (position.width / 100) * (originalImageSize?.width || 1);
    const fullSizeHeight = (position.height / 100) * (originalImageSize?.height || 1);

    // 2. Use the original, unscaled style values.
    const unscaledPadding = style.padding || 0;
    const styleForWrapping = {
        ...style,
        fontSize: style.fontSize || 24, // Use the base, unscaled font size
    };

    // 3. Call the wrapping function with the full-size dimensions.
    return wrapTextInArea(
      ctx,
      editedContent,
      styleForWrapping,
      fullSizeWidth - (2 * unscaledPadding),
      fullSizeHeight - (2 * unscaledPadding)
    );
    // The dependency array must reflect the source values used in the calculation.
  }, [editedContent, style, position.width, position.height, originalImageSize, enableHtmlRendering, content]);

  const handleSize = isMobile ? 24 : 12;

  const getBoxShadowString = (style) => {
    if (!style || !style.shadow) return 'none';
    const { shadowColor = '#000000', shadowBlur = 4, shadowOffsetX = 2, shadowOffsetY = 2 } = style;
    return `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;
  };

  const textContentStyle = {
    fontFamily: style.fontFamily || 'Arial',
    fontSize: `${enableHtmlRendering ? baseFontSize : scaledFontSize}px`,
    fontWeight: style.fontWeight || 'normal',
    fontStyle: style.fontStyle || 'normal',
    color: style.color || '#000000',
    textDecoration: style.textDecoration || 'none',
    lineHeight: `${enableHtmlRendering ? lineHeight : scaledLineHeight}px`,
    textAlign: style.textAlign || 'left',
    textShadow: style.textShadow ? `${(style.shadowOffsetX || 2) * fontScale}px ${(style.shadowOffsetY || 2) * fontScale}px ${(style.shadowBlur || 4) * fontScale}px ${style.shadowColor || '#000000'}` : 'none',
    pointerEvents: 'none',
  };

  if (style.textStroke) {
    textContentStyle.WebkitTextStroke = `${(style.strokeWidth || 2) * fontScale}px ${style.strokeColor || '#ffffff'}`;
  }

  const effectiveHandleMouseDown = (e, type, handle = null) => {
    doHandleMouseDown(e, type, handle);
  };

  const effectiveHandleTouchStart = (e, type, handle = null) => {
    handleTouchStart(e, type, handle);
  };

  const getBackgroundStyle = (style, content) => {
    const { backgroundType, backgroundColor, gradient, src } = style;
    const imageUrl = content || src;
    const css = {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };

    switch (backgroundType) {
        case 'color':
            css.backgroundColor = backgroundColor;
            css.backgroundImage = 'none';
            break;
        case 'gradient':
            if (gradient && gradient.stops) {
                const stops = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
                if (gradient.type === 'linear') {
                    css.backgroundImage = `linear-gradient(${gradient.angle || 90}deg, ${stops})`;
                } else {
                    css.backgroundImage = `radial-gradient(circle, ${stops})`;
                }
            } else {
                 css.backgroundImage = 'none';
            }
            break;
        case 'image':
        default:
            if (imageUrl) {
                css.backgroundImage = `url("${imageUrl}")`;
            } else {
                css.backgroundImage = 'none';
            }
            // A cor de fundo pode ser usada como um "tint" ou fallback
            css.backgroundColor = style.backgroundColor || 'transparent';
            break;
    }
    return css;
  };

  const boxSx = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${position.width}%`,
    height: `${position.height}%`,
    transform: `rotate(${rotation || 0}deg)`,
    zIndex: position.zIndex || 'auto',
  };

  if (element.type === 'image') {
    boxSx.filter = getFilterString(style.filters);
    boxSx.boxShadow = getBoxShadowString(style);
    boxSx.borderRadius = `${style.borderRadius || 0}px`;
    boxSx.overflow = 'visible'; // Allow handles to be visible
    boxSx.padding = 0;

    // Check if it's a placeholder and apply a distinctive style
    if (displayUrl && displayUrl.includes('ftcdn.net')) {
      boxSx.border = '2px dashed grey';
      // Prevent user-defined border from overriding the placeholder style
      if (isSelected) {
        boxSx.outline = '2px solid #1976d2'; // Keep selection outline
      }
    } else {
      boxSx.border = `${style.borderWidth || 0}px solid ${style.borderColor || '#000000'}`;
    }

  } else if (element.type === 'cropbox') {
    boxSx.backgroundColor = 'transparent';
    boxSx.border = 'none';
    boxSx.padding = 0;
  } else if (element.type === 'text') { // Text element
    boxSx.backgroundColor = hexToRgba(style.backgroundColor || '#000000', style.backgroundOpacity !== undefined ? style.backgroundOpacity : 1);
    boxSx.border = `${(style.borderWidth || 0) * fontScale}px solid ${style.borderColor || '#000000'}`;
    boxSx.borderRadius = `${(style.borderRadius || 0) * fontScale}px`;
    boxSx.padding = `${(style.padding || 0) * fontScale}px`;
  }

  const sanitizedContentForRendering = sanitizeHtml(content);

  return (
    <>
      <Box
        id={element.id}
        ref={textBoxRef}
        className={`${styles.textBox} ${isDragging ? styles.dragging : ''} ${isSelected && element.type !== 'background' ? styles.selected : ''}`}
        sx={boxSx}
        onMouseDown={(e) => effectiveHandleMouseDown(e, 'drag')}
        onTouchStart={(e) => effectiveHandleTouchStart(e, 'drag')}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
        onDoubleClick={() => {
          if (element.type === 'text' && !enableHtmlRendering) {
            setIsEditing(true);
          } else if (onDoubleClick) {
            onDoubleClick();
          }
        }}
      >
        <Box
          className={`${styles.textBoxContent} ${isSelected ? styles.selected : ''} ${element.type === 'image' ? styles.imageElement : ''}`}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'middle' ? 'center' : 'flex-end',
            height: '100%',
          }}
        >
            {renderContent()}
        </Box>

        {isSelected && (
          <>
            {resizeHandles.map((handle) => (
              <Box
                key={handle.name}
                className={styles.resizeHandle}
                sx={{
                  left: `calc(${handle.x * 100}% - ${handleSize / 2}px)`,
                  top: `calc(${handle.y * 100}% - ${handleSize / 2}px)`,
                  width: `${handleSize}px`,
                  height: `${handleSize}px`,
                  cursor: handle.cursor,
                }}
                onMouseDown={(e) => doHandleMouseDown(e, 'resize', handle)}
                onTouchStart={(e) => handleTouchStart(e, 'resize', handle)}
              />
            ))}
            {element.type !== 'cropbox' && (
              <Box
                className={styles.rotateHandle}
                sx={{
                  top: `-${handleSize * 2.5}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: `${handleSize * 1.5}px`,
                  height: `${handleSize * 1.5}px`,
                }}
                onMouseDown={(e) => doHandleMouseDown(e, 'rotate')}
                onTouchStart={(e) => handleTouchStart(e, 'rotate')}
              />
            )}
          </>
        )}
      </Box>
    </>
  );
};

const DraggableElement = React.memo(DraggableElementInternal);

export default DraggableElement;
