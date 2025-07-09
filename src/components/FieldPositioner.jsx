import React, { useState, useRef, useEffect, useCallback } from 'react';
import TextBox from './TextBox';

const COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER = {
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
  strokeWidth: 1,
  textShadow: false,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

const FieldPositioner = ({
  backgroundImage,
  csvHeaders,
  fieldPositions,
  setFieldPositions,
  fieldStyles,
  setFieldStyles,
  csvData,
  onImageDisplayedSizeChange,
  onFieldSelect,
  selectedField,
  onCsvDataUpdate,
  // colorPalette // Removido por enquanto, pode ser re-adicionado se necessário
}) => {
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null);
  const [imageContainerSize, setImageContainerSize] = useState({ width: 0, height: 0 });
  const imageContainerRef = useRef(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  useEffect(() => {
    setSelectedFieldInternal(selectedField);
  }, [selectedField]);

  const handleFieldSelectInternal = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect);
    if (onFieldSelect) {
      onFieldSelect(fieldToSelect);
    }
  }, [onFieldSelect]);

  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setImageContainerSize({ width, height });
        if (onImageDisplayedSizeChange) {
          onImageDisplayedSizeChange({ width, height });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [onImageDisplayedSizeChange]);

  useEffect(() => {
    if (csvHeaders && csvHeaders.length > 0) {
      const newCombinedPositions = { ...fieldPositions };
      const newCombinedStyles = { ...fieldStyles };
      let positionsHaveChanged = false;
      let stylesHaveChanged = false;

      csvHeaders.forEach((header, index) => {
        const defaultPos = { x: 10 + (index % 3) * 30, y: 10 + Math.floor(index / 3) * 25, width: 25, height: 15, visible: true };
        if (!newCombinedPositions[header]) {
          newCombinedPositions[header] = defaultPos;
          positionsHaveChanged = true;
        } else {
          newCombinedPositions[header] = { ...defaultPos, ...newCombinedPositions[header]};
        }

        const currentFieldStyle = fieldStyles[header] || {};
        const defaultWithExisting = {
          ...COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER,
          ...currentFieldStyle,
        };
        if (!newCombinedStyles[header] || JSON.stringify(newCombinedStyles[header]) !== JSON.stringify(defaultWithExisting)) {
            newCombinedStyles[header] = defaultWithExisting;
            stylesHaveChanged = true;
        }
      });

      if (positionsHaveChanged) setFieldPositions(newCombinedPositions);
      if (stylesHaveChanged) setFieldStyles(newCombinedStyles);
    }
  }, [csvHeaders, fieldPositions, fieldStyles, setFieldPositions, setFieldStyles]);


  const handlePositionChange = (field, newPosition) => {
    setFieldPositions(prev => ({ ...prev, [field]: { ...(prev[field] || {}), ...newPosition } }));
  };

  const handleSizeChange = (field, newSize) => {
    setFieldPositions(prev => ({ ...prev, [field]: { ...(prev[field] || {}), ...newSize } }));
  };

  const handleContentChange = useCallback((field, newText) => {
    if (!csvData || csvData.length === 0 || !onCsvDataUpdate) return;
    const updatedCsvData = csvData.map((row, index) =>
      index === currentPreviewIndex ? { ...row, [field]: newText } : row
    );
    onCsvDataUpdate(updatedCsvData);
  }, [csvData, currentPreviewIndex, onCsvDataUpdate]);

  const previewRecord = csvData && csvData.length > 0
    ? csvData[currentPreviewIndex] || csvData[0]
    : csvHeaders.reduce((acc, header) => ({ ...acc, [header]: `[${header}]` }), {});

  if (!backgroundImage) {
    return null;
  }

  const handleNextPreview = () => setCurrentPreviewIndex(prev => Math.min(prev + 1, (csvData?.length || 1) - 1));
  const handlePreviousPreview = () => setCurrentPreviewIndex(prev => Math.max(prev - 1, 0));

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 rounded-md">
      <div
        ref={imageContainerRef}
        className="relative w-full flex-grow overflow-hidden border-2 border-dashed border-gray-300 rounded-md shadow-inner"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '300px',
         }}
        onClick={(e) => {
          if (e.target === imageContainerRef.current) {
            handleFieldSelectInternal(null);
          }
        }}
      >
        {imageContainerSize.width > 0 && csvHeaders?.map(header => {
          const position = fieldPositions[header];
          const style = fieldStyles[header];

          if (!position || !style || !position.visible) return null;

          const content = previewRecord[header] !== undefined ? String(previewRecord[header]) : `[${header}]`;

          return (
            <TextBox
              key={header}
              field={header}
              position={position}
              style={style}
              content={content}
              isSelected={selectedFieldInternal === header}
              onSelect={handleFieldSelectInternal}
              onPositionChange={handlePositionChange}
              onSizeChange={handleSizeChange}
              containerSize={imageContainerSize}
              onContentChange={handleContentChange}
            />
          );
        })}
      </div>

      {csvData && csvData.length > 1 && (
        <div className="flex items-center justify-center space-x-2 p-2 bg-gray-200 border-t border-gray-300 rounded-b-md">
          <button
            onClick={handlePreviousPreview}
            disabled={currentPreviewIndex === 0}
            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-700">
            Preview Registro: {currentPreviewIndex + 1} / {csvData.length}
          </span>
          <button
            onClick={handleNextPreview}
            disabled={currentPreviewIndex === (csvData.length - 1)}
            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
};

export default FieldPositioner;
