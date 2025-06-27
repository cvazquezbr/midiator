import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider
} from '@mui/material';
import {
  Download,
  Visibility,
  Close,
  GetApp,
  Palette,
  FormatSize
} from '@mui/icons-material';

const ImageGenerator = ({ 
  csvData, 
  backgroundImage, 
  fieldPositions, 
  selectedFont, 
  fontSize 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [textColor, setTextColor] = useState('#000000');
  const [textStroke, setTextStroke] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textShadow, setTextShadow] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(4);
  const [shadowOffsetX, setShadowOffsetX] = useState(2);
  const [shadowOffsetY, setShadowOffsetY] = useState(2);

  const canvasRef = useRef(null);

  // Função para quebrar texto em linhas
  const wrapText = (ctx, text, maxWidth) => {
    if (!text) return [''];
    
    const words = text.toString().split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Função para aplicar efeitos de texto
  const applyTextEffects = (ctx) => {
    ctx.fillStyle = textColor;
    ctx.font = `${fontSize}px ${selectedFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Configurar sombra
    if (textShadow) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowOffsetY;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Configurar contorno
    if (textStroke) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
    }
  };

  // Função para desenhar texto com efeitos
  const drawText = (ctx, text, x, y) => {
    if (textStroke) {
      ctx.strokeText(text, x, y);
    }
    ctx.fillText(text, x, y);
  };

  // Função principal para gerar imagens
  const generateImages = async () => {
    if (!backgroundImage || csvData.length === 0) {
      alert('Por favor, carregue um arquivo CSV e uma imagem de fundo.');
      return;
    }

    setIsGenerating(true);
    const images = [];

    try {
      // Carregar imagem de fundo uma vez
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = backgroundImage;
      });

      for (let i = 0; i < csvData.length; i++) {
        const record = csvData[i];
        
        // Criar canvas para cada registro
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Desenhar imagem de fundo
        ctx.drawImage(img, 0, 0);
        
        // Aplicar configurações de texto
        applyTextEffects(ctx);
        
        // Desenhar campos do CSV
        Object.keys(record).forEach(field => {
          const position = fieldPositions[field];
          if (!position || !position.visible) return;
          
          const text = record[field] || '';
          if (!text) return;
          
          // Converter posições percentuais para pixels
          const x = (position.x / 100) * canvas.width;
          const y = (position.y / 100) * canvas.height;
          
          // Calcular largura máxima (80% da largura restante)
          const maxWidth = (canvas.width - x) * 0.8;
          
          // Quebrar texto em linhas
          const lines = wrapText(ctx, text, maxWidth);
          
          // Desenhar cada linha
          lines.forEach((line, lineIndex) => {
            const lineY = y + (lineIndex * (fontSize + 5));
            drawText(ctx, line, x, lineY);
          });
        });
        
        // Converter canvas para blob
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', 1.0);
        });
        
        const imageData = {
          blob: blob,
          url: URL.createObjectURL(blob),
          record: record,
          index: i,
          filename: `imagem_${String(i + 1).padStart(3, '0')}.png`
        };
        
        images.push(imageData);
      }

      setGeneratedImages(images);
    } catch (error) {
      console.error('Erro ao gerar imagens:', error);
      alert('Erro ao gerar imagens. Verifique os dados e tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para download individual
  const downloadImage = (image) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para download de todas as imagens
  const downloadAllImages = () => {
    generatedImages.forEach((image, index) => {
      setTimeout(() => {
        downloadImage(image);
      }, index * 100); // Pequeno delay entre downloads
    });
  };

  // Função para abrir preview
  const openPreview = (image) => {
    setSelectedPreview(image);
    setPreviewOpen(true);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Geração de Imagens
        </Typography>
        
        {/* Configurações de texto */}
        <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
            Configurações de Texto
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Cor do Texto"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Contorno</InputLabel>
                <Select
                  value={textStroke}
                  label="Contorno"
                  onChange={(e) => setTextStroke(e.target.value)}
                >
                  <MenuItem value={false}>Sem contorno</MenuItem>
                  <MenuItem value={true}>Com contorno</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {textStroke && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Cor do Contorno"
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography gutterBottom>Espessura: {strokeWidth}px</Typography>
                  <Slider
                    value={strokeWidth}
                    onChange={(e, value) => setStrokeWidth(value)}
                    min={1}
                    max={10}
                    size="small"
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sombra</InputLabel>
                <Select
                  value={textShadow}
                  label="Sombra"
                  onChange={(e) => setTextShadow(e.target.value)}
                >
                  <MenuItem value={false}>Sem sombra</MenuItem>
                  <MenuItem value={true}>Com sombra</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {textShadow && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Cor da Sombra"
                    type="color"
                    value={shadowColor}
                    onChange={(e) => setShadowColor(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <Typography gutterBottom>Desfoque: {shadowBlur}px</Typography>
                  <Slider
                    value={shadowBlur}
                    onChange={(e, value) => setShadowBlur(value)}
                    min={0}
                    max={20}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <Typography gutterBottom>Offset X: {shadowOffsetX}px</Typography>
                  <Slider
                    value={shadowOffsetX}
                    onChange={(e, value) => setShadowOffsetX(value)}
                    min={-10}
                    max={10}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <Typography gutterBottom>Offset Y: {shadowOffsetY}px</Typography>
                  <Slider
                    value={shadowOffsetY}
                    onChange={(e, value) => setShadowOffsetY(value)}
                    min={-10}
                    max={10}
                    size="small"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Card>

        {/* Botões de ação */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={generateImages}
            disabled={!backgroundImage || csvData.length === 0 || isGenerating}
            startIcon={<Visibility />}
            sx={{ mr: 2 }}
          >
            {isGenerating ? 'Gerando...' : `Gerar ${csvData.length} Imagens`}
          </Button>
          
          {generatedImages.length > 0 && (
            <Button
              variant="outlined"
              size="large"
              onClick={downloadAllImages}
              startIcon={<GetApp />}
            >
              Download Todas ({generatedImages.length})
            </Button>
          )}
        </Box>

        {/* Barra de progresso */}
        {isGenerating && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Gerando imagens... Isso pode levar alguns momentos.
            </Typography>
          </Box>
        )}

        {/* Resultado */}
        {generatedImages.length > 0 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              {generatedImages.length} imagens geradas com sucesso!
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              Imagens Geradas
            </Typography>
            
            <Grid container spacing={2}>
              {generatedImages.map((image, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card>
                    <Box
                      sx={{
                        position: 'relative',
                        paddingTop: '75%', // Aspect ratio 4:3
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={image.url}
                        alt={`Imagem ${index + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          cursor: 'pointer'
                        }}
                        onClick={() => openPreview(image)}
                      />
                    </Box>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption">
                          {image.filename}
                        </Typography>
                        <Box>
                          <IconButton 
                            size="small" 
                            onClick={() => openPreview(image)}
                            title="Visualizar"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => downloadImage(image)}
                            title="Download"
                          >
                            <Download />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Dialog de preview */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {selectedPreview?.filename}
              </Typography>
              <IconButton onClick={() => setPreviewOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPreview && (
              <Box sx={{ textAlign: 'center' }}>
                <img
                  src={selectedPreview.url}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain'
                  }}
                />
                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Dados do Registro:
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(selectedPreview.record).map(([key, value]) => (
                      <Grid item xs={12} sm={6} key={key}>
                        <Chip 
                          label={`${key}: ${value}`} 
                          size="small" 
                          variant="outlined"
                          sx={{ maxWidth: '100%' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => selectedPreview && downloadImage(selectedPreview)}
              startIcon={<Download />}
            >
              Download
            </Button>
            <Button onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </CardContent>
    </Card>
  );
};

export default ImageGenerator;

