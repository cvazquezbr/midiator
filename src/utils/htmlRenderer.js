/**
 * Utilitário para renderizar HTML em canvas
 * Converte HTML básico em texto formatado para renderização em canvas
 */

/**
 * Converte HTML básico em texto formatado para canvas
 * @param {string} html - String HTML para converter
 * @returns {Array} Array de objetos com texto e formatação
 */
export const parseHtmlToFormattedText = (html) => {
  if (!html) return [{ text: '', format: {} }];

  // Remove tags HTML e extrai formatação básica
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const result = [];
  
  const processNode = (node, inheritedFormat = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text.trim()) {
        result.push({
          text: text,
          format: { ...inheritedFormat }
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const format = { ...inheritedFormat };
      
      // Aplicar formatação baseada na tag
      switch (node.tagName.toLowerCase()) {
        case 'b':
        case 'strong':
          format.fontWeight = 'bold';
          break;
        case 'i':
        case 'em':
          format.fontStyle = 'italic';
          break;
        case 'u':
          format.textDecoration = 'underline';
          break;
        case 'br':
          result.push({ text: '\n', format: { ...inheritedFormat } });
          return;
        case 'p':
          if (result.length > 0) {
            result.push({ text: '\n', format: { ...inheritedFormat } });
          }
          break;
        case 'li':
          result.push({ text: '• ', format: { ...inheritedFormat } });
          break;
      }

      // Processar filhos
      for (let child of node.childNodes) {
        processNode(child, format);
      }

      // Adicionar quebra de linha após parágrafos e itens de lista
      if (['p', 'li'].includes(node.tagName.toLowerCase())) {
        result.push({ text: '\n', format: { ...inheritedFormat } });
      }
    }
  };

  processNode(tempDiv);
  
  // Se não há resultado, retorna texto vazio
  if (result.length === 0) {
    return [{ text: html, format: {} }];
  }

  return result;
};

/**
 * Renderiza texto formatado em canvas
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
 * @param {Array} formattedText - Array de objetos com texto e formatação
 * @param {number} x - Posição X inicial
 * @param {number} y - Posição Y inicial
 * @param {number} maxWidth - Largura máxima
 * @param {number} maxHeight - Altura máxima
 * @param {Object} baseStyle - Estilo base
 */
export const renderFormattedTextToCanvas = (ctx, formattedText, x, y, maxWidth, maxHeight, baseStyle) => {
  const fontSize = baseStyle.fontSize || 24;
  const lineHeight = fontSize * (baseStyle.lineHeightMultiplier || 1.2);
  
  let currentX = x;
  let currentY = y;
  let currentLine = '';
  let currentLineWidth = 0;
  
  const lines = [];
  let currentLineSegments = [];

  // Quebrar texto em linhas considerando formatação
  for (let segment of formattedText) {
    const words = segment.text.split(/(\s+|\n)/);
    
    for (let word of words) {
      if (word === '\n') {
        // Quebra de linha forçada
        lines.push([...currentLineSegments]);
        currentLineSegments = [];
        currentLine = '';
        currentLineWidth = 0;
        continue;
      }

      if (word.trim() === '') {
        // Espaço - adicionar ao segmento atual
        if (currentLineSegments.length > 0) {
          currentLineSegments[currentLineSegments.length - 1].text += word;
        }
        continue;
      }

      // Configurar fonte para medir
      const format = { ...baseStyle, ...segment.format };
      ctx.font = `${format.fontWeight || 'normal'} ${format.fontStyle || 'normal'} ${fontSize}px ${format.fontFamily || 'Arial'}`;
      
      const wordWidth = ctx.measureText(word).width;
      const spaceWidth = ctx.measureText(' ').width;
      
      // Verificar se a palavra cabe na linha atual
      if (currentLineWidth + wordWidth > maxWidth && currentLine !== '') {
        // Quebrar linha
        lines.push([...currentLineSegments]);
        currentLineSegments = [{
          text: word,
          format: format
        }];
        currentLine = word;
        currentLineWidth = wordWidth;
      } else {
        // Adicionar palavra à linha atual
        if (currentLineSegments.length > 0 && 
            JSON.stringify(currentLineSegments[currentLineSegments.length - 1].format) === JSON.stringify(format)) {
          // Mesmo formato - concatenar
          currentLineSegments[currentLineSegments.length - 1].text += (currentLine ? ' ' : '') + word;
        } else {
          // Formato diferente - novo segmento
          currentLineSegments.push({
            text: (currentLine ? ' ' : '') + word,
            format: format
          });
        }
        currentLine += (currentLine ? ' ' : '') + word;
        currentLineWidth += (currentLine === word ? 0 : spaceWidth) + wordWidth;
      }
    }
  }

  // Adicionar última linha se houver
  if (currentLineSegments.length > 0) {
    lines.push(currentLineSegments);
  }

  // Renderizar linhas
  const maxLines = Math.floor(maxHeight / lineHeight);
  const linesToRender = lines.slice(0, maxLines);

  linesToRender.forEach((lineSegments, lineIndex) => {
    let lineX = x;
    const lineY = y + (lineIndex * lineHeight);

    // Calcular largura total da linha para alinhamento
    let totalLineWidth = 0;
    lineSegments.forEach(segment => {
      ctx.font = `${segment.format.fontWeight || 'normal'} ${segment.format.fontStyle || 'normal'} ${fontSize}px ${segment.format.fontFamily || 'Arial'}`;
      totalLineWidth += ctx.measureText(segment.text).width;
    });

    // Ajustar posição X baseado no alinhamento
    if (baseStyle.textAlign === 'center') {
      lineX = x + (maxWidth - totalLineWidth) / 2;
    } else if (baseStyle.textAlign === 'right') {
      lineX = x + maxWidth - totalLineWidth;
    }

    // Renderizar cada segmento da linha
    lineSegments.forEach(segment => {
      const format = segment.format;
      
      // Configurar estilo
      ctx.font = `${format.fontWeight || 'normal'} ${format.fontStyle || 'normal'} ${fontSize}px ${format.fontFamily || 'Arial'}`;
      ctx.fillStyle = format.color || baseStyle.color || '#000000';
      
      // Aplicar efeitos de sombra
      if (baseStyle.textShadow) {
        ctx.shadowColor = baseStyle.shadowColor || '#000000';
        ctx.shadowBlur = baseStyle.shadowBlur || 4;
        ctx.shadowOffsetX = baseStyle.shadowOffsetX || 2;
        ctx.shadowOffsetY = baseStyle.shadowOffsetY || 2;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Desenhar contorno se necessário
      if (baseStyle.textStroke) {
        ctx.strokeStyle = baseStyle.strokeColor || '#ffffff';
        ctx.lineWidth = baseStyle.strokeWidth || 2;
        ctx.strokeText(segment.text, lineX, lineY);
      }

      // Desenhar texto
      ctx.fillText(segment.text, lineX, lineY);

      // Desenhar sublinhado se necessário
      if (format.textDecoration === 'underline') {
        const textWidth = ctx.measureText(segment.text).width;
        ctx.beginPath();
        ctx.moveTo(lineX, lineY + fontSize * 0.1);
        ctx.lineTo(lineX + textWidth, lineY + fontSize * 0.1);
        ctx.strokeStyle = format.color || baseStyle.color || '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Avançar posição X
      lineX += ctx.measureText(segment.text).width;
    });
  });
};

/**
 * Verifica se uma string contém HTML
 * @param {string} text - Texto para verificar
 * @returns {boolean} True se contém HTML
 */
export const containsHtml = (text) => {
  if (!text) return false;
  return /<[^>]*>/g.test(text);
};

/**
 * Remove tags HTML de uma string
 * @param {string} html - String HTML
 * @returns {string} Texto sem tags HTML
 */
export const stripHtml = (html) => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

