import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert
} from '@mui/material';
import {
  Add,
  CenterFocusStrong
} from '@mui/icons-material';
import TextBox from './TextBox';
import FormattingPanel from './FormattingPanel';

const FieldPositioner = ({ 
  backgroundImage, 
  csvHeaders, 
  fieldPositions, 
  setFieldPositions, 
  fieldStyles,
  setFieldStyles,
  csvData 
}) => {
  const [selectedField, setSelectedField] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (backgroundImage && containerRef.current) {
      const img = new Image();
      img.onload = () => {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const aspectRatio = img.height / img.width;
        const displayHeight = containerWidth * aspectRatio;
        
        setImageSize({
          width: containerWidth,
          height: displayHeight
        });
      };
      img.src = backgroundImage;
    }
  }, [backgroundImage]);

  // Inicializar posições e estilos padrão se não existirem
  useEffect(() => {
    if (csvHeaders.length > 0) {
      const newPositions = {};
      const newStyles = {};
      
      csvHeaders.forEach((header, index) => {
        if (!fieldPositions[header]) {
          newPositions[header] = {
            x: 10 + (index % 3) * 30,
            y: 10 + Math.floor(index / 3) * 25,
            width: 25,
            height: 15,
            visible: true
          };
        }
        
        if (!fieldStyles[header]) {
          newStyles[header] = {
            fontFamily: 'Arial',
            fontSize: 24,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#000000',
            textStroke: false,
            strokeColor: '#ffffff',
            strokeWidth: 2,
            textShadow: false,
            shadowColor: '#000000',
            shadowBlur: 4,
            shadowOffsetX: 2,
            shadowOffsetY: 2
          };
        }
      });
      
      if (Object.keys(newPositions).length > 0) {
        setFieldPositions(prev => ({ ...prev, ...newPositions }));
      }
      
      if (Object.keys(newStyles).length > 0) {
        setFieldStyles(prev => ({ ...prev, ...newStyles }));
      }
    }
  }, [csvHeaders]);

  const handleFieldSelect = (field) => {
    setSelectedField(field);
  };

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
        x: 50 - 12.5, // Centralizar considerando largura padrão
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
      {/* Área de edição */}
      <Grid item xs={12} lg={8}>
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

            {/* Container da imagem com campos */}
            <Box
              ref={containerRef}
              className="text-container"
              sx={{
                position: 'relative',
                border: '2px solid #ddd',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#fff',
                cursor: 'default'
              }}
              onClick={() => setSelectedField(null)}
            >
              <img
                src={backgroundImage}
                alt="Background"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
                draggable={false}
              />
              
              {/* Campos de texto */}
              {csvHeaders.map(header => {
                const position = fieldPositions[header];
                const style = fieldStyles[header];
                
                if (!position || !position.visible) return null;

                const sampleData = csvData[0] ? csvData[0][header] : `[${header}]`;
                
                return (
                  <TextBox
                    key={header}
                    field={header}
                    position={position}
                    style={style}
                    content={sampleData}
                    isSelected={selectedField === header}
                    onSelect={handleFieldSelect}
                    onPositionChange={handlePositionChange}
                    onSizeChange={handleSizeChange}
                    containerSize={imageSize}
                  />
                );
              })}
            </Box>

            {/* Instruções */}
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Instruções:</strong>
                <br />
                • Clique em um campo para selecioná-lo e editar suas propriedades
                <br />
                • Arraste o círculo central para mover o campo
                <br />
                • Arraste os pontos nas bordas para redimensionar
                <br />
                • Use o painel lateral para configurar fonte, cor e efeitos
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Painel de formatação */}
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
    </Grid>
  );
};

export default FieldPositioner;

