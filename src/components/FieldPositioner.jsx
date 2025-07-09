import React, { useState, useRef, useEffect, useCallback } from 'react';
import TextBox from './TextBox'; // Já refatorado

// Define COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER at module level
const COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER = {
  fontFamily: 'Arial',
  fontSize: 24, // Este será o tamanho base, TextBox irá escalar
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
};

const FieldPositioner = ({
  backgroundImage,
  csvHeaders,
  fieldPositions,
  setFieldPositions,
  fieldStyles,
  setFieldStyles,
  csvData,
  onImageDisplayedSizeChange, // Callback para notificar o tamanho da imagem renderizada
  // colorPalette, // Comentado por enquanto
  onFieldSelect, // Renomeado de onSelectFieldExternal para consistência com DesignStep
  selectedField, // Renomeado de selectedFieldExternal
  // showFormattingPanel = true, // Removido, não mais relevante aqui
  onCsvDataUpdate
}) => {
  // selectedFieldInternal é o campo selecionado DENTRO do FieldPositioner
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null);
  const [imageContainerSize, setImageContainerSize] = useState({ width: 0, height: 0 });
  const imageContainerRef = useRef(null); // Ref para o container da imagem, não para a img em si
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // Sincronizar selectedFieldInternal com a prop selectedField (controlado externamente)
  useEffect(() => {
    setSelectedFieldInternal(selectedField);
  }, [selectedField]);

  const handleFieldSelectInternal = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect); // Atualiza estado interno
    if (onFieldSelect) {
      onFieldSelect(fieldToSelect); // Notifica o componente pai (DesignStep)
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
    if (csvHeaders.length > 0) {
      const newCombinedPositions = {};
      const newCombinedStyles = {};
      let positionsHaveChanged = false;
      let stylesHaveChanged = false;

      csvHeaders.forEach((header, index) => {
        const existingPosition = fieldPositions[header];
        const defaultPosition = {
          x: 10 + (index % 3) * 30, y: 10 + Math.floor(index / 3) * 25,
          width: 25, height: 15, visible: true
        };
        newCombinedPositions[header] = existingPosition ? { ...defaultPosition, ...existingPosition } : defaultPosition;

        newCombinedStyles[header] = {
          ...COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER,
          ...(fieldStyles[header] || {}),
        };
      });

      if (JSON.stringify(newCombinedPositions) !== JSON.stringify(fieldPositions)) positionsHaveChanged = true;
      if (JSON.stringify(newCombinedStyles) !== JSON.stringify(fieldStyles)) stylesHaveChanged = true;

      if (positionsHaveChanged) setFieldPositions(newCombinedPositions);
      if (stylesHaveChanged) setFieldStyles(newCombinedStyles);
    }
  }, [csvHeaders, JSON.stringify(fieldPositions), JSON.stringify(fieldStyles), setFieldPositions, setFieldStyles]);

  const handlePositionChange = (field, newPosition) => {
    setFieldPositions(prev => ({ ...prev, [field]: { ...prev[field], ...newPosition } }));
  };

  const handleSizeChange = (field, newSize) => {
    setFieldPositions(prev => ({ ...prev, [field]: { ...prev[field], ...newSize } }));
  };

  const handleContentChange = useCallback((field, newText) => {
    if (!csvData || csvData.length === 0 || !onCsvDataUpdate) return;
    const updatedCsvData = csvData.map((row, index) =>
      index === currentPreviewIndex ? { ...row, [field]: newText } : row
    );
    onCsvDataUpdate(updatedCsvData);
  }, [csvData, currentPreviewIndex, onCsvDataUpdate]);

  const previewRecord = csvData && csvData.length > 0
    ? csvData[currentPreviewIndex] || csvData[0] // Fallback para o primeiro se o índice estiver fora
    : csvHeaders.reduce((acc, header) => ({ ...acc, [header]: `[${header}]` }), {});


  if (!backgroundImage) {
    // Esta mensagem agora é tratada pelo DesignStep. FieldPositioner não renderiza nada.
    return null;
  }

  // Funções de navegação de preview (UI será adicionada depois se necessário)
  const handleNextPreview = () => setCurrentPreviewIndex(prev => Math.min(prev + 1, csvData.length - 1));
  const handlePreviousPreview = () => setCurrentPreviewIndex(prev => Math.max(prev - 1, 0));


  return (
    <div className="w-full h-full flex flex-col">
      {/* Container da imagem e TextBoxes */}
      <div
        ref={imageContainerRef}
        className="relative w-full flex-grow bg-gray-200 overflow-hidden border border-gray-300 rounded-md"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'contain', // ou 'cover', dependendo do comportamento desejado
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '300px', // Para garantir que tenha alguma altura
         }}
        onClick={(e) => {
          // Desseleciona se o clique for diretamente no container e não em um textbox
          if (e.target === imageContainerRef.current) {
            handleFieldSelectInternal(null);
          }
        }}
      >
        {/* A imagem de fundo é aplicada via CSS ao container.
            Não precisamos de uma tag <img> aqui se os TextBox'es são posicionados relativos a este container.
            Isso simplifica o cálculo de tamanho e escala.
        */}

        {imageContainerSize.width > 0 && csvHeaders.map(header => {
          const position = fieldPositions[header];
          const style = fieldStyles[header];

          if (!position || !style || !position.visible) return null;

          const content = previewRecord[header] !== undefined ? String(previewRecord[header]) : `[${header}]`;

          return (
            <TextBox
              key={header}
              field={header}
              position={position} // x, y, width, height em %
              style={style} // Estilos de texto
              content={content}
              isSelected={selectedFieldInternal === header}
              onSelect={handleFieldSelectInternal} // TextBox chama isso ao ser clicado
              onPositionChange={handlePositionChange} // TextBox chama isso ao ser movido
              onSizeChange={handleSizeChange} // TextBox chama isso ao ser redimensionado
              containerSize={imageContainerSize} // Tamanho do imageContainerRef em pixels
              onContentChange={handleContentChange}
            />
          );
        })}
      </div>

      {/* Navegação de Preview (UI simplificada por enquanto) */}
      {csvData && csvData.length > 1 && (
        <div className="flex items-center justify-center space-x-2 p-2 bg-gray-100 border-t">
          <button onClick={handlePreviousPreview} disabled={currentPreviewIndex === 0} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">Prev</button>
          <span className="text-sm">Registro: {currentPreviewIndex + 1} / {csvData.length}</span>
          <button onClick={handleNextPreview} disabled={currentPreviewIndex === csvData.length - 1} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};

export default FieldPositioner;

