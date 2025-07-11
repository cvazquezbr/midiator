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
  onContentChange, // New prop for content updates
  rotation // New prop for rotation
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false); // State for rotation
  const [isEditing, setIsEditing] = useState(false); // State for edit mode
  const [editedContent, setEditedContent] = useState(content); // State for temporary edited content
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialRotation, setInitialRotation] = useState(0); // State for initial rotation

  const textBoxRef = useRef(null);
  const textareaRef = useRef(null); // Ref for the textarea

  // Helper function to get bounding box of a rotated element
  const getRotatedBoundingBox = (widthPercent, heightPercent, rotationDegrees) => {
    const width = (widthPercent / 100) * containerSize.width;
    const height = (heightPercent / 100) * containerSize.height;
    const radians = rotationDegrees * (Math.PI / 180);
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    const newWidth = height * sin + width * cos;
    const newHeight = height * cos + width * sin;

    return {
      width: (newWidth / containerSize.width) * 100,
      height: (newHeight / containerSize.height) * 100,
    };
  };

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
    } else if (type === 'rotate') {
      setIsRotating(true);
      setInitialRotation(rotation || 0);
      // Store the center of the TextBox for rotation calculation
      const rect = textBoxRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
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
    } else if (type === 'rotate') {
      setIsRotating(true);
      setInitialRotation(rotation || 0);
      const rect = textBoxRef.current.getBoundingClientRect();
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
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
      // Normalize rotation to be between 0 and 360
      newRotation = (newRotation % 360 + 360) % 360;
      onPositionChange(field, { ...position, rotation: newRotation });
      return;
    }

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    const deltaXPercent = (deltaX / containerSize.width) * 100;
    const deltaYPercent = (deltaY / containerSize.height) * 100;

    if (isDragging) {
      const rotatedBoundingBox = getRotatedBoundingBox(position.width, position.height, position.rotation || 0);
      let newDragX = initialPosition.x + deltaXPercent;
      let newDragY = initialPosition.y + deltaYPercent;

      if (field === "DEBUG") { // Log only for a specific field for less noise, change "DEBUG" to a real field name for testing
        console.log(
          `Dragging Field: ${field}\n` +
          `containerSize H: ${containerSize.height.toFixed(2)}\n` +
          `position H: ${position.height.toFixed(2)}%, rotation: ${(position.rotation || 0).toFixed(0)}deg\n` +
          `rotatedBoundingBox H (raw): ${(rotatedBoundingBox.height * containerSize.height / 100).toFixed(2)}px\n` +
          `rotatedBoundingBox H (%): ${rotatedBoundingBox.height.toFixed(2)}%\n` +
          `initialDragY: ${initialPosition.y.toFixed(2)}%, deltaYPercent: ${deltaYPercent.toFixed(2)}%\n` +
          `Pre-clamp newDragY: ${(initialPosition.y + deltaYPercent).toFixed(2)}%\n` +
          `Clamp Max Y: ${(100 - rotatedBoundingBox.height).toFixed(2)}%\n` +
          `Final newDragY: ${Math.max(0, Math.min(100 - rotatedBoundingBox.height, newDragY)).toFixed(2)}%`
        );
      }

      newDragX = Math.max(0, Math.min(100 - rotatedBoundingBox.width, newDragX));
      newDragY = Math.max(0, Math.min(100 - rotatedBoundingBox.height, newDragY));
      onPositionChange(field, { ...position, x: newDragX, y: newDragY });
    } else if (isResizing && resizeHandle) {
      // Correctly initialize newX, newY, newWidth, newHeight for mouse resizing logic
      let newX = initialPosition.x;
      let newY = initialPosition.y;
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      const currentFieldRotation = position.rotation || 0; // Get current rotation from prop

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

      // Ensure minimum dimensions
      newWidth = Math.max(5, newWidth);
      newHeight = Math.max(3, newHeight);

      // Basic sanity check for un-rotated dimensions and positions
      if (newX + newWidth > 100) {
        if (resizeHandle.name.includes('w')) { newX = 100 - newWidth; } else { newWidth = 100 - newX; }
      }
      if (newY + newHeight > 100) {
        if (resizeHandle.name.includes('n')) { newY = 100 - newHeight; } else { newHeight = 100 - newY; }
      }
      newX = Math.max(0, newX); // Ensure X is not negative
      newY = Math.max(0, newY); // Ensure Y is not negative
      // Re-ensure min dimensions after potential adjustments if X/Y were clamped to 0
      newWidth = Math.max(5, newWidth);
      newHeight = Math.max(3, newHeight);
      // And ensure width/height don't cause overflow from a 0,0 origin if X/Y were clamped
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
    
    // Prevenir scroll SEMPRE durante drag/resize/rotate
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

    const deltaXPercent = (deltaX / containerSize.width) * 100;
    const deltaYPercent = (deltaY / containerSize.height) * 100;

    if (isDragging) {
      const rotatedBoundingBox = getRotatedBoundingBox(position.width, position.height, rotation || 0);
      const newX = Math.max(0, Math.min(100 - rotatedBoundingBox.width, initialPosition.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100 - rotatedBoundingBox.height, initialPosition.y + deltaYPercent));
      onPositionChange(field, { ...position, x: newX, y: newY }); // Preserve rotation
    } else if (isResizing && resizeHandle) {
      // Store current rotation to pass it along, as onPositionChange and onSizeChange might not preserve it
      const currentRotation = position.rotation || 0;
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

      // Recalculate bounding box for the new size and position before applying
      const finalRotatedBox = getRotatedBoundingBox(newWidth, newHeight, currentRotation);

      // Adjust position if the rotated box overflows
      if (newX + finalRotatedBox.width > 100) {
        newX = 100 - finalRotatedBox.width;
      }
      if (newY + finalRotatedBox.height > 100) {
        newY = 100 - finalRotatedBox.height;
      }
      // Ensure position is not negative after adjustment
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);


      onPositionChange(field, { x: newX, y: newY });
      onSizeChange(field, { width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false); // Reset rotation state
    setResizeHandle(null);
  };

  const handleTouchEnd = () => {
    // Restaurar scroll do body
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false); // Reset rotation state
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
  if (isEditing) { // Check if we were actually editing
      if (onContentChange && content !== editedContent) {
          onContentChange(field, editedContent); // Commit content if changed
      }
      setIsEditing(false); // Exit editing mode
      // Ensure parent knows about selection state on blur, as it might be relevant for UI updates (e.g., FormattingPanel).
      if (onSelect) {
        onSelect(field);
      }
  }
};

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitChanges(); // This will set isEditing to false
      onSelect(field);  // Explicitly select the field for FormattingPanel
      // Explicitly blur after committing via Enter key to ensure focus shifts correctly.
      textareaRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedContent(content); // Revert to original prop content
      setIsEditing(false);
      onSelect(field); // Also ensure selected for FormattingPanel on escape
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
    if (isDragging || isResizing || isRotating) { // Added isRotating
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
  }, [isDragging, isResizing, isRotating, dragStart, initialPosition, initialSize, initialRotation]); // Added isRotating and initialRotation

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

  const textLines = wrapText(editedContent, pixelPosition.width - 16); // Use editedContent for display
  const lineHeight = (style.fontSize || 16) * 1.2;
  const handleSize = isMobile ? 16 : 8;

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
        transform: `rotate(${rotation || 0}deg)`, // Apply rotation
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
        // Always select the field when clicked, unless it\'s already in editing mode and the click is within the textarea
        if (!isEditing || e.target !== textareaRef.current) {
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
            WebkitTextStroke: style.textStroke
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

      {/* Rotation Handle */}
      {isSelected && !isEditing && (
        <Box
          className="rotate-handle"
          sx={{
            position: 'absolute',
            top: `-${handleSize * 2}px`, // Position above the TextBox
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${handleSize * 1.5}px`,
            height: `${handleSize * 1.5}px`,
            backgroundColor: '#ff9800', // Orange color for rotation
            border: '2px solid #ffffff',
            borderRadius: '50%',
            cursor: 'grab', // Using grab cursor for rotation
            pointerEvents: 'auto',
            zIndex: 11, // Above resize handles
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: isMobile ? '24px' : '12px',
            minHeight: isMobile ? '24px' : '12px',
            touchAction: 'none',
            '&:active': {
              backgroundColor: '#f57c00',
              cursor: 'grabbing',
            },
          }}
          onMouseDown={(e) => effectiveHandleMouseDown(e, 'rotate')}
          onTouchStart={(e) => effectiveHandleTouchStart(e, 'rotate')}
        >
          {/* Optional: Add an icon for rotation, e.g., from Material Icons */}
          {/* <RotateRightIcon sx={{ color: 'white', fontSize: isMobile ? 16 : 10 }} /> */}
        </Box>
      )}
  </Box>
  );
};

export default TextBox;

