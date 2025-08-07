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
 * @param {string} base64BackgroundImage - The base64 encoded background image.
 * @param {string} logoUrl - The URL for the logo image (e.g., /logo.png).
 * @param {string} companyImageUrl - The URL for the company image (e.g., /empresa.png).
 * @returns {Promise<string>} A promise that resolves with the data URL of the composed image.
 */
export const composeImage = async (base64BackgroundImage, logoUrl, companyImageUrl) => {
  try {
    const backgroundSrc = `data:image/png;base64,${base64BackgroundImage}`;

    // Load all images in parallel
    const [bgImg, logoImg, companyImg] = await Promise.all([
      loadImage(backgroundSrc),
      loadImage(logoUrl),
      loadImage(companyImageUrl)
    ]);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Configure canvas dimensions based on the background image, resized to 720px height
    const targetHeight = 720;
    const scale = targetHeight / bgImg.height;
    const targetWidth = bgImg.width * scale;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // 1. Draw background
    ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);

    // 2. Draw logo (top-left)
    const logoHeight = targetHeight * 0.10; // 10% of canvas height
    const logoScale = logoHeight / logoImg.height;
    const logoWidth = logoImg.width * logoScale;
    ctx.drawImage(logoImg, 0, 0, logoWidth, logoHeight);

    // 3. Draw company image (bottom-right)
    const companyImgHeight = targetHeight * 0.20; // 20% of canvas height
    const companyImgScale = companyImgHeight / companyImg.height;
    const companyImgWidth = companyImg.width * companyImgScale;
    const companyImgX = targetWidth - companyImgWidth;
    const companyImgY = targetHeight - companyImgHeight;
    ctx.drawImage(companyImg, companyImgX, companyImgY, companyImgWidth, companyImgHeight);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error composing image:', error);
    // Propagate the error to be handled by the caller
    throw error;
  }
};
