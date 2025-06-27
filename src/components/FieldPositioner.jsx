import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Grid,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  DragIndicator,
  Visibility,
  VisibilityOff,
  CenterFocusStrong
} from '@mui/icons-material';

const FieldPositioner = ({ 
  backgroundImage, 
  csvHeaders, 
  fieldPositions, 
  setFieldPositions, 
  selectedFont, 
  fontSize,
  csvData 
}) => {
  const [draggedField, setDraggedField] = useState(null);
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

  const handleDragStart = (e, field) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedField) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    updateFieldPosition(draggedField, x, y);
    setDraggedField(null);
  };

  const updateFieldPosition = (field, x, y) => {
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        x: Math.max(0, Math.min(95, x)),
        y: Math.max(0, Math.min(95, y))
      }
    }));
  };

  const toggleFieldVisibility = (field) => {
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        visible: !prev[field].visible
      }
    }));
  };

  const centerField = (field) => {
    updateFieldPosition(field, 50, 50);
  };

  const updateFieldCoordinates = (field, coordinate, value) => {
    const numValue = parseFloat(value) || 0;
    setFieldPositions(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [coordinate]: Math.max(0, Math.min(100, numValue))
      }
    }));
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
    <Box>
      {/* Área de posicionamento */}
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          border: '2px solid #ddd',
          borderRadius: 2,
          overflow: 'hidden',
          mb: 3,
          backgroundColor: '#fff'
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <img
          src={backgroundImage}
          alt="Background"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
        
        {/* Campos posicionáveis */}
        {csvHeaders.map(header => {
          const position = fieldPositions[header];
          if (!position || !position.visible) return null;

          const sampleData = csvData[0] ? csvData[0][header] : header;
          
          return (
            <Box
              key={header}
              sx={{
                position: 'absolute',
                left: `${position.x}%`,
                top: `${position.y}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '6px 12px',
                borderRadius: 1,
                cursor: 'move',
                border: '2px solid #2196f3',
                fontFamily: selectedFont,
                fontSize: `${Math.max(10, fontSize * 0.7)}px`,
                maxWidth: '200px',
                wordWrap: 'break-word',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transform: 'translate(-50%, -50%)',
                userSelect: 'none'
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, header)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <DragIndicator sx={{ fontSize: 14, mr: 0.5, color: '#666' }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                  {header}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#333' }}>
                {sampleData}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Controles dos campos */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Controles dos Campos
          </Typography>
          
          <Grid container spacing={2}>
            {csvHeaders.map(header => {
              const position = fieldPositions[header] || { x: 50, y: 50, visible: true };
              
              return (
                <Grid item xs={12} sm={6} md={4} key={header}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={header} 
                        size="small" 
                        color="primary" 
                        sx={{ mr: 1, maxWidth: '120px' }}
                      />
                      <Tooltip title="Centralizar">
                        <IconButton 
                          size="small" 
                          onClick={() => centerField(header)}
                        >
                          <CenterFocusStrong />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={position.visible}
                          onChange={() => toggleFieldVisibility(header)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {position.visible ? <Visibility /> : <VisibilityOff />}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {position.visible ? 'Visível' : 'Oculto'}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    {position.visible && (
                      <Box sx={{ mt: 1 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <TextField
                              label="X (%)"
                              type="number"
                              size="small"
                              value={position.x.toFixed(1)}
                              onChange={(e) => updateFieldCoordinates(header, 'x', e.target.value)}
                              inputProps={{ min: 0, max: 100, step: 0.1 }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              label="Y (%)"
                              type="number"
                              size="small"
                              value={position.y.toFixed(1)}
                              onChange={(e) => updateFieldCoordinates(header, 'y', e.target.value)}
                              inputProps={{ min: 0, max: 100, step: 0.1 }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FieldPositioner;

