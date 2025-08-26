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
  // Construir a string de estilo inline
  const inlineStyle = `
    width: ${maxWidth}px;
    height: ${maxHeight}px;
    box-sizing: border-box;
    padding: ${style.padding || 0}px;
    overflow-wrap: break-word;
    word-wrap: break-word;
    font-family: '${style.fontFamily || 'Arial'}';
    font-size: ${style.fontSize || 24}px;
    font-weight: ${style.fontWeight || 'normal'};
    font-style: ${style.fontStyle || 'normal'};
    color: ${style.color || '#000000'};
    text-align: ${style.textAlign || 'left'};
    line-height: ${style.lineHeightMultiplier ? `${style.lineHeightMultiplier * (style.fontSize || 24)}px` : 'normal'};
    ${style.textShadow ? `text-shadow: ${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'};` : ''}
    ${style.textStroke ? `-webkit-text-stroke: ${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'};` : ''}
    text-decoration: ${style.textDecoration || 'none'};
  `;

  // Envolver o conteúdo HTML em um div com os estilos inline
  const styledHtml = `<div style="${inlineStyle.replace(/\n/g, ' ')}">${htmlContent}</div>`;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.innerHTML = styledHtml;

  document.body.appendChild(container);

  const elementToRender = container.firstElementChild;

  if (!elementToRender) {
    console.error("Falha ao criar o elemento para renderização do HTML.");
    document.body.removeChild(container);
    return;
  }

  if (style.fontFamily) {
    try {
      await document.fonts.load(`${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 24}px ${style.fontFamily}`);
    } catch (err) {
      console.warn(`Não foi possível pré-carregar a fonte: ${style.fontFamily}.`, err);
    }
  }

  try {
    const canvasFromHtml = await html2canvas(elementToRender, {
      backgroundColor: null,
      useCORS: true,
      scale: window.devicePixelRatio,
    });
    ctx.drawImage(canvasFromHtml, x, y);
  } catch (error) {
    console.error('Erro ao renderizar HTML para canvas com html2canvas:', error);
  } finally {
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
