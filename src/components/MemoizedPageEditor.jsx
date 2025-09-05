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
  originalImageSize,
  backgroundElement,
  aspectRatio,
}) => {
  console.log('[MemoizedPageEditor] props:', { backgroundElement });
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
    // Defensively check if customBrandElements is an array. If not, fallback to the global brandElements.
    if (pageToEdit && Array.isArray(pageToEdit.customBrandElements)) {
      return pageToEdit.customBrandElements;
    }
    // Fallback to global brandElements, ensuring it's also an array.
    return Array.isArray(brandElements) ? brandElements : [];
  }, [pageToEdit, brandElements]);

  const editorContent = useMemo(() => {
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
        globalBackgroundElement={backgroundElement}
        originalImageSize={pageToEdit.customOriginalImageSize || originalImageSize}
        brandElements={memoizedBrandElements}
        aspectRatio={aspectRatio}
      />
    );
  }, [
    showGeneratedPageEditor,
    editingGeneratedPageIndex,
    pageToEdit,
    handleCloseGeneratedPageEditor,
    csvHeaders,
    memoizedPositions,
    memoizedStyles,
    handleSaveIndividualModifications,
    colorPalette,
    originalImageSize,
    backgroundElement,
    memoizedBrandElements,
    aspectRatio
  ]);

  return editorContent;
};

export default MemoizedPageEditor;
