import html2canvas from 'html2canvas';

/**
 * Verifica se uma string contém HTML
 * @param {string} text - Texto para verificar
 * @returns {boolean} True se contém HTML
 */
export const containsHtml = (text) => {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
};

/**
 * Renderiza HTML em um canvas usando html2canvas.
 * Cria um elemento DOM temporário, renderiza o HTML nele e depois o desenha no contexto do canvas principal.
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas principal onde o HTML será desenhado.
 * @param {string} htmlContent - O conteúdo HTML a ser renderizado.
 * @param {number} x - Posição X no canvas principal.
 * @param {number} y - Posição Y no canvas principal.
 * @param {number} maxWidth - Largura máxima para o conteúdo HTML.
 * @param {number} maxHeight - Altura máxima para o conteúdo HTML.
 * @param {Object} style - Estilos CSS a serem aplicados ao elemento HTML temporário.
 *                         Deve incluir propriedades como fontFamily, fontSize, color, textAlign, etc.
 */
export const renderHtmlToCanvas = async (ctx, htmlContent, x, y, maxWidth, maxHeight, style) => {
  // 1. Create an off-screen container. This provides a stable context.
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';

  // 2. Create the target div inside the container.
  const tempDiv = document.createElement('div');

  // Apply all styles to this div. It now has a containing block.
  tempDiv.style.width = `${maxWidth}px`;
  tempDiv.style.height = `${maxHeight}px`; // Set explicit height for overflow control
  tempDiv.style.boxSizing = 'border-box';
  tempDiv.style.padding = `${style.padding || 0}px`;
  tempDiv.style.overflowWrap = 'break-word';
  tempDiv.style.wordWrap = 'break-word'; // Legacy fallback

  // Apply text styles
  tempDiv.style.fontFamily = style.fontFamily || 'Arial';
  tempDiv.style.fontSize = `${style.fontSize || 24}px`;
  tempDiv.style.fontWeight = style.fontWeight || 'normal';
  tempDiv.style.fontStyle = style.fontStyle || 'normal';
  tempDiv.style.color = style.color || '#000000';
  tempDiv.style.textAlign = style.textAlign || 'left';
  tempDiv.style.lineHeight = style.lineHeightMultiplier ? `${style.lineHeightMultiplier * (style.fontSize || 24)}px` : 'normal';

  if (style.textShadow) {
    tempDiv.style.textShadow = `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}`;
  }
  if (style.textStroke) {
    tempDiv.style.webkitTextStroke = `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}`;
  }
  tempDiv.style.textDecoration = style.textDecoration || 'none';

  tempDiv.innerHTML = htmlContent;

  // 3. Append to the DOM
  container.appendChild(tempDiv);
  document.body.appendChild(container);

  // 4. Ensure fonts are loaded
  if (style.fontFamily) {
    try {
      await document.fonts.load(`${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 24}px ${style.fontFamily}`);
    } catch (err) {
      console.warn(`Could not preload font: ${style.fontFamily}.`, err);
    }
  }

  // 5. Render the inner div, which has the correct, constrained dimensions.
  try {
    const canvasFromHtml = await html2canvas(tempDiv, {
      backgroundColor: null,
      useCORS: true,
      scale: window.devicePixelRatio,
    });

    // The alignment calculation should happen *after* rendering, based on the captured canvas size.
    // However, html2canvas should capture the div with the text already aligned internally.
    // The `x` passed in is already the starting point of the textbox.
    ctx.drawImage(canvasFromHtml, x, y);

  } catch (error) {
    console.error('Error rendering HTML to canvas with html2canvas:', error);
  } finally {
    // 6. Clean up the container from the DOM
    document.body.removeChild(container);
  }
};

// ... (o resto do arquivo permanece o mesmo)

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
