import {
  wrapTextInArea,
  applyTextEffects,
} from './imageComposer';

// This is a simplified version of the loadImage function from imageComposer.js
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (new URL(src, window.location.href).origin !== window.location.origin) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) =>
      reject(new Error(`Failed to load image: ${src}`, { cause: err }));
    img.src = src;
  });
};

/**
 * Generates an Instagram story-style image from a background and text fields.
 * @param {string} backgroundImageUrl - The URL of the background image.
 * @param {string} title - The main title text.
 * @param {string} description - The description text.
 * @param {string} footer - The footer text.
 * @returns {Promise<string>} A promise that resolves with the data URL of the generated image.
 */
export const generateStoryImage = async ({
  backgroundImageUrl,
  title,
  description,
  footer,
}) => {
  try {
    const bgImg = await loadImage(backgroundImageUrl);

    // Instagram Story aspect ratio: 9:16. Standard resolution: 1080x1920.
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Draw background image to cover the entire canvas
    const canvasAspect = canvas.width / canvas.height;
    const bgAspect = bgImg.width / bgImg.height;
    let sx, sy, sWidth, sHeight;

    if (bgAspect > canvasAspect) {
      // Background is wider than canvas
      sHeight = bgImg.height;
      sWidth = bgImg.height * canvasAspect;
      sx = (bgImg.width - sWidth) / 2;
      sy = 0;
    } else {
      // Background is taller or same aspect ratio
      sWidth = bgImg.width;
      sHeight = bgImg.width / canvasAspect;
      sx = 0;
      sy = (bgImg.height - sHeight) / 2;
    }
    ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

    // --- Define styles and positions for text elements ---
    const padding = 60; // 60px padding on the sides
    const safeAreaWidth = canvas.width - 2 * padding;

    // Style for Title
    const titleStyle = {
      fontSize: 80,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'left',
      textShadow: true,
      shadowColor: 'rgba(0,0,0,0.7)',
      shadowBlur: 10,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
      lineHeightMultiplier: 1.2,
    };

    // Style for Description
    const descriptionStyle = {
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      color: 'white',
      textAlign: 'left',
      textShadow: true,
      shadowColor: 'rgba(0,0,0,0.7)',
      shadowBlur: 8,
      shadowOffsetX: 3,
      shadowOffsetY: 3,
      lineHeightMultiplier: 1.3,
    };

    // Style for Footer
    const footerStyle = {
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      color: 'white',
      textAlign: 'center',
      textShadow: true,
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 5,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      lineHeightMultiplier: 1.2,
    };

    // --- Draw Title ---
    ctx.save();
    applyTextEffects(ctx, titleStyle);
    const titleLines = wrapTextInArea(ctx, title, titleStyle, safeAreaWidth, 500); // Max height 500px for title
    let currentY = 150; // Start title from top
    for (const line of titleLines) {
      ctx.fillText(line, padding, currentY);
      currentY += titleStyle.fontSize * titleStyle.lineHeightMultiplier;
    }
    ctx.restore();

    // --- Draw Description ---
    ctx.save();
    currentY += 40; // Add some space after title
    applyTextEffects(ctx, descriptionStyle);
    const descriptionLines = wrapTextInArea(ctx, description, descriptionStyle, safeAreaWidth, 800); // Max height 800px for description
    for (const line of descriptionLines) {
      ctx.fillText(line, padding, currentY);
      currentY += descriptionStyle.fontSize * descriptionStyle.lineHeightMultiplier;
    }
    ctx.restore();

    // --- Draw Footer ---
    ctx.save();
    applyTextEffects(ctx, footerStyle);
    // wrapText just in case, for a single line
    const footerLines = wrapTextInArea(ctx, footer, footerStyle, safeAreaWidth, 100);
    const footerY = canvas.height - 100; // Position footer from bottom
    for (const line of footerLines) {
        // const textMetrics = ctx.measureText(line); // textMetrics is unused, textAlign=center handles positioning
        ctx.fillText(line, canvas.width / 2, footerY);
    }
    ctx.restore();

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating story image:', error);
    throw error; // Re-throw to be caught by the caller
  }
};
