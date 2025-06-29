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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  TextField,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  Download,
  Visibility,
  Close,
  GetApp,
  Image as ImageIcon,
  CloudUpload,
  FolderOpen,
  TableChart
} from '@mui/icons-material';

const ImageGeneratorWithDrive = ({ 
  csvData, 
  backgroundImage, 
  fieldPositions, 
  fieldStyles
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  
  // Estados para integração Google Drive
  const [driveIntegration, setDriveIntegration] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [credentialsFile, setCredentialsFile] = useState(null);

  const canvasRef = useRef(null);
  const credentialsInputRef = useRef(null);

  // Função para quebrar texto em linhas dentro de uma área retangular
  const wrapTextInArea = (ctx, text, x, y, maxWidth, maxHeight, style) => {
    if (!text) return [];
    
    const fontSize = style.fontSize || 24;
    const lineHeight = fontSize * 1.2;
    const maxLines = Math.floor(maxHeight / lineHeight);
    
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${fontSize}px ${style.fontFamily || 'Arial'}`;
    
    const words = text.toString().split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        if (lines.length >= maxLines) break;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (lines.length < maxLines && currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  // Função para aplicar efeitos de texto
  const applyTextEffects = (ctx, style) => {
    ctx.fillStyle = style.color || '#000000';
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Configurar sombra
    if (style.textShadow) {
      ctx.shadowColor = style.shadowColor || '#000000';
      ctx.shadowBlur = style.shadowBlur || 4;
      ctx.shadowOffsetX = style.shadowOffsetX || 2;
      ctx.shadowOffsetY = style.shadowOffsetY || 2;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Configurar contorno
    if (style.textStroke) {
      ctx.strokeStyle = style.strokeColor || '#ffffff';
      ctx.lineWidth = style.strokeWidth || 2;
    }
  };

  // Função para desenhar texto com efeitos
  const drawTextWithEffects = (ctx, text, x, y, style) => {
    if (style.textStroke) {
      ctx.strokeText(text, x, y);
    }
    ctx.fillText(text, x, y);
  };

  // Função para upload de arquivo de credenciais
  const handleCredentialsUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCredentialsFile(file);
    }
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
        
        // Desenhar campos do CSV com estilos individuais
        Object.keys(record).forEach(field => {
          const position = fieldPositions[field];
          const style = fieldStyles[field];
          
          if (!position || !position.visible || !style) return;
          
          const text = record[field] || '';
          if (!text) return;
          
          // Converter posições percentuais para pixels
          const x = (position.x / 100) * canvas.width;
          const y = (position.y / 100) * canvas.height;
          const width = (position.width / 100) * canvas.width;
          const height = (position.height / 100) * canvas.height;
          
          // Aplicar configurações de texto
          applyTextEffects(ctx, style);
          
          // Quebrar texto em linhas dentro da área definida
          const lines = wrapTextInArea(ctx, text, x, y, width, height, style);
          
          // Desenhar cada linha
          const lineHeight = (style.fontSize || 24) * 1.2;
          lines.forEach((line, lineIndex) => {
            const lineY = y + (lineIndex * lineHeight);
            drawTextWithEffects(ctx, line, x, lineY, style);
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
          filename: `midiator_${String(i + 1).padStart(3, '0')}.png`
        };
        
        images.push(imageData);
      }

      setGeneratedImages(images);
      
      // Se integração com Drive estiver habilitada, fazer upload automaticamente
      if (driveIntegration && projectName.trim()) {
        await uploadToDrive(images);
      }
      
    } catch (error) {
      console.error('Erro ao gerar imagens:', error);
      alert('Erro ao gerar imagens. Verifique os dados e tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para upload para Google Drive
  const uploadToDrive = async (images = generatedImages) => {
    if (!images.length) {
      alert('Nenhuma imagem para enviar.');
      return;
    }

    if (!projectName.trim()) {
      alert('Por favor, defina um nome para o projeto.');
      return;
    }

    setIsUploadingToDrive(true);
    setDriveResult(null);

    try {
      // Criar FormData para enviar arquivos e dados
      const formData = new FormData();
      
      // Adicionar arquivo de credenciais se fornecido
      if (credentialsFile) {
        formData.append('credentials', credentialsFile);
      }
      
      // Adicionar dados do projeto
      formData.append('projectName', projectName);
      formData.append('csvData', JSON.stringify(csvData));
      
      // Adicionar imagens
      images.forEach((image, index) => {
        formData.append(`image_${index}`, image.blob, image.filename);
      });

      // Fazer requisição para o backend (você precisará implementar este endpoint)
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDriveResult(result);
        alert('Upload para Google Drive concluído com sucesso!');
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro ao fazer upload para Drive:', error);
      alert(`Erro ao fazer upload para Google Drive: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
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
      }, index * 200); // Delay entre downloads
    });
  };

  // Função para abrir preview
  const openPreview = (image) => {
    setSelectedPreview(image);
    setPreviewOpen(true);
  };

  // Calcular estatísticas
  const visibleFields = Object.values(fieldPositions).filter(pos => pos.visible).length;
  const totalFields = Object.keys(fieldPositions).length;

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Geração de Imagens com Google Drive
        </Typography>
        
        {/* Informações do projeto */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Registros CSV
              </Typography>
              <Typography variant="h6">
                {csvData.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Campos Visíveis
              </Typography>
              <Typography variant="h6">
                {visibleFields}/{totalFields}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Estilos Configurados
              </Typography>
              <Typography variant="h6">
                {Object.keys(fieldStyles).length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Imagens a Gerar
              </Typography>
              <Typography variant="h6" color="primary">
                {csvData.length}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Configurações do Google Drive */}
        <Card sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <CloudUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
              Integração com Google Drive
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={driveIntegration}
                  onChange={(e) => setDriveIntegration(e.target.checked)}
                />
              }
              label="Enviar automaticamente para Google Drive após gerar imagens"
            />
            
            {driveIntegration && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nome do Projeto"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Ex: Certificados_2024"
                      helperText="Nome da pasta que será criada no Google Drive"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<CloudUpload />}
                      sx={{ height: '56px' }}
                    >
                      {credentialsFile ? credentialsFile.name : 'Credenciais Google (Opcional)'}
                      <input
                        type="file"
                        accept=".json"
                        hidden
                        ref={credentialsInputRef}
                        onChange={handleCredentialsUpload}
                      />
                    </Button>
                  </Grid>
                </Grid>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Como configurar:</strong><br />
                    1. Acesse o Google Cloud Console<br />
                    2. Crie um projeto e ative as APIs do Drive e Sheets<br />
                    3. Crie credenciais (Service Account ou OAuth)<br />
                    4. Faça download do arquivo JSON e carregue aqui
                  </Typography>
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={generateImages}
            disabled={!backgroundImage || csvData.length === 0 || isGenerating || visibleFields === 0}
            startIcon={<Visibility />}
            sx={{ mr: 2 }}
          >
            {isGenerating ? 'Gerando...' : `Gerar ${csvData.length} Imagens`}
          </Button>
          
          {generatedImages.length > 0 && (
            <>
              <Button
                variant="outlined"
                size="large"
                onClick={downloadAllImages}
                startIcon={<GetApp />}
                sx={{ mr: 2 }}
              >
                Download Todas ({generatedImages.length})
              </Button>
              
              {!driveIntegration && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => uploadToDrive()}
                  disabled={isUploadingToDrive || !projectName.trim()}
                  startIcon={<CloudUpload />}
                  color="secondary"
                >
                  {isUploadingToDrive ? 'Enviando...' : 'Enviar para Drive'}
                </Button>
              )}
            </>
          )}
        </Box>

        {/* Validações */}
        {visibleFields === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Nenhum campo está visível. Configure pelo menos um campo na etapa anterior.
          </Alert>
        )}

        {csvData.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Carregue um arquivo CSV para gerar as imagens.
          </Alert>
        )}

        {!backgroundImage && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Carregue uma imagem de fundo para gerar as imagens.
          </Alert>
        )}

        {/* Barra de progresso */}
        {(isGenerating || isUploadingToDrive) && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {isGenerating && 'Gerando imagens com formatação individual...'}
              {isUploadingToDrive && 'Enviando para Google Drive...'}
            </Typography>
          </Box>
        )}

        {/* Resultado do Google Drive */}
        {driveResult && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎉 Upload para Google Drive concluído!
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  startIcon={<FolderOpen />}
                  href={driveResult.folder_url}
                  target="_blank"
                  fullWidth
                >
                  Abrir Pasta no Drive
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  startIcon={<TableChart />}
                  href={driveResult.spreadsheet_url}
                  target="_blank"
                  fullWidth
                >
                  Abrir Planilha
                </Button>
              </Grid>
            </Grid>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {driveResult.total_images} imagens enviadas • {driveResult.total_records} registros processados
            </Typography>
          </Alert>
        )}

        {/* Resultado */}
        {generatedImages.length > 0 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              🎉 {generatedImages.length} imagens geradas com sucesso!
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
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                      onClick={() => openPreview(image)}
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
                          objectFit: 'contain'
                        }}
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

export default ImageGeneratorWithDrive;

