import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { parseHtmlToFormattedText, renderFormattedTextToCanvas, containsHtml } from '../../../utils/htmlRenderer';

const SlidePreview = ({
  slide,
  containerWidth,
  containerHeight,
  fieldPositions,
  fieldStyles,
}) => {
  const canvasRef = useRef(null);
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    if (slide && slide.backgroundImage) {
      const img = new Image();
      img.src = slide.backgroundImage;
      img.onload = () => setBackgroundImage(img);
    }
  }, [slide]);

  useEffect(() => {
    if (backgroundImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const { naturalWidth, naturalHeight } = backgroundImage;

      const aspectRatio = naturalWidth / naturalHeight;
      let drawWidth = containerWidth;
      let drawHeight = containerWidth / aspectRatio;

      if (drawHeight > containerHeight) {
        drawHeight = containerHeight;
        drawWidth = containerHeight * aspectRatio;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      ctx.drawImage(backgroundImage, 0, 0, drawWidth, drawHeight);

      Object.keys(slide.record).forEach(field => {
        const position = fieldPositions[field];
        const style = fieldStyles[field];
        const text = slide.record[field] || '';

        if (position && style && text && position.visible) {
          drawText(ctx, text, position, style, drawWidth, drawHeight);
        }
      });
    }
  }, [backgroundImage, slide, containerWidth, containerHeight, fieldPositions, fieldStyles]);

  const drawText = (ctx, text, position, style, canvasWidth, canvasHeight) => {
    const { x, y, width, height, rotation } = position;
    const {
      fontSize,
      fontFamily,
      color,
      textAlign,
      verticalAlign,
      fontWeight,
      fontStyle,
      textShadow,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
      textStroke,
      strokeColor,
      strokeWidth,
      lineHeightMultiplier,
    } = style;

    const posX = (x / 100) * canvasWidth;
    const posY = (y / 100) * canvasHeight;
    const boxWidth = (width / 100) * canvasWidth;
    const boxHeight = (height / 100) * canvasHeight;

    ctx.save();
    ctx.translate(posX + boxWidth / 2, posY + boxHeight / 2);
    ctx.rotate((rotation || 0) * (Math.PI / 180));
    ctx.translate(-(posX + boxWidth / 2), -(posY + boxHeight / 2));

    const effectiveFontSize = fontSize * (canvasWidth / 1920); // Adjust font size based on canvas width
    ctx.font = `${fontWeight || 'normal'} ${fontStyle || 'normal'} ${effectiveFontSize}px ${fontFamily || 'Arial'}`;
    ctx.fillStyle = color || '#000000';
    ctx.textAlign = textAlign || 'left';
    ctx.textBaseline = 'top';

    if (textShadow) {
      ctx.shadowColor = shadowColor || '#000000';
      ctx.shadowBlur = shadowBlur || 0;
      ctx.shadowOffsetX = shadowOffsetX || 0;
      ctx.shadowOffsetY = shadowOffsetY || 0;
    }

    if (containsHtml(text)) {
      const formattedText = parseHtmlToFormattedText(text);
      renderFormattedTextToCanvas(ctx, formattedText, posX, posY, boxWidth, boxHeight, style);
    } else {
      const lines = wrapText(ctx, text, boxWidth);
      const lineHeight = effectiveFontSize * (lineHeightMultiplier || 1.2);

      let startY = posY;
      if (verticalAlign === 'middle') {
        startY += (boxHeight - lines.length * lineHeight) / 2;
      } else if (verticalAlign === 'bottom') {
        startY += boxHeight - lines.length * lineHeight;
      }

      lines.forEach((line, index) => {
        let startX = posX;
        if (textAlign === 'center') {
          startX += boxWidth / 2;
        } else if (textAlign === 'right') {
          startX += boxWidth;
        }

        if (textStroke) {
          ctx.strokeStyle = strokeColor || '#ffffff';
          ctx.lineWidth = strokeWidth || 2;
          ctx.strokeText(line, startX, startY + index * lineHeight);
        }
        ctx.fillText(line, startX, startY + index * lineHeight);
      });
    }

    ctx.restore();
  };

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%' }} />
    </Box>
  );
};

export default SlidePreview;
