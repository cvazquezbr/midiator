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
  containerSize
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  const textBoxRef = useRef(null);

  const pixelPosition = {
    x: (position.x / 100) * containerSize.width,
    y: (position.y / 100) * containerSize.height,
    width: (position.width / 100) * containerSize.width,
    height: (position.height / 100) * containerSize.height
  };

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

  const handleMouseDown = (e, type, handle = null) => {
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
      let newX = initialPosition.x;
      let newY = initialPosition.y;
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;

      switch (resizeHandle.name) {
        case 'nw':
          newX += deltaXPercent;
          newY += deltaYPercent;
          newWidth -= deltaXPercent;
          newHeight -= deltaYPercent;
          break;
        case 'n':
          newY += deltaYPercent;
          newHeight -= deltaYPercent;
          break;
        case 'ne':
          newY += deltaYPercent;
          newWidth += deltaXPercent;
          newHeight -= deltaYPercent;
          break;
        case 'e':
          newWidth += deltaXPercent;
          break;
        case 'se':
          newWidth += deltaXPercent;
          newHeight += deltaYPercent;
          break;
        case 's':
          newHeight += deltaYPercent;
          break;
        case 'sw':
          newX += deltaXPercent;
          newWidth -= deltaXPercent;
          newHeight += deltaYPercent;
          break;
        case 'w':
          newX += deltaXPercent;
          newWidth -= deltaXPercent;
          break;
      }

      newWidth = Math.max(5, Math.min(100 - newX, newWidth));
      newHeight = Math.max(3, Math.min(100 - newY, newHeight));
      newX = Math.max(0, Math.min(100 - newWidth, newX));
      newY = Math.max(0, Math.min(100 - newHeight, newY));

      onPositionChange(field, { x: newX, y: newY });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, initialPosition, initialSize]);

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

  const textLines = wrapText(content, pixelPosition.width - 16);
  const lineHeight = (style.fontSize || 16) * 1.2;

  return (
    <Box
      ref={textBoxRef}
      className="text-box"
      sx={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        border: isSelected ? '2px solid #2196f3' : '2px solid transparent',
        borderRadius: 1,
        backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
        padding: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: 2,
        '&:hover': {
          border: '2px solid #2196f3',
          backgroundColor: 'rgba(33, 150, 243, 0.05)'
        }
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
       onClick={() => onSelect(field)} // <-- adicionado aqui
    >
      <Box
        sx={{
          fontFamily: style.fontFamily || 'Arial',
          fontSize: `${style.fontSize || 16}px`,
          fontWeight: style.fontWeight || 'normal',
          fontStyle: style.fontStyle || 'normal',
          color: style.color || '#000000',
          textDecoration: style.textDecoration || 'none',
          lineHeight: `${lineHeight}px`,
          textShadow: style.textShadow
            ? `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}`
            : 'none',
          WebkitTextStroke: style.textStroke
            ? `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}`
            : 'none',
          pointerEvents: 'none'
        }}
      >
        {textLines.map((line, index) => (
          <div key={index} style={{ marginBottom: index < textLines.length - 1 ? '2px' : 0 }}>
            {line}
          </div>
        ))}
      </Box>

      {isSelected && resizeHandles.map((handle) => (
        <Box
          key={handle.name}
          sx={{
            position: 'absolute',
            left: `${handle.x * 100}%`,
            top: `${handle.y * 100}%`,
            width: '8px',
            height: '8px',
            backgroundColor: '#2196f3',
            border: '1px solid #ffffff',
            borderRadius: '50%',
            cursor: handle.cursor,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'resize', handle)}
        />
      ))}
    </Box>
  );
};

export default TextBox;
