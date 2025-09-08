import { containsHtml, renderHtmlToCanvas } from './htmlRenderer';
import { isHtmlField } from '../lib/utils';
import { applyColorHighlight } from './filterUtils';


// Helper functions moved from PageGeneratorFrontendOnly.jsx and adapted for utility use

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
    const words = text.toString().split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            if (lines.length >= maxLines) break;
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (lines.length < maxLines && currentLine) {
        lines.push(currentLine);
    }
    return lines;
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
    if (src.startsWith('http')) {
        img.crossOrigin = 'Anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`, { cause: err }));
    img.src = src;
  });
};

const getDimensionsFromAspectRatio = (aspectRatio) => {
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

/**
 * Creates a complete composite image with text and returns full imageData object.
 * This version uses a single main background image and applies transformations to it.
 * @param {object} params - The parameters for composition.
 * @returns {Promise<object>} A promise that resolves with the final imageData object.
 */
export const composeSingleImage = async ({
    record,
    index,
    brandElements = [],
    fieldPositions = {},
    fieldStyles = {},
    aspectRatio,
    pageTemplate,
    fontScale = 1,
}) => {

    // 1. Create final canvas with fixed dimensions based on aspect ratio.
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    const dimensions = getDimensionsFromAspectRatio(aspectRatio);

    if (!dimensions) {
        finalCanvas.width = 1080;
        finalCanvas.height = 1080;
        console.warn(`[imageComposer] Aspect ratio not provided or invalid. Falling back to 1080x1080.`);
    } else {
        finalCanvas.width = dimensions.width;
        finalCanvas.height = dimensions.height;
    }

    // 2. Draw background color or gradient
    if (pageTemplate.gradient) {
        // This is a simplified gradient handling. The editor creates a CSS string.
        // For canvas, we'd need to parse this or use the structured object.
        // For now, we assume a simple linear gradient object if not a string.
        if (typeof pageTemplate.gradient === 'object' && pageTemplate.gradient.stops) {
            const gradient = ctx.createLinearGradient(0, 0, finalCanvas.width, finalCanvas.height);
            pageTemplate.gradient.stops.forEach(stop => {
                gradient.addColorStop(stop.position / 100, stop.color);
            });
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = 'white'; // Fallback
        }
    } else {
        ctx.fillStyle = pageTemplate.backgroundColor || 'white';
    }
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // 3. Collect and sort all elements (text and brand) by zIndex
    const elementsToDraw = [];

    // Add page images to the drawing queue
    (pageTemplate.images || []).forEach(image => {
        if (image.src && image.visible !== false) {
            elementsToDraw.push({
                type: 'image',
                ...image,
                zIndex: image.zIndex || 0,
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

    (brandElements || []).forEach(element => {
        if (element.url && element.visible !== false) {
            elementsToDraw.push({
                type: 'image', // Treat brand elements as images
                ...element,
                zIndex: element.zIndex || 0,
            });
        }
    });

    elementsToDraw.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // 4. Draw sorted elements
    for (const element of elementsToDraw) {
        ctx.save();
        if (element.type === 'text') {
            const { id, content, position, style } = element;
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

            const finalStyle = {
                ...style,
                fontSize: (style.fontSize || 24) * fontScale,
                strokeWidth: (style.strokeWidth || 2) * fontScale,
                shadowBlur: (style.shadowBlur || 4) * fontScale,
                shadowOffsetX: (style.shadowOffsetX || 2) * fontScale,
                shadowOffsetY: (style.shadowOffsetY || 2) * fontScale,
            };

            const padding = (style.padding || 0);
            const borderRadius = (style.borderRadius || 0);
            const borderWidth = (style.borderWidth || 0);

            const backgroundOpacity = style.backgroundOpacity !== undefined ? style.backgroundOpacity : 1;
            const backgroundColorHex = style.backgroundColor || '#000000';
            if (backgroundOpacity > 0) {
                ctx.fillStyle = hexToRgba(backgroundColorHex, backgroundOpacity);
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

            const lines = wrapTextInArea(ctx, content, finalStyle, effectiveTextWidth, effectiveTextHeight);
            const lineHeight = finalStyle.fontSize * (finalStyle.lineHeightMultiplier || 1.2);

            let currentLineRenderY = textContentStartY;
            if (finalStyle.verticalAlign === 'middle') {
                const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - finalStyle.fontSize) : 0);
                currentLineRenderY += (effectiveTextHeight - totalTextBlockHeight) / 2;
            } else if (finalStyle.verticalAlign === 'bottom') {
                const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - finalStyle.fontSize) : 0);
                currentLineRenderY += effectiveTextHeight - totalTextBlockHeight;
            }

            if (containsHtml(content)) {
                await renderHtmlToCanvas(ctx, content, textContentStartX, textContentStartY, effectiveTextWidth, effectiveTextHeight, finalStyle);
            } else {
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

        } else if (element.type === 'image') {
            try {
                const elementImg = await loadImage(element.src || element.url);
                const elX = (element.x / 100) * finalCanvas.width;
                const elY = (element.y / 100) * finalCanvas.height;
                const elWidth = (element.width / 100) * finalCanvas.width;
                const elHeight = (element.height / 100) * finalCanvas.height;

                if (element.rotation) {
                    const centerX = elX + elWidth / 2;
                    const centerY = elY + elHeight / 2;
                    ctx.translate(centerX, centerY);
                    ctx.rotate(element.rotation * Math.PI / 180);
                    ctx.translate(-centerX, -centerY);
                }
                if (element.filters) {
                    const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = element.filters;
                    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`;
                }
                ctx.drawImage(elementImg, elX, elY, elWidth, elHeight);
            } catch (error) {
                console.error(`[composeSingleImage] Failed to load or draw image element ${element.id}:`, error);
            }
        }
        ctx.restore();
    }

    // 5. Generate final data URL and blob
    const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
    const blob = dataURLtoBlob(dataUrl);

    // 6. Return the complete imageData object
    return {
        url: dataUrl,
        dataUrl: dataUrl,
        blob,
        record,
        index,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        // Return the state of the page template that was actually used for composition
        customPageTemplate: pageTemplate,
    };
};
