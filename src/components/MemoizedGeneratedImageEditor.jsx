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

  const memoizedPositions = useMemo(() => {
    const positionsSource = imageToEdit?.customFieldPositions !== undefined
      ? imageToEdit.customFieldPositions
      : fieldPositions;
    return JSON.parse(JSON.stringify(positionsSource || {}));
  }, [imageToEdit, fieldPositions]);

  const memoizedStyles = useMemo(() => {
    const stylesSource = imageToEdit?.customFieldStyles !== undefined
      ? imageToEdit.customFieldStyles
      : fieldStyles;
    return JSON.parse(JSON.stringify(stylesSource || {}));
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
