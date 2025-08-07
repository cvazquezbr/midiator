/**
 * Loads an image from a given URL.
 * @param {string} src - The source URL of the image.
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image element.
 */
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Handle CORS
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`, { cause: err }));
    img.src = src;
  });
};

/**
 * Composes a new image by combining a background, a logo, and a company image.
 * This version adds a colored rectangle at the bottom matching the company image's height.
 * @param {string} backgroundImageUrl - The URL or base64 string of the background image.
 * @param {string} logoUrl - The URL for the logo image (e.g., /LOGO.png).
 * @param {string} companyImageUrl - The URL for the company image (e.g., /EMPRESA.png).
 * @returns {Promise<string>} A promise that resolves with the data URL of the composed image.
 */
export const composeImage = async (backgroundImageUrl, logoUrl, companyImageUrl) => {
  console.log('[composeImage] Starting composition with:', { backgroundImageUrl, logoUrl, companyImageUrl });
  try {
    // Since EMPRESA.png has a transparent background, we will use a hardcoded color
    // for the rectangle, inspired by the text shadow in the image.
    const companyBackgroundColor = '#808080'; // A neutral gray

    // Handle both base64 strings and URLs for the background
    const backgroundSrc = backgroundImageUrl.startsWith('data:')
      ? backgroundImageUrl
      : backgroundImageUrl;

    // Load all images in parallel
    const [bgImg, logoImg, companyImg] = await Promise.all([
      loadImage(backgroundSrc),
      loadImage(logoUrl),
      loadImage(companyImageUrl)
    ]);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use the background image's original dimensions for the canvas
    const targetWidth = bgImg.width;
    const targetHeight = bgImg.height;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    console.log('[composeImage] Canvas dimensions set to:', { targetWidth, targetHeight });

    // 1. Draw the main background image
    ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);

    // --- Enhancement: Draw the rectangle for the company image ---
    // First, calculate the company image's dimensions to determine the rectangle's height.
    const companyImgHeight = targetHeight * 0.1; // Rectangle height is 10% of the canvas height
    const companyImgScale = companyImgHeight / companyImg.height;
    const companyImgWidth = companyImg.width * companyImgScale;
    console.log('[composeImage] Company image rectangle:', { companyImgHeight, companyImgWidth });

    // 2. Draw the colored rectangle at the bottom of the canvas
    ctx.fillStyle = companyBackgroundColor;
    ctx.fillRect(0, targetHeight - companyImgHeight, targetWidth, companyImgHeight);

    // 3. Draw the logo in the top-left corner with a dynamic margin
    const logoHeight = targetHeight * 0.1; // Logo height is 10% of canvas height
    const logoScale = logoHeight / logoImg.height;
    const logoWidth = logoImg.width * logoScale;
    const margin = targetWidth * 0.02; // Use 2% of the canvas width as margin
    console.log('[composeImage] Logo dimensions and margin:', { logoHeight, logoWidth, margin });
    ctx.drawImage(logoImg, margin, margin, logoWidth, logoHeight);

    // 4. Draw the company image on the bottom-right, over the rectangle, with the same dynamic margin
    const companyImgX = targetWidth - companyImgWidth - margin;
    const companyImgY = targetHeight - companyImgHeight; // Aligns with the top of the rectangle
    ctx.drawImage(companyImg, companyImgX, companyImgY, companyImgWidth, companyImgHeight);

    const finalUrl = canvas.toDataURL('image/png');
    console.log('[composeImage] Composition finished. Returning data URL.');
    return finalUrl;
  } catch (error) {
    console.error('Error composing image:', error);
    // Propagate the error to be handled by the caller
    throw error;
  }
};
