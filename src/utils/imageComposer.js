import { containsHtml, renderHtmlToCanvas } from './htmlRenderer';
import { isHtmlField } from '../lib/utils';

// Helper functions moved from ImageGeneratorFrontendOnly.jsx and adapted for utility use

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

/**
 * Composes a new image by applying filters and brand elements to a background.
 * @param {string} backgroundImageUrl - The URL or base64 string of the background image.
 * @param {object} imageFilters - An object containing filter values for the background.
 * @param {Array<object>} brandElements - An array of brand element objects to overlay.
 * @returns {Promise<HTMLCanvasElement>} A promise that resolves with the canvas containing the composed background.
 */
export const composeImage = async (
  backgroundImageUrl,
  imageFilters = {},
  brandElements = []
) => {
  try {
    const bgImg = await loadImage(backgroundImageUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = bgImg.width;
    canvas.height = bgImg.height;

    const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = imageFilters;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`;
    ctx.drawImage(bgImg, 0, 0);
    ctx.filter = 'none';

    for (const element of brandElements) {
      if (!element.url) continue;
      try {
        const elementImg = await loadImage(element.url);
        ctx.save();
        const elX = (element.x / 100) * canvas.width;
        const elY = (element.y / 100) * canvas.height;
        const elWidth = (element.width / 100) * canvas.width;
        const elHeight = (element.height / 100) * canvas.height;
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
        ctx.restore();
      } catch (error) {
        console.error(`[composeImage] Failed to load or draw brand element ${element.id}:`, error);
      }
    }
    return canvas;
  } catch (error) {
    console.error('Error composing image:', error);
    throw error;
  }
};

/**
 * Creates a complete composite image with text and returns full imageData object.
 * @param {object} params - The parameters for composition.
 * @returns {Promise<object>} A promise that resolves with the final imageData object.
 */
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

export const composeSingleImage = async ({
    record,
    index,
    itemBackgroundImage,
    imageFilters,
    brandElements,
    fieldPositions,
    fieldStyles,
    fontScale = 1,
    aspectRatio
}) => {
    if (!itemBackgroundImage) {
        throw new Error(`Background image is missing for record index ${index}.`);
    }

    // 1. Compose the background with filters and brand elements
    const backgroundCanvas = await composeImage(itemBackgroundImage, imageFilters, brandElements);

    // 2. Create a new canvas to draw the final image with text
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');

    const dimensions = getDimensionsFromAspectRatio(aspectRatio);

    if (dimensions) {
        finalCanvas.width = dimensions.width;
        finalCanvas.height = dimensions.height;
        const hRatio = finalCanvas.width / backgroundCanvas.width;
        const vRatio = finalCanvas.height / backgroundCanvas.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShift_x = (finalCanvas.width - backgroundCanvas.width * ratio) / 2;
        const centerShift_y = (finalCanvas.height - backgroundCanvas.height * ratio) / 2;
        ctx.drawImage(backgroundCanvas, 0, 0, backgroundCanvas.width, backgroundCanvas.height,
                      centerShift_x, centerShift_y, backgroundCanvas.width * ratio, backgroundCanvas.height * ratio);
    } else {
        finalCanvas.width = backgroundCanvas.width;
        finalCanvas.height = backgroundCanvas.height;
        ctx.drawImage(backgroundCanvas, 0, 0);
    }

    // 3. Draw text fields onto the canvas
    for (const field of Object.keys(record)) {
        const position = fieldPositions[field];
        const style = fieldStyles[field];
        if (!position || !position.visible || !style) continue;
        const text = record[field] || "";
        if (!text) continue;

        ctx.save();
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

        // Create a render-specific style object.
        // The fontSize is treated as pre-scaled, but other pixel values must be scaled up for the full-res canvas.
        const finalStyle = {
            ...style,
            fontSize: (style.fontSize || 24),
            strokeWidth: (style.strokeWidth || 2),
            shadowBlur: (style.shadowBlur || 4),
            shadowOffsetX: (style.shadowOffsetX || 2),
            shadowOffsetY: (style.shadowOffsetY || 2),
        };

        const padding = (style.padding || 0);
        const borderRadius = (style.borderRadius || 0);
        const borderWidth = (style.borderWidth || 0);

        // Draw the textbox background and border using scaled values
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

        // Apply final text effects with the scaled font size
        applyTextEffects(ctx, finalStyle);

        const effectiveTextWidth = Math.max(0, posPx.width - (2 * padding));
        const effectiveTextHeight = Math.max(0, posPx.height - (2 * padding));
        const textContentStartX = posPx.x + padding;
        const textContentStartY = posPx.y + padding;

        const lines = wrapTextInArea(ctx, text, finalStyle, effectiveTextWidth, effectiveTextHeight);
        const lineHeight = finalStyle.fontSize * (finalStyle.lineHeightMultiplier || 1.2);

        let currentLineRenderY = textContentStartY;
        if (finalStyle.verticalAlign === 'middle') {
            const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - finalStyle.fontSize) : 0);
            currentLineRenderY += (effectiveTextHeight - totalTextBlockHeight) / 2;
        } else if (finalStyle.verticalAlign === 'bottom') {
            const totalTextBlockHeight = lines.length * lineHeight - (lines.length > 0 ? (lineHeight - finalStyle.fontSize) : 0);
            currentLineRenderY += effectiveTextHeight - totalTextBlockHeight;
        }

        if (containsHtml(text)) {
            // For HTML fields, we delegate the entire rendering, including wrapping, to the HTML renderer.
            await renderHtmlToCanvas(ctx, text, textContentStartX, textContentStartY, effectiveTextWidth, effectiveTextHeight, finalStyle);
        } else {
            // For plain text fields, we use the manual wrapping and line-by-line drawing.
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
                // For plain text, we call the simpler drawing function directly.
                if (finalStyle.textStroke) {
                    ctx.strokeText(line, currentLineRenderX, finalLineY);
                }
                ctx.fillText(line, currentLineRenderX, finalLineY);
            }
        }
        ctx.restore();
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
        backgroundImage: itemBackgroundImage, // Always preserve the original background
        fontScale, // Preserve the font scale used for generation
        // customFieldPositions and customFieldStyles are not handled here as this is for initial generation
    };
};
