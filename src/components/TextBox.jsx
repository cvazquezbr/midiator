import React, { useState, useRef, useEffect } from 'react';
// import { Box } from '@mui/material'; // Removido

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
  onContentChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  const textBoxRef = useRef(null);
  const textareaRef = useRef(null);

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
    x: (position.x / 100) * containerSize.width,
    y: (position.y / 100) * containerSize.height,
    width: (position.width / 100) * containerSize.width,
    height: (position.height / 100) * containerSize.height
  };

  const isMobile = typeof navigator !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0));

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
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const deltaXPercent = (deltaX / containerSize.width) * 100;
    const deltaYPercent = (deltaY / containerSize.height) * 100;

    if (isDragging) {
      const newX = Math.max(0, Math.min(100 - position.width, initialPosition.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100 - position.height, initialPosition.y + deltaYPercent));
      onPositionChange(field, { x: newX, y: newY });
    } else if (isResizing && resizeHandle) {
      let newX = initialPosition.x; let newY = initialPosition.y;
      let newWidth = initialSize.width; let newHeight = initialSize.height;
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
      newWidth = Math.max(5, Math.min(100 - newX, newWidth));
      newHeight = Math.max(3, Math.min(100 - newY, newHeight));
      newX = Math.max(0, Math.min(100 - newWidth, newX));
      newY = Math.max(0, Math.min(100 - newHeight, newY));
      onPositionChange(field, { x: newX, y: newY });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging && !isResizing) return;
    e.preventDefault(); e.stopPropagation();
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    const deltaXPercent = (deltaX / containerSize.width) * 100;
    const deltaYPercent = (deltaY / containerSize.height) * 100;
    if (isDragging) {
      const newX = Math.max(0, Math.min(100 - position.width, initialPosition.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100 - position.height, initialPosition.y + deltaYPercent));
      onPositionChange(field, { x: newX, y: newY });
    } else if (isResizing && resizeHandle) {
      let newX = initialPosition.x; let newY = initialPosition.y;
      let newWidth = initialSize.width; let newHeight = initialSize.height;
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
      newWidth = Math.max(5, Math.min(100 - newX, newWidth));
      newHeight = Math.max(3, Math.min(100 - newY, newHeight));
      newX = Math.max(0, Math.min(100 - newWidth, newX));
      newY = Math.max(0, Math.min(100 - newHeight, newY));
      onPositionChange(field, { x: newX, y: newY });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); setResizeHandle(null); };
  const handleTouchEnd = () => {
    document.body.style.overflow = ''; document.body.style.touchAction = '';
    setIsDragging(false); setIsResizing(false); setResizeHandle(null);
  };

  const handleDoubleClick = () => { if (isSelected) { setIsEditing(true); } };
  const handleTextareaChange = (e) => { setEditedContent(e.target.value); };

  const commitChanges = () => {
    if (isEditing && onContentChange && content !== editedContent) {
      onContentChange(field, editedContent);
    }
    setIsEditing(false);
  };

  const handleTextareaBlur = () => {
    if (isEditing) {
      if (onContentChange && content !== editedContent) { onContentChange(field, editedContent); }
      setIsEditing(false);
      if (onSelect) { onSelect(field); }
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); commitChanges(); onSelect(field); textareaRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault(); setEditedContent(content); setIsEditing(false); onSelect(field); textareaRef.current?.blur();
    }
  };

  const effectiveHandleMouseDown = (e, type, handle = null) => {
    if (isEditing) {
      if (e.target === textareaRef.current) { return; }
      textareaRef.current?.blur(); e.stopPropagation(); return;
    }
    doHandleMouseDown(e, type, handle);
  };

  const effectiveHandleTouchStart = (e, type, handle = null) => {
    if (isEditing) {
      if (e.target === textareaRef.current) { return; }
      textareaRef.current?.blur(); e.stopPropagation(); return;
    }
    handleTouchStart(e, type, handle);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
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
        document.body.style.overflow = ''; document.body.style.touchAction = '';
      };
    }
  }, [isDragging, isResizing, dragStart, initialPosition, initialSize]);

  const wrapText = (text, maxWidth) => {
    // ... (lógica de wrapText mantida)
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

  const textLines = wrapText(editedContent, pixelPosition.width - 16); // Padding de 8px em cada lado
  const lineHeightVal = (style.fontSize || 16) * (style.lineHeightMultiplier || 1.2); // Usa lineHeightMultiplier
  const handleSize = isMobile ? 16 : 8; // Tamanho do handle de redimensionamento

  // Constrói o estilo inline para o texto, incluindo text-shadow e text-stroke
  const textDisplayStyle = {
    fontFamily: style.fontFamily || 'Arial',
    fontSize: `${style.fontSize || 16}px`,
    fontWeight: style.fontWeight || 'normal',
    fontStyle: style.fontStyle || 'normal',
    color: style.color || '#000000',
    textDecoration: style.textDecoration || 'none',
    lineHeight: `${lineHeightVal}px`,
    textAlign: style.textAlign || 'left', // Adicionado para consistência
    // WebkitTextStroke: style.textStroke ? `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}` : 'none',
    // textShadow: style.textShadow ? `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}` : 'none',
  };
   if (style.textStroke) {
    textDisplayStyle.WebkitTextStroke = `${style.strokeWidth || 1}px ${style.strokeColor || '#000000'}`;
    // Fallback para navegadores não-WebKit (raro, mas bom ter)
    // textDisplayStyle.textStroke = `${style.strokeWidth || 1}px ${style.strokeColor || '#000000'}`;
  }
  if (style.textShadow) {
    textDisplayStyle.textShadow = `${style.shadowOffsetX || 0}px ${style.shadowOffsetY || 0}px ${style.shadowBlur || 0}px ${style.shadowColor || 'transparent'}`;
  }


  // Define as classes de Tailwind com base no estado
  const boxClasses = `text-box absolute cursor-grab select-none p-2 box-border overflow-hidden flex
    ${isSelected ? 'border-2 border-blue-500 bg-blue-500 bg-opacity-10' : 'border-2 border-transparent'}
    hover:border-blue-300 hover:bg-blue-500 hover:bg-opacity-5
    ${isDragging ? 'cursor-grabbing' : ''}
    ${isEditing ? 'cursor-text' : ''}
    touch-none webkit-touch-callout-none webkit-user-select-none`; // touch-none para interações de toque

  // Mapeia style.textAlign para classes Tailwind
  let textAlignClass = 'justify-start'; // default left
  if (style.textAlign === 'center') textAlignClass = 'justify-center';
  if (style.textAlign === 'right') textAlignClass = 'justify-end';

  // Mapeia style.verticalAlign para classes Tailwind
  let verticalAlignClass = 'items-start'; // default top
  if (style.verticalAlign === 'middle') verticalAlignClass = 'items-center';
  if (style.verticalAlign === 'bottom') verticalAlignClass = 'items-end';


  return (
    <div
      ref={textBoxRef}
      className={`${boxClasses} ${textAlignClass} ${verticalAlignClass}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        zIndex: 2, // Para garantir que esteja acima da imagem de fundo
      }}
      onMouseDown={(e) => effectiveHandleMouseDown(e, 'drag')}
      onTouchStart={(e) => effectiveHandleTouchStart(e, 'drag')}
      onClick={(e) => {
        if (!isEditing || e.target !== textareaRef.current) { onSelect(field); }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing && isSelected ? (
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          className="w-full h-full border-none outline-none bg-transparent resize-none overflow-hidden p-0 box-border"
          style={{
            fontFamily: style.fontFamily || 'Arial',
            fontSize: `${style.fontSize || 16}px`,
            fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal',
            color: style.color || '#000000',
            lineHeight: `${lineHeightVal}px`,
            textDecoration: style.textDecoration || 'none',
            textAlign: style.textAlign || 'left',
          }}
        />
      ) : (
        <div
          className="pointer-events-none" // Texto não deve capturar eventos de mouse
          style={textDisplayStyle}
        >
          {textLines.map((line, index) => (
            <div key={index} style={{ marginBottom: index < textLines.length - 1 ? '2px' : 0 }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {isSelected && !isEditing && resizeHandles.map((handle) => (
        <div
          key={handle.name}
          className={`resize-handle-${handle.name} absolute bg-blue-500 border-2 border-white rounded-full pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 z-10 active:bg-blue-700 active:scale-125`}
          style={{
            left: `${handle.x * 100}%`,
            top: `${handle.y * 100}%`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            cursor: handle.cursor,
            minWidth: isMobile ? '20px' : '8px', // Aumenta área de toque no mobile
            minHeight: isMobile ? '20px' : '8px',
          }}
          onMouseDown={(e) => effectiveHandleMouseDown(e, 'resize', handle)}
          onTouchStart={(e) => effectiveHandleTouchStart(e, 'resize', handle)}
        />
      ))}
    </div>
  );
};

export default TextBox;

