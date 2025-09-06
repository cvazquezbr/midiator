// --- Color Highlight Filter ---

// Helper to parse hex color string to an RGB object
export const hexToRgb = (hex) => {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper to calculate the distance between two colors in the RGB space
export const colorDistance = (rgb1, rgb2) => {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  // Using the squared distance to avoid a square root, for performance.
  return dr * dr + dg * dg + db * db;
};

/**
 * Applies a color highlight effect to a canvas context.
 * Pixels that are not within the tolerance of the highlight color are desaturated.
 * @param {CanvasRenderingContext2D} ctx - The canvas context to modify.
 * @param {number} width - The width of the canvas area to process.
 * @param {number} height - The height of the canvas area to process.
 * @param {string} highlightColorHex - The hex string of the color to highlight.
 * @param {number} highlightAmount - The intensity of the effect (0-100).
 */
export const applyColorHighlight = (ctx, width, height, highlightColorHex, highlightAmount) => {
  if (!highlightColorHex || !highlightAmount || highlightAmount === 0) return;

  const highlightRgb = hexToRgb(highlightColorHex);
  if (!highlightRgb) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // The tolerance is inversely related to the highlightAmount.
  // A higher amount means a smaller tolerance, thus highlighting a more specific color range.
  // The max distance in RGB space is sqrt(3 * 255^2) ~= 441. We use squared distance.
  const maxDistSq = 3 * 255 * 255;
  const toleranceSq = maxDistSq * (1 - (highlightAmount / 100));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const pixelRgb = { r, g, b };
    const distSq = colorDistance(pixelRgb, highlightRgb);

    if (distSq > toleranceSq) {
      // Not the highlight color, so convert to grayscale.
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    // If it is the highlight color, we leave it as is.
  }

  ctx.putImageData(imageData, 0, 0);
};
