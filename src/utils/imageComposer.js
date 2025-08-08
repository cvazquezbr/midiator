/**
 * Loads an image from a given URL.
 * @param {string} src - The source URL of the image.
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image element.
 */
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    console.log(`[loadImage] Attempting to load image from: ${src}`);
    const img = new Image();
    // img.crossOrigin = 'Anonymous'; // This can cause issues with local dev servers and even some production environments. Removing it for same-origin requests.
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
  logoUrl,
  companyImageUrl,
  imageFilters = {},
  includeLogo = true,
  includeEmpresa = true
) => {
  console.log('[composeImage] Starting composition with:', {
    backgroundImageUrl,
    logoUrl,
    companyImageUrl,
    imageFilters,
    includeLogo,
    includeEmpresa
  });
  try {
    const companyBackgroundColor = '#808080'; // A neutral gray

    let backgroundSrc = backgroundImageUrl;
    if (!backgroundImageUrl.startsWith('data:') && !backgroundImageUrl.startsWith('http')) {
      backgroundSrc = `data:image/png;base64,${backgroundImageUrl}`;
    }

    const imagePromises = [loadImage(backgroundSrc)];
    if (includeLogo && logoUrl) {
      imagePromises.push(loadImage(logoUrl));
    }
    if (includeEmpresa && companyImageUrl) {
      imagePromises.push(loadImage(companyImageUrl));
    }

    const images = await Promise.all(imagePromises);
    const bgImg = images[0];
    let logoImg = null;
    let companyImg = null;
    let currentImageIndex = 1;

    if (includeLogo && logoUrl) {
      logoImg = images[currentImageIndex++];
    }
    if (includeEmpresa && companyImageUrl) {
      companyImg = images[currentImageIndex];
    }

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

    const margin = targetWidth * 0.02;

    if (includeLogo && logoImg) {
      const logoHeight = targetHeight * 0.1;
      const logoScale = logoHeight / logoImg.height;
      const logoWidth = logoImg.width * logoScale;
      ctx.drawImage(logoImg, margin, margin, logoWidth, logoHeight);
      console.log(`[composeImage] Drawing logo at (${margin}, ${margin})`);
    }

    if (includeEmpresa && companyImg) {
      const companyImgHeight = targetHeight * 0.1;
      const companyImgScale = companyImgHeight / companyImg.height;
      const companyImgWidth = companyImg.width * companyImgScale;

      ctx.fillStyle = companyBackgroundColor;
      ctx.fillRect(0, targetHeight - companyImgHeight, targetWidth, companyImgHeight);

      const companyImgX = targetWidth - companyImgWidth - margin;
      const companyImgY = targetHeight - companyImgHeight;
      ctx.drawImage(companyImg, companyImgX, companyImgY, companyImgWidth, companyImgHeight);
      console.log(`[composeImage] Drawing company image at (${companyImgX}, ${companyImgY})`);
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
