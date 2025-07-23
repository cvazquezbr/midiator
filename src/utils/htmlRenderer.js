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
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px'; // Move off-screen
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = `${maxWidth}px`;
  tempDiv.style.height = `${maxHeight}px`;
  tempDiv.style.overflow = 'hidden'; // Clip content if it exceeds bounds
  tempDiv.style.boxSizing = 'border-box'; // Include padding and border in width/height

  // Apply styles from the 'style' object
  tempDiv.style.fontFamily = style.fontFamily || 'Arial';
  tempDiv.style.fontSize = `${style.fontSize || 24}px`;
  tempDiv.style.fontWeight = style.fontWeight || 'normal';
  tempDiv.style.fontStyle = style.fontStyle || 'normal';
  tempDiv.style.color = style.color || '#000000';
  tempDiv.style.textAlign = style.textAlign || 'left';
  tempDiv.style.lineHeight = style.lineHeightMultiplier ? `${style.lineHeightMultiplier * (style.fontSize || 24)}px` : 'normal';

  // Text shadow
  if (style.textShadow) {
    const shadowColor = style.shadowColor || '#000000';
    const shadowBlur = style.shadowBlur || 4;
    const shadowOffsetX = style.shadowOffsetX || 2;
    const shadowOffsetY = style.shadowOffsetY || 2;
    tempDiv.style.textShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;
  } else {
    tempDiv.style.textShadow = 'none';
  }

  // Text stroke is not directly supported by html2canvas in this manner.
  // If critical, a more complex solution (e.g., SVG text) would be needed.

  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  try {
    const canvasFromHtml = await html2canvas(tempDiv, {
      backgroundColor: null, // Transparent background
      width: maxWidth,
      height: maxHeight,
      useCORS: true,
    });

    // Draw the generated canvas onto the main canvas context
    ctx.drawImage(canvasFromHtml, x, y, maxWidth, maxHeight);
  } catch (error) {
    console.error('Erro ao renderizar HTML para canvas com html2canvas:', error);
  } finally {
    document.body.removeChild(tempDiv);
  }
};

// These functions are now deprecated for HTML rendering to canvas.
// They are kept as placeholders or for non-HTML text rendering if needed elsewhere.
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

