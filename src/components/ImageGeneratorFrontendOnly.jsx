import React, { useState, useRef, useEffect } from 'react';
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
  TableChart,
  Google
} from '@mui/icons-material';
import GoogleAuthSetup from './GoogleAuthSetup';
import googleDriveAPI from '../utils/googleDriveAPI';

const ImageGeneratorFrontendOnly = ({
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
  const [authConfigured, setAuthConfigured] = useState(false);
  const [showAuthSetup, setShowAuthSetup] = useState(false);

  const canvasRef = useRef(null);

  // Estado para controle de fontes carregadas
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Efeito para garantir que as fontes estejam carregadas
  useEffect(() => {
    const loadFonts = async () => {
      try {
        // Aguarda todas as fontes do documento estarem carregadas
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Erro ao carregar fontes:', error);
        setFontsLoaded(true); // Continua mesmo com erro
      }
    };

    loadFonts();
  }, []);

  // Função para quebrar texto em linhas dentro de uma área retangular
  const wrapTextInArea = (ctx, text, x, y, maxWidth, maxHeight, style) => {
    if (!text) return [];

    const fontSize = style.fontSize || 24;
    const lineHeight = fontSize * (style.lineHeightMultiplier || 1.2);
    const maxLines = Math.floor(maxHeight / lineHeight);

    // Aplica a fonte antes de medir o texto
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
    ctx.textAlign = style.textAlign || 'left';
    ctx.textBaseline = style.textBaseline || 'top';

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
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }
  };

  // Função para desenhar texto com efeitos
  const drawTextWithEffects = (ctx, text, x, y, style) => {
    // Desenha o contorno primeiro (se habilitado)
    if (style.textStroke) {
      ctx.strokeText(text, x, y);
    }
    // Desenha o texto preenchido por cima
    ctx.fillText(text, x, y);
  };

  // Função para calcular posições precisas
  const calculatePrecisePosition = (position, canvasWidth, canvasHeight) => {
    return {
      x: Math.round((position.x / 100) * canvasWidth),
      y: Math.round((position.y / 100) * canvasHeight),
      width: Math.round((position.width / 100) * canvasWidth),
      height: Math.round((position.height / 100) * canvasHeight)
    };
  };

  // Função principal para gerar imagens
  const generateImages = async () => {
    if (!backgroundImage || csvData.length === 0) {
      alert('Por favor, carregue um arquivo CSV e uma imagem de fundo.');
      return;
    }

    if (!fontsLoaded) {
      alert('Aguardando carregamento das fontes. Tente novamente em alguns segundos.');
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

        // Configurar canvas com alta qualidade
        canvas.width = img.width;
        canvas.height = img.height;

        // Melhorar qualidade de renderização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.textRenderingOptimization = 'optimizeQuality';

        // Desenhar imagem de fundo
        ctx.drawImage(img, 0, 0);

        // Desenhar campos do CSV com estilos individuais
        Object.keys(record).forEach(field => {
          const position = fieldPositions[field];
          const style = fieldStyles[field];

          if (!position || !position.visible || !style) return;

          const text = record[field] || '';
          if (!text) return;

          // Calcular posições precisas
          const pos = calculatePrecisePosition(position, canvas.width, canvas.height);

          // Aplicar configurações de texto
          applyTextEffects(ctx, style);

          // Quebrar texto em linhas dentro da área definida
          const lines = wrapTextInArea(ctx, text, pos.x, pos.y, pos.width, pos.height, style);

          // Desenhar cada linha
          const lineHeight = (style.fontSize || 24) * (style.lineHeightMultiplier || 1.2);
          lines.forEach((line, lineIndex) => {
            const lineY = pos.y + (lineIndex * lineHeight);

            // Aplicar efeitos novamente para cada linha (necessário para alguns navegadores)
            applyTextEffects(ctx, style);

            drawTextWithEffects(ctx, line, pos.x, lineY, style);
          });
        });

        // Converter canvas para blob com alta qualidade
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

    } catch (error) {
      console.error('Erro na geração de imagens:', error);
      alert(`Erro na geração de imagens: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para fazer download de uma imagem
  const downloadImage = (imageData) => {
    const link = document.createElement('a');
    link.href = imageData.url;
    link.download = imageData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para fazer download de todas as imagens
  const downloadAllImages = () => {
    generatedImages.forEach((imageData, index) => {
      setTimeout(() => {
        downloadImage(imageData);
      }, index * 100); // Pequeno delay entre downloads
    });
  };

  // Função para abrir preview
  const openPreview = (imageData) => {
    setSelectedPreview(imageData);
    setPreviewOpen(true);
  };

  // Função para fechar preview
  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedPreview(null);
  };

  // Função para upload para Google Drive
  const uploadToGoogleDrive = async () => {
    if (!authConfigured) {
      setShowAuthSetup(true);
      return;
    }

    if (!projectName.trim()) {
      alert('Por favor, digite um nome para o projeto.');
      return;
    }

    if (generatedImages.length === 0) {
      alert('Nenhuma imagem foi gerada ainda.');
      return;
    }

    setIsUploadingToDrive(true);
    setDriveResult(null);

    try {
      // 1. Criar pasta principal do projeto
      const folder = await googleDriveAPI.createFolder(projectName);

      // 2. Criar subpasta para as imagens (agora vamos usar essa para tudo)
      const contentFolder = await googleDriveAPI.createFolder('Conteúdo', folder.id);

      const uploadResults = [];
      const sheetData = [];

      // Obter todos os cabeçalhos únicos de todas as linhas do CSV
      const allHeaders = Array.from(new Set(
        generatedImages.flatMap(img => Object.keys(img.record))
      ));

      // 3. Upload de cada imagem para a pasta de conteúdo
      for (let i = 0; i < generatedImages.length; i++) {
        const imageData = generatedImages[i];

        try {
          const result = await googleDriveAPI.uploadFile(
            imageData.blob,
            imageData.filename,
            contentFolder.id // Enviando para a pasta de conteúdo
          );

          uploadResults.push({
            filename: imageData.filename,
            success: true,
            fileId: result.id
          });

          // Preparar dados para a planilha
          const row = [
            i + 1,
            `https://drive.google.com/file/d/${result.id}/view?usp=sharing`,
            ...allHeaders.map(header => imageData.record[header] || '')
          ];

          sheetData.push(row);

        } catch (error) {
          uploadResults.push({
            filename: imageData.filename,
            success: false,
            error: error.message
          });
        }
      }

      // 4. Criar planilha na MESMA pasta das imagens
      if (sheetData.length > 0) {
        const headers = [
          'Nº',
          'Link do Arquivo',
          ...allHeaders
        ];

        // Agora criando na pasta de conteúdo
        await googleDriveAPI.createSpreadsheet(
          `Relação de Arquivos - ${projectName}`,
          [headers, ...sheetData],
          contentFolder.id // <-- Aqui está a mudança principal
        );
      }

      // 5. Atualizar estado com resultados
      setDriveResult({
        folderId: folder.id,
        folderName: projectName,
        uploads: uploadResults,
        successCount: uploadResults.filter(r => r.success).length,
        totalCount: uploadResults.length,
        contentFolderId: contentFolder.id // Adicionando para referência
      });

    } catch (error) {
      console.error('Erro no upload para Google Drive:', error);
      alert(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };
  // Callback para quando a autenticação for bem-sucedida
  const handleAuthSuccess = () => {
    setAuthConfigured(true);
    setShowAuthSetup(false);
  };

  // Callback para quando houver erro na autenticação
  const handleAuthError = (error) => {
    console.error('Erro na autenticação:', error);
    setAuthConfigured(false);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Geração de Imagens
          </Typography>

          {!fontsLoaded && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Carregando fontes... Aguarde antes de gerar as imagens.
            </Alert>
          )}

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                color="primary"
                onClick={generateImages}
                disabled={isGenerating || !fontsLoaded}
                startIcon={<ImageIcon />}
                fullWidth
              >
                {isGenerating ? 'Gerando...' : 'Gerar Imagens'}
              </Button>
            </Grid>

            {generatedImages.length > 0 && (
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  onClick={downloadAllImages}
                  startIcon={<Download />}
                  fullWidth
                >
                  Download Todas ({generatedImages.length})
                </Button>
              </Grid>
            )}
          </Grid>

          {isGenerating && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Gerando imagens...
              </Typography>
            </Box>
          )}

          {/* Integração Google Drive */}
          {generatedImages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                <Google sx={{ mr: 1, verticalAlign: 'middle' }} />
                Integração Google Drive
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={driveIntegration}
                        onChange={(e) => setDriveIntegration(e.target.checked)}
                      />
                    }
                    label="Ativar integração com Google Drive"
                  />
                </Grid>

                {driveIntegration && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nome do Projeto"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Ex: Certificados 2024"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={uploadToGoogleDrive}
                        disabled={isUploadingToDrive}
                        startIcon={<CloudUpload />}
                        fullWidth
                      >
                        {isUploadingToDrive ? 'Enviando...' : 'Enviar para Google Drive'}
                      </Button>
                    </Grid>
                  </>
                )}
              </Grid>

              {isUploadingToDrive && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Enviando para Google Drive...
                  </Typography>
                </Box>
              )}

              {driveResult && (
                <Alert
                  severity={driveResult.successCount === driveResult.totalCount ? "success" : "warning"}
                  sx={{ mt: 2 }}
                >
                  Upload concluído: {driveResult.successCount}/{driveResult.totalCount} arquivos enviados com sucesso.
                  {driveResult.successCount < driveResult.totalCount && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Alguns arquivos falharam no upload. Verifique sua conexão e tente novamente.
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>
          )}

          {/* Lista de imagens geradas */}
          {generatedImages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Imagens Geradas ({generatedImages.length})
              </Typography>

              <Grid container spacing={2}>
                {generatedImages.map((imageData, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body2" noWrap>
                            {imageData.filename}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => openPreview(imageData)}
                            title="Visualizar"
                          >
                            <Visibility />
                          </IconButton>

                          <IconButton
                            size="small"
                            onClick={() => downloadImage(imageData)}
                            title="Download"
                          >
                            <Download />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Preview */}
      <Dialog
        open={previewOpen}
        onClose={closePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Preview - {selectedPreview?.filename}
          <IconButton
            onClick={closePreview}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {selectedPreview && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={selectedPreview.url}
                alt={selectedPreview.filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => downloadImage(selectedPreview)} startIcon={<Download />}>
            Download
          </Button>
          <Button onClick={closePreview}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Configuração de Autenticação */}
      <Dialog
        open={showAuthSetup}
        onClose={() => setShowAuthSetup(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configuração Google Drive
          <IconButton
            onClick={() => setShowAuthSetup(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <GoogleAuthSetup
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  );
};

export default ImageGeneratorFrontendOnly;

