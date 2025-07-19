import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, ButtonGroup, Button, Chip } from '@mui/material';

const ANCHOR_POINTS = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
  'center': { x: 0.5, y: 0.5 }
};

const Preview = ({
  imageContainerRef,
  bgImageDimsRef,
  generatedImages,
  generationMode,
  currentImageIndex,
  narrationVideoData,
  normalizedVideoPosition,
  setNormalizedVideoPosition,
  videoScale,
  useChromaKey,
  chromaKeyColor,
  chromaKeySimilarity,
  chromaKeyBlend,
  chromaKeySpillSuppress,
  chromaKeyEdgeSmoothing,
  chromaKeyYuv,
  chromaKeyColorspace,
}) => {
  const [bgImageDims, setBgImageDims] = useState({ 
    width: 0, 
    height: 0, 
    offsetX: 0, 
    offsetY: 0
  });
  
  const [videoAspectRatio, setVideoAspectRatio] = useState(16/9);
  const [anchorPoint, setAnchorPoint] = useState('bottom-right');
  const imgRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const dragHandleRef = useRef();
  const containerRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [chromaKeyPreview, setChromaKeyPreview] = useState(false);

  // Atualiza as dimensões quando o container ou imagem mudam
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && imgRef.current && imgRef.current.complete) {
        const container = containerRef.current;
        const img = imgRef.current;
        
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const containerRatio = containerWidth / containerHeight;

        let width, height, offsetX, offsetY;
        
        if (imgRatio > containerRatio) {
          width = containerWidth;
          height = width / imgRatio;
          offsetX = 0;
          offsetY = (containerHeight - height) / 2;
        } else {
          height = containerHeight;
          width = height * imgRatio;
          offsetX = (containerWidth - width) / 2;
          offsetY = 0;
        }

        const newDims = { 
          width, 
          height, 
          offsetX, 
          offsetY,
          containerWidth,
          containerHeight
        };
        setBgImageDims(newDims);
        if (bgImageDimsRef) {
          bgImageDimsRef.current = newDims;
        }
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [generatedImages, currentImageIndex, generationMode]);

  // Atualiza a razão de aspecto do vídeo quando carregado
  const handleVideoLoadedMetadata = (e) => {
    const video = e.target;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoAspectRatio(video.videoWidth / video.videoHeight);
    }
  };

  // Função para aplicar chromakey em tempo real no canvas
  const applyChromaKeyToCanvas = () => {
    if (!canvasRef.current || !videoRef.current || !useChromaKey) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    if (video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Converter cor hex para RGB
      const targetColor = {
        r: parseInt(chromaKeyColor.slice(1, 3), 16),
        g: parseInt(chromaKeyColor.slice(3, 5), 16),
        b: parseInt(chromaKeyColor.slice(5, 7), 16)
      };
      
      const threshold = chromaKeySimilarity * 255;
      const blendFactor = chromaKeyBlend;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calcular distância da cor alvo
        const distance = Math.sqrt(
          Math.pow(r - targetColor.r, 2) +
          Math.pow(g - targetColor.g, 2) +
          Math.pow(b - targetColor.b, 2)
        );
        
        if (distance < threshold) {
          // Aplicar transparência baseada na distância e blend
          const alpha = Math.max(0, (distance / threshold) * blendFactor);
          data[i + 3] = alpha * 255;
          
          // Supressão de spill se configurado
          if (chromaKeySpillSuppress > 0) {
            const spillReduction = 1 - chromaKeySpillSuppress;
            if (chromaKeyColor.toLowerCase().includes('00ff00')) { // Verde
              data[i + 1] = data[i + 1] * spillReduction; // Reduzir canal verde
            } else if (chromaKeyColor.toLowerCase().includes('0000ff')) { // Azul
              data[i + 2] = data[i + 2] * spillReduction; // Reduzir canal azul
            }
          }
        }
      }
      
      // Aplicar suavização de bordas se configurado
      if (chromaKeyEdgeSmoothing > 0) {
        // Implementação básica de blur para suavização
        const blurRadius = Math.floor(chromaKeyEdgeSmoothing * 10);
        for (let y = blurRadius; y < canvas.height - blurRadius; y++) {
          for (let x = blurRadius; x < canvas.width - blurRadius; x++) {
            const idx = (y * canvas.width + x) * 4;
            if (data[idx + 3] < 255 && data[idx + 3] > 0) {
              // Aplicar blur apenas nas bordas semi-transparentes
              let avgAlpha = 0;
              let count = 0;
              for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                  const neighborIdx = ((y + dy) * canvas.width + (x + dx)) * 4;
                  avgAlpha += data[neighborIdx + 3];
                  count++;
                }
              }
              data[idx + 3] = avgAlpha / count;
            }
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    }
  };

  // Atualizar preview de chromakey em tempo real
  useEffect(() => {
    if (useChromaKey && videoRef.current && canvasRef.current) {
      const interval = setInterval(applyChromaKeyToCanvas, 100); // 10 FPS para preview
      return () => clearInterval(interval);
    }
  }, [useChromaKey, chromaKeyColor, chromaKeySimilarity, chromaKeyBlend, chromaKeySpillSuppress, chromaKeyEdgeSmoothing]);

  // Inicia o arrasto
  const handleDragStart = (e) => {
    // Só inicia o arrasto se o clique foi no manipulador de arrasto
    if (e.target !== dragHandleRef.current && !dragHandleRef.current.contains(e.target)) {
      return;
    }
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: normalizedVideoPosition.x,
      startY: normalizedVideoPosition.y
    };
    e.preventDefault();
  };

  // Atualiza a posição durante o arrasto
  const handleDrag = (e) => {
    if (!isDragging || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Calcula nova posição em percentual
    const newX = dragStartRef.current.startX + (deltaX / containerWidth);
    const newY = dragStartRef.current.startY + (deltaY / containerHeight);
    
    // Calcula limites baseados no tamanho do vídeo
    const maxX = 1 - (videoContainerDims.width / bgImageDims.width);
    const maxY = 1 - (videoContainerDims.height / bgImageDims.height);
    
    setNormalizedVideoPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY)),
    });
  };

  // Finaliza o arrasto
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Adiciona listeners de mouse globalmente durante o arrasto
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging]);

  // Aplica o ponto de ancoragem selecionado
  const applyAnchorPoint = (point) => {
    setAnchorPoint(point);
    
    const anchor = ANCHOR_POINTS[point];
    
    // Calcula limites baseados no tamanho do vídeo
    const maxX = 1 - (videoContainerDims.width / bgImageDims.width);
    const maxY = 1 - (videoContainerDims.height / bgImageDims.height);
    
    // Calcula nova posição baseada no ponto de ancoragem
    const newPosition = {
      x: maxX * anchor.x,
      y: maxY * anchor.y
    };
    
    setNormalizedVideoPosition(newPosition);
  };

  // Calcula as dimensões do container de vídeo mantendo a razão de aspecto
  const getVideoContainerDimensions = () => {
    const baseWidth = bgImageDims.width * videoScale;
    const baseHeight = bgImageDims.height * videoScale;
    
    // Calcula a altura baseada na razão de aspecto do vídeo
    const calculatedHeight = baseWidth / videoAspectRatio;
    
    // Se a altura calculada for maior que a altura base, ajusta pela largura
    if (calculatedHeight > baseHeight) {
      return {
        width: baseHeight * videoAspectRatio,
        height: baseHeight
      };
    }
    
    return {
      width: baseWidth,
      height: calculatedHeight
    };
  };

  // Estilo do vídeo
  const videoStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: useChromaKey && chromaKeyPreview ? 'none' : 'block'
  };

  const canvasStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: useChromaKey && chromaKeyPreview ? 'block' : 'none'
  };

  // Calcula dimensões do container de vídeo
  const videoContainerDims = getVideoContainerDimensions();

  return (
    <Paper elevation={0} sx={{
      p: 2,
      mb: 3,
      backgroundColor: 'background.default',
      borderRadius: 2,
      border: 1,
      borderColor: 'divider'
    }}>
      <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
        Pré-visualização
      </Typography>

      {/* Informações de Chromakey */}
      {useChromaKey && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            label={`Cor: ${chromaKeyColor}`} 
            size="small" 
            sx={{ backgroundColor: chromaKeyColor, color: 'white' }}
          />
          <Chip 
            label={`Similaridade: ${(chromaKeySimilarity * 100).toFixed(0)}%`} 
            size="small" 
            variant="outlined"
            sx={{ color: 'text.primary', borderColor: 'divider' }}
          />
          <Chip 
            label={`Blend: ${(chromaKeyBlend * 100).toFixed(0)}%`} 
            size="small" 
            variant="outlined"
            sx={{ color: 'text.primary', borderColor: 'divider' }}
          />
          {chromaKeySpillSuppress > 0 && (
            <Chip 
              label={`Spill: ${(chromaKeySpillSuppress * 100).toFixed(0)}%`} 
              size="small" 
              variant="outlined"
              sx={{ color: 'text.primary', borderColor: 'divider' }}
            />
          )}
          {chromaKeyEdgeSmoothing > 0 && (
            <Chip 
              label={`Suavização: ${(chromaKeyEdgeSmoothing * 100).toFixed(0)}%`} 
              size="small" 
              variant="outlined"
              sx={{ color: 'text.primary', borderColor: 'divider' }}
            />
          )}
          <Chip 
            label={chromaKeyColorspace === 'yuv' || chromaKeyYuv ? 'YUV' : 'RGB'} 
            size="small" 
            variant="outlined"
            sx={{ color: 'text.primary', borderColor: 'divider' }}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ButtonGroup variant="outlined" size="small">
          <Button 
            onClick={() => applyAnchorPoint('top-left')}
            color={anchorPoint === 'top-left' ? 'primary' : 'inherit'}
          >
            NO
          </Button>
          <Button 
            onClick={() => applyAnchorPoint('top-right')}
            color={anchorPoint === 'top-right' ? 'primary' : 'inherit'}
          >
            NE
          </Button>
          <Button 
            onClick={() => applyAnchorPoint('bottom-left')}
            color={anchorPoint === 'bottom-left' ? 'primary' : 'inherit'}
          >
            SO
          </Button>
          <Button 
            onClick={() => applyAnchorPoint('bottom-right')}
            color={anchorPoint === 'bottom-right' ? 'primary' : 'inherit'}
          >
            SE
          </Button>
          <Button 
            onClick={() => applyAnchorPoint('center')}
            color={anchorPoint === 'center' ? 'primary' : 'inherit'}
          >
            Centro
          </Button>
        </ButtonGroup>
      </Box>

      {/* Toggle para preview de chromakey */}
      {useChromaKey && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button 
              onClick={() => setChromaKeyPreview(false)}
              color={!chromaKeyPreview ? 'primary' : 'inherit'}
            >
              Original
            </Button>
            <Button 
              onClick={() => setChromaKeyPreview(true)}
              color={chromaKeyPreview ? 'primary' : 'inherit'}
            >
              Com Chromakey
            </Button>
          </ButtonGroup>
        </Box>
      )}

      <Box
        ref={(el) => {
          containerRef.current = el;
          if (imageContainerRef) {
            if (typeof imageContainerRef === 'function') {
              imageContainerRef(el);
            } else {
              imageContainerRef.current = el;
            }
          }
        }}
        sx={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: 'background.default',
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          maxHeight:'500px'
        }}
        onMouseDown={handleDragStart}
      >
        {generatedImages.length > 0 ? (
          <img
            ref={imgRef}
            src={generationMode === 'slides' 
              ? generatedImages[currentImageIndex].url 
              : generatedImages[0].url}
            alt="Background"
            style={{
              position: 'absolute',
              top: `${bgImageDims.offsetY}px`,
              left: `${bgImageDims.offsetX}px`,
              width: `${bgImageDims.width}px`,
              height: `${bgImageDims.height}px`,
              transition: generationMode === 'slides' ? 'opacity 0.5s ease-in-out' : 'none',
              objectFit: 'contain',
              border: isDragging ? '2px solid' : 'none',
              borderColor: isDragging ? 'primary.main' : 'transparent'
            }}
            onLoad={() => {
              if (containerRef.current && imgRef.current) {
                const container = containerRef.current;
                const img = imgRef.current;
                const imgRatio = img.naturalWidth / img.naturalHeight;
                const containerRatio = container.offsetWidth / container.offsetHeight;

                let width, height, offsetX, offsetY;
                
                if (imgRatio > containerRatio) {
                  width = container.offsetWidth;
                  height = width / imgRatio;
                  offsetX = 0;
                  offsetY = (container.offsetHeight - height) / 2;
                } else {
                  height = container.offsetHeight;
                  width = height * imgRatio;
                  offsetX = (container.offsetWidth - width) / 2;
                  offsetY = 0;
                }

                setBgImageDims({ 
                  width, 
                  height, 
                  offsetX, 
                  offsetY,
                  containerWidth: container.offsetWidth,
                  containerHeight: container.offsetHeight
                });
                
                // Aplica ponto de ancoragem inicial
                applyAnchorPoint(anchorPoint);
              }
            }}
          />
        ) : (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: 'text.secondary'
          }}>
            <Typography>Nenhuma imagem disponível</Typography>
          </Box>
        )}

        {/* Container para o vídeo */}
        {generationMode === 'narration' && narrationVideoData.url && (
          <div
            style={{
              position: 'absolute',
              left: `${bgImageDims.offsetX + normalizedVideoPosition.x * bgImageDims.width}px`,
              top: `${bgImageDims.offsetY + normalizedVideoPosition.y * bgImageDims.height}px`,
              width: `${videoContainerDims.width}px`,
              height: `${videoContainerDims.height}px`,
              zIndex: 100,
              cursor: isDragging ? 'grabbing' : 'move',
              pointerEvents: 'auto',
              ...(useChromaKey && {
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: chromaKeyPreview ? `0 0 10px ${chromaKeyColor}` : 'none'
              })
            }}
            ref={dragHandleRef}
          >
            <video
              ref={videoRef}
              src={narrationVideoData.url}
              autoPlay
              loop
              muted
              style={videoStyle}
              onLoadedMetadata={handleVideoLoadedMetadata}
            />
            <canvas
              ref={canvasRef}
              style={canvasStyle}
            />
            {/* Overlay para melhor visualização da área de arrasto */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '2px dashed',
              borderColor: isDragging ? '#8b5cf6' : '#e5e7eb',
              pointerEvents: 'none',
              zIndex: 101,
              opacity: isDragging ? 1 : 0.3
            }} />
          </div>
        )}
      </Box>
      
      {isDragging && (
        <Typography variant="body2" sx={{ mt: 1, color: 'primary.main', textAlign: 'center' }}>
          Arrastando o vídeo... Solte para posicionar
        </Typography>
      )}

      {useChromaKey && chromaKeyPreview && (
        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', textAlign: 'center', display: 'block' }}>
          Preview de chromakey em tempo real - A qualidade final será superior
        </Typography>
      )}
    </Paper>
  );
};

export default Preview;

