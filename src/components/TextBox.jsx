import React, { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

const TextBox = ({ 
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
  rotation
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

  const getRotatedBoundingBox = (widthPercent, heightPercent, rotationDegrees) => {
    // Ensure containerSize has valid dimensions before using them
    const cWidth = containerSize.width || 1; // Fallback to 1 to avoid NaN/Infinity if not ready
    const cHeight = containerSize.height || 1; // Fallback to 1 to avoid NaN/Infinity if not ready

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

  const handleMouseMove = (e) => {
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
      let newX = initialPosition.x;
      let newY = initialPosition.y;
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      const currentFieldRotation = position.rotation || 0;

      switch (resizeHandle.name) {
        case 'nw': newX += deltaXPercent; newY += deltaYPercent; newWidth -= deltaXPercent; newHeight -= deltaYPercent; break;
        case 'n': newY += deltaYPercent; newHeight -= deltaYPercent; break;
        case 'ne': newY += deltaYPercent; newWidth += deltaXPercent; newHeight -= deltaYPercent; break;
        case 'e': newWidth += deltaXPercent; break;
        case 'se': newWidth += deltaXPercent; newHeight += deltaYPercent; break;
        case 's': newHeight += deltaYPercent; break;
        case 'sw': newX += deltaXPercent; newWidth -= deltaXPercent; newHeight += deltaYPercent; break;
        case 'w': newX += deltaXPercent; newWidth -= deltaXPercent; break;
      }

      newWidth = Math.max(5, newWidth);
      newHeight = Math.max(3, newHeight);

      if (newX + newWidth > 100) {
        if (resizeHandle.name.includes('w')) { newX = 100 - newWidth; } else { newWidth = 100 - newX; }
      }
      if (newY + newHeight > 100) {
        if (resizeHandle.name.includes('n')) { newY = 100 - newHeight; } else { newHeight = 100 - newY; }
      }
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newWidth = Math.max(5, newWidth);
      newHeight = Math.max(3, newHeight);
      if (newX === 0) newWidth = Math.min(newWidth, 100);
      if (newY === 0) newHeight = Math.min(newHeight, 100);

      const rotatedBoundingBox = getRotatedBoundingBox(newWidth, newHeight, currentFieldRotation);
      let finalPosX = newX;
      let finalPosY = newY;

      if (finalPosX + rotatedBoundingBox.width > 100) {
        finalPosX = 100 - rotatedBoundingBox.width;
      }
      if (finalPosY + rotatedBoundingBox.height > 100) {
        finalPosY = 100 - rotatedBoundingBox.height;
      }
      finalPosX = Math.max(0, finalPosX);
      finalPosY = Math.max(0, finalPosY);

      if (rotatedBoundingBox.width > 100.5 || rotatedBoundingBox.height > 100.5) {
         if (finalPosX < -0.5 || finalPosY < -0.5 ) { return; }
         if (finalPosX + rotatedBoundingBox.width > 100.5 || finalPosY + rotatedBoundingBox.height > 100.5) { return; }
      }

      onPositionChange(field, { x: finalPosX, y: finalPosY, rotation: currentFieldRotation });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  };

  const handleTouchMove = (e) => {
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
      const currentFieldRotation = position.rotation || 0;
      let newX = initialPosition.x;
      let newY = initialPosition.y;
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;

      switch (resizeHandle.name) {
        case 'nw': newX += deltaXPercent; newY += deltaYPercent; newWidth -= deltaXPercent; newHeight -= deltaYPercent; break;
        case 'n': newY += deltaYPercent; newHeight -= deltaYPercent; break;
        case 'ne': newY += deltaYPercent; newWidth += deltaXPercent; newHeight -= deltaYPercent; break;
        case 'e': newWidth += deltaXPercent; break;
        case 'se': newWidth += deltaXPercent; newHeight += deltaYPercent; break;
        case 's': newHeight += deltaYPercent; break;
        case 'sw': newX += deltaXPercent; newWidth -= deltaXPercent; newHeight += deltaYPercent; break;
        case 'w': newX += deltaXPercent; newWidth -= deltaXPercent; break;
      }

      newWidth = Math.max(5, newWidth);
      newHeight = Math.max(3, newHeight);

      if (newX + newWidth > 100) {
        if (resizeHandle.name.includes('w')) { newX = 100 - newWidth; } else { newWidth = 100 - newX; }
      }
      if (newY + newHeight > 100) {
        if (resizeHandle.name.includes('n')) { newY = 100 - newHeight; } else { newHeight = 100 - newY; }
      }
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newWidth = Math.max(5, newWidth);
      newHeight = Math.max(3, newHeight);
      if (newX === 0) newWidth = Math.min(newWidth, 100);
      if (newY === 0) newHeight = Math.min(newHeight, 100);

      const rotatedBoundingBox = getRotatedBoundingBox(newWidth, newHeight, currentFieldRotation);
      let finalPosX = newX;
      let finalPosY = newY;

      if (finalPosX + rotatedBoundingBox.width > 100) { finalPosX = 100 - rotatedBoundingBox.width; }
      if (finalPosY + rotatedBoundingBox.height > 100) { finalPosY = 100 - rotatedBoundingBox.height; }
      finalPosX = Math.max(0, finalPosX);
      finalPosY = Math.max(0, finalPosY);

      if (rotatedBoundingBox.width > 100.5 || rotatedBoundingBox.height > 100.5) {
         if (finalPosX < -0.5 || finalPosY < -0.5 ) { return; }
         if (finalPosX + rotatedBoundingBox.width > 100.5 || finalPosY + rotatedBoundingBox.height > 100.5) { return; }
      }

      onPositionChange(field, { x: finalPosX, y: finalPosY, rotation: currentFieldRotation });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false); setIsResizing(false); setIsRotating(false);
    setResizeHandle(null);
  };

  const handleTouchEnd = () => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    setIsDragging(false); setIsResizing(false); setIsRotating(false);
    setResizeHandle(null);
  };

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
  }, [isDragging, isResizing, isRotating, dragStart, initialPosition, initialSize, initialRotation]);

  const wrapText = (text, maxWidth) => {
    if (!text) return [''];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${style.fontSize || 16}px ${style.fontFamily || 'Arial'}`;
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

  const textLines = wrapText(editedContent, pixelPosition.width - 16);
  const lineHeight = (style.fontSize || 16) * 1.2;
  const handleSize = isMobile ? 16 : 8;

  return (
    <Box
      ref={textBoxRef}
      className="text-box"
      sx={{
        position: 'absolute', left: `${position.x}%`, top: `${position.y}%`,
        width: `${position.width}%`, height: `${position.height}%`,
        cursor: isDragging ? 'grabbing' : (isEditing ? 'text' : 'grab'),
        userSelect: 'none', border: isSelected ? '2px solid #2196f3' : '2px solid transparent',
        borderRadius: 1, backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
        transform: `rotate(${rotation || 0}deg)`, padding: '8px', boxSizing: 'border-box',
        overflow: 'hidden', zIndex: 2, display: 'flex',
        justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'center' ? 'center' : 'flex-end',
        alignItems: style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'middle' ? 'center' : 'flex-end',
        touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none',
        '&:hover': {
          border: isSelected ? '2px solid #2196f3' : '2px solid #a0cfff',
          backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
        },
      }}
      onMouseDown={(e) => effectiveHandleMouseDown(e, 'drag')}
      onTouchStart={(e) => effectiveHandleTouchStart(e, 'drag')}
      onClick={(e) => { if (!isEditing || e.target !== textareaRef.current) onSelect(field); }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing && isSelected ? (
        <textarea
          ref={textareaRef} value={editedContent} onChange={handleTextareaChange}
          onBlur={handleTextareaBlur} onKeyDown={handleTextareaKeyDown}
          style={{
            width: '100%', height: '100%', fontFamily: style.fontFamily || 'Arial',
            fontSize: `${style.fontSize || 16}px`, fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal', color: style.color || '#000000',
            lineHeight: `${lineHeight}px`, textDecoration: style.textDecoration || 'none',
            border: 'none', outline: 'none', backgroundColor: 'transparent',
            resize: 'none', overflow: 'hidden', padding: 0, boxSizing: 'border-box',
            textAlign: style.textAlign || 'left',
          }}
        />
      ) : (
        <Box
          sx={{
            pointerEvents: 'none', fontFamily: style.fontFamily || 'Arial',
            fontSize: `${style.fontSize || 16}px`, fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal', color: style.color || '#000000',
            textDecoration: style.textDecoration || 'none', lineHeight: `${lineHeight}px`,
            textShadow: style.textShadow ? `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}` : 'none',
            WebkitTextStroke: style.textStroke ? `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}` : 'none',
          }}
        >
          {textLines.map((line, index) => (
            <div key={index} style={{ marginBottom: index < textLines.length - 1 ? '2px' : 0 }}>
              {line}
            </div>
          ))}
        </Box>
      )}
      {isSelected && !isEditing && resizeHandles.map((handle) => (
        <Box
          key={handle.name} className={`resize-handle-${handle.name}`}
          sx={{
            position: 'absolute', left: `${handle.x * 100}%`, top: `${handle.y * 100}%`,
            width: `${handleSize}px`, height: `${handleSize}px`,
            backgroundColor: '#2196f3', border: '2px solid #ffffff', borderRadius: '50%',
            cursor: handle.cursor, pointerEvents: 'auto', transform: 'translate(-50%, -50%)',
            zIndex: 10, minWidth: isMobile ? '20px' : '8px', minHeight: isMobile ? '20px' : '8px',
            touchAction: 'none',
            '&:active': { backgroundColor: '#1976d2', transform: 'translate(-50%, -50%) scale(1.2)'},
          }}
          onMouseDown={(e) => effectiveHandleMouseDown(e, 'resize', handle)}
          onTouchStart={(e) => effectiveHandleTouchStart(e, 'resize', handle)}
        />
      ))}
      {isSelected && !isEditing && (
        <Box
          className="rotate-handle"
          sx={{
            position: 'absolute', top: `-${handleSize * 2}px`, left: '50%',
            transform: 'translateX(-50%)', width: `${handleSize * 1.5}px`, height: `${handleSize * 1.5}px`,
            backgroundColor: '#ff9800', border: '2px solid #ffffff', borderRadius: '50%',
            cursor: 'grab', pointerEvents: 'auto', zIndex: 11, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            minWidth: isMobile ? '24px' : '12px', minHeight: isMobile ? '24px' : '12px',
            touchAction: 'none',
            '&:active': { backgroundColor: '#f57c00', cursor: 'grabbing' },
          }}
          onMouseDown={(e) => effectiveHandleMouseDown(e, 'rotate')}
          onTouchStart={(e) => effectiveHandleTouchStart(e, 'rotate')}
        />
      )}
  </Box>
  );
};

export default TextBox;
