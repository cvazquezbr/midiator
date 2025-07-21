import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import styles from './HtmlTextBox.module.css';

const HtmlTextBox = ({
  field,
  position,
  style,
  content,
  isSelected,
  onSelect,
  onPositionChange,
  onSizeChange,
  containerSize,
  onContentChange,
  rotation,
  setIsMoving,
  originalImageSize,
  fontScale: fontScaleProp,
  enableHtmlRendering = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialRotation, setInitialRotation] = useState(0);

  const textBoxRef = useRef(null);
  const textareaRef = useRef(null);
  const htmlContentRef = useRef(null);

  // Função para sanitizar HTML básico
  const sanitizeHtml = (html) => {
    if (!enableHtmlRendering) return html;
    
    // Lista de tags permitidas para formatação básica
    const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'ul', 'ol', 'li'];
    const allowedAttributes = ['style'];
    
    // Remover scripts e outras tags perigosas
    let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
    
    return sanitized;
  };

  // Função para renderizar conteúdo HTML ou texto simples
  const renderContent = () => {
    if (!enableHtmlRendering) {
      return content;
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
          pointerEvents: 'none'
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
    let newX = initialPosition.x;
    let newY = initialPosition.y;
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;

    const rad = rotationDegrees * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotatedDeltaX = deltaXPercent * cos + deltaYPercent * sin;
    const rotatedDeltaY = -deltaXPercent * sin + deltaYPercent * cos;

    const initialCenterX = initialPosition.x + initialSize.width / 2;
    const initialCenterY = initialPosition.y + initialSize.height / 2;

    const corners = {
        nw: { x: initialPosition.x, y: initialPosition.y },
        ne: { x: initialPosition.x + initialSize.width, y: initialPosition.y },
        sw: { x: initialPosition.x, y: initialPosition.y + initialSize.height },
        se: { x: initialPosition.x + initialSize.width, y: initialPosition.y + initialSize.height },
    };

    const rotatePoint = (point, center, angleRad) => {
        const s = Math.sin(angleRad);
        const c = Math.cos(angleRad);
        point.x -= center.x;
        point.y -= center.y;
        const xnew = point.x * c - point.y * s;
        const ynew = point.x * s + point.y * c;
        point.x = xnew + center.x;
        point.y = ynew + center.y;
        return point;
    };

    const initialRotatedCorners = {};
    for (const key in corners) {
        initialRotatedCorners[key] = rotatePoint({ ...corners[key] }, { x: initialCenterX, y: initialCenterY }, rad);
    }

    let fixedAnchorPoint = { x: 0, y: 0 };
    let oppositeHandleName = '';

    switch (handleName) {
        case 'n':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.sw.x + initialRotatedCorners.se.x) / 2,
                y: (initialRotatedCorners.sw.y + initialRotatedCorners.se.y) / 2
            };
            oppositeHandleName = 's_mid';
            newHeight -= rotatedDeltaY;
            newWidth = initialSize.width;
            break;
        case 'e':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.nw.x + initialRotatedCorners.sw.x) / 2,
                y: (initialRotatedCorners.nw.y + initialRotatedCorners.sw.y) / 2
            };
            oppositeHandleName = 'w_mid';
            newWidth += rotatedDeltaX;
            newHeight = initialSize.height;
            break;
        case 's':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.nw.x + initialRotatedCorners.ne.x) / 2,
                y: (initialRotatedCorners.nw.y + initialRotatedCorners.ne.y) / 2
            };
            oppositeHandleName = 'n_mid';
            newHeight += rotatedDeltaY;
            newWidth = initialSize.width;
            break;
        case 'w':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.ne.x + initialRotatedCorners.se.x) / 2,
                y: (initialRotatedCorners.ne.y + initialRotatedCorners.se.y) / 2
            };
            oppositeHandleName = 'e_mid';
            newWidth -= rotatedDeltaX;
            newHeight = initialSize.height;
            break;
        case 'nw': fixedAnchorPoint = initialRotatedCorners.se; oppositeHandleName = 'se';
            newWidth -= rotatedDeltaX; newHeight -= rotatedDeltaY; break;
        case 'ne': fixedAnchorPoint = initialRotatedCorners.sw; oppositeHandleName = 'sw';
            newWidth += rotatedDeltaX; newHeight -= rotatedDeltaY; break;
        case 'se': fixedAnchorPoint = initialRotatedCorners.nw; oppositeHandleName = 'nw';
            newWidth += rotatedDeltaX; newHeight += rotatedDeltaY; break;
        case 'sw': fixedAnchorPoint = initialRotatedCorners.ne; oppositeHandleName = 'ne';
            newWidth -= rotatedDeltaX; newHeight += rotatedDeltaY; break;
    }

    newWidth = Math.max(5, newWidth);
    newHeight = Math.max(3, newHeight);

    let localAnchorXComp, localAnchorYComp;
    switch (oppositeHandleName) {
        case 'nw': localAnchorXComp = -newWidth / 2; localAnchorYComp = -newHeight / 2; break;
        case 'ne': localAnchorXComp = newWidth / 2; localAnchorYComp = -newHeight / 2; break;
        case 'sw': localAnchorXComp = -newWidth / 2; localAnchorYComp = newHeight / 2; break;
        case 'se': localAnchorXComp = newWidth / 2; localAnchorYComp = newHeight / 2; break;
        case 'n_mid': localAnchorXComp = 0; localAnchorYComp = -newHeight / 2; break;
        case 'e_mid': localAnchorXComp = newWidth / 2; localAnchorYComp = 0; break;
        case 's_mid': localAnchorXComp = 0; localAnchorYComp = newHeight / 2; break;
        case 'w_mid': localAnchorXComp = -newWidth / 2; localAnchorYComp = 0; break;
        default:
            console.error("Unknown oppositeHandleName:", oppositeHandleName);
            localAnchorXComp = 0; localAnchorYComp = 0;
    }

    const termX = localAnchorXComp * cos - localAnchorYComp * sin;
    const termY = localAnchorXComp * sin + localAnchorYComp * cos;

    const newCenterX = fixedAnchorPoint.x - termX;
    const newCenterY = fixedAnchorPoint.y - termY;

    newX = newCenterX - newWidth / 2;
    newY = newCenterY - newHeight / 2;

    newWidth = Math.max(5, newWidth);
    newHeight = Math.max(3, newHeight);

    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    if (newX + newWidth > 100) {
        newWidth = 100 - newX;
    }
    if (newY + newHeight > 100) {
        newHeight = 100 - newY;
    }

    newX = Math.max(0, Math.min(newX, 100 - newWidth));
    newY = Math.max(0, Math.min(newY, 100 - newHeight));

    return { newX, newY, newWidth, newHeight };
  };

  useEffect(() => {
    if (!isEditing) {
      setEditedContent(content);
    }
  }, [content, isEditing]);

  useEffect(() => {
    if (isEditing && isSelected && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing, isSelected]);

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
    e.preventDefault();
    e.stopPropagation();

    if (setIsMoving) setIsMoving(true);

    onSelect(field);
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

    onSelect(field);
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

      onPositionChange(field, { ...position, rotation: newRotation });
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

      onPositionChange(field, { ...position, x: finalNewDragX, y: finalNewDragY });

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
      
      onPositionChange(field, { ...position, x: newX, y: newY, rotation: rotationDegrees });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, isRotating, dragStart, initialRotation, field, position, containerSize, initialPosition, initialSize, resizeHandle, onPositionChange, onSizeChange, getRotatedBoundingBox]);

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
      onPositionChange(field, { ...position, rotation: newRotation });
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

      onPositionChange(field, { ...position, x: finalNewDragX, y: finalNewDragY });

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

      onPositionChange(field, { ...position, x: newX, y: newY, rotation: rotationDegrees });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, isRotating, dragStart, initialRotation, field, position, containerSize, initialPosition, initialSize, resizeHandle, onPositionChange, onSizeChange, getRotatedBoundingBox]);

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

  const handleDoubleClick = () => {
    if (isSelected) setIsEditing(true);
  };

  const handleTextareaChange = (e) => setEditedContent(e.target.value);

  const commitChanges = () => {
    if (isEditing && onContentChange && content !== editedContent) {
      onContentChange(field, editedContent);
    }
    setIsEditing(false);
  };

  const handleTextareaBlur = () => {
    if (isEditing) {
      if (onContentChange && content !== editedContent) {
        onContentChange(field, editedContent);
      }
      setIsEditing(false);
      if (onSelect) onSelect(field);
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); commitChanges(); onSelect(field);
      textareaRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault(); setEditedContent(content); setIsEditing(false);
      onSelect(field);
      textareaRef.current?.blur();
    }
  };

  const effectiveHandleMouseDown = (e, type, handle = null) => {
    if (isEditing) {
      if (e.target === textareaRef.current) return;
      textareaRef.current?.blur();
      e.stopPropagation();
      return;
    }
    doHandleMouseDown(e, type, handle);
  };

  const effectiveHandleTouchStart = (e, type, handle = null) => {
    if (isEditing) {
       if (e.target === textareaRef.current) return;
      textareaRef.current?.blur();
      e.stopPropagation();
      return;
    }
    handleTouchStart(e, type, handle);
  };

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

  const wrapText = (text, maxWidth, fontSize) => {
    if (!text) return [''];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
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
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const fontScale = fontScaleProp || 1;

  const baseFontSize = style.fontSize || 24;
  const scaledFontSize = baseFontSize * fontScale;
  const lineHeight = baseFontSize * (style.lineHeightMultiplier || 1.2);
  const scaledLineHeight = lineHeight * fontScale;

  const originalBoxWidth = (position.width / 100) * (originalImageSize?.width || 1);
  const paddingInPixels = 8 * 2;
  const textLines = enableHtmlRendering ? [content] : wrapText(editedContent, originalBoxWidth - paddingInPixels, baseFontSize);

  const handleSize = isMobile ? 24 : 12;

  const textContentStyle = {
    fontFamily: style.fontFamily || 'Arial',
    fontSize: `${scaledFontSize}px`,
    fontWeight: style.fontWeight || 'normal',
    fontStyle: style.fontStyle || 'normal',
    color: style.color || '#000000',
    textDecoration: style.textDecoration || 'none',
    lineHeight: `${scaledLineHeight}px`,
    textShadow: style.textShadow ? `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}` : 'none',
    WebkitTextStroke: style.textStroke ? `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}` : 'none',
    pointerEvents: 'none',
  };

  return (
    <Box
      ref={textBoxRef}
      className={`${styles.textBox} ${isDragging ? styles.dragging : ''} ${isSelected ? styles.selected : ''} ${isEditing ? styles.editing : ''}`}
      sx={{
        left: `${position.x}%`, 
        top: `${position.y}%`,
        width: `${position.width}%`, 
        height: `${position.height}%`,
        transform: `rotate(${rotation || 0}deg)`,
      }}
      onMouseDown={(e) => effectiveHandleMouseDown(e, 'drag')}
      onTouchStart={(e) => effectiveHandleTouchStart(e, 'drag')}
      onClick={(e) => {
        if (!isEditing || e.target !== textareaRef.current) {
          onSelect(field);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Box
        className={`${styles.textBoxContent} ${isSelected ? styles.selected : ''}`}
        sx={{
          justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'center' ? 'center' : 'flex-end',
          alignItems: style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'middle' ? 'center' : 'flex-end',
        }}
      >
        {isEditing && isSelected ? (
          <textarea
            ref={textareaRef} 
            value={editedContent} 
            onChange={handleTextareaChange}
            onBlur={handleTextareaBlur} 
            onKeyDown={handleTextareaKeyDown}
            className={styles.textArea}
            style={{
              fontFamily: style.fontFamily || 'Arial',
              fontSize: `${scaledFontSize}px`,
              fontWeight: style.fontWeight || 'normal',
              fontStyle: style.fontStyle || 'normal',
              color: style.color || '#000000',
              lineHeight: `${scaledLineHeight}px`,
              textDecoration: style.textDecoration || 'none',
              textAlign: style.textAlign || 'left',
            }}
          />
        ) : (
          <Box 
            className={`${styles.textContent} ${enableHtmlRendering ? styles.htmlContent : ''}`}
            sx={textContentStyle}
          >
            {enableHtmlRendering ? (
              renderContent()
            ) : (
              textLines.map((line, index) => (
                <div key={index} style={{ marginBottom: index < textLines.length - 1 ? '2px' : 0 }}>
                  {line}
                </div>
              ))
            )}
          </Box>
        )}
      </Box>

      {/* Handles de redimensionamento e rotação */}
      {isSelected && !isEditing && (
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
              onMouseDown={(e) => effectiveHandleMouseDown(e, 'resize', handle)}
              onTouchStart={(e) => effectiveHandleTouchStart(e, 'resize', handle)}
            />
          ))}
          <Box
            className={styles.rotateHandle}
            sx={{
              top: `-${handleSize * 2.5}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${handleSize * 1.5}px`,
              height: `${handleSize * 1.5}px`,
            }}
            onMouseDown={(e) => effectiveHandleMouseDown(e, 'rotate')}
            onTouchStart={(e) => effectiveHandleTouchStart(e, 'rotate')}
          />
        </>
      )}
    </Box>
  );
};

export default HtmlTextBox;

