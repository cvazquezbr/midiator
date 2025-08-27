import html2canvas from 'html2canvas';

/**
 * Checks if a string contains HTML tags.
 * @param {string} text The text to check.
 * @returns {boolean} True if the text contains HTML.
 */
export const containsHtml = (text) => {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
};

/**
 * Renders HTML content onto a canvas using html2canvas, with a robust method to ensure proper layout and wrapping.
 * @param {CanvasRenderingContext2D} ctx The context of the main canvas.
 * @param {string} htmlContent The HTML content to render.
 * @param {number} x The X position on the main canvas.
 * @param {number} y The Y position on the main canvas.
 * @param {number} maxWidth The maximum width for the HTML content.
 * @param {number} maxHeight The maximum height for the HTML content.
 * @param {Object} style The CSS styles to apply.
 */
export const renderHtmlToCanvas = async (ctx, htmlContent, x, y, maxWidth, maxHeight, style) => {
  // Create an off-screen parent container that will act as a table.
  const tableContainer = document.createElement('div');
  tableContainer.style.position = 'absolute';
  tableContainer.style.left = '-9999px';
  tableContainer.style.top = '-9999px';
  tableContainer.style.display = 'table';
  tableContainer.style.width = `${maxWidth}px`;
  tableContainer.style.height = `${maxHeight}px`;

  // Create the target child element that will act as a table-cell.
  const tempDiv = document.createElement('div');

  // Apply all necessary styles to the table-cell element.
  tempDiv.style.display = 'table-cell';
  tempDiv.style.verticalAlign = style.verticalAlign || 'top'; // 'top', 'middle', 'bottom'
  tempDiv.style.boxSizing = 'border-box';
  tempDiv.style.padding = `${style.padding || 0}px`;
  tempDiv.style.overflowWrap = 'break-word';
  tempDiv.style.wordWrap = 'break-word';

  // Apply text styles
  tempDiv.style.fontFamily = style.fontFamily || 'Arial';
  tempDiv.style.fontSize = `${style.fontSize || 24}px`;
  tempDiv.style.fontWeight = style.fontWeight || 'normal';
  tempDiv.style.fontStyle = style.fontStyle || 'normal';
  tempDiv.style.color = style.color || '#000000';
  tempDiv.style.textAlign = style.textAlign || 'left';
  tempDiv.style.lineHeight = style.lineHeightMultiplier ? style.lineHeightMultiplier : 'normal';

  if (style.textShadow) {
    tempDiv.style.textShadow = `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}`;
  }
  if (style.textStroke) {
    tempDiv.style.webkitTextStroke = `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}`;
  }

  tempDiv.innerHTML = htmlContent;

  // Build the DOM structure and append to the body
  tableContainer.appendChild(tempDiv);
  document.body.appendChild(tableContainer);

  // Ensure fonts are loaded before capturing
  if (style.fontFamily) {
    try {
      await document.fonts.load(`${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 24}px ${style.fontFamily}`);
    } catch (err) {
      console.warn(`Could not preload font: ${style.fontFamily}.`, err);
    }
  }

  try {
    // Render the container, which now controls the layout.
    const canvasFromHtml = await html2canvas(tableContainer, {
      backgroundColor: null, // Make background transparent
      useCORS: true,
      scale: window.devicePixelRatio, // Use device pixel ratio for better quality
      width: maxWidth,
      height: maxHeight,
    });

    // Draw the resulting canvas onto the main context at the specified coordinates.
    ctx.drawImage(canvasFromHtml, x, y);

  } catch (error) {
    console.error('Error rendering HTML to canvas with html2canvas:', error);
  } finally {
    // Clean up by removing the container from the DOM.
    document.body.removeChild(tableContainer);
  }
};

// Keep other exported functions as they were.
export const parseHtmlToFormattedText = (html) => {
  return [{ text: html, format: {} }];
};

export const renderFormattedTextToCanvas = (ctx, formattedText, x, y, maxWidth, maxHeight, baseStyle) => {
  const text = formattedText.map(segment => segment.text).join('');
  ctx.font = `${baseStyle.fontWeight || 'normal'} ${baseStyle.fontStyle || 'normal'} ${baseStyle.fontSize || 24}px ${baseStyle.fontFamily || 'Arial'}`;
  ctx.fillStyle = baseStyle.color || '#000000';
  ctx.textAlign = baseStyle.textAlign || 'left';
  ctx.textBaseline = baseStyle.textBaseline || 'top';
  ctx.fillText(text, x, y);
};

export const stripHtml = (html) => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};
