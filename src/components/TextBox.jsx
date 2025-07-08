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
  onContentChange // New prop for content updates
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // State for edit mode
  const [editedContent, setEditedContent] = useState(content); // State for temporary edited content
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  const textBoxRef = useRef(null);
  const textareaRef = useRef(null); // Ref for the textarea

  // Update editedContent if the external content prop changes while not editing
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(content);
    }
  }, [content, isEditing]);

  // Effect to focus and select text when entering edit mode
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

  // Detectar se é dispositivo móvel
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

  // Original handleMouseDown and handleTouchStart are kept for internal logic
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
    // Prevenir comportamento padrão IMEDIATAMENTE
    e.preventDefault();
    e.stopPropagation();

    // Desabilitar scroll do body durante a interação
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

  const handleTouchMove = (e) => {
    if (!isDragging && !isResizing) return;
    
    // Prevenir scroll SEMPRE durante drag/resize
    e.preventDefault();
    e.stopPropagation();

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

  const handleTouchEnd = () => {
    // Restaurar scroll do body
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleDoubleClick = () => {
    if (isSelected) {
      setIsEditing(true);
      // Focus is now handled by the useEffect hook
    }
  };

  const handleTextareaChange = (e) => {
    setEditedContent(e.target.value);
  };

  const commitChanges = () => {
    // Only call onContentChange if the content has actually changed
    if (isEditing && onContentChange && content !== editedContent) {
      onContentChange(field, editedContent);
    }
    setIsEditing(false); // Ensure isEditing is set to false after committing
                         // This should happen regardless of content change to exit edit mode.
  };

  const handleTextareaBlur = () => {
    // If blur is caused by clicking outside, FieldPositioner's
    // mousedown will handle deselection (setSelectedField(null)).
    // If blur is programmatic (from Enter/Escape), we've already handled selection.
    // We still need to commit changes if they haven't been (e.g. user clicks another field directly).
    if (isEditing) { // Only if still in editing mode (e.g., focus moved to another element directly)
        if (onContentChange && content !== editedContent) {
            onContentChange(field, editedContent);
        }
        setIsEditing(false);
        onSelect(field); // Explicitly call onSelect, similar to Enter key path
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isEditing && onContentChange && content !== editedContent) {
          onContentChange(field, editedContent);
      }
      setIsEditing(false);
      // Explicitly re-assert selection for formatting panel after editing via Enter
      onSelect(field); // This calls FieldPositioner.setSelectedField
      textareaRef.current?.blur(); // Blur after everything else
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedContent(content); // Revert to original prop content
      setIsEditing(false);
      // Also ensure selected state is re-asserted for panel
      onSelect(field);
      textareaRef.current?.blur(); // Ensure blur on escape too
    }
  };

  // Prevent drag/resize when editing text
  const effectiveHandleMouseDown = (e, type, handle = null) => {
    if (isEditing) {
      // If clicking inside textarea, let the default behavior happen
      if (e.target === textareaRef.current) {
        return;
      }
      // If clicking outside textarea but still in edit mode (e.g. on a resize handle by mistake), blur textarea
      textareaRef.current?.blur();
      e.stopPropagation(); // Stop propagation to prevent selection or other parent handlers
      return;
    }
    doHandleMouseDown(e, type, handle); // Corrected to doHandleMouseDown
  };

  const effectiveHandleTouchStart = (e, type, handle = null) => {
    if (isEditing) {
       if (e.target === textareaRef.current) {
        return;
      }
      textareaRef.current?.blur();
      e.stopPropagation();
      return;
    }
    handleTouchStart(e, type, handle);
  };


  useEffect(() => {
    if (isDragging || isResizing) {
      // Configurar event listeners com opções adequadas para mobile
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
        
        // Garantir que o scroll seja restaurado
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };
    }
  // Reverting dependencies to the version from feat/field-editor-enhancements
  // as a debugging step for the "Expected )" build error.
  // The functions handleMouseMove, etc., are defined in the component scope
  // and will be fresh on each render. If they don't rely on props/state
  // that aren't already in this array, not listing them is okay,
  // but using useCallback for them and then listing them would be better.
  // For now, this revert is to isolate the build error.
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
  const handleSize = isMobile ? 16 : 8;

  // Re-typing the return statement carefully to avoid hidden syntax errors.
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
        cursor: isDragging ? 'grabbing' : (isEditing ? 'text' : 'grab'),
        userSelect: 'none',
        border: isSelected ? '2px solid #2196f3' : '2px solid transparent',
        borderRadius: 1,
        backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
        padding: '8px', // This padding applies to the main Box
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: 2,
        display: 'flex', // Used for text alignment
        justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'center' ? 'center' : 'flex-end',
        alignItems: style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'middle' ? 'center' : 'flex-end',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        '&:hover': {
          border: isSelected ? '2px solid #2196f3' : '2px solid #a0cfff', // Slightly different hover if not selected
          backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
        },
      }}
      onMouseDown={(e) => effectiveHandleMouseDown(e, 'drag')}
      onTouchStart={(e) => effectiveHandleTouchStart(e, 'drag')}
      onClick={(e) => {
        if (isEditing && e.target === textareaRef.current) {
          return; // Allow clicks inside textarea
        }
        if (!isEditing) {
          onSelect(field);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing && isSelected ? (
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown} // Use the dedicated handler
          style={{ // Inline styles for the textarea
            width: '100%',
            height: '100%',
            fontFamily: style.fontFamily || 'Arial',
            fontSize: `${style.fontSize || 16}px`,
            fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal',
            color: style.color || '#000000',
            lineHeight: `${lineHeight}px`,
            textDecoration: style.textDecoration || 'none',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent', // Crucial for blending
            resize: 'none',
            overflow: 'hidden', // Or 'auto' if content might exceed box and scroll is desired
            padding: 0, // Padding is on the parent Box
            boxSizing: 'border-box',
            textAlign: style.textAlign || 'left',
          }}
        />
      ) : (
        <Box // This Box is for displaying static text
          sx={{
            // Styles for static text are inherited or applied here
            // Pointer events none to ensure drag/clicks go to parent unless editing
            pointerEvents: 'none', // Text itself should not capture mouse events meant for the draggable box
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
            WebkitTextStroke: style.textStroke // Corrected from 'WebkitTextStroke:' to 'WebkitTextStroke:'
              ? `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}`
              : 'none',
          }}
        >
          {textLines.map((line, index) => (
            <div key={index} style={{ marginBottom: index < textLines.length - 1 ? '2px' : 0 }}>
              {line}
            </div>
          ))}
        </Box>
      )}
      {/* End of ternary for editing/displaying text */}

      {/* Resize handles directly rendered if condition is met, without Fragment wrapper */}
      {isSelected && !isEditing && resizeHandles.map((handle) => (
        <Box
          key={handle.name}
          className={`resize-handle-${handle.name}`}
          sx={{
            position: 'absolute',
            left: `${handle.x * 100}%`,
            top: `${handle.y * 100}%`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            backgroundColor: '#2196f3',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            cursor: handle.cursor,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            minWidth: isMobile ? '20px' : '8px',
            minHeight: isMobile ? '20px' : '8px',
            touchAction: 'none',
            '&:active': {
              backgroundColor: '#1976d2',
              transform: 'translate(-50%, -50%) scale(1.2)',
            },
          }}
          onMouseDown={(e) => effectiveHandleMouseDown(e, 'resize', handle)}
          onTouchStart={(e) => effectiveHandleTouchStart(e, 'resize', handle)}
        />
      ))}
  </Box>
  );
};

export default TextBox;

