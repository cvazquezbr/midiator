import React, { useMemo } from 'react';
import GeneratedImageEditor from './GeneratedImageEditor';

const MemoizedGeneratedImageEditor = ({
  showGeneratedImageEditor,
  handleCloseGeneratedImageEditor,
  generatedImages,
  editingGeneratedImageIndex,
  csvHeaders,
  fieldPositions,
  fieldStyles,
  brandElements,
  handleSaveIndividualModifications,
  colorPalette,
  backgroundImage,
  originalImageSize,
  imageFilters,
}) => {
  const imageToEdit = useMemo(() => {
    return generatedImages.find(img => img.index === editingGeneratedImageIndex);
  }, [generatedImages, editingGeneratedImageIndex]);

  console.log('--- DEBUGGING START ---');
  console.log('[Memoized] Image to Edit:', imageToEdit);

  const memoizedPositions = useMemo(() => {
    console.log('[Memoized] Preparing POSITIONS...');
    const basePositions = JSON.parse(JSON.stringify(fieldPositions || {}));
    const customPositions = imageToEdit?.customFieldPositions || {};

    console.log('[Memoized] Base Positions (Template):', basePositions);
    console.log('[Memoized] Custom Positions (from Image):', customPositions);

    Object.keys(customPositions).forEach(field => {
      basePositions[field] = {
        ...(basePositions[field] || {}),
        ...customPositions[field],
      };
    });

    console.log('[Memoized] FINAL Merged Positions:', basePositions);
    return basePositions;
  }, [imageToEdit, fieldPositions]);

  const memoizedStyles = useMemo(() => {
    console.log('[Memoized] Preparing STYLES...');
    const baseStyles = JSON.parse(JSON.stringify(fieldStyles || {}));
    const customStyles = imageToEdit?.customFieldStyles || {};

    console.log('[Memoized] Base Styles (Template):', baseStyles);
    console.log('[Memoized] Custom Styles (from Image):', customStyles);

    Object.keys(customStyles).forEach(field => {
      baseStyles[field] = {
        ...(baseStyles[field] || {}),
        ...customStyles[field],
      };
    });

    console.log('[Memoized] FINAL Merged Styles:', baseStyles);
    return baseStyles;
  }, [imageToEdit, fieldStyles]);

  const memoizedBrandElements = useMemo(() => {
    return imageToEdit?.customBrandElements !== undefined
      ? imageToEdit.customBrandElements
      : brandElements;
  }, [imageToEdit, brandElements]);

  if (!showGeneratedImageEditor || editingGeneratedImageIndex === null || !imageToEdit) {
    if (showGeneratedImageEditor && editingGeneratedImageIndex !== null) {
      console.error(`[MemoizedEditor] Render: Could not find image with index ${editingGeneratedImageIndex} to edit.`);
    }
    return null;
  }

  return (
    <GeneratedImageEditor
      open={showGeneratedImageEditor}
      onClose={handleCloseGeneratedImageEditor}
      imageData={imageToEdit}
      globalCsvHeaders={csvHeaders}
      initialFieldPositions={memoizedPositions}
      initialFieldStyles={memoizedStyles}
      onSave={handleSaveIndividualModifications}
      colorPalette={colorPalette}
      globalBackgroundImage={imageToEdit.backgroundImage || backgroundImage}
      originalImageSize={imageToEdit.customOriginalImageSize || originalImageSize}
      imageFilters={imageFilters}
      brandElements={memoizedBrandElements}
    />
  );
};

export default MemoizedGeneratedImageEditor;
