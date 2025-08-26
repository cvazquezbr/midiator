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
  tempDiv.style.height = 'auto'; // Altura automática para medir o conteúdo
  tempDiv.style.boxSizing = 'border-box';
  tempDiv.style.padding = `${style.padding || 0}px`;

  // Aplicar estilos para medição
  tempDiv.style.fontFamily = style.fontFamily || 'Arial';
  tempDiv.style.fontSize = `${style.fontSize || 24}px`;
  tempDiv.style.fontWeight = style.fontWeight || 'normal';
  tempDiv.style.fontStyle = style.fontStyle || 'normal';
  tempDiv.style.color = style.color || '#000000';
  tempDiv.style.textAlign = style.textAlign || 'left';
  tempDiv.style.lineHeight = style.lineHeightMultiplier ? `${style.lineHeightMultiplier * (style.fontSize || 24)}px` : 'normal';

  // Sombra de texto
  if (style.textShadow) {
    tempDiv.style.textShadow = `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}`;
  }

  // Decoração e contorno de texto
  tempDiv.style.textDecoration = style.textDecoration || 'none';
  if (style.textStroke) {
    tempDiv.style.webkitTextStroke = `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}`;
  }

  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  // Garantir que a fonte específica esteja carregada antes de renderizar
  if (style.fontFamily) {
    try {
      // Usa uma combinação de peso, tamanho e família para carregar a fonte exata.
      await document.fonts.load(`${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 24}px ${style.fontFamily}`);
    } catch (err) {
      console.warn(`Não foi possível pré-carregar a fonte: ${style.fontFamily}. A renderização pode usar uma fonte de fallback.`, err);
    }
  }

  // Forçar o navegador a calcular o layout para obter a largura real do conteúdo
  const contentWidth = tempDiv.scrollWidth;

  // Ajustar a posição X com base no alinhamento
  let adjustedX = x;
  if (style.textAlign === 'center') {
    adjustedX = x + (maxWidth - contentWidth) / 2;
  } else if (style.textAlign === 'right') {
    adjustedX = x + (maxWidth - contentWidth);
  }

  // Agora, ajuste a altura do div para a altura máxima para o html2canvas
  tempDiv.style.height = `${maxHeight}px`;
  tempDiv.style.width = `${maxWidth}px`;

  try {
    const canvasFromHtml = await html2canvas(tempDiv, {
      backgroundColor: null,
      useCORS: true,
      width: maxWidth,
      height: maxHeight,
      scale: window.devicePixelRatio,
    });

    // Desenhar o canvas gerado no canvas principal na posição X ajustada
    ctx.drawImage(canvasFromHtml, adjustedX, y);
  } catch (error) {
    console.error('Erro ao renderizar HTML para canvas com html2canvas:', error);
  } finally {
    document.body.removeChild(tempDiv);
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
