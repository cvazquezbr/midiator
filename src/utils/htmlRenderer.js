import { containsHtml as originalContainsHtml } from './htmlRenderer';

/**
 * Verifica se uma string contém HTML.
 * A implementação original foi mantida, mas esta função pode ser estendida se necessário.
 * @param {string} text - Texto para verificar
 * @returns {boolean} True se contém HTML
 */
export const containsHtml = (text) => {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
};

/**
 * Renderiza HTML em um canvas usando a técnica de SVG foreignObject.
 * Este método é mais fiável do que o html2canvas para renderizar HTML complexo e com estilos.
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas principal onde o HTML será desenhado.
 * @param {string} htmlContent - O conteúdo HTML a ser renderizado.
 * @param {number} x - Posição X no canvas principal.
 * @param {number} y - Posição Y no canvas principal.
 * @param {number} maxWidth - Largura máxima para o conteúdo HTML.
 * @param {number} maxHeight - Altura máxima para o conteúdo HTML.
 * @param {Object} style - Estilos CSS a serem aplicados ao elemento HTML.
 */
export const renderHtmlToCanvas = (ctx, htmlContent, x, y, maxWidth, maxHeight, style) => {
  return new Promise((resolve, reject) => {
    // Construir a string de estilo CSS a partir do objeto de estilo
    const inlineStyle = `
      div {
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
        line-height: ${style.lineHeightMultiplier ? style.lineHeightMultiplier : 'normal'};
        display: flex;
        flex-direction: column;
        justify-content: ${style.verticalAlign === 'middle' ? 'center' : (style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start')};
        margin: 0;
        padding: ${style.padding || 0}px;
      }
      ${style.textShadow ? `
      div {
        text-shadow: ${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'};
      }` : ''}
      ${style.textStroke ? `
      div {
        -webkit-text-stroke: ${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'};
      }` : ''}
    `;

    // Construir o SVG com foreignObject
    const data = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${maxHeight}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            <style>${inlineStyle.replace(/\n/g, ' ')}</style>
            ${htmlContent}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();
    // Codificar o SVG para uso em um data URL
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, x, y);
      URL.revokeObjectURL(url);
      resolve();
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      console.error("Erro ao carregar a imagem SVG para o canvas:", err);
      reject(err);
    };

    img.src = url;
  });
};

// Manter outras funções exportadas se existirem e forem necessárias em outros locais
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
