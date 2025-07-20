import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  rotation,
  setIsMoving,
  originalImageSize,
  fontScale: fontScaleProp
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

  const getRotatedBoundingBox = useCallback((widthPercent, heightPercent, rotationDegrees) => {
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
  }, [containerSize.width, containerSize.height]);

  const calculateResizedDimensionsAndPosition = (initialPosition, initialSize, deltaXPercent, deltaYPercent, handleName, rotationDegrees) => {
    let newX = initialPosition.x;
    let newY = initialPosition.y;
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;

    const rad = rotationDegrees * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Adjust deltas based on rotation
    // deltaRotX is change along the box's rotated "width" axis
    // deltaRotY is change along the box's rotated "height" axis
    const rotatedDeltaX = deltaXPercent * cos + deltaYPercent * sin;
    const rotatedDeltaY = -deltaXPercent * sin + deltaYPercent * cos;

    // Store initial center for reference
    const initialCenterX = initialPosition.x + initialSize.width / 2;
    const initialCenterY = initialPosition.y + initialSize.height / 2;

    // Calculate the initial position of all 4 corners of the UNROTATED box
    const corners = {
        nw: { x: initialPosition.x, y: initialPosition.y },
        ne: { x: initialPosition.x + initialSize.width, y: initialPosition.y },
        sw: { x: initialPosition.x, y: initialPosition.y + initialSize.height },
        se: { x: initialPosition.x + initialSize.width, y: initialPosition.y + initialSize.height },
    };

    // Function to rotate a point around a center
    const rotatePoint = (point, center, angleRad) => {
        const s = Math.sin(angleRad);
        const c = Math.cos(angleRad);
        // translate point back to origin:
        point.x -= center.x;
        point.y -= center.y;
        // rotate point
        const xnew = point.x * c - point.y * s;
        const ynew = point.x * s + point.y * c;
        // translate point back:
        point.x = xnew + center.x;
        point.y = ynew + center.y;
        return point;
    };

    // Get initial ROTATED screen positions of corners
    const initialRotatedCorners = {};
    for (const key in corners) {
        initialRotatedCorners[key] = rotatePoint({ ...corners[key] }, { x: initialCenterX, y: initialCenterY }, rad);
    }

    let fixedAnchorPoint = { x: 0, y: 0 };
    let oppositeHandleName = '';

    // Determine the fixed anchor point based on the handle being dragged
    switch (handleName) {
        case 'n':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.sw.x + initialRotatedCorners.se.x) / 2,
                y: (initialRotatedCorners.sw.y + initialRotatedCorners.se.y) / 2
            };
            oppositeHandleName = 's_mid'; // Indicates midpoint of south side
            newHeight -= rotatedDeltaY;
            // Width should not change for 'n' handle drag
            newWidth = initialSize.width;
            break;
        case 'e':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.nw.x + initialRotatedCorners.sw.x) / 2,
                y: (initialRotatedCorners.nw.y + initialRotatedCorners.sw.y) / 2
            };
            oppositeHandleName = 'w_mid'; // Indicates midpoint of west side
            newWidth += rotatedDeltaX;
            // Height should not change for 'e' handle drag
            newHeight = initialSize.height;
            break;
        case 's':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.nw.x + initialRotatedCorners.ne.x) / 2,
                y: (initialRotatedCorners.nw.y + initialRotatedCorners.ne.y) / 2
            };
            oppositeHandleName = 'n_mid'; // Indicates midpoint of north side
            newHeight += rotatedDeltaY;
            newWidth = initialSize.width;
            break;
        case 'w':
            fixedAnchorPoint = {
                x: (initialRotatedCorners.ne.x + initialRotatedCorners.se.x) / 2,
                y: (initialRotatedCorners.ne.y + initialRotatedCorners.se.y) / 2
            };
            oppositeHandleName = 'e_mid'; // Indicates midpoint of east side
            newWidth -= rotatedDeltaX;
            newHeight = initialSize.height;
            break;
        // Corner cases remain the same, anchoring to the opposite corner
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

    // Calculate the new position of the dragged handle in the rotated system,
    // assuming the fixedAnchorPoint stays put.
    // This is the tricky part. We need to find the new (X, Y) of the unrotated bounding box.

    // Let the fixed anchor point in the *local* unrotated frame be (ax_local, ay_local)
    // e.g. if handle is 'e', anchor is 'sw'. In local frame, sw is (0, H_initial).
    // Let the dragged handle in the *local* unrotated frame be (dx_local, dy_local)
    // e.g. if handle is 'e', it's (W_initial, H_initial/2) or a corner.

    // The vector from the fixed anchor to the dragged handle, in the local frame, changes length.
    // Its new length is newWidth or newHeight or sqrt(newW^2+newH^2).
    // The direction of this vector (in local frame) is fixed. e.g., from W to E is along local X axis.

    // Simpler: find the new center such that the fixedAnchorPoint remains at its screen position.
    // Let P_anchor_screen be the screen coords of the fixed anchor.
    // Let C_new be the new center (newCenterX, newCenterY) of the unrotated box.
    // Let P_anchor_local be the local coords of the anchor relative to C_new (e.g., (-newWidth/2, newHeight/2) for 'sw' if center is origin).
    // P_anchor_screen = Rotate(P_anchor_local, C_new, rad) + C_new
    // P_anchor_screen.x = (P_anchor_local.x * cos - P_anchor_local.y * sin) + newCenterX
    // P_anchor_screen.y = (P_anchor_local.x * sin + P_anchor_local.y * cos) + newCenterY
    // We know P_anchor_screen (it's fixedAnchorPoint.x, fixedAnchorPoint.y).
    // We know P_anchor_local's components in terms of newWidth/newHeight.
    // Solve for newCenterX, newCenterY.

    let localAnchorXComp, localAnchorYComp; // Components of vector from center to anchor point in local frame
    switch (oppositeHandleName) {
        // Corner cases (anchor is an opposite corner)
        case 'nw': localAnchorXComp = -newWidth / 2; localAnchorYComp = -newHeight / 2; break;
        case 'ne': localAnchorXComp = newWidth / 2; localAnchorYComp = -newHeight / 2; break;
        case 'sw': localAnchorXComp = -newWidth / 2; localAnchorYComp = newHeight / 2; break;
        case 'se': localAnchorXComp = newWidth / 2; localAnchorYComp = newHeight / 2; break;
        // Side cases (anchor is midpoint of the opposite side)
        case 'n_mid': // Dragging 's' handle, anchor is midpoint of 'n' side
            localAnchorXComp = 0; localAnchorYComp = -newHeight / 2; break;
        case 'e_mid': // Dragging 'w' handle, anchor is midpoint of 'e' side
            localAnchorXComp = newWidth / 2; localAnchorYComp = 0; break;
        case 's_mid': // Dragging 'n' handle, anchor is midpoint of 's' side
            localAnchorXComp = 0; localAnchorYComp = newHeight / 2; break;
        case 'w_mid': // Dragging 'e' handle, anchor is midpoint of 'w' side
            localAnchorXComp = -newWidth / 2; localAnchorYComp = 0; break;
        default:
            console.error("Unknown oppositeHandleName:", oppositeHandleName);
            localAnchorXComp = 0; localAnchorYComp = 0;
    }

    // We want: fixedAnchorPoint.x = newCenterX + localAnchorXComp * cos - localAnchorYComp * sin
    //          fixedAnchorPoint.y = newCenterY + localAnchorXComp * sin + localAnchorYComp * cos

    // So: newCenterX = fixedAnchorPoint.x - (localAnchorXComp * cos - localAnchorYComp * sin)
    //     newCenterY = fixedAnchorPoint.y - (localAnchorXComp * sin + localAnchorYComp * cos)

    const termX = localAnchorXComp * cos - localAnchorYComp * sin;
    const termY = localAnchorXComp * sin + localAnchorYComp * cos;

    const newCenterX = fixedAnchorPoint.x - termX;
    const newCenterY = fixedAnchorPoint.y - termY;

    newX = newCenterX - newWidth / 2;
    newY = newCenterY - newHeight / 2;

    // Boundary checks (basic for now, might need getRotatedBoundingBox checks)
    newWidth = Math.max(5, newWidth);
    newHeight = Math.max(3, newHeight);

    // Clamping position and then potentially dimensions if position clamping forces it
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    if (newX + newWidth > 100) {
        newWidth = 100 - newX;
    }
    if (newY + newHeight > 100) {
        newHeight = 100 - newY;
    }
    // Re-clamp position if dimensions changed due to boundary
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
      
      // Ensure that the position object passed to onPositionChange includes all necessary properties
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

      // Ensure that the position object passed to onPositionChange includes all necessary properties
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

  // Para o wrap, usamos a largura da caixa em pixels no tamanho original da imagem
  const originalBoxWidth = (position.width / 100) * (originalImageSize?.width || 1);
  const paddingInPixels = 8 * 2; // 8px de cada lado
  const textLines = wrapText(editedContent, originalBoxWidth - paddingInPixels, baseFontSize);

  const handleSize = isMobile ? 24 : 12; // Aumentado o tamanho do handle

  // Estilo para o conteúdo do texto, que será escalado
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
      className="text-box"
      sx={{
        position: 'absolute', left: `${position.x}%`, top: `${position.y}%`,
        width: `${position.width}%`, height: `${position.height}%`,
        cursor: isDragging ? 'grabbing' : (isEditing ? 'text' : 'grab'),
        userSelect: 'none',
        transform: `rotate(${rotation || 0}deg)`,
        zIndex: 2,
        touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none',
        '&:hover': {
          border: isSelected ? '2px solid #2196f3' : '2px solid #a0cfff',
          backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
        },
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
      {/* Div interna para visualização de borda e conteúdo */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          border: isSelected ? '2px solid #2196f3' : '2px solid transparent',
          borderRadius: 1,
          backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
          padding: '8px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'center' ? 'center' : 'flex-end',
          alignItems: style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'middle' ? 'center' : 'flex-end',
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          '&:hover': {
            border: isSelected ? '2px solid #2196f3' : '2px solid #a0cfff',
            backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
          },
        }}
      >
        {isEditing && isSelected ? (
          <textarea
            ref={textareaRef} value={editedContent} onChange={handleTextareaChange}
            onBlur={handleTextareaBlur} onKeyDown={handleTextareaKeyDown}
            style={{
              width: '100%',
              height: '100%',
              fontFamily: style.fontFamily || 'Arial',
              fontSize: `${scaledFontSize}px`, // A fonte no textarea precisa ser escalada visualmente
              fontWeight: style.fontWeight || 'normal',
              fontStyle: style.fontStyle || 'normal',
              color: style.color || '#000000',
              lineHeight: `${scaledLineHeight}px`, // A altura da linha também
              textDecoration: style.textDecoration || 'none',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              overflow: 'hidden',
              padding: 0,
              boxSizing: 'border-box',
              textAlign: style.textAlign || 'left',
            }}
          />
        ) : (
          <Box
            sx={textContentStyle}
            dangerouslySetInnerHTML={{ __html: editedContent }}
          />
        )}
      </Box>

      {/* Handles de redimensionamento e rotação */}
      {isSelected && !isEditing && (
        <>
          {resizeHandles.map((handle) => (
            <Box
              key={handle.name}
              className={`resize-handle-${handle.name}`}
              sx={{
                position: 'absolute',
                left: `calc(${handle.x * 100}% - ${handleSize / 2}px)`,
                top: `calc(${handle.y * 100}% - ${handleSize / 2}px)`,
                width: `${handleSize}px`,
                height: `${handleSize}px`,
                backgroundColor: '#2196f3',
                border: '2px solid #ffffff',
                borderRadius: '50%',
                cursor: handle.cursor,
                pointerEvents: 'auto',
                zIndex: 10,
                touchAction: 'none',
                '&:active': {
                  backgroundColor: '#1976d2',
                  transform: 'scale(1.2)',
                },
              }}
              onMouseDown={(e) => effectiveHandleMouseDown(e, 'resize', handle)}
              onTouchStart={(e) => effectiveHandleTouchStart(e, 'resize', handle)}
            />
          ))}
          <Box
            className="rotate-handle"
            sx={{
              position: 'absolute',
              top: `-${handleSize * 2.5}px`, // Aumentar a distância para não sobrepor a borda
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${handleSize * 1.5}px`,
              height: `${handleSize * 1.5}px`,
              backgroundColor: '#ff9800',
              border: '2px solid #ffffff',
              borderRadius: '50%',
              cursor: 'grab',
              pointerEvents: 'auto',
              zIndex: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
              '&:active': { backgroundColor: '#f57c00', cursor: 'grabbing' },
            }}
            onMouseDown={(e) => effectiveHandleMouseDown(e, 'rotate')}
            onTouchStart={(e) => effectiveHandleTouchStart(e, 'rotate')}
          />
        </>
      )}
    </Box>
  );
};

export default TextBox;
