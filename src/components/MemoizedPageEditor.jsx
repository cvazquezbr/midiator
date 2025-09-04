import React, { useMemo } from 'react';
import PageEditor from './PageEditor';

const MemoizedPageEditor = ({
  showGeneratedPageEditor,
  handleCloseGeneratedPageEditor,
  generatedPages,
  editingGeneratedPageIndex,
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
  console.log('[MemoizedPageEditor] props:', { imageFilters });
  const pageToEdit = useMemo(() => {
    return generatedPages.find(img => img.index === editingGeneratedPageIndex);
  }, [generatedPages, editingGeneratedPageIndex]);

  const memoizedPositions = useMemo(() => {
    const basePositions = JSON.parse(JSON.stringify(fieldPositions || {}));
    const customPositions = pageToEdit?.customFieldPositions || {};

    Object.keys(customPositions).forEach(field => {
      basePositions[field] = {
        ...(basePositions[field] || {}),
        ...customPositions[field],
      };
    });

    return basePositions;
  }, [pageToEdit, fieldPositions]);

  const memoizedStyles = useMemo(() => {
    const baseStyles = JSON.parse(JSON.stringify(fieldStyles || {}));
    const customStyles = pageToEdit?.customFieldStyles || {};

    Object.keys(customStyles).forEach(field => {
      baseStyles[field] = {
        ...(baseStyles[field] || {}),
        ...customStyles[field],
      };
    });

    return baseStyles;
  }, [pageToEdit, fieldStyles]);

  const memoizedBrandElements = useMemo(() => {
    return pageToEdit?.customBrandElements !== undefined
      ? pageToEdit.customBrandElements
      : brandElements;
  }, [pageToEdit, brandElements]);

  if (!showGeneratedPageEditor || editingGeneratedPageIndex === null || !pageToEdit) {
    if (showGeneratedPageEditor && editingGeneratedPageIndex !== null) {
      console.error(`[MemoizedEditor] Render: Could not find page with index ${editingGeneratedPageIndex} to edit.`);
    }
    return null;
  }

  return (
    <PageEditor
      open={showGeneratedPageEditor}
      onClose={handleCloseGeneratedPageEditor}
      pageData={pageToEdit}
      globalCsvHeaders={csvHeaders}
      initialFieldPositions={memoizedPositions}
      initialFieldStyles={memoizedStyles}
      onSave={handleSaveIndividualModifications}
      colorPalette={colorPalette}
      globalBackgroundImage={pageToEdit.backgroundImage || backgroundImage}
      originalImageSize={pageToEdit.customOriginalImageSize || originalImageSize}
      imageFilters={imageFilters}
      brandElements={memoizedBrandElements}
    />
  );
};

export default MemoizedPageEditor;
