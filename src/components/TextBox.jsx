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

  const getRotatedBoundingBox = (widthPercent, heightPercent, rotationDegrees) => {
    const width = (widthPercent / 100) * containerSize.width;
    const height = (heightPercent / 100) * containerSize.height;
    const radians = rotationDegrees * (Math.PI / 180);
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    const newWidthPx = height * sin + width * cos;
    const newHeightPx = height * cos + width * sin;

    return {
      width: (newWidthPx / containerSize.width) * 100,
      height: (newHeightPx / containerSize.height) * 100,
    };
  };

  // Função auxiliar para transformar um ponto de coordenadas da caixa para coordenadas de tela
  const transformBoxPointToScreen = (pointInBoxCoords, boxTopLeftX, boxTopLeftY, boxW, boxH, degrees) => {
      const radians = degrees * (Math.PI / 180);
      const cosA = Math.cos(radians);
      const sinA = Math.sin(radians);

      const boxCenterX_unrotated = boxTopLeftX + boxW / 2;
      const boxCenterY_unrotated = boxTopLeftY + boxH / 2;

      const localX = pointInBoxCoords.x - boxW / 2;
      const localY = pointInBoxCoords.y - boxH / 2;

      const rotatedLocalX = localX * cosA - localY * sinA;
      const rotatedLocalY = localX * sinA + localY * cosA;

      return {
          x: boxCenterX_unrotated + rotatedLocalX,
          y: boxCenterY_unrotated + rotatedLocalY,
      };
  };

  const calculateResizedDimensionsAndPosition = (
    currentInitialPosition,
    currentInitialSize,
    deltaXPercentScreen,
    deltaYPercentScreen,
    resizeHandleName,
    currentRotationDegrees
  ) => {
    const initialBoxX = currentInitialPosition.x;
    const initialBoxY = currentInitialPosition.y;
    const initialBoxW = currentInitialSize.width;
    const initialBoxH = currentInitialSize.height;

    const rotationRadians = currentRotationDegrees * (Math.PI / 180);
    const cosA = Math.cos(rotationRadians);
    const sinA = Math.sin(rotationRadians);

    const pivotRatios = {
        'n': { x: 0.5, y: 1.0 },   // Meio do lado Sul
        's': { x: 0.5, y: 0.0 },   // Meio do lado Norte
        'w': { x: 1.0, y: 0.5 },   // Meio do lado Leste
        'e': { x: 0.0, y: 0.5 },   // Meio do lado Oeste
        'nw': { x: 1.0, y: 1.0 },  // Canto SE
        'ne': { x: 0.0, y: 1.0 },  // Canto SW
        'sw': { x: 1.0, y: 0.0 },  // Canto NE
        'se': { x: 0.0, y: 0.0 }   // Canto NW
    };
    const pivotRatio = pivotRatios[resizeHandleName] || { x: 0.0, y: 0.0 }; // Default para 'se'

    const pivotInInitialBox = {
        x: pivotRatio.x * initialBoxW,
        y: pivotRatio.y * initialBoxH
    };

    const pivotScreenPosInitial = transformBoxPointToScreen(
        pivotInInitialBox,
        initialBoxX, initialBoxY,
        initialBoxW, initialBoxH,
        currentRotationDegrees
    );

    const dxScreen = deltaXPercentScreen;
    const dyScreen = deltaYPercentScreen;
    const dxBox = dxScreen * cosA + dyScreen * sinA;
    const dyBox = -dxScreen * sinA + dyScreen * cosA;

    let newWidth = initialBoxW;
    let newHeight = initialBoxH;
    let tempAnchorShiftX_box = 0;
    let tempAnchorShiftY_box = 0;

    switch (resizeHandleName) {
        case 'n': newHeight -= dyBox; tempAnchorShiftY_box = dyBox; break;
        case 's': newHeight += dyBox; break;
        case 'w': newWidth -= dxBox; tempAnchorShiftX_box = dxBox; break;
        case 'e': newWidth += dxBox; break;
        case 'nw': newWidth -= dxBox; newHeight -= dyBox; tempAnchorShiftX_box = dxBox; tempAnchorShiftY_box = dyBox; break;
        case 'ne': newWidth += dxBox; newHeight -= dyBox; tempAnchorShiftY_box = dyBox; break;
        case 'sw': newWidth -= dxBox; newHeight += dyBox; tempAnchorShiftX_box = dxBox; break;
        case 'se': newWidth += dxBox; newHeight += dyBox; break;
    }

    newWidth = Math.max(5, newWidth);
    newHeight = Math.max(3, newHeight);

    const prelimAnchorShiftX_screen = tempAnchorShiftX_box * cosA - tempAnchorShiftY_box * sinA;
    const prelimAnchorShiftY_screen = tempAnchorShiftX_box * sinA + tempAnchorShiftY_box * cosA;
    const prelimBoxX = initialBoxX + prelimAnchorShiftX_screen;
    const prelimBoxY = initialBoxY + prelimAnchorShiftY_screen;

    const pivotInNewResizedBox = {
        x: pivotRatio.x * newWidth,
        y: pivotRatio.y * newHeight
    };
    const pivotScreenPosAfterResize_prelim = transformBoxPointToScreen(
        pivotInNewResizedBox,
        prelimBoxX, prelimBoxY,
        newWidth, newHeight,
        currentRotationDegrees
    );

    const correctionX = pivotScreenPosInitial.x - pivotScreenPosAfterResize_prelim.x;
    const correctionY = pivotScreenPosInitial.y - pivotScreenPosAfterResize_prelim.y;

    let newX = prelimBoxX + correctionX;
    let newY = prelimBoxY + correctionY;

    // Lógica de contenção
    const finalRotatedBounds = getRotatedBoundingBox(newWidth, newHeight, currentRotationDegrees);
    if (newX < 0) {
        // Se newX < 0, e o pivô estava à direita (e.g., alça 'e' ou 'ne' ou 'se'),
        // o ajuste para manter o pivô pode ter empurrado newX para < 0.
        // Precisamos ajustar newWidth também.
        // Esta parte da contenção é complexa quando um pivô deve ser mantido.
        // Uma simplificação por agora:
        newX = 0;
    }
    if (newX + finalRotatedBounds.width > 100) {
        newX = 100 - finalRotatedBounds.width;
    }
    if (newY < 0) {
        newY = 0;
    }
    if (newY + finalRotatedBounds.height > 100) {
        newY = 100 - finalRotatedBounds.height;
    }
     // Re-verificar se newX/newY ainda estão dentro dos limites após o ajuste de largura/altura
    if (newX < 0) newX = 0;
    if (newX + getRotatedBoundingBox(newWidth, newHeight, currentRotationDegrees).width > 100) {
      // Potencialmente reajustar newWidth se newX foi fixado em 0 e ainda estoura
      // Ou newX se newWidth é fixo.
    }
    // Similar para newY e newHeight.
    // A contenção robusta com pivôs é não trivial. A lógica acima é uma primeira aproximação.

    return { newX, newY, newWidth, newHeight };
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
      
      onPositionChange(field, { x: newX, y: newY, rotation: rotationDegrees });
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
    const deltaXPercent = (deltaX / containerSize.width) * 100;
    const deltaYPercent = (deltaY / containerSize.height) * 100;

    if (isDragging) {
      const rotatedBoundingBox = getRotatedBoundingBox(position.width, position.height, rotation || 0);
      let newX = initialPosition.x + deltaXPercent;
      let newY = initialPosition.y + deltaYPercent;

      newX = Math.max(0, Math.min(100 - rotatedBoundingBox.width, newX));
      newY = Math.max(0, Math.min(100 - rotatedBoundingBox.height, newY));
      onPositionChange(field, { ...position, x: newX, y: newY });
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

      onPositionChange(field, { x: newX, y: newY, rotation: rotationDegrees });
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

