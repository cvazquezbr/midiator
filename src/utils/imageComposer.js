import html2canvas from 'html2canvas';

export const dataURLtoBlob = (dataurl) => {
    if (!dataurl) return null;
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1].split(';base64,').pop());
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
};

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Allow cross-origin images for html2canvas
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`, { cause: err }));
    img.src = src;
  });
};

/**
 * Creates a complete composite image by rendering a DOM structure to a canvas using html2canvas.
 * This ensures a 1:1 match with the browser's rendering engine.
 * @returns {Promise<object>} A promise that resolves with the final imageData object.
 */
export const composeSingleImage = async ({
    record,
    index,
    itemBackgroundImage,
    imageFilters,
    brandElements,
    fieldPositions,
    fieldStyles,
    fontScale = 1,
    originalImageSize, // The native resolution of the background image
}) => {
    if (!itemBackgroundImage) {
        throw new Error(`Background image is missing for record index ${index}.`);
    }

    // 1. Load the background image to determine the canvas dimensions
    const bgImg = await loadImage(itemBackgroundImage);
    const renderWidth = originalImageSize?.width || bgImg.width;
    const renderHeight = originalImageSize?.height || bgImg.height;

    // 2. Create an off-screen container to build the DOM structure
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Style the container to be the exact size of the final image, but hidden
    Object.assign(container.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: `${renderWidth}px`,
        height: `${renderHeight}px`,
        margin: '0',
        padding: '0',
        overflow: 'hidden', // Ensure nothing spills out
    });

    // 3. Create and style the background image element
    const backgroundEl = document.createElement('img');
    backgroundEl.src = itemBackgroundImage;
    const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = imageFilters || {};
    Object.assign(backgroundEl.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        objectFit: 'contain', // or 'cover' depending on desired behavior
        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`,
    });
    container.appendChild(backgroundEl);

    // 4. Create and style all text and brand elements
    const elementsToRender = [
        ...Object.keys(record).map(header => ({
            id: header,
            type: 'text',
            content: record[header] || '',
            position: fieldPositions[header],
            style: fieldStyles[header],
        })),
        ...(brandElements || []).map(el => ({
            id: el.id,
            type: 'image',
            content: el.url,
            position: el,
            style: el.filters || {},
        })),
    ];

    // Sort by z-index to ensure correct stacking
    elementsToRender.sort((a, b) => (a.position?.zIndex || 0) - (b.position?.zIndex || 0));

    elementsToRender.forEach(element => {
        if (!element.position || !element.position.visible) return;

        const el = document.createElement(element.type === 'image' ? 'img' : 'div');

        // Base styles for the element's box
        Object.assign(el.style, {
            position: 'absolute',
            left: `${element.position.x}%`,
            top: `${element.position.y}%`,
            width: `${element.position.width}%`,
            height: `${element.position.height}%`,
            transform: `rotate(${element.position.rotation || 0}deg)`,
            display: 'flex',
            padding: '8px', // Consistent padding
            boxSizing: 'border-box',
        });

        if (element.type === 'image') {
            el.src = element.content;
            const { brightness = 100, contrast = 100, saturate = 100, blur = 0, opacity = 100 } = element.style;
            Object.assign(el.style, {
                objectFit: 'contain',
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) opacity(${opacity}%)`,
            });
        } else { // Text element
            const style = element.style;
            const baseFontSize = style.fontSize || 24;
            const scaledFontSize = baseFontSize * fontScale;
            const lineHeight = scaledFontSize * (style.lineHeightMultiplier || 1.2);

            Object.assign(el.style, {
                fontFamily: style.fontFamily || 'Arial',
                fontSize: `${scaledFontSize}px`,
                fontWeight: style.fontWeight || 'normal',
                fontStyle: style.fontStyle || 'normal',
                color: style.color || '#000000',
                textDecoration: style.textDecoration || 'none',
                lineHeight: `${lineHeight}px`,
                textAlign: style.textAlign || 'left',
                justifyContent: style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'middle' ? 'center' : 'flex-end',
                alignItems: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'center' ? 'center' : 'flex-end',
                textShadow: style.textShadow ? `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 4}px ${style.shadowColor || '#000000'}` : 'none',
                WebkitTextStroke: style.textStroke ? `${style.strokeWidth || 2}px ${style.strokeColor || '#ffffff'}` : 'none',
                wordWrap: 'break-word',
            });
            el.innerHTML = element.content;
        }

        container.appendChild(el);
    });

    let dataUrl = '';
    try {
        // 5. Use html2canvas to render the container
        const canvas = await html2canvas(container, {
            useCORS: true, // Important for loading cross-origin images
            backgroundColor: null, // Make background transparent
            width: renderWidth,
            height: renderHeight,
            scale: 1, // Render at native resolution
        });

        // 6. Get the data URL from the resulting canvas
        dataUrl = canvas.toDataURL('image/png', 1.0);
    } catch (e) {
        console.error("html2canvas rendering failed:", e);
        throw e;
    } finally {
        // 7. Clean up the DOM
        document.body.removeChild(container);
    }

    const blob = dataURLtoBlob(dataUrl);

    // 8. Return the complete imageData object
    return {
        url: dataUrl,
        dataUrl: dataUrl,
        blob,
        record,
        index,
        filename: `midiator_${String(index + 1).padStart(3, '0')}.png`,
        backgroundImage: itemBackgroundImage,
        // customFieldPositions and customFieldStyles are not handled here as this is for initial generation
    };
};
