import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Add,
  CenterFocusStrong,
  SkipPrevious,
  ArrowLeft,
  ArrowRight,
  SkipNext,
  Edit
} from '@mui/icons-material';
import TextBox from './TextBox';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer'; // Import the new drawer

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
  onImageDisplayedSizeChange,
  colorPalette,
  onSelectFieldExternal,
  showFormattingPanel,
  onCsvDataUpdate // New prop to notify App.jsx of changes
}) => {
  const [selectedField, setSelectedField] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // State for the drawer
  const containerRef = useRef(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0);

  const handleFieldSelectInternal = useCallback((fieldToSelect) => {
    setSelectedField(fieldToSelect);
    if (onSelectFieldExternal) {
      onSelectFieldExternal(fieldToSelect);
    }
  }, [onSelectFieldExternal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setImageSize({ width, height });
        if (onImageDisplayedSizeChange) {
          onImageDisplayedSizeChange({ width, height });
        }
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [onImageDisplayedSizeChange]);

  // Effect to initialize or update field positions and styles based on csvHeaders and props.
  // This ensures that every field in csvHeaders has a corresponding position and a complete style object.
  useEffect(() => {
    // Diagnostic logs removed.

    if (csvHeaders.length > 0) {
      const newCombinedPositions = {};
      const newCombinedStyles = {};
      let positionsHaveChanged = false;
      let stylesHaveChanged = false;

      csvHeaders.forEach((header, index) => {
        // Logic for positions: use existing if available, else default.
        const existingPosition = fieldPositions[header];
        const defaultPosition = {
          x: 10 + (index % 3) * 30,
          y: 10 + Math.floor(index / 3) * 25,
          width: 25,
          height: 15,
          visible: true,
          rotation: 0 // Initialize rotation
        };
        // Ensure all default keys are present if existingPosition is only partial
        newCombinedPositions[header] = existingPosition
          ? { ...defaultPosition, ...existingPosition, rotation: existingPosition.rotation || 0 }
          : defaultPosition;

        // Logic for styles: merge existing styles with a complete default set.
        // Custom styles from fieldStyles[header] (from parent) override the defaults.
        newCombinedStyles[header] = {
          ...COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER,
          ...(fieldStyles[header] || {}),
        };
      });

      // Check if the newly combined positions are different from the current prop
      if (JSON.stringify(newCombinedPositions) !== JSON.stringify(fieldPositions)) {
        positionsHaveChanged = true;
      }

      // Check if the newly combined styles are different from the current prop
      if (JSON.stringify(newCombinedStyles) !== JSON.stringify(fieldStyles)) {
        stylesHaveChanged = true;
      }

      // Call parent setters only if there's an actual change.
      if (positionsHaveChanged) {
        setFieldPositions(newCombinedPositions);
      }
      if (stylesHaveChanged) {
        setFieldStyles(newCombinedStyles);
      }
    }
    // This effect depends on the content of fieldPositions and fieldStyles objects, not just their references.
    // Stringifying them for the dependency array is a common way to track changes in object content,
    // though it can be performance-intensive for very large/complex objects.
    // For this use case, it's likely acceptable.
  }, [csvHeaders, fieldPositions, fieldStyles, setFieldPositions, setFieldStyles]);

  const handlePositionChange = (field, newPosition) => {
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...newPosition
      }
    }));
  };

  const handleSizeChange = (field, newSize) => {
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...newSize
      }
    }));
  };

  const centerAllFields = () => {
    const newPositions = {};
    csvHeaders.forEach((header, index) => {
      newPositions[header] = {
        ...fieldPositions[header],
        x: 50 - 12.5,
        y: 20 + index * 20
      };
    });
    setFieldPositions(prev => ({ ...prev, ...newPositions }));
  };

  const autoArrangeFields = () => {
    const newPositions = {};
    const cols = 2;
    const fieldWidth = 40;
    const fieldHeight = 15;
    const spacing = 5;

    csvHeaders.forEach((header, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      newPositions[header] = {
        ...fieldPositions[header],
        x: 10 + col * (fieldWidth + spacing),
        y: 10 + row * (fieldHeight + spacing),
        width: fieldWidth,
        height: fieldHeight
      };
    });

    setFieldPositions(prev => ({ ...prev, ...newPositions }));
  };

  const handleColorCircleClick = (color) => {
    if (selectedField) {
      setFieldStyles(prev => ({
        ...prev,
        [selectedField]: {
          ...prev[selectedField],
          color: color
        }
      }));
    }
  };

  // Handler para prevenir scroll durante interações
  const handleContainerTouchStart = (e) => {
    // Só prevenir se não estiver clicando em um TextBox
    if (!e.target.closest('.text-box')) {
      setIsInteracting(true);
    }
  };

  const handleContainerTouchEnd = () => {
    setIsInteracting(false);
  };

  const handleContentChange = useCallback((field, newText) => {
    if (!csvData || csvData.length === 0) return;

    const updatedCsvData = csvData.map((row, index) => {
      if (index === currentPreviewIndex) {
        return {
          ...row,
          [field]: newText,
        };
      }
      return row;
    });

    // Propagate change upwards
    if (onCsvDataUpdate) {
      onCsvDataUpdate(updatedCsvData);
    }
  }, [csvData, currentPreviewIndex, onCsvDataUpdate]);

  // Navigation handlers
  const handleNextPreview = () => {
    setCurrentPreviewIndex(prevIndex => Math.min(prevIndex + 1, csvData.length - 1));
  };

  const handlePreviousPreview = () => {
    setCurrentPreviewIndex(prevIndex => Math.max(prevIndex - 1, 0));
  };

  const handleFirstPreview = () => {
    setCurrentPreviewIndex(0);
  };

  const handleLastPreview = () => {
    setCurrentPreviewIndex(csvData.length - 1);
  };

  // Efeito para gerenciar scroll durante interações
  useEffect(() => {
    if (isInteracting && isMobile) {
      // Prevenir scroll apenas durante interações ativas
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };
    }
  }, [isInteracting, isMobile]);

  if (!backgroundImage) {
    return (
      <Box
        sx={{
          height: 400,
          border: '2px dashed #ccc',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}
      >
        <Typography color="textSecondary" variant="h6">
          Carregue uma imagem de fundo para posicionar os campos
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Editor de Campos
              </Typography>
              <Box>
                <Button
                  size="small"
                  onClick={centerAllFields}
                  startIcon={<CenterFocusStrong />}
                  sx={{ mr: 1 }}
                >
                  Centralizar
                </Button>
                <Button
                  size="small"
                  onClick={autoArrangeFields}
                  startIcon={<Add />}
                >
                  Auto Organizar
                </Button>
              </Box>
            </Box>

            {csvData.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Carregue um arquivo CSV para ver o preview dos dados
              </Alert>
            )}

            {isMobile && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Modo Mobile:</strong> Toque em um campo para abrir o painel de edição.
              </Alert>
            )}

            <Box
              ref={containerRef}
              className="text-container"
              sx={{
                position: 'relative',
                border: '2px solid #ddd',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#fff',
                cursor: 'default',
                touchAction: isMobile ? 'pan-x pan-y' : 'auto',
                WebkitOverflowScrolling: 'touch',
                '&.interacting': {
                  touchAction: 'none'
                }
              }}
              onMouseDown={(e) => {
                if (e.target.closest('.text-box')) return;
                setSelectedField(null);
              }}
              onTouchStart={handleContainerTouchStart}
              onTouchEnd={handleContainerTouchEnd}
            >
              <img
                src={backgroundImage}
                alt="Background"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  WebkitUserDrag: 'none'
                }}
                draggable={false}
              />

              {csvHeaders && csvHeaders.length > 0
                ? csvHeaders.map(header => {
                  const position = fieldPositions[header];
                  const style = fieldStyles[header];
                  if (!position || !position.visible) return null;
                  const record = csvData[currentPreviewIndex] || {};
                  const sampleData = record[header] !== undefined ? record[header] : `[${header}]`;

                  return (
                    <TextBox
                      key={header}
                      field={header}
                      position={position}
                      style={style}
                      content={sampleData}
                      isSelected={selectedField === header}
                      onSelect={handleFieldSelectInternal}
                      onPositionChange={handlePositionChange}
                      onSizeChange={handleSizeChange}
                      containerSize={imageSize}
                      onContentChange={handleContentChange}
                      rotation={position.rotation}
                    />
                  );
                })
                : null
              }
            </Box>

            {csvData && csvData.length > 1 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Primeiro Registro"><span><IconButton onClick={handleFirstPreview} disabled={currentPreviewIndex === 0} size="small"><SkipPrevious /></IconButton></span></Tooltip>
                <Tooltip title="Registro Anterior"><span><IconButton onClick={handlePreviousPreview} disabled={currentPreviewIndex === 0} size="small"><ArrowLeft /></IconButton></span></Tooltip>
                <Typography variant="body2" sx={{ minWidth: '100px', textAlign: 'center' }}>Registro: {currentPreviewIndex + 1} / {csvData.length}</Typography>
                <Tooltip title="Próximo Registro"><span><IconButton onClick={handleNextPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><ArrowRight /></IconButton></span></Tooltip>
                <Tooltip title="Último Registro"><span><IconButton onClick={handleLastPreview} disabled={currentPreviewIndex === csvData.length - 1} size="small"><SkipNext /></IconButton></span></Tooltip>
              </Box>
            )}

            {colorPalette && colorPalette.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                {colorPalette.map((color, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: isMobile ? 40 : 30,
                      height: isMobile ? 40 : 30,
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: '2px solid #fff',
                      boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                      touchAction: 'manipulation',
                      '&:active': { transform: 'scale(0.95)' }
                    }}
                    onClick={() => handleColorCircleClick(color)}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {!isMobile && showFormattingPanel && (
        <Grid item xs={12} lg={4}>
          <FormattingPanel
            selectedField={selectedField}
            fieldStyles={fieldStyles}
            setFieldStyles={setFieldStyles}
            fieldPositions={fieldPositions}
            setFieldPositions={setFieldPositions}
            csvHeaders={csvHeaders}
          />
        </Grid>
      )}

      {isMobile && (
        <>
          <Fab
            color="primary"
            aria-label="edit"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setIsDrawerOpen(true)}
            disabled={!selectedField}
          >
            <Edit />
          </Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            selectedField={selectedField}
            fieldStyles={fieldStyles}
            setFieldStyles={setFieldStyles}
            fieldPositions={fieldPositions}
            setFieldPositions={setFieldPositions}
            csvHeaders={csvHeaders}
          />
        </>
      )}
    </Grid>
  );
};

export default FieldPositioner;

