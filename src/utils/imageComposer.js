import { containsHtml, renderHtmlToCanvas } from './htmlRenderer';
import { applyColorHighlight } from './filterUtils';

// Helper functions moved from PageGeneratorFrontendOnly.jsx and adapted for utility use

export const urlToBlob = async (url) => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error(`[urlToBlob] Error fetching URL ${url}:`, error);
    throw error;
  }
};

export const dataURLtoBlob = (dataurl) => {
    if (!dataurl) return null;
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1].split(';base64,').pop());
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
};

export const wrapTextInArea = (ctx, text, style, maxWidth, maxHeight) => {
    if (!text) return [];
    const fontSize = style.fontSize || 24;
    const lineHeight = fontSize * (style.lineHeightMultiplier || 1.2);
    const maxLines = Math.floor(maxHeight / lineHeight);
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${fontSize}px ${style.fontFamily || 'Arial'}`;

    const allLines = [];
    const paragraphs = text.toString().split('\n');

    for (const paragraph of paragraphs) {
        if (allLines.length >= maxLines) break;

        const words = paragraph.split(' ');
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + ' ' + word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine !== '') {
                allLines.push(currentLine);
                if (allLines.length >= maxLines) break;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (allLines.length < maxLines && currentLine) {
            allLines.push(currentLine);
        }
    }

    return allLines;
};

export const applyTextEffects = (ctx, style) => {
    ctx.fillStyle = style.color || '#000000';
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
    ctx.textAlign = style.textAlign || 'left';
    ctx.textBaseline = 'top'; // Consistent baseline
    if (style.textShadow) {
        ctx.shadowColor = style.shadowColor || '#000000';
        ctx.shadowBlur = style.shadowBlur || 4;
        ctx.shadowOffsetX = style.shadowOffsetX || 2;
        ctx.shadowOffsetY = style.shadowOffsetY || 2;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    if (style.textStroke) {
        ctx.strokeStyle = style.strokeColor || '#ffffff';
        ctx.lineWidth = style.strokeWidth || 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
};

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

export const drawTextWithEffects = async (ctx, text, x, y, style, maxWidth, maxHeight) => {
    if (containsHtml(text)) {
        await renderHtmlToCanvas(ctx, text, x, y, maxWidth, maxHeight, style);
    } else {
        if (style.textStroke) {
            ctx.strokeText(text, x, y);
        }
        ctx.fillText(text, x, y);
    }
};

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Adiciona o proxy para imagens do Vercel Blob Storage para evitar problemas de CORS no canvas
    let finalSrc = src;
    if (src && src.includes('blob.vercel-storage.com')) {
      finalSrc = `/api/image-proxy?url=${encodeURIComponent(src)}`;
    } else if (src && src.startsWith('http')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`, { cause: err }));
    img.src = finalSrc;
  });
};

export const getDimensionsFromAspectRatio = (aspectRatio) => {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '4:5':
      return { width: 720, height: 900 };
    case '1:1':
      return { width: 720, height: 720 };
    default:
      return null;
  }
};

