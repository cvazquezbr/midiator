import React from 'react';
import {
  Box, Typography
} from '@mui/material';
import Draggable from 'react-draggable';

const Preview = ({
  imageContainerRef,
  generatedImages,
  generationMode,
  currentImageIndex,
  narrationVideoData,
  videoPosition,
  setVideoPosition,
  videoScale,
  useChromaKey,
  chromaKeyColor,
}) => {
  const videoStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: `${narrationVideoData.width * videoScale}px`,
    height: `${narrationVideoData.height * videoScale}px`,
    cursor: 'move',
    border: '2px dashed #fff',
  };

  if (useChromaKey) {
    // This is a simple visual cue, not a real chroma key effect.
    // A real-time preview would require a canvas-based solution.
    videoStyle.filter = `drop-shadow(0 0 5px ${chromaKeyColor}) drop-shadow(0 0 15px ${chromaKeyColor})`;
  }

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

      <Box
        ref={imageContainerRef}
        sx={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: 'rgba(0,0,0,0.3)',
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {generatedImages.length > 0 && generationMode === 'slides' ? (
          <img
            src={generatedImages[currentImageIndex].url}
            alt={`Frame ${currentImageIndex + 1}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transition: 'opacity 0.5s ease-in-out',
            }}
          />
        ) : generatedImages.length > 0 && generationMode === 'narration' ? (
           <img
              src={generatedImages[0].url}
              alt="Background"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
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
        {generationMode === 'narration' && narrationVideoData.url && (
          <Draggable
            position={videoPosition}
            onStop={(e, data) => setVideoPosition({ x: data.x, y: data.y })}
            bounds="parent"
          >
            <video
              src={narrationVideoData.url}
              autoPlay
              loop
              muted
              style={videoStyle}
            />
          </Draggable>
        )}
      </Box>
    </Paper>
  );
};

export default Preview;
