// Helper function to find the best font size to fit text within a box
export const findBestFitFontSize = (text, fontFamily, fontWeight, boxWidth, boxHeight) => {
  if (!text || !boxWidth || !boxHeight) {
    return 24; // Return a default size if inputs are invalid
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let minFontSize = 8;
  let maxFontSize = 300; // A reasonable max size
  let bestSize = minFontSize;

  // Use binary search to find the best font size efficiently
  while (minFontSize <= maxFontSize) {
    const currentSize = Math.floor((minFontSize + maxFontSize) / 2);
    if (currentSize <= minFontSize) break; // Avoid infinite loop

    ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);

    // A simple check: does it fit horizontally and vertically?
    // Add a small buffer for vertical fit.
    if (metrics.width < boxWidth && currentSize < boxHeight) {
      bestSize = currentSize; // This size is valid, try for a larger one
      minFontSize = currentSize + 1;
    } else {
      maxFontSize = currentSize - 1; // It's too big, try a smaller size
    }
  }
  return bestSize;
};

const COMPLETE_DEFAULT_STYLE = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  textAlign: 'left',
  verticalAlign: 'top',
  lineHeightMultiplier: 1.2,
  textStroke: false,
  strokeColor: '#ffffff',
  strokeWidth: 2,
  textShadow: false,
  shadowColor: '#000000',
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  // Box properties
  backgroundColor: 'rgba(0,0,0,0)',
  borderColor: '#000000',
  borderWidth: 0,
  borderRadius: 0,
  padding: 5,
  backgroundOpacity: 0,
};

export const autoArrangeFields = ({
  csvHeaders,
  fieldPositions,
  fieldStyles,
  csvData,
  effectiveImageSize,
  currentPreviewIndex = 0,
}) => {
    // 1. Define Safe Zone and Field Roles
    const safeZoneMargins = {
      top: 10, // 10%
      bottom: 10, // 10%
      left: 5, // 5%
      right: 5, // 5%
    };

    const titleField = csvHeaders.length > 0 ? csvHeaders[0] : null;
    const subtitleField = csvHeaders.length > 1 ? csvHeaders[1] : null;
    const sideLabelField = csvHeaders.length > 2 ? csvHeaders[2] : null;

    const newPositions = { ...fieldPositions };
    const newStyles = { ...fieldStyles };

    // Ensure all fields have a complete default style object to begin with.
    csvHeaders.forEach(header => {
      newStyles[header] = {
        ...COMPLETE_DEFAULT_STYLE,
        ...(newStyles[header] || {}),
      };
    });

    // 2. Calculate Safe Zone and Bands
    const safeZone = {
      x: safeZoneMargins.left,
      y: safeZoneMargins.top,
      width: 100 - safeZoneMargins.left - safeZoneMargins.right,
      height: 100 - safeZoneMargins.top - safeZoneMargins.bottom,
    };

    const bandHeight = safeZone.height / 3;
    const innerMargin = 2; // 2% margin inside bands/safezone

    // Rule for Title Field (Top Band)
    if (titleField) {
      const titleHeight = bandHeight - (innerMargin * 2);
      const titleWidth = safeZone.width - (innerMargin * 2);

      newPositions[titleField] = {
        ...(newPositions[titleField] || {}),
        x: safeZone.x + innerMargin,
        y: safeZone.y + innerMargin,
        width: titleWidth,
        height: titleHeight,
        rotation: 0,
        visible: true,
      };

      const titleBoxWidthPx = (titleWidth / 100) * (effectiveImageSize?.width || 1080);
      const titleBoxHeightPx = (titleHeight / 100) * (effectiveImageSize?.height || 1080);
      const titleText = csvData[currentPreviewIndex]?.[titleField] || `[${titleField}]`;

      const bestFontSize = findBestFitFontSize(
        titleText,
        'Anton',
        'normal',
        titleBoxWidthPx,
        titleBoxHeightPx
      );

      newStyles[titleField] = {
        ...COMPLETE_DEFAULT_STYLE,
        ...(newStyles[titleField] || {}),
        fontFamily: 'Anton',
        fontSize: bestFontSize,
        textAlign: 'center',
        verticalAlign: 'middle',
        textShadow: true,
        shadowColor: '#000000',
        shadowBlur: 5,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        color: '#FFFFFF',
      };
    }

    // Rule for Subtitle Field (Third Band)
    if (subtitleField) {
      const subtitleHeight = bandHeight - (innerMargin * 2);
      const subtitleWidth = safeZone.width - (innerMargin * 2);
      newPositions[subtitleField] = {
        ...(newPositions[subtitleField] || {}),
        x: safeZone.x + innerMargin,
        y: safeZone.y + (bandHeight * 2) + innerMargin,
        width: subtitleWidth,
        height: subtitleHeight,
        rotation: 0,
        visible: true,
      };
      newStyles[subtitleField] = {
        ...COMPLETE_DEFAULT_STYLE,
        ...(newStyles[subtitleField] || {}),
        textAlign: 'center',
        verticalAlign: 'middle',
      };
    }

    // Rule for Side Label Field (Right Side, Vertical)
    if (sideLabelField) {
      // After 270deg rotation:
      // - unrotated 'width' becomes visual 'height'
      // - unrotated 'height' becomes visual 'width'
      const visualWidth = 10; // 10% visual width, which is the unrotated height
      const visualHeight = safeZone.height * 0.8; // 80% of the safe zone's height

      const unrotatedWidth = visualHeight;
      const unrotatedHeight = visualWidth;

      // To correctly position the element, we calculate the top-left (x, y) of the UNROTATED box
      // such that after a 270-degree rotation around its center, it appears where we want.
      // The rotation origin is the center of the box (x + width/2, y + height/2).

      // Let's calculate the desired center of the ROTATED box.
      // Visual center X should be at the right edge of the safe zone, minus half the visual width.
      const visualCenterX = (safeZone.x + safeZone.width - innerMargin) - (visualWidth / 2);
      // Visual center Y should be in the middle of the safe zone.
      const visualCenterY = safeZone.y + safeZone.height / 2;

      // The center of the rotated box is the same as the center of the unrotated box.
      const centerX = visualCenterX;
      const centerY = visualCenterY;

      // Now, we find the top-left (x, y) for the UNROTATED box.
      const x = centerX - unrotatedWidth / 2;
      const y = centerY - unrotatedHeight / 2;

      newPositions[sideLabelField] = {
        ...(newPositions[sideLabelField] || {}),
        x: x,
        y: y,
        width: unrotatedWidth,
        height: unrotatedHeight,
        rotation: 270,
        visible: true,
      };
      newStyles[sideLabelField] = {
        ...COMPLETE_DEFAULT_STYLE,
        ...(newStyles[sideLabelField] || {}),
        textAlign: 'center',
        verticalAlign: 'middle',
      };
    }

    // Hide other fields
    csvHeaders.forEach((header, index) => {
      if (index > 2) {
        if (!newPositions[header]) newPositions[header] = {};
        newPositions[header].visible = false;
      } else {
        // Ensure the first three fields are visible
        if (!newPositions[header]) newPositions[header] = {};
        newPositions[header].visible = true;
      }
    });

    return { newPositions, newStyles };
};
