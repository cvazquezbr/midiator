import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, ButtonGroup, Button } from '@mui/material';

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
  const dragHandleRef = useRef();
  const containerRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

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
    objectFit: 'cover', // Garante que o vídeo preencha o container mantendo proporção
    backgroundColor: useChromaKey ? chromaKeyColor : 'transparent',
  };

  if (useChromaKey) {
    videoStyle.filter = `drop-shadow(0 0 5px ${chromaKeyColor}) drop-shadow(0 0 15px ${chromaKeyColor})`;
    videoStyle.mixBlendMode = 'multiply';
  }

  // Calcula dimensões do container de vídeo
  const videoContainerDims = getVideoContainerDimensions();

  return (
    <Paper elevation={0} sx={{
      p: 2,
      mb: 3,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 2
    }}>
      <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
        Pré-visualização
      </Typography>

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
          backgroundColor: 'rgba(0,0,0,0.3)',
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
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
              border: isDragging ? '2px solid #ff4081' : 'none'
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
            color: 'rgba(255,255,255,0.5)'
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
                backgroundColor: chromaKeyColor,
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: `0 0 10px ${chromaKeyColor}`
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
            {/* Overlay para melhor visualização da área de arrasto */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '2px dashed #fff',
              pointerEvents: 'none',
              zIndex: 101
            }} />
          </div>
        )}
      </Box>
      
      {isDragging && (
        <Typography variant="body2" sx={{ mt: 1, color: '#ff4081', textAlign: 'center' }}>
          Arrastando o vídeo... Solte para posicionar
        </Typography>
      )}
    </Paper>
  );
};

export default Preview;