const drawImageWithEffects = async (ctx, element, canvasWidth, canvasHeight) => {
    const src = element.src || element.url;
    if (!src) return;

    try {
        const img = await loadImage(src);
        ctx.save();

        const {
          x = 0, y = 0, width = 100, height = 100,
          rotation = 0,
          filters = { brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 },
          crop,
          shadow, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY,
          borderRadius = 0,
          borderWidth = 0,
          borderColor,
          objectFit = 'fill',
        } = element;

        const dx = (x / 100) * canvasWidth;
        const dy = (y / 100) * canvasHeight;
        const dWidth = (width / 100) * canvasWidth;
        const dHeight = (height / 100) * canvasHeight;

        // Draw shadow first, so it's behind the image and not clipped
        if (shadow) {
            ctx.save();
            if (rotation) {
                const centerX = dx + dWidth / 2;
                const centerY = dy + dHeight / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.translate(-centerX, -centerY);
            }
            ctx.shadowColor = shadowColor || '#000000';
            ctx.shadowBlur = shadowBlur || 10;
            ctx.shadowOffsetX = shadowOffsetX || 5;
            ctx.shadowOffsetY = shadowOffsetY || 5;
            // We need to fill a shape for the shadow to appear, so we'll fill the rounded rect.
            // The actual image will be drawn over this.
            drawRoundedRect(ctx, dx, dy, dWidth, dHeight, borderRadius);
            ctx.fillStyle = 'rgba(0,0,0,0.01)'; // Use a near-transparent fill
            ctx.fill();
            ctx.restore();
        }

        // Now, draw the main image with clipping and border
        ctx.save();
        if (rotation) {
          const centerX = dx + dWidth / 2;
          const centerY = dy + dHeight / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(rotation * Math.PI / 180);
          ctx.translate(-centerX, -centerY);
        }

        // Apply clipping path for rounded corners
        drawRoundedRect(ctx, dx, dy, dWidth, dHeight, borderRadius);
        ctx.clip();

        // Set filters
        const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = filters || {};
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`;

        // Draw the image with object-fit logic
        if (crop && crop.width > 0 && crop.height > 0) {
          const sx = (crop.x / 100) * img.width;
          const sy = (crop.y / 100) * img.height;
          const sWidth = (crop.width / 100) * img.width;
          const sHeight = (crop.height / 100) * img.height;
          ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        } else {
            let finalDestX = dx;
            let finalDestY = dy;
            let finalDestWidth = dWidth;
            let finalDestHeight = dHeight;
            let finalSrcX = 0;
            let finalSrcY = 0;
            let finalSrcWidth = img.width;
            let finalSrcHeight = img.height;

            const imgRatio = img.width / img.height;
            const containerRatio = dWidth / dHeight;

            if (objectFit === 'contain') {
                if (imgRatio > containerRatio) { // Image is wider than container
                    finalDestWidth = dWidth;
                    finalDestHeight = dWidth / imgRatio;
                    finalDestY = dy + (dHeight - finalDestHeight) / 2;
                } else { // Image is taller or same aspect ratio
                    finalDestHeight = dHeight;
                    finalDestWidth = dHeight * imgRatio;
                    finalDestX = dx + (dWidth - finalDestWidth) / 2;
                }
            } else if (objectFit === 'cover') {
                if (imgRatio > containerRatio) { // Image is wider, so height is the limiting dimension for covering
                    finalSrcHeight = img.height;
                    finalSrcWidth = img.height * containerRatio;
                    finalSrcX = (img.width - finalSrcWidth) / 2;
                } else { // Image is taller, so width is the limiting dimension
                    finalSrcWidth = img.width;
                    finalSrcHeight = img.width / containerRatio;
                    finalSrcY = (img.height - finalSrcHeight) / 2;
                }
            }
            // For 'fill', we use the default values which stretch the image.
            ctx.drawImage(img, finalSrcX, finalSrcY, finalSrcWidth, finalSrcHeight, finalDestX, finalDestY, finalDestWidth, finalDestHeight);
        }

        ctx.filter = 'none';

        // Apply highlight if needed (it's drawn on top of the image, within the clip)
        if (filters.highlightAmount && filters.highlightAmount > 0) {
            applyColorHighlight(ctx, canvasWidth, canvasHeight, filters.highlightColor, filters.highlightAmount);
        }

        // Draw border on top, within the same clipped and rotated context
        if (borderWidth > 0) {
            ctx.strokeStyle = borderColor || '#000000';
            ctx.lineWidth = borderWidth;
            drawRoundedRect(ctx, dx, dy, dWidth, dHeight, borderRadius);
            ctx.stroke();
        }

        ctx.restore(); // Restore from clipping, rotation, and filters
    } catch (error) {
        console.error(`[imageComposer] Failed to draw image ${src}:`, error);
        // Optionally draw a placeholder for the failed image
        ctx.save();
        ctx.fillStyle = 'red';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        const x = (element.x / 100) * canvasWidth + (element.width / 100) * canvasWidth / 2;
        const y = (element.y / 100) * canvasHeight + (element.height / 100) * canvasHeight / 2;
        ctx.fillText('Erro Imagem', x, y);
        ctx.restore();
    }
};

/**
 * Creates a complete composite image with text and returns full imageData object.
 * This version uses a pageTemplate object that can contain multiple images and a background color/gradient.
 * @param {object} params - The parameters for composition.
 * @returns {Promise<object>} A promise that resolves with the final imageData object.
 */
export const drawAndComposeImage = async ({
    record,
    index,
    brandElements = [],
    fieldPositions = {},
    fieldStyles = {},
    aspectRatio,
    pageTemplate,
}) => {

    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    const dimensions = getDimensionsFromAspectRatio(aspectRatio);

    if (!dimensions) {
        finalCanvas.width = 1080;
        finalCanvas.height = 1080;
    } else {
        finalCanvas.width = dimensions.width;
        finalCanvas.height = dimensions.height;
    }

    // 1. Draw background color or gradient
    ctx.save();
    if (pageTemplate.gradient && pageTemplate.gradient.type === 'linear') {
        const angle = pageTemplate.gradient.angle || 0;
        const radians = (angle - 90) * (Math.PI / 180);
        const x0 = finalCanvas.width / 2;
        const y0 = finalCanvas.height / 2;
        const length = Math.sqrt(Math.pow(finalCanvas.width, 2) + Math.pow(finalCanvas.height, 2));
        const x1 = x0 + Math.cos(radians) * length / 2;
        const y1 = y0 + Math.sin(radians) * length / 2;
        const x2 = x0 - Math.cos(radians) * length / 2;
        const y2 = y0 - Math.sin(radians) * length / 2;

        const gradient = ctx.createLinearGradient(x2, y2, x1, y1);
        const colors = pageTemplate.gradient.colors || ['#FFFFFF', '#000000'];
        colors.forEach((color, idx) => {
            gradient.addColorStop(idx / (colors.length - 1), color);
        });
        ctx.fillStyle = gradient;

    } else if (pageTemplate.gradient && pageTemplate.gradient.type === 'radial') {
        const gradient = ctx.createRadialGradient(
            finalCanvas.width / 2, finalCanvas.height / 2, 0,
            finalCanvas.width / 2, finalCanvas.height / 2, Math.max(finalCanvas.width, finalCanvas.height) / 2
        );
        const colors = pageTemplate.gradient.colors || ['#FFFFFF', '#000000'];
        colors.forEach((color, idx) => {
            gradient.addColorStop(idx / (colors.length - 1), color);
        });
        ctx.fillStyle = gradient;
    } else if (pageTemplate.backgroundColor) {
        ctx.fillStyle = pageTemplate.backgroundColor;
    } else {
        ctx.fillStyle = 'white';
    }
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.restore();


    // 2. Collect and sort all elements by zIndex
    const elementsToDraw = [];

    (pageTemplate.images || []).forEach(img => {
        if (img.visible !== false) {
            elementsToDraw.push({
                type: 'image',
                ...img,
                zIndex: img.zIndex || -1, // Default to be behind other elements
            });
        }
    });

    (brandElements || []).forEach(element => {
        if (element.url && element.visible !== false) {
            elementsToDraw.push({
                type: 'image', // Treat brand elements as generic images
                ...element,
                zIndex: element.zIndex || 0,
            });
        }
    });

    Object.keys(record).forEach(field => {
        const position = fieldPositions[field];
        const style = fieldStyles[field];
        if (position && position.visible && style) {
            elementsToDraw.push({
                type: 'text',
                id: field,
                content: record[field] || '',
                position,
                style,
                zIndex: position.zIndex || 0,
            });
        }
    });

    elementsToDraw.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // 3. Draw sorted elements
    for (const element of elementsToDraw) {
        if (element.type === 'image') {
            await drawImageWithEffects(ctx, element, finalCanvas.width, finalCanvas.height);
        } else if (element.type === 'text') {
            ctx.save();
            const { content, position, style } = element;
            if (!content) {
                ctx.restore();
                continue;
            }

            const posPx = {
                x: (position.x / 100) * finalCanvas.width,
                y: (position.y / 100) * finalCanvas.height,
                width: (position.width / 100) * finalCanvas.width,
                height: (position.height / 100) * finalCanvas.height
            };

            if (position.rotation) {
                const centerX = posPx.x + posPx.width / 2;
                const centerY = posPx.y + posPx.height / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(position.rotation * Math.PI / 180);
                ctx.translate(-centerX, -centerY);
            }

            const finalStyle = { ...style, fontSize: (style.fontSize || 24) };
            const padding = (style.padding || 0);
            const borderRadius = (style.borderRadius || 0);
            const borderWidth = (style.borderWidth || 0);

            const backgroundOpacity = style.backgroundOpacity !== undefined ? style.backgroundOpacity : 1;
            if (backgroundOpacity > 0 && style.backgroundColor) {
                ctx.fillStyle = hexToRgba(style.backgroundColor, backgroundOpacity);
                drawRoundedRect(ctx, posPx.x, posPx.y, posPx.width, posPx.height, borderRadius);
                ctx.fill();
            }
            if (borderWidth > 0) {
                ctx.strokeStyle = style.borderColor || '#000000';
                ctx.lineWidth = borderWidth;
                drawRoundedRect(ctx, posPx.x, posPx.y, posPx.width, posPx.height, borderRadius);
                ctx.stroke();
            }

            applyTextEffects(ctx, finalStyle);

            const effectiveTextWidth = Math.max(0, posPx.width - (2 * padding));
            const effectiveTextHeight = Math.max(0, posPx.height - (2 * padding));
            const textContentStartX = posPx.x + padding;
            const textContentStartY = posPx.y + padding;
            const lineHeight = finalStyle.fontSize * (finalStyle.lineHeightMultiplier || 1.2);

            if (containsHtml(content)) {
                await renderHtmlToCanvas(ctx, content, textContentStartX, textContentStartY, effectiveTextWidth, effectiveTextHeight, finalStyle);
            } else {
                const lines = wrapTextInArea(ctx, content, finalStyle, effectiveTextWidth, effectiveTextHeight);
                let totalTextBlockHeight = lines.length * lineHeight;
                if (lines.length > 0) {
                   totalTextBlockHeight -= (lineHeight - finalStyle.fontSize); // Adjust for last line
                }

                let currentLineRenderY = textContentStartY;
                if (finalStyle.verticalAlign === 'middle') {
                    currentLineRenderY += (effectiveTextHeight - totalTextBlockHeight) / 2;
                } else if (finalStyle.verticalAlign === 'bottom') {
                    currentLineRenderY += effectiveTextHeight - totalTextBlockHeight;
                }

                for (const line of lines) {
                    let currentLineRenderX;
                    if (finalStyle.textAlign === 'center') {
                        currentLineRenderX = textContentStartX + effectiveTextWidth / 2;
                    } else if (finalStyle.textAlign === 'right') {
                        currentLineRenderX = textContentStartX + effectiveTextWidth;
                    } else {
                        currentLineRenderX = textContentStartX;
                    }
                    const finalLineY = currentLineRenderY + (lines.indexOf(line) * lineHeight);
                    if (finalStyle.textStroke) {
                        ctx.strokeText(line, currentLineRenderX, finalLineY);
                    }
                    ctx.fillText(line, currentLineRenderX, finalLineY);
                }
            }
            ctx.restore();
        }
    }

    // 4. Generate final data URL and blob
    const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
    const blob = dataURLtoBlob(dataUrl);

    // 5. Return the complete imageData object
    return {
        url: dataUrl,
        dataUrl: dataUrl,
        blob,
        record,
        index,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        pageTemplateUsed: pageTemplate,
    };
};
