/**
 * Loads an image from a given URL.
 * @param {string} src - The source URL of the image.
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image element.
 */
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    console.log(`[loadImage] Attempting to load image from: ${src}`);
    const img = new Image();
    // For external images (like from Google Drive), this is necessary to avoid tainting the canvas.
    if (src.startsWith('http')) {
        img.crossOrigin = 'Anonymous';
    }
    img.onload = () => {
      console.log(`[loadImage] Successfully loaded image: ${src}`);
      resolve(img);
    };
    img.onerror = (err) => {
      console.error(`[loadImage] Failed to load image: ${src}`, err);
      reject(new Error(`Failed to load image: ${src}`, { cause: err }));
    };
    img.src = src;
  });
};

/**
 * Composes a new image by combining a background, a logo, and a company image.
 * This version adds a colored rectangle at the bottom matching the company image's height.
 * @param {string} backgroundImageUrl - The URL or base64 string of the background image.
 * @param {string} logoUrl - The URL for the logo image (e.g., /LOGO.png).
 * @param {string} companyImageUrl - The URL for the company image (e.g., /EMPRESA.png).
 * @param {object} imageFilters - An object containing filter values.
 * @returns {Promise<string>} A promise that resolves with the data URL of the composed image.
 */
export const composeImage = async (
  backgroundImageUrl,
  imageFilters = {},
  brandElements = []
) => {
  console.log('[composeImage] Starting composition with:', {
    backgroundImageUrl,
    imageFilters,
    brandElements
  });
  try {
    let backgroundSrc = backgroundImageUrl;
    // A blob: URL is a valid source, so we should not treat it as a base64 string.
    if (!backgroundImageUrl.startsWith('data:') && !backgroundImageUrl.startsWith('http') && !backgroundImageUrl.startsWith('blob:')) {
      backgroundSrc = `data:image/png;base64,${backgroundImageUrl}`;
    }

    const bgImg = await loadImage(backgroundSrc);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const targetWidth = bgImg.width;
    const targetHeight = bgImg.height;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = imageFilters;
    const filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`;
    ctx.filter = filterString;
    ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
    ctx.filter = 'none';

    // Draw brand elements
    for (const element of brandElements) {
      if (!element.url) continue;

      try {
        const elementImg = await loadImage(element.url);

        ctx.save();

        // Calculate pixel dimensions and positions
        const elX = (element.x / 100) * targetWidth;
        const elY = (element.y / 100) * targetHeight;
        const elWidth = (element.width / 100) * targetWidth;
        const elHeight = (element.height / 100) * targetHeight;

        // Apply transformations (rotation)
        if (element.rotation) {
            const centerX = elX + elWidth / 2;
            const centerY = elY + elHeight / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(element.rotation * Math.PI / 180);
            ctx.translate(-centerX, -centerY);
        }

        // Apply individual filters
        if (element.filters) {
            const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = element.filters;
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`;
        }

        ctx.drawImage(elementImg, elX, elY, elWidth, elHeight);

        ctx.restore(); // Restore context to remove filters and transformations for the next element

      } catch (error) {
        console.error(`[composeImage] Failed to load or draw brand element ${element.id}:`, error);
        // Continue to the next element
      }
    }

    const finalUrl = canvas.toDataURL('image/png');
    console.log('[composeImage] Composition finished.');
    return finalUrl;
  } catch (error) {
    console.error('Error composing image:', error);
    // Propagate the error to be handled by the caller
    throw error;
  }
};
